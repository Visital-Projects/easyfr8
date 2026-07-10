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
    
    const idx = db.documents.findIndex(d => d.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    
    db.documents[idx] = { ...db.documents[idx], ...body };
    await writeDb(db);
    
    return NextResponse.json({ success: true, document: db.documents[idx] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
