import { NextResponse } from 'next/server';
import { getServices, createService } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cms/services
 * Returns services list. Supports ?homepage=true and ?active=true query parameters.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const homepageOnly = url.searchParams.get('homepage') === 'true';
    const activeOnly = url.searchParams.get('active') === 'true';

    let services = await getServices(activeOnly);

    if (homepageOnly) {
      services = services.filter((s) => s.show_on_homepage !== false && s.active !== false);
    }

    return NextResponse.json(services, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/cms/services
 * Inserts a single service row.
 * Requires Administrator or Manager role.
 */
export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();

    if (!body || !body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ success: false, error: 'Service title is required' }, { status: 400 });
    }

    const service = await createService(body);
    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
