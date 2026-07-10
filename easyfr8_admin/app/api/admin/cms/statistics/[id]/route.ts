import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const db = await readDb();

    if (!db.statistics) db.statistics = [];
    const idx = db.statistics.findIndex((s) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Statistic not found' }, { status: 404 });
    }

    db.statistics[idx] = {
      ...db.statistics[idx],
      ...body,
      id: id,
      updated_at: new Date().toISOString(),
    };

    await writeDb(db);
    return NextResponse.json(db.statistics[idx]);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await readDb();

    if (!db.statistics) db.statistics = [];
    const idx = db.statistics.findIndex((s) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Statistic not found' }, { status: 404 });
    }

    db.statistics.splice(idx, 1);
    await writeDb(db);

    return NextResponse.json({ success: true, message: 'Statistic deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
