import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM terms ORDER BY name ASC');
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
    const { id, name, status } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Term name is required.' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      'INSERT INTO terms (id, name, status) VALUES (?, ?, ?)',
      [id || `term-${Math.floor(100 + Math.random() * 900)}`, name, status || 'active']
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
