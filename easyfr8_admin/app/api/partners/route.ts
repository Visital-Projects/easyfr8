import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await readDb();
    // Return only active partners sorted by sort_order
    const partners = (db.partners || [])
      .filter((p) => p.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);

    return NextResponse.json(partners);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
