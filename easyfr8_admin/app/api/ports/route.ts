import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const country = searchParams.get('country') || '';
    const type = searchParams.get('freight_type') || '';
    const status = searchParams.get('status') || '';
    
    const isAll = searchParams.get('all') === 'true' || searchParams.get('limit') === 'all';

    const pool = getPool();
    let whereClause = ' WHERE 1=1';
    const params: any[] = [];
    
    if (search) {
      whereClause += ' AND (port_name LIKE ? OR port_code LIKE ? OR country LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (country) {
      whereClause += ' AND (country LIKE ?)';
      params.push(`%${country}%`);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (type) {
      const cleanType = type.trim();
      const lower = cleanType.toLowerCase();

      if (lower === 'ocean freight' || lower === 'ocean' || lower === 'ocean-freight' || lower === 'mode-ocean') {
        whereClause += ' AND (freight_type = "Ocean" OR freight_type = "Ocean Freight" OR freight_type = "ocean-freight" OR freight_type = "mode-ocean" OR LOWER(freight_type) = "ocean")';
      } else if (lower === 'air freight' || lower === 'air' || lower === 'mode-air') {
        whereClause += ' AND (freight_type = "Air" OR freight_type = "Air Freight" OR freight_type = "mode-air" OR LOWER(freight_type) = "air" OR id IN (SELECT origin_id FROM freight_rates WHERE freight_mode_id = "mode-air") OR id IN (SELECT destination_id FROM freight_rates WHERE freight_mode_id = "mode-air") OR port_code IN (SELECT origin_id FROM freight_rates WHERE freight_mode_id = "mode-air") OR port_code IN (SELECT destination_id FROM freight_rates WHERE freight_mode_id = "mode-air"))';
      } else {
        const [ftRows]: any = await pool.query(
          'SELECT id, name FROM freight_types WHERE id = ? OR LOWER(name) = LOWER(?)',
          [cleanType, cleanType]
        );
        if (ftRows && ftRows.length > 0) {
          const ftId = ftRows[0].id;
          const ftName = ftRows[0].name;
          whereClause += ' AND (freight_type = ? OR freight_type = ? OR LOWER(freight_type) = LOWER(?) OR LOWER(freight_type) = LOWER(?) OR id IN (SELECT origin_id FROM freight_rates WHERE freight_mode_id = ?) OR id IN (SELECT destination_id FROM freight_rates WHERE freight_mode_id = ?))';
          params.push(ftId, ftName, ftId, ftName, ftId, ftId);
        } else {
          whereClause += ' AND (freight_type = ? OR LOWER(freight_type) = LOWER(?))';
          params.push(cleanType, cleanType);
        }
      }
    }
    
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    if (isAll) {
      const dataQuery = `SELECT * FROM ports${whereClause} ORDER BY port_name ASC, id ASC`;
      const [rows]: any = await pool.query(dataQuery, params);
      return NextResponse.json({
        success: true,
        ports: rows,
        pagination: {
          page: 1,
          limit: rows.length,
          total: rows.length,
          totalPages: 1
        }
      }, { headers: noCacheHeaders });
    }

    // Pagination params: default limit 50, enforce max 100
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Math.min(Math.max(Number.isInteger(limitParam) && limitParam > 0 ? limitParam : 50, 1), 100);
    const offset = (page - 1) * limit;

    // Count total matching records
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM ports${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;
    
    // Deterministic ordering
    const dataQuery = `SELECT * FROM ports${whereClause} ORDER BY port_name ASC, id ASC LIMIT ? OFFSET ?`;
    const [rows]: any = await pool.query(dataQuery, [...params, limit, offset]);
    
    return NextResponse.json({
      success: true,
      ports: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }, { headers: noCacheHeaders });
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
    const { id, port_code, port_name, country, freight_type, status } = body;
    if (!port_code || !port_name) {
      return NextResponse.json({ success: false, error: 'Port code and port name are required.' }, { status: 400 });
    }

    const pool = getPool();
    const cleanCode = String(port_code).trim();
    const cleanName = String(port_name).trim();
    const cleanCountry = country ? String(country).trim() : '';
    const cleanFreightType = freight_type ? String(freight_type).trim() : 'Ocean';
    const cleanStatus = status ? String(status).trim() : 'active';
    const cleanId = id && String(id).trim()
      ? String(id).trim()
      : `port-${cleanCode.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    await pool.query(
      'INSERT INTO ports (id, port_code, port_name, country, freight_type, status) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanId, cleanCode, cleanName, cleanCountry, cleanFreightType, cleanStatus]
    );

    // Read back the confirmed persisted record directly from MySQL
    const [rows]: any = await pool.query('SELECT * FROM ports WHERE id = ?', [cleanId]);
    const persistedPort = rows && rows[0] ? rows[0] : null;

    return NextResponse.json({ success: true, port: persistedPort }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

