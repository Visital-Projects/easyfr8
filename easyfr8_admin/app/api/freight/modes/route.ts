import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

/**
 * @deprecated Legacy freight modes endpoint. Use /api/freight-types for canonical modes.
 * Preserved for backward compatibility. Table `freight_modes` is retained.
 */
export async function GET(req: Request) {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM freight_modes ORDER BY name ASC');
    return NextResponse.json(rows, {
      headers: {
        'X-API-Deprecated': 'Use /api/freight-types instead',
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
    const { id, name, status } = body;
    const pool = getPool();
    await pool.query(
      'INSERT INTO freight_modes (id, name, status) VALUES (?, ?, ?)',
      [id || `mode-${Math.floor(100 + Math.random() * 900)}`, name, status || 'active']
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
