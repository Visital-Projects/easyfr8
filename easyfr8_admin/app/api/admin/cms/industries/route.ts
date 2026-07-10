import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { Industry } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    const sorted = (db.industries || []).sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(sorted);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await readDb();
    if (!db.industries) db.industries = [];

    const newIndustry: Industry = {
      id: `ind-${Date.now()}`,
      title: body.title || '',
      desc: body.desc || '',
      icon: body.icon || 'flaticon-transport-1',
      status: body.status || 'active',
      sort_order: body.sort_order ?? db.industries.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.industries.push(newIndustry);
    await writeDb(db);
    return NextResponse.json(newIndustry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
