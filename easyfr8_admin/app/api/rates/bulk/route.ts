import { NextResponse } from 'next/server';
import { execute, getRates } from '@/lib/db';
import { FreightRate } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { rates } = await req.json();
    if (!Array.isArray(rates)) {
      return NextResponse.json({ success: false, error: 'Rates must be an array' }, { status: 400 });
    }

    for (let i = 0; i < rates.length; i++) {
      const r = rates[i];
      const id = r.id || `RTE-${Date.now()}-${i}`;
      const origin = r.origin || '';
      const destination = r.destination || '';
      const container = r.container || '';
      const cost = Number(r.cost) || 0;
      const transit = Number(r.transit) || 0;
      const validity = r.validity || '';

      await execute(`
        INSERT INTO rates (id, origin, destination, container, cost, transit, validity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          origin = VALUES(origin),
          destination = VALUES(destination),
          container = VALUES(container),
          cost = VALUES(cost),
          transit = VALUES(transit),
          validity = VALUES(validity),
          updated_at = NOW()
      `, [id, origin, destination, container, cost, transit, validity]);
    }

    const freshRates = await getRates();
    return NextResponse.json({ success: true, rates: freshRates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
