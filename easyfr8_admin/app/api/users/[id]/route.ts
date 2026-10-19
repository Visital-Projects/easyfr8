import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const rows: any = await query(
      'SELECT id, name, email, phone, role, status, avatar, reg_date, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const u = rows[0];
    return NextResponse.json({
      id: u.id,
      name: u.name ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      role: u.role ?? 'Customer',
      status: u.status ?? 'Active',
      avatar: u.avatar ?? '',
      regDate: u.reg_date ? String(u.reg_date).slice(0, 10) : '',
      lastLogin: u.last_login ? String(u.last_login).slice(0, 10) : '',
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();

    const existing: any = await query('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const current = existing[0];
    const name = body.name !== undefined ? body.name : current.name;
    const email = body.email !== undefined ? body.email : current.email;
    const phone = body.phone !== undefined ? body.phone : current.phone;
    const role = body.role !== undefined ? body.role : current.role;
    const status = body.status !== undefined ? body.status : current.status;
    let avatar = body.avatar !== undefined ? body.avatar : current.avatar;

    // If Base64 avatar uploaded, persist into MySQL media table and store streaming reference
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:')) {
      const mediaId = `MED-AVATAR-${id}-${Date.now()}`;
      const now = new Date();
      await execute(
        'INSERT INTO media (id, file_name, file_url, file_type, file_size, uploaded_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [mediaId, `${String(name).replace(/[^a-zA-Z0-9_-]/g, '_')}_avatar.png`, avatar, 'image/png', `${Math.round(avatar.length / 1024)} KB`]
      );
      avatar = `/api/media/${mediaId}?v=${now.getTime()}`;
    }

    await execute(`
      UPDATE users
      SET name = ?, email = ?, phone = ?, role = ?, status = ?, avatar = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, email, phone, role, status, avatar, id]);

    return NextResponse.json({
      success: true,
      user: {
        id,
        name,
        email,
        phone,
        role,
        status,
        avatar,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // Prevent administrator from accidentally deleting their own currently authenticated account
    if (auth.user?.id === id) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own active administrator account.' }, { status: 400 });
    }

    await execute('DELETE FROM users WHERE id = ?', [id]);
    try {
      await execute("DELETE FROM media WHERE id LIKE CONCAT('MED-AVATAR-', ?, '-%')", [id]);
    } catch {
      // ignore media cleanup failure if table or rows don't exist
    }
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
