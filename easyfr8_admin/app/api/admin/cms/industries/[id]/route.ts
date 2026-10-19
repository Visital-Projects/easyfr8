import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();

    const existing: any = await query('SELECT * FROM industries WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Industry not found' }, { status: 404 });
    }

    const current = existing[0];
    const title = body.title !== undefined ? body.title : current.title;
    const slug = body.slug !== undefined ? body.slug : (current.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const desc = body.desc !== undefined ? body.desc : (body.description !== undefined ? body.description : current.description);
    const icon = body.icon !== undefined ? body.icon : current.icon;
    const status = body.status !== undefined ? body.status : current.status;
    const sortOrder = body.sort_order !== undefined ? body.sort_order : current.sort_order;

    await execute(`
      UPDATE industries
      SET title = ?, slug = ?, description = ?, icon = ?, status = ?, sort_order = ?, updated_at = NOW()
      WHERE id = ?
    `, [title, slug, desc, icon, status, sortOrder, id]);

    return NextResponse.json({
      id,
      title,
      desc,
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
    await execute('DELETE FROM industries WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: 'Industry deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
