import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { port_code, port_name, country, freight_type, status } = body;
    const pool = getPool();
    await pool.query(
      'UPDATE ports SET port_code = ?, port_name = ?, country = ?, freight_type = ?, status = ? WHERE id = ?',
      [port_code, port_name, country, freight_type, status, id]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pool = getPool();
    await pool.query('DELETE FROM ports WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
