import { NextResponse } from 'next/server';
import { execute, query, logAuditEvent } from '@/lib/db';
import { authenticateRequest, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }
    
    const decoded = auth.user;
    
    const { currentPassword, newPassword, confirmPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Current password and new password are required.' }, { status: 400 });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: 'New password and confirmation do not match.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    
    // Check credentials inside database
    const rows = await query('SELECT id, password, email, name FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }
    
    const user = rows[0];
    if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ success: false, error: 'Invalid current password.' }, { status: 401 });
    }
    
    // Hash new password using bcrypt
    const hashedPassword = hashPassword(newPassword);
    
    // Save new hashed password into MySQL
    await execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, user.id]);
    
    await logAuditEvent(
      user.email,
      user.name,
      'Changed user password'
    );
    
    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

