import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { Blog } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.blogs);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
