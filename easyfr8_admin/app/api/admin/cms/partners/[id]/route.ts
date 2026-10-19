import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();

    const existing: any = await query('SELECT * FROM partners WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    const current = existing[0];
    const name = body.name !== undefined ? body.name : current.name;
    let logo = body.logo !== undefined ? body.logo : current.logo;
    const websiteUrl = body.websiteUrl !== undefined ? body.websiteUrl : (body.website_url !== undefined ? body.website_url : current.website_url);
    const status = body.status !== undefined ? body.status : current.status;
    const sortOrder = (body.sort_order !== undefined && body.sort_order !== null && !isNaN(Number(body.sort_order)))
      ? Number(body.sort_order)
      : current.sort_order;

    // If Base64 logo uploaded, persist into MySQL media table and store streaming reference
    if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
      const mediaId = `MED-PARTNER-${id}-${Date.now()}`;
      const now = new Date();
      await execute(
        'INSERT INTO media (id, file_name, file_url, file_type, file_size, uploaded_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [mediaId, `${String(name).replace(/[^a-zA-Z0-9_-]/g, '_')}_logo.png`, logo, 'image/png', `${Math.round(logo.length / 1024)} KB`]
      );
      logo = `/api/media/${mediaId}?v=${now.getTime()}`;
    }

    await execute(`
      UPDATE partners
      SET name = ?, logo = ?, website_url = ?, status = ?, sort_order = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, logo, websiteUrl, status, sortOrder, id]);

    return NextResponse.json({
      id,
      name,
      logo,
      websiteUrl,
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
    await execute('DELETE FROM partners WHERE id = ?', [id]);
    // Clean up any associated uploaded partner media
    try {
      await execute('DELETE FROM media WHERE id LIKE ?', [`MED-PARTNER-${id}-%`]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Partner deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
