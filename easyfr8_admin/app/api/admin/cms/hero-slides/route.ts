import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { HeroSlide } from '@/lib/store';

export async function GET() {
  try {
    const db = await readDb();
    // Return all slides for admin management sorted by sort_order
    const slides = (db.heroSlides || []).sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(slides);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await readDb();
    
    const newId = `slide-${Date.now()}`;
    const newSlide: HeroSlide = {
      id: newId,
      title: body.title || '',
      subtitle: body.subtitle || '',
      description: body.description || '',
      button_text: body.button_text || '',
      button_url: body.button_url || '',
      image: body.image || '',
      status: body.status || 'active',
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : (db.heroSlides?.length || 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    if (!db.heroSlides) {
      db.heroSlides = [];
    }
    db.heroSlides.push(newSlide);
    await writeDb(db);
    
    return NextResponse.json(newSlide);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
