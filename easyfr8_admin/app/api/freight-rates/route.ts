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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const modeId = searchParams.get('mode_id');
    const shipmentTypeId = searchParams.get('shipment_type_id');
    const originId = searchParams.get('origin_id');
    const destinationId = searchParams.get('destination_id');
    const containerId = searchParams.get('container_id');

    const pool = getPool();
    let sql = `
      SELECT 
        fr.*,
        fm.name AS mode_name,
        st.name AS shipment_name,
        loc_o.port_code AS origin_code,
        loc_o.port_name AS origin_name,
        loc_o.country AS origin_country,
        loc_d.port_code AS destination_code,
        loc_d.port_name AS destination_name,
        loc_d.country AS destination_country,
        c.name AS container_name
      FROM freight_rates fr
      JOIN freight_types fm ON fr.freight_mode_id = fm.id
      JOIN shipment_types st ON fr.shipment_type_id = st.id
      JOIN ports loc_o ON fr.origin_id = loc_o.id
      JOIN ports loc_d ON fr.destination_id = loc_d.id
      LEFT JOIN containers c ON fr.container_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (modeId) {
      sql += ' AND fr.freight_mode_id = ?';
      params.push(modeId);
    }
    if (shipmentTypeId) {
      sql += ' AND fr.shipment_type_id = ?';
      params.push(shipmentTypeId);
    }
    if (originId) {
      sql += ' AND fr.origin_id = ?';
      params.push(originId);
    }
    if (destinationId) {
      sql += ' AND fr.destination_id = ?';
      params.push(destinationId);
    }
    if (containerId) {
      sql += ' AND fr.container_id = ?';
      params.push(containerId);
    }

    sql += ' ORDER BY fr.price ASC';
    const [rows]: any = await pool.query(sql, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status } = body;
    const pool = getPool();
    const rateId = id || `frate-${Math.floor(100 + Math.random() * 900)}`;
    
    await pool.query(
      `INSERT INTO freight_rates (id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rateId,
        freight_mode_id,
        shipment_type_id,
        origin_id,
        destination_id,
        container_id || null,
        price || 0,
        currency || 'USD',
        transit_time || 0,
        carrier,
        status || 'active'
      ]
    );

    const operator = getOperator(req);
    const [portRows]: any = await pool.query(
      'SELECT id, port_code FROM ports WHERE id IN (?, ?)',
      [origin_id, destination_id]
    );
    const originPort = portRows.find((p: any) => p.id === origin_id)?.port_code || origin_id;
    const destPort = portRows.find((p: any) => p.id === destination_id)?.port_code || destination_id;

    const rateLogValue = { origin: originPort, destination: destPort, price, carrier };
    await logRateActivity(rateId, 'create', null, rateLogValue, operator);
    await logAuditEvent(null, operator, `Created freight rate route: ${originPort} → ${destPort}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
