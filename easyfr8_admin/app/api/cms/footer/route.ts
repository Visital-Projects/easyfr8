import { NextResponse } from 'next/server';
import { getCmsData, execute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FOOTER_ABOUT_DEFAULT =
  'EasyFr8 simplifies global trade supply chains through instant digital freight rate booking and automated compliance tracking.';

/**
 * GET /api/cms/footer
 * Returns footer-specific data: contact info + services list.
 * This is independent of the About Us page CMS section.
 */
export async function GET() {
  try {
    const cms = await getCmsData();

    // Construct footer-specific CMS data containing only the contact and services details
    const footerCms = {
      contact: cms?.contact || {},
      services: cms?.services || [],
    };

    // Ensure contact.footerAbout is initialised to its own default if missing
    if (footerCms.contact && !footerCms.contact.footerAbout) {
      footerCms.contact.footerAbout = FOOTER_ABOUT_DEFAULT;
    }

    return NextResponse.json({ success: true, ...footerCms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/cms/footer
 * Updates ONLY the contact/footer section. Never touches aboutUs data.
 * Body: { phones, emails, officeAddress, socialLinks, copyright, logoImage, footerAbout }
 */
export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const cms = await getCmsData();

    // Accept either { contact: {...} } wrapper or flat contact fields
    const incomingContact = body.contact ?? body;

    const updatedCms = {
      ...cms,
      contact: {
        ...cms.contact,
        ...incomingContact,
      },
    };

    const { services: _s, faqs: _f, ...cmsDataToStore } = updatedCms;

    await execute(
      'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [JSON.stringify(cmsDataToStore)]
    );

    return NextResponse.json({ success: true, contact: updatedCms.contact });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
