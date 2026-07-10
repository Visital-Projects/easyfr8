import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { port_code, name, country, type } = body;
    const pool = getPool();
    await pool.query(
      'UPDATE locations SET port_code = ?, name = ?, country = ?, type = ? WHERE id = ?',
      [port_code, name, country, type, id]
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
    await pool.query('DELETE FROM locations WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
