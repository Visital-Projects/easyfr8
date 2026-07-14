import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { Blog } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await readDb();
    return new NextResponse(JSON.stringify(db.blogs), {
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
    const blog: Blog = await req.json();
    const db = await readDb();
    
    if (!blog.id) {
      blog.id = `BLG-${Math.floor(100 + Math.random() * 900)}`;
    }
    
    db.blogs.unshift(blog);
    await writeDb(db);
    
    return NextResponse.json({ success: true, blog });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
