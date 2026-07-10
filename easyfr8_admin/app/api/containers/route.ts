import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM containers ORDER BY name ASC');
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description, size, status } = body;
    const pool = getPool();
    await pool.query(
      'INSERT INTO containers (id, name, description, size, status) VALUES (?, ?, ?, ?, ?)',
      [id || `container-${Math.floor(100 + Math.random() * 900)}`, name, description || '', size || '', status || 'active']
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
