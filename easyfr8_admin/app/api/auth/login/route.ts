import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

const SECRET = 'easyfr8_admin_secret_key_123';

function generateToken(payload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }));
  return `${header}.${data}.signature_sim`;
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const db = await readDb();
    
    // Find user in database
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user || user.status === 'Inactive') {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or inactive account.' },
        { status: 401 }
      );
    }
    
    // In mock/test environment we accept admin123 or check if there is password
    // Let's check if password matches "admin123" or is simple for testing
    if (password && password !== 'admin123' && password !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid password credentials match.' },
        { status: 401 }
      );
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
    return NextResponse.json({
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
