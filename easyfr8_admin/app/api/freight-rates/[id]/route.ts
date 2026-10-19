import { NextResponse } from 'next/server';
import { getPool, logRateActivity, logAuditEvent } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { resolveFreightRatePayload } from '@/lib/rateResolver';

function getOperator(req: Request): string {
  const auth = authenticateRequest(req);
  if (auth.authenticated && auth.user) {
    return auth.user.name || auth.user.email || 'Admin';
  }
  return 'Admin';
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = getPool();
    const [rows]: any = await pool.query(
      `SELECT 
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
      WHERE fr.id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Freight rate not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rate: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();
    const pool = getPool();

    // Check existing rate exists
    const [oldRows]: any = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [id]);
    if (!oldRows || oldRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Freight rate not found.' }, { status: 404 });
    }
    const oldRate = oldRows[0];

    // Merge missing fields with old rate if updating partially
    const mergedBody = {
      freight_mode_id: body.freight_mode_id !== undefined ? body.freight_mode_id : oldRate.freight_mode_id,
      shipment_type_id: body.shipment_type_id !== undefined ? body.shipment_type_id : oldRate.shipment_type_id,
      origin_id: body.origin_id !== undefined ? body.origin_id : oldRate.origin_id,
      destination_id: body.destination_id !== undefined ? body.destination_id : oldRate.destination_id,
      transhipment_id: body.transhipment_id !== undefined ? body.transhipment_id : oldRate.transhipment_id,
      container_id: body.container_id !== undefined ? body.container_id : oldRate.container_id,
      price: body.price !== undefined ? body.price : oldRate.price,
      currency: body.currency !== undefined ? body.currency : oldRate.currency,
      transit_time: body.transit_time !== undefined ? body.transit_time : oldRate.transit_time,
      carrier: body.carrier !== undefined ? body.carrier : oldRate.carrier,
      status: body.status !== undefined ? body.status : oldRate.status,
      local_thc: body.local_thc !== undefined ? body.local_thc : (body.localThc !== undefined ? body.localThc : oldRate.local_thc),
      documentation_fee: body.documentation_fee !== undefined ? body.documentation_fee : (body.documentationFee !== undefined ? body.documentationFee : oldRate.documentation_fee),
      customs_clearance: body.customs_clearance !== undefined ? body.customs_clearance : (body.customsClearance !== undefined ? body.customsClearance : oldRate.customs_clearance),
      other_charges: body.other_charges !== undefined ? body.other_charges : (body.otherCharges !== undefined ? body.otherCharges : oldRate.other_charges),
    };

    const resolution = await resolveFreightRatePayload(pool, mergedBody);
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

    const finalCarrier = typeof carrier === 'string' ? carrier.trim() : '';

    await pool.query(
      `UPDATE freight_rates 
       SET freight_mode_id = ?, shipment_type_id = ?, origin_id = ?, destination_id = ?, transhipment_id = ?, 
           container_id = ?, price = ?, currency = ?, transit_time = ?, carrier = ?, status = ?,
           local_thc = ?, documentation_fee = ?, customs_clearance = ?, other_charges = ?
       WHERE id = ?`,
      [
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
        id,
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

    const oldRateValue = oldRate ? { origin: oldRate.origin_id, destination: oldRate.destination_id, transhipment: oldRate.transhipment_id, price: oldRate.price, carrier: oldRate.carrier, local_thc: oldRate.local_thc, documentation_fee: oldRate.documentation_fee, customs_clearance: oldRate.customs_clearance, other_charges: oldRate.other_charges } : null;
    const newRateValue = { origin: originPort, destination: destPort, transhipment: transPort, price, carrier, local_thc: localThc, documentation_fee: documentationFee, customs_clearance: customsClearance, other_charges: otherCharges };

    const routeDesc = transPort 
      ? `${originPort} → [Via: ${transPort}] → ${destPort}`
      : `${originPort} → ${destPort}`;

    await logRateActivity(id, 'update', oldRateValue, newRateValue, operator);
    await logAuditEvent(null, operator, `Updated freight rate route: ${routeDesc}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUT /api/freight-rates/[id] error]', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update freight rate.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticateRequest(req, ['Administrator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

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
