import { NextResponse } from 'next/server';
import { getPool, logRateActivity, logAuditEvent } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { resolveFreightRatePayload, generateUniqueRateId } from '@/lib/rateResolver';

function getOperator(req: Request): string {
  const auth = authenticateRequest(req);
  if (auth.authenticated && auth.user) {
    return auth.user.name || auth.user.email || 'Admin';
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
    const transhipmentId = searchParams.get('transhipment_id');
    const containerId = searchParams.get('container_id');

    const status = searchParams.get('status');

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
        loc_t.port_code AS transhipment_code,
        loc_t.port_name AS transhipment_name,
        loc_t.country AS transhipment_country,
        c.name AS container_name
      FROM freight_rates fr
      LEFT JOIN freight_types fm ON (fr.freight_mode_id = fm.id OR fr.freight_mode_id = fm.name)
      LEFT JOIN shipment_types st ON (fr.shipment_type_id = st.id OR fr.shipment_type_id = st.name)
      LEFT JOIN ports loc_o ON (fr.origin_id = loc_o.id OR fr.origin_id = loc_o.port_code OR fr.origin_id = loc_o.port_name)
      LEFT JOIN ports loc_d ON (fr.destination_id = loc_d.id OR fr.destination_id = loc_d.port_code OR fr.destination_id = loc_d.port_name)
      LEFT JOIN ports loc_t ON (fr.transhipment_id = loc_t.id OR fr.transhipment_id = loc_t.port_code OR fr.transhipment_id = loc_t.port_name)
      LEFT JOIN containers c ON (fr.container_id = c.id OR fr.container_id = c.name)
      WHERE 1=1
    `;
    const params = [];

    if (modeId) {
      sql += ` AND (
        fr.freight_mode_id = ? OR fm.id = ? OR fm.name LIKE ?
        OR fr.freight_mode_id IN (SELECT id FROM freight_types WHERE id = ? OR name LIKE ?)
        OR fr.freight_mode_id IN (SELECT id FROM freight_modes WHERE id = ? OR name LIKE ?)
      )`;
      params.push(modeId, modeId, `%${modeId}%`, modeId, `%${modeId}%`, modeId, `%${modeId}%`);
    }
    if (shipmentTypeId) {
      const cleanSt = shipmentTypeId.replace(/^(shiptype-|ship-)/i, '');
      sql += ` AND (
        fr.shipment_type_id = ? OR st.id = ? OR st.name LIKE ?
        OR fr.shipment_type_id IN (
          SELECT id FROM shipment_types 
          WHERE id = ? OR name LIKE ? OR id LIKE ? OR name LIKE ?
        )
      )`;
      params.push(
        shipmentTypeId, shipmentTypeId, `%${shipmentTypeId}%`,
        shipmentTypeId, `%${shipmentTypeId}%`, `%${cleanSt}%`, `%${cleanSt}%`
      );
    }
    if (originId) {
      sql += ` AND (
        fr.origin_id = ? OR loc_o.id = ? OR loc_o.port_code = ? OR loc_o.port_name LIKE ?
        OR fr.origin_id IN (
          SELECT p2.id FROM ports p1, ports p2 
          WHERE (p1.id = ? OR p1.port_code = ?) 
            AND (p2.id = p1.id OR p2.port_code = p1.port_code OR (p1.port_name != '' AND p2.port_name LIKE CONCAT('%', SUBSTRING_INDEX(p1.port_name, ' ', 1), '%')))
        )
      )`;
      params.push(originId, originId, originId, `%${originId}%`, originId, originId);
    }
    if (destinationId) {
      sql += ` AND (
        fr.destination_id = ? OR loc_d.id = ? OR loc_d.port_code = ? OR loc_d.port_name LIKE ?
        OR fr.destination_id IN (
          SELECT p2.id FROM ports p1, ports p2 
          WHERE (p1.id = ? OR p1.port_code = ?) 
            AND (p2.id = p1.id OR p2.port_code = p1.port_code OR (p1.port_name != '' AND p2.port_name LIKE CONCAT('%', SUBSTRING_INDEX(p1.port_name, ' ', 1), '%')))
        )
      )`;
      params.push(destinationId, destinationId, destinationId, `%${destinationId}%`, destinationId, destinationId);
    }
    if (transhipmentId) {
      if (transhipmentId === 'none' || transhipmentId === 'null') {
        sql += ' AND fr.transhipment_id IS NULL';
      } else {
        sql += ` AND (
          fr.transhipment_id = ? OR loc_t.id = ? OR loc_t.port_code = ? OR loc_t.port_name LIKE ?
          OR fr.transhipment_id IN (
            SELECT p2.id FROM ports p1, ports p2 
            WHERE (p1.id = ? OR p1.port_code = ?) 
              AND (p2.id = p1.id OR p2.port_code = p1.port_code OR (p1.port_name != '' AND p2.port_name LIKE CONCAT('%', SUBSTRING_INDEX(p1.port_name, ' ', 1), '%')))
          )
        )`;
        params.push(transhipmentId, transhipmentId, transhipmentId, `%${transhipmentId}%`, transhipmentId, transhipmentId);
      }
    }
    if (containerId) {
      sql += ` AND (
        fr.container_id = ? OR c.id = ? OR c.name LIKE ?
        OR fr.container_id IN (
          SELECT id FROM containers WHERE id = ? OR name LIKE ? OR name IN (
            SELECT name FROM containers WHERE id = ?
          )
        )
      )`;
      params.push(containerId, containerId, `%${containerId}%`, containerId, `%${containerId}%`, containerId);
    }
    if (status) {
      sql += ' AND fr.status = ?';
      params.push(status);
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
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const pool = getPool();

    // Resolve all foreign key references, types, and defaults safely against MySQL
    const resolution = await resolveFreightRatePayload(pool, body);
    if (!resolution.success) {
      return NextResponse.json({ success: false, error: resolution.error }, { status: resolution.status });
    }

    const {
      modeId,
      shipmentTypeId,
      originId,
      destinationId,
      transhipmentId,
      containerId,
      price,
      currency,
      transitTime,
      carrier,
      status,
      localThc,
      documentationFee,
      customsClearance,
      otherCharges,
    } = resolution.data;

    const rateId = await generateUniqueRateId(pool, body.id);
    const finalCarrier = typeof carrier === 'string' ? carrier.trim() : '';

    await pool.query(
      `INSERT INTO freight_rates (
        id, freight_mode_id, shipment_type_id, origin_id, destination_id, transhipment_id, 
        container_id, price, currency, transit_time, carrier, status,
        local_thc, documentation_fee, customs_clearance, other_charges
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rateId,
        modeId,
        shipmentTypeId,
        originId,
        destinationId,
        transhipmentId,
        containerId,
        price,
        currency,
        transitTime,
        finalCarrier,
        status,
        localThc,
        documentationFee,
        customsClearance,
        otherCharges,
      ]
    );

    const operator = getOperator(req);
    const portIds = [originId, destinationId];
    if (transhipmentId) portIds.push(transhipmentId);
    const [portRows]: any = await pool.query(
      `SELECT id, port_code FROM ports WHERE id IN (${portIds.map(() => '?').join(', ')})`,
      portIds
    );
    const originPort = portRows.find((p: any) => p.id === originId)?.port_code || originId;
    const destPort = portRows.find((p: any) => p.id === destinationId)?.port_code || destinationId;
    const transPort = transhipmentId ? (portRows.find((p: any) => p.id === transhipmentId)?.port_code || transhipmentId) : null;

    const rateLogValue = { origin: originPort, destination: destPort, transhipment: transPort, price, carrier, local_thc: localThc, documentation_fee: documentationFee, customs_clearance: customsClearance, other_charges: otherCharges };
    const routeDesc = transPort 
      ? `${originPort} → [Via: ${transPort}] → ${destPort}`
      : `${originPort} → ${destPort}`;
    await logRateActivity(rateId, 'create', null, rateLogValue, operator);
    await logAuditEvent(null, operator, `Created freight rate route: ${routeDesc}`);

    return NextResponse.json({
      success: true,
      id: rateId,
      rate: {
        id: rateId,
        freight_mode_id: modeId,
        shipment_type_id: shipmentTypeId,
        origin_id: originId,
        destination_id: destinationId,
        transhipment_id: transhipmentId,
        container_id: containerId,
        price,
        currency,
        transit_time: transitTime,
        carrier,
        status,
        local_thc: localThc,
        documentation_fee: documentationFee,
        customs_clearance: customsClearance,
        other_charges: otherCharges,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/freight-rates error]', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create freight rate.' }, { status: 500 });
  }
}
