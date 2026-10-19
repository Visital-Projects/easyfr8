import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing: any = await query(
      'SELECT id, title, subtitle, description, button_text, button_url, status, sort_order, updated_at FROM hero_slides WHERE id = ?',
      [id]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Slide not found' }, { status: 404 });
    }

    const current = existing[0];
    const updates: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.subtitle !== undefined) {
      updates.push('subtitle = ?');
      values.push(body.subtitle);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.button_text !== undefined) {
      updates.push('button_text = ?');
      values.push(body.button_text);
    }
    if (body.button_url !== undefined) {
      updates.push('button_url = ?');
      values.push(body.button_url);
    }
    // Only update image column if provided and NOT a lightweight API URL
    if (body.image !== undefined && typeof body.image === 'string' && !body.image.startsWith('/api/')) {
      updates.push('image = ?');
      values.push(body.image);
    }
    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(body.sort_order);
    }

    const now = new Date();
    updates.push('updated_at = ?');
    values.push(now);

    values.push(id);

    await execute(
      `UPDATE hero_slides SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Return lightweight metadata ONLY — NEVER hydrate or echo the full Base64 string back!
    const updatedSlide = {
      id,
      title: body.title !== undefined ? body.title : current.title,
      subtitle: body.subtitle !== undefined ? body.subtitle : current.subtitle,
      description: body.description !== undefined ? body.description : current.description,
      button_text: body.button_text !== undefined ? body.button_text : current.button_text,
      button_url: body.button_url !== undefined ? body.button_url : current.button_url,
      image: `/api/admin/cms/hero-slides/${id}/image?v=${now.getTime()}`,
      status: body.status !== undefined ? body.status : current.status,
      sort_order: body.sort_order !== undefined ? body.sort_order : current.sort_order,
      updated_at: now.toISOString(),
    };

    return NextResponse.json(updatedSlide);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await execute('DELETE FROM hero_slides WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Slide deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
