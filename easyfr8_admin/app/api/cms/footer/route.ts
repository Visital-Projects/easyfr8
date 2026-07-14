import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

const FOOTER_ABOUT_DEFAULT =
  'EasyFr8 simplifies global trade supply chains through instant digital freight rate booking and automated compliance tracking.';

/**
 * GET /api/cms/footer
 * Returns footer-specific data: contact info + services list.
 * This is independent of the About Us page CMS section.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await readDb();

    // Construct footer-specific CMS data containing only the contact and services details
    const footerCms = {
      contact: db.cms?.contact || {},
      services: db.cms?.services || [],
    };

    // Ensure contact.footerAbout is initialised to its own default if missing
    if (footerCms.contact && !footerCms.contact.footerAbout) {
      footerCms.contact.footerAbout = FOOTER_ABOUT_DEFAULT;
    }

    return new NextResponse(JSON.stringify({ success: true, ...footerCms }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}

/**
 * POST /api/cms/footer
 * Updates ONLY the contact/footer section. Never touches aboutUs data.
 * Body: { phones, emails, officeAddress, socialLinks, copyright, logoImage, footerAbout }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await readDb();

    // Accept either { contact: {...} } wrapper or flat contact fields
    const incomingContact = body.contact ?? body;

    // Merge only into contact — aboutUs and other CMS sections are untouched
    db.cms = {
      ...db.cms,
      contact: {
        ...db.cms.contact,
        ...incomingContact,
      },
    };

    await writeDb(db);
    return NextResponse.json({ success: true, contact: db.cms.contact });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Allow PUT as alias for POST
export async function PUT(req: Request) {
  return POST(req);
}

