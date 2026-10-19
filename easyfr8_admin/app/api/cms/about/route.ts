import { NextResponse } from 'next/server';
import { getCmsData, execute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cms/about
 * Returns only the aboutUs section of the CMS data.
 * This endpoint is independent of the footer/contact CMS section.
 */
export async function GET() {
  try {
    const cms = await getCmsData();
    return NextResponse.json({ success: true, aboutUs: cms?.aboutUs || {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/cms/about
 * Updates ONLY the aboutUs section. Never touches contact/footer data.
 * Body: { overview, mission, vision, overviewImage, coreValues, team }
 */
export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const cms = await getCmsData();

    // Merge only into aboutUs — contact/footer data is untouched
    const updatedCms = {
      ...cms,
      aboutUs: {
        ...cms.aboutUs,
        ...(body.aboutUs ?? body), // accept either { aboutUs: {...} } or flat fields
      },
    };

    const { services: _s, faqs: _f, ...cmsDataToStore } = updatedCms;

    await execute(
      'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [JSON.stringify(cmsDataToStore)]
    );

    return NextResponse.json({ success: true, aboutUs: updatedCms.aboutUs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Allow PUT as alias for POST
export async function PUT(req: Request) {
  return POST(req);
}
