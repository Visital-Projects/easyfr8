import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

/**
 * @deprecated Legacy locations endpoint. Use /api/ports for canonical port management.
 * Preserved for backward compatibility. Table `locations` is retained.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    
    const pool = getPool();
    let query = 'SELECT * FROM locations WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR port_code LIKE ? OR country LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY name ASC';
    const [rows]: any = await pool.query(query, params);
    return NextResponse.json(rows, {
      headers: {
        'X-API-Deprecated': 'Use /api/ports instead',
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

    const body = await req.json();
    const { id, port_code, name, country, type } = body;
    const pool = getPool();
    await pool.query(
      'INSERT INTO locations (id, port_code, name, country, type) VALUES (?, ?, ?, ?, ?)',
      [id || `loc-${Math.floor(100 + Math.random() * 900)}`, port_code, name, country, type || 'Ocean']
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
