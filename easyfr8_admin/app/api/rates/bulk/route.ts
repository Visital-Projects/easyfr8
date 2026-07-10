import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { rates } = await req.json();
    if (!Array.isArray(rates)) {
      return NextResponse.json({ success: false, error: 'Rates must be an array' }, { status: 400 });
    }
    
    const db = await readDb();
    db.rates = rates;
    await writeDb(db);
    
    return NextResponse.json({ success: true, rates: db.rates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
