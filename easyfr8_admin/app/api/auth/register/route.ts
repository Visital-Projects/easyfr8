import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (!email) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address format.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ success: false, error: 'Full name / company name is required.' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await query<any>('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: 'An account with this email address already exists.' }, { status: 409 });
    }

    const id = await generateNextUserId();
    const hashedPassword = hashPassword(password);
    const role = 'Customer';
    const status = 'Active';

    await execute(
      `INSERT INTO users (id, name, email, phone, password, role, status, avatar, reg_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', NOW(), NOW(), NOW())`,
      [id, name, email, phone, hashedPassword, role, status]
    );

    const tokenPayload = {
      id,
      name,
      email,
      role
    };

    const token = generateToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id,
        name,
        email,
        role,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
        phone
      }
    }, { status: 201 });

    response.cookies.set('easyfr8_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
