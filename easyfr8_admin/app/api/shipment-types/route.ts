import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const freightTypeId = searchParams.get('freight_type_id');
    const pool = getPool();
    let query = 'SELECT st.*, ft.name AS freight_type_name FROM shipment_types st JOIN freight_types ft ON st.freight_type_id = ft.id';
    const params = [];
    if (freightTypeId) {
      query += ' WHERE st.freight_type_id = ?';
      params.push(freightTypeId);
    }
    query += ' ORDER BY st.name ASC';
    const [rows]: any = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, freight_type_id, name, description, status } = body;
    const pool = getPool();
    await pool.query(
      'INSERT INTO shipment_types (id, freight_type_id, name, description, status) VALUES (?, ?, ?, ?, ?)',
      [id || `shipment-${Math.floor(100 + Math.random() * 900)}`, freight_type_id, name, description || '', status || 'active']
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
