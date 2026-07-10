import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { freight_type_id, name, description, status } = body;
    const pool = getPool();
    await pool.query(
      'UPDATE shipment_types SET freight_type_id = ?, name = ?, description = ?, status = ? WHERE id = ?',
      [freight_type_id, name, description, status, id]
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
    await pool.query('DELETE FROM shipment_types WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
