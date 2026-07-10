import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { Partner } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    const partners = (db.partners || []).sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(partners);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await readDb();

    const newId = `partner-${Date.now()}`;
    const newPartner: Partner = {
      id: newId,
      name: body.name || '',
      logo: body.logo || '',
      websiteUrl: body.websiteUrl || '',
      status: body.status || 'active',
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : (db.partners?.length || 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!db.partners) db.partners = [];
    db.partners.push(newPartner);
    await writeDb(db);

    return NextResponse.json(newPartner);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
