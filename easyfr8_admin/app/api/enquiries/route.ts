import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { Enquiry } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.enquiries);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await readDb();
    
    const newEnq: Enquiry = {
      id: `ENQ-${Date.now()}`,
      name: body.name || 'Anonymous',
      email: body.email || '',
      subject: body.subject || body.service || 'Website Enquiry',
      date: new Date().toISOString().split('T')[0],
      status: 'New',
      notes: body.message || body.notes || '',
      assignedTo: '',
      source: body.source || 'Web Form'
    };
    
    db.enquiries.unshift(newEnq);
    await writeDb(db);
    
    return NextResponse.json({ success: true, enquiry: newEnq });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
