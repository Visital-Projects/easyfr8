import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const pool = getPool();
    let sql = 'SELECT * FROM containers';
    const params: any[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY name ASC';
    const [rows]: any = await pool.query(sql, params);
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
    const { id, name, description, size, status } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Container name is required.' }, { status: 400 });
    }

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
