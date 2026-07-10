import { NextResponse } from 'next/server';
import { readDb, updateById, logAuditEvent } from '@/lib/db';

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

export async function GET(req: Request) {
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
    
    const db = await readDb();
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }
    
    return NextResponse.json({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
    
    const { name, email, avatar, phone } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required.' }, { status: 400 });
    }
    
    const db = await readDb();
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }
    
    await updateById('users', decoded.id, {
      name,
      email,
      avatar: avatar ?? user.avatar,
      phone: phone ?? user.phone
    });
    
    await logAuditEvent(
      user.email,
      user.name,
      `Updated profile information: Name=${name}, Email=${email}`
    );
    
    return NextResponse.json({
      success: true,
      user: {
        id: decoded.id,
        name,
        email,
        role: user.role,
        avatar: avatar ?? user.avatar,
        phone: phone ?? user.phone
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
