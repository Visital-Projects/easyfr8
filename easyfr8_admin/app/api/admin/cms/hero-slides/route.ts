import { NextResponse } from 'next/server';
import { execute, query, getHeroSlides } from '@/lib/db';
import { HeroSlide } from '@/lib/store';

export async function GET() {
  try {
    const allSlides = await getHeroSlides();
    const slides = allSlides.sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(slides);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newId = `slide-${Date.now()}`;
    const now = new Date();
    const [countRows]: any = await query('SELECT COUNT(*) as count FROM hero_slides');
    const sortOrder = typeof body.sort_order === 'number' ? body.sort_order : ((countRows[0]?.count || 0) + 1);

    await execute(
      `INSERT INTO hero_slides (id, title, subtitle, description, button_text, button_url, image, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        newId,
        body.title || '',
        body.subtitle || '',
        body.description || '',
        body.button_text || '',
        body.button_url || '',
        body.image || '',
        body.status || 'active',
        sortOrder,
      ]
    );

    const newSlide: HeroSlide = {
      id: newId,
      title: body.title || '',
      subtitle: body.subtitle || '',
      description: body.description || '',
      button_text: body.button_text || '',
      button_url: body.button_url || '',
      image: `/api/admin/cms/hero-slides/${newId}/image?v=${now.getTime()}`,
      status: body.status || 'active',
      sort_order: sortOrder,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    return NextResponse.json(newSlide);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
