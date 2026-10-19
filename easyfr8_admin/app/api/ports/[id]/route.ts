import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();
    const { port_code, port_name, country, freight_type, status } = body;
    const pool = getPool();
    await pool.query(
      'UPDATE ports SET port_code = ?, port_name = ?, country = ?, freight_type = ?, status = ? WHERE id = ?',
      [
        String(port_code || '').trim(),
        String(port_name || '').trim(),
        country ? String(country).trim() : '',
        freight_type ? String(freight_type).trim() : 'Ocean',
        status ? String(status).trim() : 'active',
        id
      ]
    );

    // Read back the confirmed updated record directly from MySQL
    const [rows]: any = await pool.query('SELECT * FROM ports WHERE id = ?', [id]);
    const updatedPort = rows && rows[0] ? rows[0] : null;

    return NextResponse.json({ success: true, port: updatedPort });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const pool = getPool();
    await pool.query('DELETE FROM ports WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

