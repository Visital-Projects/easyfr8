import { NextResponse } from 'next/server';
import { getPartners } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allPartners = await getPartners();
    // Return only active partners with a usable logo, sorted deterministically
    const partners = allPartners
      .filter((p) => p.status === 'active' && Boolean(p.logo && p.logo.trim() !== '') && !p.name.toLowerCase().includes('test partner'))
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.id).localeCompare(String(b.id)));

    return NextResponse.json(partners, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
