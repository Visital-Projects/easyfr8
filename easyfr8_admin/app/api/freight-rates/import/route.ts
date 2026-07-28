import { NextResponse } from 'next/server';
import { getPool, logRateActivity, logAuditEvent } from '@/lib/db';
import * as XLSX from 'xlsx';

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

export async function POST(req: Request) {
  const pool = getPool();
  let connection: any = null;

  try {
    connection = await pool.getConnection();

    let rows: any[] = [];
    let duplicateStrategy = 'skip';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length === 0) {
        return NextResponse.json({ success: false, error: 'Uploaded file is empty.' }, { status: 400 });
      }
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json({ success: false, error: 'File contains no worksheets.' }, { status: 400 });
      }
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      const body = await req.json();
      rows = body.rows || [];
      duplicateStrategy = body.options?.duplicateStrategy || 'skip';
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No data rows provided for import.' }, { status: 400 });
    }

    // Fetch lookup maps for resolution
    const [modes]: any = await connection.query('SELECT id, name FROM freight_types');
    const [shipmentTypes]: any = await connection.query('SELECT id, freight_type_id, name FROM shipment_types');
    const [ports]: any = await connection.query('SELECT id, port_code, port_name FROM ports');
    const [containers]: any = await connection.query('SELECT id, name FROM containers');
    const [existingRates]: any = await connection.query('SELECT id, origin_id, destination_id, carrier, container_id, shipment_type_id FROM freight_rates');

    const operator = getOperator(req);

    // Helpers to resolve lookups
    const findModeId = (val: string) => {
      if (!val) return null;
      const v = val.trim().toLowerCase();
      const match = modes.find((m: any) => 
        m.id.toLowerCase() === v || 
        m.name.toLowerCase() === v ||
        (v.includes('ocean') || v.includes('sea')) && m.name.toLowerCase().includes('ocean') ||
        v.includes('air') && m.name.toLowerCase().includes('air')
      );
      return match ? match.id : null;
    };

    const findShipmentTypeId = (val: string, modeId?: string | null) => {
      if (!val) return null;
      const v = val.trim().toLowerCase();
      const match = shipmentTypes.find((s: any) => {
        const sId = s.id.toLowerCase();
        const sName = s.name.toLowerCase();
        const modeMatch = !modeId || s.freight_type_id === modeId;
        if (!modeMatch) return false;

        if (sId === v || sName === v) return true;
        if (v.startsWith('fcl') && sName.startsWith('fcl')) return true;
        if (v.startsWith('lcl') && sName.startsWith('lcl')) return true;
        if (v.includes('air') && sName.includes('air')) return true;
        return false;
      }) || shipmentTypes.find((s: any) => {
        const sId = s.id.toLowerCase();
        const sName = s.name.toLowerCase();
        if (sId === v || sName === v) return true;
        if (v.startsWith('fcl') && sName.startsWith('fcl')) return true;
        if (v.startsWith('lcl') && sName.startsWith('lcl')) return true;
        if (v.includes('air') && sName.includes('air')) return true;
        return false;
      });
      return match ? match.id : null;
    };

    const findPortId = (val: string) => {
      if (!val) return null;
      const v = val.trim().toLowerCase();
      const match = ports.find((p: any) => {
        const pId = p.id.toLowerCase();
        const pCode = p.port_code.toLowerCase();
        const pName = p.port_name.toLowerCase();
        if (pId === v || pCode === v || pName === v) return true;
        if (v.includes(pCode) || pName.includes(v) || v.includes(pName)) return true;
        return false;
      });
      return match ? match.id : null;
    };

    const findContainerId = (val: string) => {
      if (!val) return null;
      const cleanVal = val.trim().toLowerCase().replace(/\s+/g, '');
      
      const match = containers.find((c: any) => {
        const cId = c.id.toLowerCase().replace(/\s+/g, '');
        const cName = c.name.toLowerCase().replace(/\s+/g, '');
        
        // Exact or cleaned match on ID or Name
        if (cId === cleanVal || cName === cleanVal) return true;
        
        // Match standard code extractions (e.g. 20gp, 40gp, 40hc, 40oth)
        const codeInParen = c.name.match(/\(([^)]+)\)/);
        if (codeInParen) {
          const code = codeInParen[1].toLowerCase().replace(/\s+/g, '');
          if (code === cleanVal || cleanVal.includes(code)) return true;
        }

        // Common Alias Patterns
        if ((cleanVal.includes('20gp') || cleanVal.includes('20ftstandard') || cleanVal.includes('20ftdry') || cleanVal === '20gpcontainer' || cleanVal === '20gp') && (cId.includes('20gp') || cName.includes('20gp') || cName === '20gp')) return true;
        if ((cleanVal.includes('40gp') || cleanVal.includes('40ftstandard') || cleanVal.includes('40ftdry') || cleanVal === '40gpcontainer' || cleanVal === '40gp') && (cId.includes('40gp') || cName.includes('40gp') || cName === '40gp')) return true;
        if ((cleanVal.includes('40hc') || cleanVal.includes('40fthc') || cleanVal.includes('40fthighcube') || cleanVal.includes('40highcube') || cleanVal === '40hc') && (cId.includes('40hc') || cName.includes('40hc') || cName === '40hc')) return true;
        if ((cleanVal.includes('40oth') || cleanVal.includes('40ot') || cleanVal.includes('40ftopentop') || cleanVal === '40open top') && (cId.includes('40oth') || cId.includes('40ot') || cName.includes('40oth') || cName.includes('40opentop'))) return true;

        return false;
      });

      return match ? match.id : null;
    };

    const errors: { row: number; field: string; message: string }[] = [];
    const validRowsToProcess: any[] = [];

    // Pre-validate every row
    rows.forEach((row: any, index: number) => {
      const rowIndex = index + 1;
      const rawMode = row['Mode'] || row['freight_mode_id'] || row['mode_name'] || '';
      const rawShipment = row['Shipment Type'] || row['shipment_type_id'] || row['shipment_name'] || '';
      const rawOrigin = row['Origin'] || row['origin_id'] || row['origin_code'] || row['origin_name'] || '';
      const rawDest = row['Destination'] || row['destination_id'] || row['destination_code'] || row['destination_name'] || '';
      const rawContainer = row['Container'] || row['container_id'] || row['container_name'] || '';
      const rawCarrier = row['Carrier'] || row['carrier'] || '';
      const rawPrice = row['Price'] || row['price'] || '';
      const rawTransit = row['Transit Time'] || row['transit_time'] || '0';
      const rawStatus = (row['Status'] || row['status'] || 'active').toString().toLowerCase();
      const rawRateId = row['Rate ID'] || row['id'] || '';

      // Mode validation
      const modeId = findModeId(rawMode);
      if (!modeId) {
        errors.push({ row: rowIndex, field: 'Mode', message: `Invalid or unknown Mode '${rawMode}'. Must match an existing Freight Type.` });
      }

      // Shipment Type validation
      const shipmentTypeId = findShipmentTypeId(rawShipment, modeId);
      if (!shipmentTypeId) {
        errors.push({ row: rowIndex, field: 'Shipment Type', message: `Invalid or unknown Shipment Type '${rawShipment}'.` });
      }

      // Origin validation
      const originId = findPortId(rawOrigin);
      if (!originId) {
        errors.push({ row: rowIndex, field: 'Origin', message: `Invalid or unknown Origin Port '${rawOrigin}'. Must match port code or name.` });
      }

      // Destination validation
      const destinationId = findPortId(rawDest);
      if (!destinationId) {
        errors.push({ row: rowIndex, field: 'Destination', message: `Invalid or unknown Destination Port '${rawDest}'. Must match port code or name.` });
      }

      if (originId && destinationId && originId === destinationId) {
        errors.push({ row: rowIndex, field: 'Destination', message: `Origin and Destination ports cannot be identical.` });
      }

      // Container validation (Required for Sea Freight, optional/null for Air Freight)
      const containerId = findContainerId(rawContainer);
      const isAirFreight = modeId === 'mode-air' || modeId === 'air-freight';

      if (!isAirFreight) {
        if (!rawContainer || !rawContainer.trim()) {
          errors.push({ row: rowIndex, field: 'Container', message: `Container is required.` });
        } else if (!containerId) {
          errors.push({ row: rowIndex, field: 'Container', message: `Container '${rawContainer}' not found.` });
        }
      }

      // Carrier validation
      if (!rawCarrier.trim()) {
        errors.push({ row: rowIndex, field: 'Carrier', message: `Carrier line name is required.` });
      }

      // Price validation
      const priceNum = parseFloat(rawPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.push({ row: rowIndex, field: 'Price', message: `Price must be a valid positive numeric value.` });
      }

      // Transit Time validation
      const transitNum = parseInt(rawTransit, 10);
      if (isNaN(transitNum) || transitNum < 0) {
        errors.push({ row: rowIndex, field: 'Transit Time', message: `Transit time must be a non-negative integer.` });
      }

      const status = rawStatus === 'inactive' ? 'inactive' : 'active';

      const isContainerValid = isAirFreight || containerId;
      if (modeId && shipmentTypeId && originId && destinationId && isContainerValid && rawCarrier.trim() && !isNaN(priceNum) && priceNum > 0) {
        validRowsToProcess.push({
          rowIndex,
          rateId: rawRateId.trim() || `frate-${Math.floor(1000 + Math.random() * 9000)}`,
          modeId,
          shipmentTypeId,
          originId,
          destinationId,
          containerId: isAirFreight ? null : containerId,
          carrier: rawCarrier.trim(),
          price: priceNum,
          currency: row['Currency'] || row['currency'] || 'USD',
          transitTime: transitNum || 0,
          status,
        });
      }
    });

    // If there are validation errors, return them without corrupting DB
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Found ${errors.length} validation errors in the import file. No records were modified.`,
        summary: {
          total: rows.length,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: errors.length,
          errors,
        },
      }, { status: 422 });
    }

    // Start MySQL Transaction
    await connection.beginTransaction();

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of validRowsToProcess) {
      // Check if Rate ID or exact route combination exists
      const existingById = existingRates.find((r: any) => r.id.toLowerCase() === item.rateId.toLowerCase());
      const existingByRoute = existingRates.find((r: any) => 
        r.freight_mode_id === item.modeId &&
        r.origin_id === item.originId && 
        r.destination_id === item.destinationId && 
        r.carrier.toLowerCase() === item.carrier.toLowerCase() &&
        r.container_id === item.containerId &&
        r.shipment_type_id === item.shipmentTypeId
      );

      const targetExisting = existingById || existingByRoute;

      if (targetExisting) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateStrategy === 'update') {
          // Update existing
          await connection.query(
            `UPDATE freight_rates 
             SET freight_mode_id = ?, shipment_type_id = ?, origin_id = ?, destination_id = ?, container_id = ?, price = ?, currency = ?, transit_time = ?, carrier = ?, status = ?
             WHERE id = ?`,
            [
              item.modeId,
              item.shipmentTypeId,
              item.originId,
              item.destinationId,
              item.containerId || null,
              item.price,
              item.currency,
              item.transitTime,
              item.carrier,
              item.status,
              targetExisting.id,
            ]
          );

          const rateLogValue = { origin: item.originId, destination: item.destinationId, price: item.price, carrier: item.carrier };
          await logRateActivity(targetExisting.id, 'update', null, rateLogValue, operator);
          updatedCount++;
          continue;
        }
      }

      const insertPayload = [
        item.rateId,
        item.modeId,
        item.shipmentTypeId,
        item.originId,
        item.destinationId,
        item.containerId,
        item.price,
        item.currency,
        item.transitTime,
        item.carrier,
        item.status,
      ];
      console.log('[IMPORT INSERT PAYLOAD]', item.rateId, insertPayload);

      // Insert new rate record
      await connection.query(
        `INSERT INTO freight_rates (id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        insertPayload
      );

      const rateLogValue = { origin: item.originId, destination: item.destinationId, price: item.price, carrier: item.carrier };
      await logRateActivity(item.rateId, 'create', null, rateLogValue, operator);
      importedCount++;
    }

    await connection.commit();

    await logAuditEvent(null, operator, `Batch imported ${importedCount} freight rates (Updated: ${updatedCount}, Skipped: ${skippedCount})`);

    return NextResponse.json({
      success: true,
      message: `Import processed successfully.`,
      summary: {
        total: rows.length,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: 0,
        errors: [],
      },
    });
  } catch (err: any) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error('[IMPORT ERROR]', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error during bulk import.',
      details: err.stack || null,
    }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
