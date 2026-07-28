import { NextResponse } from 'next/server';
import { readDb, writeDb, logRateActivity, logAuditEvent } from '@/lib/db';
import { FreightRate } from '@/lib/store';

function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getOperator(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded && decoded.name) {
      return decoded.name;
    }
  }
  return 'Admin';
}

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.rates);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rate: FreightRate = await req.json();
    if (!rate.container || !rate.container.trim()) {
      return NextResponse.json({ success: false, error: 'Container is required.' }, { status: 400 });
    }
    const db = await readDb();
    
    // Add default ID if not present
    if (!rate.id) {
      rate.id = `RTE-${Math.floor(300 + Math.random() * 900)}`;
    }
    
    db.rates.unshift(rate);
    await writeDb(db);
    
    const operator = getOperator(req);
    await logRateActivity(rate.id, 'create', null, rate, operator);
    await logAuditEvent(null, operator, `Created freight rate route: ${rate.origin} → ${rate.destination}`);
    
    return NextResponse.json({ success: true, rate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
