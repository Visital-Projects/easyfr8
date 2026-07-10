import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { KYCDocument } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.documents);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const doc: KYCDocument = await req.json();
    const db = await readDb();
    
    if (!doc.id) {
      doc.id = `DOC-${Math.floor(200 + Math.random() * 800)}`;
    }
    
    db.documents.unshift(doc);
    await writeDb(db);
    
    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
