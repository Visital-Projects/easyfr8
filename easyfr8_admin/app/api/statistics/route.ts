import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await readDb();
    // Return only active statistics sorted by sort_order
    const statistics = (db.statistics || [])
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);

    return NextResponse.json(statistics);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
