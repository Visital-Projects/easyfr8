import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM freight_types ORDER BY sort_order ASC, name ASC');
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
    const { id, name, status, sort_order } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Freight type name is required.' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      'INSERT INTO freight_types (id, name, status, sort_order) VALUES (?, ?, ?, ?)',
      [id || `ftype-${Math.floor(100 + Math.random() * 900)}`, name, status || 'active', sort_order || 0]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
