import { NextResponse } from 'next/server';
import { execute, query, getIndustries } from '@/lib/db';
import { Industry } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allIndustries = await getIndustries();
    const sorted = allIndustries.sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(sorted, {
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
    const [countRows]: any = await query('SELECT COUNT(*) as count FROM industries');
    const newId = `ind-${Date.now()}`;
    const sortOrder = typeof body.sort_order === 'number' ? body.sort_order : ((countRows[0]?.count || 0) + 1);
    const title = body.title || '';
    const slug = body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const desc = body.desc || body.description || '';
    const icon = body.icon || 'flaticon-transport-1';
    const status = body.status || 'active';

    await execute(`
      INSERT INTO industries (id, title, slug, description, icon, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [newId, title, slug, desc, icon, status, sortOrder]);

    const newIndustry: Industry = {
      id: newId,
      title,
      desc,
      icon,
      status: status as 'active' | 'inactive',
      sort_order: sortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(newIndustry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
