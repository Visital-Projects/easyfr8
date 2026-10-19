import { NextResponse } from 'next/server';
import { execute, query, getPartners } from '@/lib/db';
import { Partner } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allPartners = await getPartners();
    const partners = allPartners.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.id).localeCompare(String(b.id)));
    return NextResponse.json(partners, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const [maxRows]: any = await query('SELECT MAX(sort_order) as max_sort FROM partners');
    const newId = `partner-${Date.now()}`;
    const sortOrder = (typeof body.sort_order === 'number' && !isNaN(body.sort_order))
      ? body.sort_order
      : ((maxRows[0]?.max_sort || 0) + 1);
    const name = body.name || '';
    let logo = body.logo || '';
    const websiteUrl = body.websiteUrl || body.website_url || '';
    const status = body.status || 'active';

    // If Base64 logo uploaded, persist into MySQL media table and store streaming reference
    if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
      const mediaId = `MED-PARTNER-${newId}-${Date.now()}`;
      const now = new Date();
      await execute(
        'INSERT INTO media (id, file_name, file_url, file_type, file_size, uploaded_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [mediaId, `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_logo.png`, logo, 'image/png', `${Math.round(logo.length / 1024)} KB`]
      );
      logo = `/api/media/${mediaId}?v=${now.getTime()}`;
    }

    await execute(`
      INSERT INTO partners (id, name, logo, website_url, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [newId, name, logo, websiteUrl, status, sortOrder]);

    const newPartner: Partner = {
      id: newId,
      name,
      logo,
      websiteUrl,
      status: status as 'active' | 'inactive',
      sort_order: sortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(newPartner, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
