import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query('SELECT image, updated_at FROM hero_slides WHERE id = ?', [id]);
    
    if (rows.length === 0 || !rows[0].image) {
      return NextResponse.json({ success: false, error: 'Hero slide image not found' }, { status: 404 });
    }

    const image: string = rows[0].image;
    const url = new URL(req.url);

    // Explicit raw JSON request
    if (url.searchParams.get('format') === 'json') {
      return NextResponse.json({ id, image });
    }

    // Stream Base64 as binary buffer
    if (image.startsWith('data:')) {
      const commaIdx = image.indexOf(',');
      if (commaIdx !== -1) {
        const header = image.substring(0, commaIdx);
        const base64Data = image.substring(commaIdx + 1);
        const mimeMatch = header.match(/^data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const buffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(buffer.length),
            'Content-Disposition': 'inline',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      }
    }

    // Redirect external URL
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return NextResponse.redirect(image);
    }

    return NextResponse.json({ success: false, error: 'Invalid image format' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
