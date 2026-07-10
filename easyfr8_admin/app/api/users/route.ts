import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { UserAccount } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.users);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user: UserAccount = await req.json();
    const db = await readDb();
    
    if (!user.id) {
      user.id = `USR-${Math.floor(100 + Math.random() * 900)}`;
    }
    
    db.users.push(user);
    await writeDb(db);
    
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
