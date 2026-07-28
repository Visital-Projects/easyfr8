import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await readDb();
    const active = (db.industries || [])
      .filter((i) => i.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(active);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
