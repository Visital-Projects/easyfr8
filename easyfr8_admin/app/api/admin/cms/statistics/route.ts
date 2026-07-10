import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { Statistic } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    const statistics = (db.statistics || []).sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(statistics);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await readDb();

    const newId = `stat-${Date.now()}`;
    const newStat: Statistic = {
      id: newId,
      label: body.label || '',
      value: body.value || '',
      icon: body.icon || 'flaticon-transport-9',
      status: body.status || 'active',
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : (db.statistics?.length || 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!db.statistics) db.statistics = [];
    db.statistics.push(newStat);
    await writeDb(db);

    return NextResponse.json(newStat);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
