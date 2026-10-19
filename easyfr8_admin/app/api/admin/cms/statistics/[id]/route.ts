import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();

    const existing: any = await query('SELECT * FROM statistics WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Statistic not found' }, { status: 404 });
    }

    const current = existing[0];
    const label = body.label !== undefined ? body.label : current.label;
    const value = body.value !== undefined ? body.value : current.value;
    const icon = body.icon !== undefined ? body.icon : current.icon;
    const status = body.status !== undefined ? body.status : current.status;
    const sortOrder = body.sort_order !== undefined ? body.sort_order : current.sort_order;

    await execute(`
      UPDATE statistics
      SET label = ?, value = ?, icon = ?, status = ?, sort_order = ?, updated_at = NOW()
      WHERE id = ?
    `, [label, value, icon, status, sortOrder, id]);

    return NextResponse.json({
      id,
      label,
      value,
      icon,
      status,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await execute('DELETE FROM statistics WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: 'Statistic deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
