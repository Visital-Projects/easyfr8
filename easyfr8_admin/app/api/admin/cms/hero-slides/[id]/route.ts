import { NextResponse } from 'next/server';
import { readDb, writeDb, getPool } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await readDb();
    
    if (!db.heroSlides) {
      return NextResponse.json({ success: false, error: 'No slides found' }, { status: 404 });
    }
    
    const index = db.heroSlides.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Slide not found' }, { status: 404 });
    }
    
    // Update fields
    const updatedSlide = {
      ...db.heroSlides[index],
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    db.heroSlides[index] = updatedSlide;
    await writeDb(db);
    
    return NextResponse.json(updatedSlide);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readDb();
    
    if (!db.heroSlides) {
      return NextResponse.json({ success: false, error: 'No slides found' }, { status: 404 });
    }
    
    const index = db.heroSlides.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Slide not found' }, { status: 404 });
    }
    
    db.heroSlides.splice(index, 1);
    
    const pool = getPool();
    const [result]: any = await pool.query('DELETE FROM hero_slides WHERE id = ?', [id]);
    
    await writeDb(db);
    
    return NextResponse.json({
      success: true,
      message: 'Slide deleted successfully.',
      affectedRows: result.affectedRows || 1,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
