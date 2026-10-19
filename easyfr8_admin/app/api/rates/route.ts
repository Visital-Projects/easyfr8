import { NextResponse } from 'next/server';
import { execute, getRates, logRateActivity, logAuditEvent } from '@/lib/db';
import { FreightRate } from '@/lib/store';
import { authenticateRequest } from '@/lib/auth';

/**
 * @deprecated Legacy rates endpoint. Use /api/freight-rates for canonical rate management.
 * Preserved for backward compatibility. Table `rates` is retained.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rates = await getRates();
    return NextResponse.json(rates, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-API-Deprecated': 'Use /api/freight-rates instead',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const rate: FreightRate = await req.json();
    if (!rate.container || !rate.container.trim()) {
      return NextResponse.json({ success: false, error: 'Container is required.' }, { status: 400 });
    }

    const id = rate.id || `RTE-${Math.floor(300 + Math.random() * 900)}`;
    const origin = rate.origin || '';
    const destination = rate.destination || '';
    const container = rate.container || '';
    const cost = Number(rate.cost) || 0;
    const transit = Number(rate.transit) || 0;
    const validity = rate.validity || '';

    await execute(`
      INSERT INTO rates (id, origin, destination, container, cost, transit, validity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [id, origin, destination, container, cost, transit, validity]);

    rate.id = id;
    const operator = auth.user?.name || auth.user?.email || 'Admin User';
    await logRateActivity(id, 'create', null, rate, operator);
    await logAuditEvent(auth.user?.email || null, operator, `Created freight rate route: ${origin} → ${destination}`);

    return NextResponse.json({ success: true, rate }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
