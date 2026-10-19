import { NextResponse } from 'next/server';
import { getCmsData, execute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cms
 * Aggregates all CMS dynamic sections directly from normalized MySQL tables:
 * - services from `services` table (ORDER BY sort_order ASC, id ASC)
 * - faqs from `faqs` table (ORDER BY sort_order ASC, id ASC)
 * - hero, about, contact, static pages, seo from `cms_data`
 */
export async function GET() {
  try {
    const cms = await getCmsData();
    return NextResponse.json(cms, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST / PUT /api/cms
 * Saves CMS updates directly to MySQL:
 * - If services array is updated, writes each row to `services` table
 * - If faqs array is updated, writes each row to `faqs` table
 * - Updates non-collection pages in `cms_data`
 */
export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    // 1. Direct row-level persistence for faqs if updated
    if (Array.isArray(body.faqs)) {
      const activeFaqIds: string[] = [];
      for (let i = 0; i < body.faqs.length; i++) {
        const f = body.faqs[i];
        const id = String(f.id);
        activeFaqIds.push(id);
        const category = f.category || 'General';
        const question = f.question || '';
        const answer = f.answer || '';
        const sortOrder = typeof f.sort_order === 'number' ? f.sort_order : i + 1;
        const isActive = f.published !== false ? 1 : 0;

        await execute(`
          INSERT INTO faqs (
            id, category, question, answer, sort_order, is_active, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            category = VALUES(category),
            question = VALUES(question),
            answer = VALUES(answer),
            sort_order = VALUES(sort_order),
            is_active = VALUES(is_active),
            updated_at = NOW()
        `, [id, category, question, answer, sortOrder, isActive]);
      }

      // If faqs list changed and some were removed, delete them from the faqs table
      if (activeFaqIds.length > 0) {
        const placeholders = activeFaqIds.map(() => '?').join(', ');
        await execute(`DELETE FROM faqs WHERE id NOT IN (${placeholders})`, activeFaqIds);
      }
    }

    // 2. Direct row-level persistence for services only if explicitly provided in services-specific update
    // (Regular CMS sections do not touch services table to prevent timeout with large base64 image strings)
    if (Array.isArray(body.services) && body.services.length > 0 && !body.homepage && !body.aboutUs && !body.contact) {
      for (let i = 0; i < body.services.length; i++) {
        const s = body.services[i];
        const id = String(s.id);
        const title = s.title || '';
        const slug = s.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const category = (s.category && String(s.category).toLowerCase().includes('value')) ? 'value-added' : 'core';
        const icon = s.icon || 'anchor';
        const desc = s.desc || '';
        const details = s.details || '';
        const image = s.image || '';
        const bannerImage = s.bannerImage || '';
        const sortOrder = typeof s.sortOrder === 'number' ? s.sortOrder : i + 1;
        const showOnHomepage = s.show_on_homepage !== false ? 1 : 0;
        const active = s.active !== false ? 1 : 0;

        await execute(`
          INSERT INTO services (
            id, title, slug, category, icon, description, details, image, banner_image, sort_order, show_on_homepage, active, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            slug = VALUES(slug),
            category = VALUES(category),
            icon = VALUES(icon),
            description = VALUES(description),
            details = VALUES(details),
            image = VALUES(image),
            banner_image = VALUES(banner_image),
            sort_order = VALUES(sort_order),
            show_on_homepage = VALUES(show_on_homepage),
            active = VALUES(active),
            updated_at = NOW()
        `, [id, title, slug, category, icon, desc, details, image, bannerImage, sortOrder, showOnHomepage, active]);
      }
    }

    // 3. Persist remaining CMS sections (homepage, aboutUs, contact, staticPages, media, seo) to cms_data.
    const { query } = await import('@/lib/db');
    const rows = await query<{ data: string }>('SELECT data FROM cms_data WHERE id = 1');
    let currentCmsData: any = {};
    if (rows.length > 0 && rows[0].data) {
      try {
        currentCmsData = JSON.parse(rows[0].data);
      } catch {
        currentCmsData = {};
      }
    }

    const { services: _s, faqs: _f, ...cmsBody } = body;
    const updatedCmsData = { ...currentCmsData, ...cmsBody };

    await execute(
      'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [JSON.stringify(updatedCmsData)]
    );

    const freshCms = await getCmsData();
    return NextResponse.json({ success: true, cms: freshCms });
  } catch (error: any) {
    console.error('[CMS POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
