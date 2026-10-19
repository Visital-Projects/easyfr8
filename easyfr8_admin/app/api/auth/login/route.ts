import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { verifyPassword, generateToken, needsRehash, hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim();
    
    // Find user in database by email with password included
    const rows: any = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [trimmedEmail]);
    const user = rows[0];
    
    if (!user || user.status === 'Inactive') {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or inactive account.' },
        { status: 401 }
      );
    }
    
    // Securely verify password against stored bcrypt hash (or legacy plaintext)
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    // Auto-upgrade legacy plaintext password to secure bcrypt hash
    if (needsRehash(user.password)) {
      try {
        const newHash = hashPassword(password);
        await execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [newHash, user.id]);
      } catch (err) {
        console.error('Failed to upgrade password hash:', err);
      }
    }
    
    // Create token payload
    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    const token = generateToken(tokenPayload);
    
    // Return standard response matching API_DOCUMENTATION
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150'
      }
    });

    // Set cookie for browser credentials compatibility (HTTP-only)
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
