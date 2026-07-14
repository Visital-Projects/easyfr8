import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await readDb();
    return new NextResponse(JSON.stringify(db.cms), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
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
