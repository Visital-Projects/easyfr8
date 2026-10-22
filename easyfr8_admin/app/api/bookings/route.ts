import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized: Authentication token is required.' },
        { status: auth.status || 401 }
      );
    }

    const pool = getPool();
    const role = (auth.user.role || '').toLowerCase().trim();
    const isStaff = role === 'administrator' || role === 'manager';

    let query = `
      SELECT 
        b.*,
        ft.name AS freight_type_name,
        st.name AS shipment_type_name,
        t.name AS term_name,
        p_load.port_name AS loading_port_name,
        p_load.port_code AS loading_port_code,
        p_dis.port_name AS discharge_port_name,
        p_dis.port_code AS discharge_port_code,
        c.name AS container_name,
        fr.price AS freight_rate_price,
        fr.currency AS freight_rate_currency,
        fr.transit_time AS freight_rate_transit_time,
        fr.local_thc AS freight_rate_local_thc,
        fr.other_charges AS freight_rate_other_charges,
        fr.transhipment_id AS freight_rate_transhipment_id,
        p_trans.port_name AS transhipment_port_name,
        p_trans.port_code AS transhipment_port_code
      FROM bookings b
      LEFT JOIN freight_types ft ON b.freight_type_id = ft.id
      LEFT JOIN shipment_types st ON b.shipment_type_id = st.id
      LEFT JOIN terms t ON b.term_id = t.id
      LEFT JOIN ports p_load ON b.loading_port_id = p_load.id
      LEFT JOIN ports p_dis ON b.discharge_port_id = p_dis.id
      LEFT JOIN containers c ON b.container_id = c.id
      LEFT JOIN freight_rates fr ON b.freight_rate_id = fr.id
      LEFT JOIN ports p_trans ON fr.transhipment_id = p_trans.id
    `;

    const params: any[] = [];
    if (!isStaff) {
      // Authenticated Customer: retrieve only bookings matching verified session email
      const verifiedEmail = (auth.user.email || '').toLowerCase().trim();
      query += ` WHERE LOWER(TRIM(b.email)) = LOWER(TRIM(?)) `;
      params.push(verifiedEmail);
    }

    query += ` ORDER BY b.created_at DESC`;

    const [rows]: any = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Enforce Authentication Requirement on Backend
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please log in to the User Portal first to submit your booking.' 
        }, 
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      user_name, 
      email, 
      phone, 
      freight_type_id, 
      shipment_type_id, 
      term_id, 
      loading_port_id, 
      discharge_port_id, 
      container_id, 
      cargo_details,
      freight_rate_id,
      containers
    } = body;
    
    // Bind authoritative server-side user identity
    const verifiedUserName = (user_name && user_name.trim()) || auth.user?.name || 'Shipper';
    const verifiedEmail = (email && email.trim()) || auth.user?.email || '';
    const verifiedPhone = (phone && phone.trim()) || auth.user?.phone || '';

    if (!verifiedUserName || !verifiedEmail || !term_id || !loading_port_id || !discharge_port_id) {
      return NextResponse.json({ success: false, error: 'Required booking parameters are missing.' }, { status: 400 });
    }

    const pool = getPool();

    // 1. Ensure freight_type_id resolves to a valid row in freight_types table
    let finalFreightTypeId = freight_type_id;
    const [ftCheck]: any = await pool.query('SELECT id FROM freight_types WHERE id = ? LIMIT 1', [finalFreightTypeId]);
    if (!ftCheck || ftCheck.length === 0) {
      const lowerFt = String(finalFreightTypeId || '').toLowerCase();
      const [ftFuzzy]: any = await pool.query(
        'SELECT id FROM freight_types WHERE LOWER(name) LIKE ? OR LOWER(id) LIKE ? LIMIT 1',
        [`%${lowerFt}%`, `%${lowerFt}%`]
      );
      if (ftFuzzy && ftFuzzy.length > 0) {
        finalFreightTypeId = ftFuzzy[0].id;
      } else {
        const [defaultFt]: any = await pool.query('SELECT id FROM freight_types ORDER BY sort_order ASC LIMIT 1');
        finalFreightTypeId = defaultFt?.[0]?.id || 'ocean-freight';
      }
    }

    // 2. Ensure shipment_type_id resolves to a valid row in shipment_types table
    let finalShipmentTypeId = shipment_type_id;
    const [stCheck]: any = await pool.query('SELECT id FROM shipment_types WHERE id = ? LIMIT 1', [finalShipmentTypeId]);
    if (!stCheck || stCheck.length === 0) {
      const lowerSt = String(finalShipmentTypeId || '').toLowerCase();
      const [stFuzzy]: any = await pool.query(
        'SELECT id FROM shipment_types WHERE freight_type_id = ? OR LOWER(name) LIKE ? LIMIT 1',
        [finalFreightTypeId, `%${lowerSt}%`]
      );
      if (stFuzzy && stFuzzy.length > 0) {
        finalShipmentTypeId = stFuzzy[0].id;
      } else {
        const [defaultSt]: any = await pool.query('SELECT id FROM shipment_types LIMIT 1');
        finalShipmentTypeId = defaultSt?.[0]?.id || 'shiptype-fcl';
      }
    }

    // 3. Ensure term_id resolves to a valid row in terms table
    let finalTermId = term_id;
    const [termCheck]: any = await pool.query('SELECT id FROM terms WHERE id = ? LIMIT 1', [finalTermId]);
    if (!termCheck || termCheck.length === 0) {
      const lowerTerm = String(finalTermId || '').toLowerCase();
      const [termFuzzy]: any = await pool.query(
        'SELECT id FROM terms WHERE LOWER(name) LIKE ? OR LOWER(id) LIKE ? LIMIT 1',
        [`%${lowerTerm}%`, `%${lowerTerm}%`]
      );
      if (termFuzzy && termFuzzy.length > 0) {
        finalTermId = termFuzzy[0].id;
      } else {
        const [defaultTerm]: any = await pool.query('SELECT id FROM terms WHERE status = "active" LIMIT 1');
        finalTermId = defaultTerm?.[0]?.id || 'term-fob';
      }
    }

    // 4. Ensure loading_port_id resolves to a valid row in ports table
    let finalLoadingPortId = loading_port_id;
    const [loadCheck]: any = await pool.query('SELECT id FROM ports WHERE id = ? LIMIT 1', [finalLoadingPortId]);
    if (!loadCheck || loadCheck.length === 0) {
      const cleanLoad = String(finalLoadingPortId).replace(/^(port|loc)-/, '').replace(/-\d+$/, '');
      const [loadFuzzy]: any = await pool.query(
        'SELECT id FROM ports WHERE port_code = ? OR locode = ? OR id LIKE ? LIMIT 1',
        [finalLoadingPortId, finalLoadingPortId, `%${cleanLoad}%`]
      );
      if (loadFuzzy && loadFuzzy.length > 0) {
        finalLoadingPortId = loadFuzzy[0].id;
      } else {
        const [defaultPort]: any = await pool.query('SELECT id FROM ports LIMIT 1');
        finalLoadingPortId = defaultPort?.[0]?.id || 'loc-sgpin';
      }
    }

    // 5. Ensure discharge_port_id resolves to a valid row in ports table
    let finalDischargePortId = discharge_port_id;
    const [disCheck]: any = await pool.query('SELECT id FROM ports WHERE id = ? LIMIT 1', [finalDischargePortId]);
    if (!disCheck || disCheck.length === 0) {
      const cleanDis = String(finalDischargePortId).replace(/^(port|loc)-/, '').replace(/-\d+$/, '');
      const [disFuzzy]: any = await pool.query(
        'SELECT id FROM ports WHERE port_code = ? OR locode = ? OR id LIKE ? LIMIT 1',
        [finalDischargePortId, finalDischargePortId, `%${cleanDis}%`]
      );
      if (disFuzzy && disFuzzy.length > 0) {
        finalDischargePortId = disFuzzy[0].id;
      } else {
        const [defaultDisPort]: any = await pool.query('SELECT id FROM ports WHERE id != ? LIMIT 1', [finalLoadingPortId]);
        finalDischargePortId = defaultDisPort?.[0]?.id || finalLoadingPortId;
      }
    }

    // 6. Ensure container_id points to a valid container row in containers table
    let finalContainerId = container_id || null;
    if (finalContainerId) {
      const [contCheck]: any = await pool.query('SELECT id FROM containers WHERE id = ? LIMIT 1', [finalContainerId]);
      if (!contCheck || contCheck.length === 0) {
        const [defaultCont]: any = await pool.query('SELECT id FROM containers LIMIT 1');
        finalContainerId = defaultCont?.[0]?.id || null;
      }
    }

    // Format structured multi-container details to guarantee persistence and Admin Console visibility
    let finalCargoDetails = cargo_details || '';
    if (Array.isArray(containers) && containers.length > 0 && !finalCargoDetails.includes('[Containers]:')) {
      const containerText = '[Containers]:\n' + containers.map((c: any, i: number) => {
        let line = `- Container #${i + 1}: ${c.equipment || 'Standard'} | Qty: ${c.quantity || 1} | Weight: ${c.weight || 0} ${c.weight_unit || 'KG'}`;
        if (c.temperature !== '' && c.temperature != null) {
          line += ` | Temp: ${c.temperature} ${c.temp_unit || 'Celsius'}`;
        }
        if (c.dimensions && (c.dimensions.length || c.dimensions.width || c.dimensions.height)) {
          line += ` | Dim: ${c.dimensions.length || 0}x${c.dimensions.width || 0}x${c.dimensions.height || 0}mm`;
        }
        if (c.gauge_type) {
          line += ` | Gauge: ${c.gauge_type}`;
        }
        if (c.special_instructions) {
          line += ` | Special: ${c.special_instructions}`;
        }
        return line;
      }).join('\n');
      finalCargoDetails = `${containerText}\n${finalCargoDetails}`.trim();
    }

    // Derive authoritative rate data server-side to prevent price tampering
    let rateIdToStore: string | null = null;
    let priceToStore: number | null = null;
    let currencyToStore = 'USD';
    let carrierToStore: string | null = null;
    let transitTimeToStore: number | null = null;

    const targetRateId = freight_rate_id || (typeof cargo_details === 'string' ? (cargo_details.match(/\[Selected Rate:\s*([^|\]]+)/i)?.[1]?.trim() || null) : null);

    if (targetRateId) {
      rateIdToStore = targetRateId;
      const [rateRows]: any = await pool.query(
        'SELECT id, carrier, price, currency, transit_time FROM freight_rates WHERE id = ? LIMIT 1',
        [targetRateId]
      );
      if (rateRows && rateRows.length > 0) {
        const rate = rateRows[0];
        carrierToStore = rate.carrier || null;
        priceToStore = rate.price != null ? parseFloat(rate.price) : null;
        currencyToStore = rate.currency || 'USD';
        transitTimeToStore = rate.transit_time != null ? parseInt(rate.transit_time, 10) : null;
      }
    }
    
    // Generate a unique booking number
    const booking_no = `BK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `bk-${Math.floor(100000 + Math.random() * 900000)}`;
    
    await pool.query(
      `INSERT INTO bookings 
        (id, booking_no, user_name, email, phone, freight_type_id, shipment_type_id, 
         term_id, loading_port_id, discharge_port_id, container_id, freight_rate_id, price, currency, carrier, transit_time, cargo_details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        id,
        booking_no,
        verifiedUserName,
        verifiedEmail,
        verifiedPhone,
        finalFreightTypeId,
        finalShipmentTypeId,
        finalTermId,
        finalLoadingPortId,
        finalDischargePortId,
        finalContainerId,
        rateIdToStore,
        priceToStore,
        currencyToStore,
        carrierToStore,
        transitTimeToStore,
        finalCargoDetails,
      ]
    );

    
    return NextResponse.json({ success: true, booking_no });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
