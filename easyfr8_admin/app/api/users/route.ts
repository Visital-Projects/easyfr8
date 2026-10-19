import { NextResponse } from 'next/server';
import { execute, getUsers, query } from '@/lib/db';
import { UserAccount } from '@/lib/store';
import { authenticateRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate the next sequential unique User ID (format: USR-XXX or USR-XXXX).
 * Determines the highest existing numeric ID across the users table (e.g. 318 -> USR-319),
 * and verifies uniqueness against all existing IDs before returning.
 */
async function generateNextUserId(): Promise<string> {
  const rows = await query<{ id: string }>('SELECT id FROM users');
  const existingIds = new Set<string>();
  let maxNum = 0;

  for (const row of rows) {
    if (!row || !row.id) continue;
    const idStr = String(row.id).trim();
    existingIds.add(idStr.toUpperCase());

    const match = idStr.match(/^USR-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum > 0 ? maxNum + 1 : 1;
  const formatId = (n: number) => `USR-${n < 1000 ? String(n).padStart(3, '0') : String(n)}`;
  let candidateId = formatId(nextNum);

  while (existingIds.has(candidateId.toUpperCase())) {
    nextNum++;
    candidateId = formatId(nextNum);
  }

  return candidateId;
}

export async function GET(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    let id = await generateNextUserId();
    const name = body.name || '';
    const email = body.email || '';
    const phone = body.phone || '';
    const role = body.role || 'Customer';
    const status = body.status || 'Active';
    const plainPassword = body.password || 'admin123';
    const hashedPassword = hashPassword(plainPassword);
    let avatar = body.avatar || '';

    // If Base64 avatar uploaded, persist into MySQL media table and store streaming reference
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:')) {
      const mediaId = `MED-AVATAR-${id}-${Date.now()}`;
      const now = new Date();
      await execute(
        'INSERT INTO media (id, file_name, file_url, file_type, file_size, uploaded_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [mediaId, `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_avatar.png`, avatar, 'image/png', `${Math.round(avatar.length / 1024)} KB`]
      );
      avatar = `/api/media/${mediaId}?v=${now.getTime()}`;
    }

    let inserted = false;
    let attempts = 0;
    while (!inserted && attempts < 10) {
      attempts++;
      try {
        await execute(`
          INSERT INTO users (id, name, email, phone, password, role, status, avatar, reg_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `, [id, name, email, phone, hashedPassword, role, status, avatar]);
        inserted = true;
      } catch (insertError: any) {
        const isPrimaryKeyDup =
          (insertError?.code === 'ER_DUP_ENTRY' || insertError?.errno === 1062) &&
          (String(insertError?.message || '').includes('PRIMARY') || String(insertError?.sqlMessage || '').includes('PRIMARY'));

        if (isPrimaryKeyDup && attempts < 10) {
          id = await generateNextUserId();
          continue;
        }
        throw insertError;
      }
    }

    const createdUser: UserAccount = {
      id,
      name,
      email,
      phone,
      role,
      status,
      avatar,
      regDate: new Date().toISOString().slice(0, 10),
      lastLogin: '',
    };

    return NextResponse.json({ success: true, user: createdUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
