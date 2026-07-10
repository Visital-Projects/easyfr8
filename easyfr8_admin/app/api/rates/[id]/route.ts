import { NextResponse } from 'next/server';
import { readDb, writeDb, logRateActivity, logAuditEvent } from '@/lib/db';

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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await readDb();
    
    const idx = db.rates.findIndex(r => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Rate not found' }, { status: 404 });
    }
    
    const oldRate = { ...db.rates[idx] };
    const newRate = { ...db.rates[idx], ...body };
    db.rates[idx] = newRate;
    
    await writeDb(db);
    
    const operator = getOperator(req);
    await logRateActivity(id, 'update', oldRate, newRate, operator);
    await logAuditEvent(null, operator, `Updated freight rate route: ${oldRate.origin} → ${oldRate.destination}`);
    
    return NextResponse.json({ success: true, rate: db.rates[idx] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readDb();
    
    const idx = db.rates.findIndex(r => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Rate not found' }, { status: 404 });
    }
    
    const oldRate = db.rates[idx];
    db.rates = db.rates.filter(r => r.id !== id);
    
    await writeDb(db);
    
    const operator = getOperator(req);
    await logRateActivity(id, 'delete', oldRate, null, operator);
    await logAuditEvent(null, operator, `Deleted freight rate route: ${oldRate.origin} → ${oldRate.destination}`);
    
    return NextResponse.json({ success: true, message: 'Rate deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
