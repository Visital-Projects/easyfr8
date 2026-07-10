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
    
    const idx = db.enquiries.findIndex(e => e.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Enquiry not found' }, { status: 404 });
    }
    
    db.enquiries[idx] = { ...db.enquiries[idx], ...body };
    await writeDb(db);
    
    return NextResponse.json({ success: true, enquiry: db.enquiries[idx] });
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
    
    const initialLength = db.enquiries.length;
    db.enquiries = db.enquiries.filter(e => e.id !== id);
    
    if (db.enquiries.length === initialLength) {
      return NextResponse.json({ success: false, error: 'Enquiry not found' }, { status: 404 });
    }
    
    await writeDb(db);
    return NextResponse.json({ success: true, message: 'Enquiry deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
