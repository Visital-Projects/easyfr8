import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.cms);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await readDb();
    
    // Update cms fields
    db.cms = { ...db.cms, ...body };
    await writeDb(db);
    
    return NextResponse.json({ success: true, cms: db.cms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// In case PUT is called instead of POST
export async function PUT(req: Request) {
  return POST(req);
}
