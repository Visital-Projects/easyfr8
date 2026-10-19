import { NextResponse } from 'next/server';
import { getUsers, updateById, logAuditEvent, execute } from '@/lib/db';
import { authenticateRequest, generateToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }
    
    const decoded = auth.user;
    const users = await getUsers();
    const user = users.find(u => u.id === decoded.id || (decoded.email && u.email?.toLowerCase() === decoded.email?.toLowerCase()));
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
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }
    
    const decoded = auth.user;
    
    const { name, email, avatar, phone } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required.' }, { status: 400 });
    }

    const trimmedEmail = String(email).trim();
    const trimmedName = String(name).trim();
    
    const users = await getUsers();
    const user = users.find(u => u.id === decoded.id || (decoded.email && u.email?.toLowerCase() === decoded.email?.toLowerCase()));
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Check for duplicate email across other accounts
    const emailConflict = users.find(
      u => u.id !== user.id && u.email?.toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (emailConflict) {
      return NextResponse.json(
        { success: false, error: 'Email is already in use by another account.' },
        { status: 409 }
      );
    }

    let finalAvatar = avatar !== undefined ? avatar : user.avatar;
    if (finalAvatar && typeof finalAvatar === 'string' && finalAvatar.startsWith('data:')) {
      const mediaId = `MED-AVATAR-${user.id}-${Date.now()}`;
      const now = new Date();
      await execute(
        'INSERT INTO media (id, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
        [mediaId, `${trimmedName.replace(/\s+/g, '_')}_avatar.png`, finalAvatar, 'image/png', `${Math.round(finalAvatar.length / 1024)} KB`]
      );
      finalAvatar = `/api/media/${mediaId}?v=${now.getTime()}`;
    }
    
    // Update user using stable user.id
    await updateById('users', user.id, {
      name: trimmedName,
      email: trimmedEmail,
      avatar: finalAvatar,
      phone: phone ?? user.phone
    });
    
    await logAuditEvent(
      user.email,
      user.name,
      `Updated profile information: Name=${trimmedName}, Email=${trimmedEmail}`
    );

    const refreshedToken = generateToken({
      id: user.id,
      name: trimmedName,
      email: trimmedEmail,
      role: user.role
    });
    
    return NextResponse.json({
      success: true,
      token: refreshedToken,
      user: {
        id: user.id,
        name: trimmedName,
        email: trimmedEmail,
        role: user.role,
        avatar: finalAvatar,
        phone: phone ?? user.phone
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

