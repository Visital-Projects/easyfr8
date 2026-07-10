import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

/**
 * GET /api/cms/about
 * Returns only the aboutUs section of the CMS data.
 * This endpoint is independent of the footer/contact CMS section.
 */
export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json({ success: true, aboutUs: db.cms?.aboutUs || {} });
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
    const body = await req.json();
    const db = await readDb();

    // Merge only into aboutUs — contact/footer data is untouched
    db.cms = {
      ...db.cms,
      aboutUs: {
        ...db.cms.aboutUs,
        ...(body.aboutUs ?? body), // accept either { aboutUs: {...} } or flat fields
      },
    };

    await writeDb(db);
    return NextResponse.json({ success: true, aboutUs: db.cms.aboutUs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Allow PUT as alias for POST
export async function PUT(req: Request) {
  return POST(req);
}
