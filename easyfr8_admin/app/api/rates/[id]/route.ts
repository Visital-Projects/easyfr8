import { NextResponse } from 'next/server';
import { execute, query, logRateActivity, logAuditEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getOperator(req: Request): string {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/easyfr8_session=([^;]+)/);
  if (match) {
    try {
      const decoded = decodeURIComponent(match[1]);
      const session = JSON.parse(decoded);
      return session.name || session.email || 'Admin User';
    } catch {
      // ignore
    }
  }
  return 'Admin User';
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.container !== undefined && (!body.container || !body.container.trim())) {
      return NextResponse.json({ success: false, error: 'Container is required.' }, { status: 400 });
    }

    const existing: any = await query('SELECT * FROM rates WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Rate not found' }, { status: 404 });
    }

    const oldRate = existing[0];
    const origin = body.origin !== undefined ? body.origin : oldRate.origin;
    const destination = body.destination !== undefined ? body.destination : oldRate.destination;
    const container = body.container !== undefined ? body.container : oldRate.container;
    const cost = body.cost !== undefined ? Number(body.cost) : Number(oldRate.cost);
    const transit = body.transit !== undefined ? Number(body.transit) : Number(oldRate.transit);
    const validity = body.validity !== undefined ? body.validity : oldRate.validity;

    await execute(`
      UPDATE rates
      SET origin = ?, destination = ?, container = ?, cost = ?, transit = ?, validity = ?, updated_at = NOW()
      WHERE id = ?
    `, [origin, destination, container, cost, transit, validity, id]);

    const newRate = {
      id,
      origin,
      destination,
      container,
      cost,
      transit,
      validity,
    };

    const operator = getOperator(req);
    await logRateActivity(id, 'update', oldRate, newRate, operator);
    await logAuditEvent(null, operator, `Updated freight rate route: ${origin} → ${destination}`);

    return NextResponse.json({ success: true, rate: newRate });
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
    const existing: any = await query('SELECT * FROM rates WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Rate not found' }, { status: 404 });
    }

    const oldRate = existing[0];
    await execute('DELETE FROM rates WHERE id = ?', [id]);

    const operator = getOperator(req);
    await logRateActivity(id, 'delete', oldRate, null, operator);
    await logAuditEvent(null, operator, `Deleted freight rate route: ${oldRate.origin} → ${oldRate.destination}`);

    return NextResponse.json({ success: true, message: 'Rate deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
