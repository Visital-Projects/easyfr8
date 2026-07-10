import { NextResponse } from 'next/server';
import { getPool, logRateActivity, logAuditEvent } from '@/lib/db';

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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status } = body;
    const pool = getPool();

    // Fetch old rate state for diffing/logging
    const [oldRows]: any = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [id]);
    const oldRate = oldRows.length > 0 ? oldRows[0] : null;

    await pool.query(
      `UPDATE freight_rates 
       SET freight_mode_id = ?, shipment_type_id = ?, origin_id = ?, destination_id = ?, 
           container_id = ?, price = ?, currency = ?, transit_time = ?, carrier = ?, status = ? 
       WHERE id = ?`,
      [
        freight_mode_id,
        shipment_type_id,
        origin_id,
        destination_id,
        container_id || null,
        price,
        currency || 'USD',
        transit_time,
        carrier,
        status,
        id
      ]
    );

    const operator = getOperator(req);
    const [portRows]: any = await pool.query(
      'SELECT id, port_code FROM ports WHERE id IN (?, ?)',
      [origin_id, destination_id]
    );
    const originPort = portRows.find((p: any) => p.id === origin_id)?.port_code || origin_id;
    const destPort = portRows.find((p: any) => p.id === destination_id)?.port_code || destination_id;

    const oldRateValue = oldRate ? { origin: originPort, destination: destPort, price: oldRate.price, carrier: oldRate.carrier } : null;
    const newRateValue = { origin: originPort, destination: destPort, price, carrier };

    await logRateActivity(id, 'update', oldRateValue, newRateValue, operator);
    await logAuditEvent(null, operator, `Updated freight rate route: ${originPort} → ${destPort}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = getPool();

    // Fetch old rate state for diffing/logging
    const [oldRows]: any = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [id]);
    const oldRate = oldRows.length > 0 ? oldRows[0] : null;

    await pool.query('DELETE FROM freight_rates WHERE id = ?', [id]);

    if (oldRate) {
      const operator = getOperator(req);
      const [portRows]: any = await pool.query(
        'SELECT id, port_code FROM ports WHERE id IN (?, ?)',
        [oldRate.origin_id, oldRate.destination_id]
      );
      const originPort = portRows.find((p: any) => p.id === oldRate.origin_id)?.port_code || oldRate.origin_id;
      const destPort = portRows.find((p: any) => p.id === oldRate.destination_id)?.port_code || oldRate.destination_id;

      const oldRateValue = { origin: originPort, destination: destPort, price: oldRate.price, carrier: oldRate.carrier };
      await logRateActivity(id, 'delete', oldRateValue, null, operator);
      await logAuditEvent(null, operator, `Deleted freight rate route: ${originPort} → ${destPort}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
