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
    
    const idx = db.blogs.findIndex(b => b.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }
    
    db.blogs[idx] = { ...db.blogs[idx], ...body };
    await writeDb(db);
    
    return NextResponse.json({ success: true, blog: db.blogs[idx] });
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
    
    const initialLength = db.blogs.length;
    db.blogs = db.blogs.filter(b => b.id !== id);
    
    if (db.blogs.length === initialLength) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }
    
    await writeDb(db);
    return NextResponse.json({ success: true, message: 'Blog deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
