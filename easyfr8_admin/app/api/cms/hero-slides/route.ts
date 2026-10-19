import { NextResponse } from 'next/server';
import { getHeroSlides } from '@/lib/db';

export async function GET() {
  try {
    const allSlides = await getHeroSlides();
    // Return only active slides sorted by sort_order with public streaming image endpoint
    const slides = allSlides
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        ...s,
        image: `/api/cms/hero-slides/${s.id}/image?v=${new Date(s.updated_at || Date.now()).getTime()}`,
      }));
      
    return new NextResponse(JSON.stringify(slides), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  }
}
