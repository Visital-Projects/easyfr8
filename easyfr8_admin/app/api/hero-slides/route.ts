import { NextResponse } from 'next/server';
import { getHeroSlides } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allSlides = await getHeroSlides();
    const slides = allSlides
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);

    return NextResponse.json(slides, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
