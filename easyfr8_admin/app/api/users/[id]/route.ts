import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await readDb();
    
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    db.users[idx] = { ...db.users[idx], ...body };
    await writeDb(db);
    
    return NextResponse.json({ success: true, user: db.users[idx] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readDb();
    
    const initialLength = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    
    if (db.users.length === initialLength) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    await writeDb(db);
    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
