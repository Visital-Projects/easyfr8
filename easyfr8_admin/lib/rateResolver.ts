import mysql from 'mysql2/promise';

export interface ResolveFreightRateResult {
  modeId: string;
  shipmentTypeId: string;
  originId: string;
  destinationId: string;
  transhipmentId: string | null;
  containerId: string | null;
  price: number;
  currency: string;
  transitTime: number;
  carrier: string;
  status: 'active' | 'inactive';
  localThc: number;
  documentationFee: number;
  customsClearance: number;
  otherCharges: number;
}

export type ResolveFreightRateOutcome =
  | { success: true; data: ResolveFreightRateResult }
  | { success: false; error: string; status: number };

/**
 * Resolves frontend display names, codes, legacy IDs, or direct IDs
 * against MySQL master tables (freight_types, shipment_types, ports, containers).
 * Ensures foreign key constraints on freight_rates table are never violated.
 */
export async function resolveFreightRatePayload(
  pool: mysql.Pool,
  body: any
): Promise<ResolveFreightRateOutcome> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be a valid JSON object.', status: 400 };
  }

  // 1. Resolve Freight Mode
  const rawMode = String(body.freight_mode_id || '').trim();
  if (!rawMode) {
    return { success: false, error: 'Freight Mode is required.', status: 400 };
  }

  const [modes]: any = await pool.query('SELECT id, name FROM freight_types');
  const [legacyModes]: any = await pool.query('SELECT id, name FROM freight_modes');

  let resolvedModeId: string | null = null;
  let resolvedModeName = '';

  // Direct ID match in freight_types
  const directMode = modes.find((m: any) => m.id === rawMode);
  if (directMode) {
    resolvedModeId = directMode.id;
    resolvedModeName = directMode.name;
  } else {
    // Case-insensitive name match
    const byName = modes.find((m: any) => m.name.toLowerCase() === rawMode.toLowerCase());
    if (byName) {
      resolvedModeId = byName.id;
      resolvedModeName = byName.name;
    } else {
      // Legacy freight_modes match (e.g. 'mode-ocean' -> 'Ocean Freight' -> freight_types 'ocean-freight')
      const leg = legacyModes.find((m: any) => m.id === rawMode || m.name.toLowerCase() === rawMode.toLowerCase());
      if (leg) {
        const matchByName = modes.find((m: any) => m.name.toLowerCase() === leg.name.toLowerCase());
        if (matchByName) {
          resolvedModeId = matchByName.id;
          resolvedModeName = matchByName.name;
        }
      }
    }

    // Common alias pattern match
    if (!resolvedModeId) {
      const v = rawMode.toLowerCase();
      if (v.includes('ocean') || v.includes('sea')) {
        const m = modes.find((m: any) => m.name.toLowerCase().includes('ocean') || m.id.includes('ocean'));
        if (m) { resolvedModeId = m.id; resolvedModeName = m.name; }
      } else if (v.includes('air')) {
        const m = modes.find((m: any) => m.name.toLowerCase().includes('air') || m.id.includes('air'));
        if (m) { resolvedModeId = m.id; resolvedModeName = m.name; }
      } else if (v.includes('road')) {
        const m = modes.find((m: any) => m.name.toLowerCase().includes('road') || m.id.includes('road'));
        if (m) { resolvedModeId = m.id; resolvedModeName = m.name; }
      }
    }
  }

  if (!resolvedModeId) {
    return { success: false, error: `Invalid Freight Mode '${rawMode}'. Must match an existing freight type.`, status: 400 };
  }

  // 2. Resolve Shipment Type
  const rawShipment = String(body.shipment_type_id || '').trim();
  if (!rawShipment) {
    return { success: false, error: 'Shipment Type is required.', status: 400 };
  }

  const [shipmentTypes]: any = await pool.query('SELECT id, freight_type_id, name FROM shipment_types');
  let resolvedShipmentTypeId: string | null = null;

  // Direct ID match
  const directShipment = shipmentTypes.find((s: any) => s.id === rawShipment);
  if (directShipment) {
    resolvedShipmentTypeId = directShipment.id;
  } else {
    const v = rawShipment.toLowerCase();
    const cleanV = v.replace(/^(shiptype-|shipment-|ship-)/i, '');

    // Match within the resolved freight_mode_id first
    const candidate = shipmentTypes.find((s: any) => {
      const modeMatch = s.freight_type_id === resolvedModeId;
      if (!modeMatch) return false;
      const sId = s.id.toLowerCase();
      const sName = s.name.toLowerCase();
      if (sName === v) return true;
      if (sId === cleanV || sId === `shiptype-${cleanV}` || sId === `shipment-${cleanV}`) return true;
      if (v.startsWith('fcl') && (sName.startsWith('fcl') || sId.includes('fcl'))) return true;
      if (v.startsWith('lcl') && (sName.startsWith('lcl') || sId.includes('lcl'))) return true;
      if (v.includes('air') && (sName.includes('air') || sId.includes('air'))) return true;
      return false;
    }) || shipmentTypes.find((s: any) => {
      const sId = s.id.toLowerCase();
      const sName = s.name.toLowerCase();
      if (sName === v) return true;
      if (sId === cleanV || sId === `shiptype-${cleanV}` || sId === `shipment-${cleanV}`) return true;
      if (v.startsWith('fcl') && (sName.startsWith('fcl') || sId.includes('fcl'))) return true;
      if (v.startsWith('lcl') && (sName.startsWith('lcl') || sId.includes('lcl'))) return true;
      if (v.includes('air') && (sName.includes('air') || sId.includes('air'))) return true;
      return false;
    });

    if (candidate) {
      resolvedShipmentTypeId = candidate.id;
    }
  }

  if (!resolvedShipmentTypeId) {
    return { success: false, error: `Invalid Shipment Type '${rawShipment}'.`, status: 400 };
  }

  // 3. Resolve Origin & Destination Ports
  const rawOrigin = String(body.origin_id || '').trim();
  const rawDest = String(body.destination_id || '').trim();
  if (!rawOrigin) return { success: false, error: 'Origin Location is required.', status: 400 };
  if (!rawDest) return { success: false, error: 'Destination Location is required.', status: 400 };

  const [ports]: any = await pool.query('SELECT id, port_code, port_name FROM ports');

  const resolvePort = (raw: string) => {
    if (!raw) return null;
    const str = raw.trim();
    // Direct ID match
    const direct = ports.find((p: any) => p.id === str);
    if (direct) return direct.id;

    // Check code in parentheses e.g. "A Coruna (ESLCG)"
    const parenMatch = str.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const code = parenMatch[1].trim().toLowerCase();
      const matchCode = ports.find((p: any) => p.port_code.toLowerCase() === code);
      if (matchCode) return matchCode.id;
    }

    const v = str.toLowerCase();
    // Exact port_code or port_name match
    const exact = ports.find((p: any) => p.port_code.toLowerCase() === v || p.port_name.toLowerCase() === v);
    if (exact) return exact.id;

    // Substring / contains match
    const partial = ports.find((p: any) => {
      const pCode = p.port_code.toLowerCase();
      const pName = p.port_name.toLowerCase();
      return v.includes(pCode) || pName.includes(v) || v.includes(pName);
    });
    return partial ? partial.id : null;
  };

  const resolvedOriginId = resolvePort(rawOrigin);
  if (!resolvedOriginId) {
    return { success: false, error: `Invalid Origin Port '${rawOrigin}'. Port not found in master records.`, status: 400 };
  }

  const resolvedDestId = resolvePort(rawDest);
  if (!resolvedDestId) {
    return { success: false, error: `Invalid Destination Port '${rawDest}'. Port not found in master records.`, status: 400 };
  }

  if (resolvedOriginId === resolvedDestId) {
    return { success: false, error: 'Origin and Destination ports cannot be identical.', status: 400 };
  }

  // Optional Transhipment Port
  const rawTranshipment = body.transhipment_id !== undefined && body.transhipment_id !== null ? String(body.transhipment_id).trim() : '';
  let resolvedTranshipmentId: string | null = null;
  if (rawTranshipment && rawTranshipment.toLowerCase() !== 'none' && rawTranshipment.toLowerCase() !== 'n/a') {
    resolvedTranshipmentId = resolvePort(rawTranshipment);
    if (!resolvedTranshipmentId) {
      return { success: false, error: `Invalid Transhipment Port '${rawTranshipment}'. Port not found in master records.`, status: 400 };
    }
    if (resolvedTranshipmentId === resolvedOriginId) {
      return { success: false, error: 'Transhipment Port cannot be identical to Origin Port.', status: 400 };
    }
    if (resolvedTranshipmentId === resolvedDestId) {
      return { success: false, error: 'Transhipment Port cannot be identical to Destination Port.', status: 400 };
    }
  }

  // 4. Resolve Container
  const isAirMode = resolvedModeId === 'mode-air' || resolvedModeName.toLowerCase().includes('air');
  const rawContainer = body.container_id !== undefined && body.container_id !== null ? String(body.container_id).trim() : '';

  let resolvedContainerId: string | null = null;
  if (!isAirMode) {
    if (!rawContainer || rawContainer.toLowerCase() === 'none' || rawContainer.toLowerCase() === 'n/a') {
      return { success: false, error: 'Container is required for ocean freight rates.', status: 400 };
    }
  }

  if (rawContainer && rawContainer.toLowerCase() !== 'none' && rawContainer.toLowerCase() !== 'n/a') {
    const [containers]: any = await pool.query('SELECT id, name FROM containers');
    // Direct ID match
    const direct = containers.find((c: any) => c.id === rawContainer);
    if (direct) {
      resolvedContainerId = direct.id;
    } else {
      const cleanVal = rawContainer.toLowerCase().replace(/\s+/g, '');
      const parenMatch = rawContainer.match(/\(([^)]+)\)/);
      const code = parenMatch ? parenMatch[1].toLowerCase().replace(/\s+/g, '') : null;

      const match = containers.find((c: any) => {
        const cId = c.id.toLowerCase().replace(/\s+/g, '');
        const cName = c.name.toLowerCase().replace(/\s+/g, '');
        if (cId === cleanVal || cName === cleanVal) return true;
        if (code && (cId.includes(code) || cName.includes(code))) return true;
        if (cleanVal.includes('40oth') || cleanVal.includes('40ot') || cleanVal.includes('opentop')) {
          if (cId.includes('40ot') || cName.includes('40ot') || cName.includes('opentop')) return true;
        }
        if (cleanVal.includes('40hc') || cleanVal.includes('highcube')) {
          if (cId.includes('40hc') || cName.includes('40hc') || cName.includes('highcube')) return true;
        }
        if (cleanVal.includes('40gp') || cleanVal.includes('40ftstandard')) {
          if (cId.includes('40gp') || cName.includes('40gp')) return true;
        }
        if (cleanVal.includes('20gp') || cleanVal.includes('20ftstandard')) {
          if (cId.includes('20gp') || cName.includes('20gp')) return true;
        }
        return false;
      });

      if (match) {
        resolvedContainerId = match.id;
      }
    }

    if (!resolvedContainerId && !isAirMode) {
      return { success: false, error: `Invalid Container '${rawContainer}'. Container not found in master records.`, status: 400 };
    }
  }

  // 5. Price conversion
  const priceNum = parseFloat(String(body.price !== undefined && body.price !== null ? body.price : 0));
  if (isNaN(priceNum) || priceNum < 0) {
    return { success: false, error: 'Price must be a valid non-negative number.', status: 400 };
  }
  const safePrice = Number(priceNum.toFixed(2));

  // 6. Transit time conversion
  const transitNum = parseInt(String(body.transit_time !== undefined && body.transit_time !== null ? body.transit_time : 0), 10);
  if (isNaN(transitNum) || transitNum < 0) {
    return { success: false, error: 'Transit time must be a valid non-negative integer.', status: 400 };
  }
  const safeTransit = transitNum;

  // 7. Currency, Carrier, Status
  const safeCurrency = (body.currency && String(body.currency).trim()) ? String(body.currency).trim().slice(0, 10) : 'USD';
  const rawCarrierStr = body.carrier !== undefined && body.carrier !== null ? String(body.carrier).trim() : '';
  const safeCarrier = rawCarrierStr ? rawCarrierStr.slice(0, 255) : '';
  const safeStatus = String(body.status || 'active').toLowerCase().trim() === 'inactive' ? 'inactive' : 'active';

  // 8. Additional Charges validation & parsing
  const parseCharge = (val: any, fieldLabel: string): { success: true; value: number } | { success: false; error: string } => {
    if (val === undefined || val === null || val === '') {
      return { success: true, value: 0 };
    }
    const num = parseFloat(String(val));
    if (isNaN(num) || num < 0) {
      return { success: false, error: `${fieldLabel} must be a valid non-negative number.` };
    }
    return { success: true, value: Number(num.toFixed(2)) };
  };

  const thcRes = parseCharge(body.local_thc !== undefined ? body.local_thc : body.localThc, 'Local THC');
  if (!thcRes.success) return { success: false, error: thcRes.error, status: 400 };

  const docRes = parseCharge(body.documentation_fee !== undefined ? body.documentation_fee : body.documentationFee, 'Documentation Fee');
  if (!docRes.success) return { success: false, error: docRes.error, status: 400 };

  const customsRes = parseCharge(body.customs_clearance !== undefined ? body.customs_clearance : body.customsClearance, 'Customs Clearance');
  if (!customsRes.success) return { success: false, error: customsRes.error, status: 400 };

  const otherRes = parseCharge(body.other_charges !== undefined ? body.other_charges : body.otherCharges, 'Other Charges');
  if (!otherRes.success) return { success: false, error: otherRes.error, status: 400 };

  return {
    success: true,
    data: {
      modeId: resolvedModeId,
      shipmentTypeId: resolvedShipmentTypeId,
      originId: resolvedOriginId,
      destinationId: resolvedDestId,
      transhipmentId: resolvedTranshipmentId,
      containerId: resolvedContainerId,
      price: safePrice,
      currency: safeCurrency,
      transitTime: safeTransit,
      carrier: safeCarrier,
      status: safeStatus,
      localThc: thcRes.value,
      documentationFee: docRes.value,
      customsClearance: customsRes.value,
      otherCharges: otherRes.value,
    },
  };
}

/**
 * Ensures unique ID generation conforming to project convention (frate-XXX).
 */
export async function generateUniqueRateId(pool: mysql.Pool, preferredId?: string): Promise<string> {
  if (preferredId && preferredId.trim()) {
    const cleanPreferred = preferredId.trim();
    const [rows]: any = await pool.query('SELECT id FROM freight_rates WHERE id = ?', [cleanPreferred]);
    if (rows.length === 0) {
      return cleanPreferred;
    }
  }

  // Generate frate-XXX conforming to project conventions
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `frate-${Math.floor(100 + Math.random() * 900)}`;
    const [rows]: any = await pool.query('SELECT id FROM freight_rates WHERE id = ?', [candidate]);
    if (rows.length === 0) {
      return candidate;
    }
  }

  return `frate-${Date.now().toString().slice(-4)}`;
}
