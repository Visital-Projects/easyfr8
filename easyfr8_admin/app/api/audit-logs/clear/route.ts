import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function POST() {
  try {
    const db = await readDb();
    db.auditLogs = [];
    await writeDb(db);
    return NextResponse.json({ success: true, message: 'Audit logs cleared.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
