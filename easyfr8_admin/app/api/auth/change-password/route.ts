import { NextResponse } from 'next/server';
import { readDb, execute, query, logAuditEvent } from '@/lib/db';

function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null; // Expired
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Session expired or invalid.' }, { status: 401 });
    }
    
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Current password and new password are required.' }, { status: 400 });
    }
    
    // Check credentials inside database
    const rows = await query('SELECT password, email, name FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }
    
    const dbPassword = rows[0].password;
    if (currentPassword !== dbPassword) {
      return NextResponse.json({ success: false, error: 'Invalid current password.' }, { status: 401 });
    }
    
    // Save new password
    await execute('UPDATE users SET password = ? WHERE id = ?', [newPassword, decoded.id]);
    
    await logAuditEvent(
      rows[0].email,
      rows[0].name,
      'Changed user password'
    );
    
    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
