import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('freight_type') || '';
    
    const pool = getPool();
    let query = 'SELECT * FROM ports WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (port_name LIKE ? OR port_code LIKE ? OR country LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (type) {
      query += ' AND freight_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY port_name ASC';
    const [rows]: any = await pool.query(query, params);
    
    // Backward compatibility support for autocomplete response envelopes
    return NextResponse.json({ success: true, ports: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, port_code, port_name, country, freight_type, status } = body;
    const pool = getPool();
    await pool.query(
      'INSERT INTO ports (id, port_code, port_name, country, freight_type, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id || `port-${Math.floor(100 + Math.random() * 900)}`, port_code, port_name, country, freight_type || 'Ocean', status || 'active']
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
