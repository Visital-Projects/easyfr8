import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDbDate(val: any): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parsePublishedAt(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    val = val.trim();
    if (!val || val === 'null' || val === 'undefined') return null;
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [d, m, y] = val.split('-');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) {
      return val;
    }
    if (!/\d{4}/.test(val)) {
      return null;
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || '').trim().replace(/\/+$/, '');
    const rows: any = await query(
      'SELECT id, title, slug, content, excerpt, category, author, status, published_at, created_at, updated_at FROM blogs WHERE id = ? OR slug = ? OR LOWER(slug) = LOWER(?) LIMIT 1',
      [cleanId, cleanId, cleanId]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }
    const r = rows[0];
    const blog = {
      id: r.id,
      title: r.title ?? '',
      slug: r.slug ?? '',
      body: r.content ?? '',
      category: r.category ?? '',
      tags: '',
      status: r.status === 'Published' ? 'Published' : 'Draft',
      // Image URL reference — admin UI loads raw base64 separately via /image?format=json when editing
      image: `/api/blogs/${r.id}/image?v=${new Date(r.updated_at || Date.now()).getTime()}`,
      date: formatDbDate(r.published_at || r.created_at),
      author: r.author ?? 'easyfr8',
      seoTitle: r.title ?? '',
      seoDesc: r.excerpt ?? '',
      metaKeywords: '',
      publishedAt: formatDbDate(r.published_at),
      readingTime: 5,
    };
    return NextResponse.json({ success: true, blog }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager', 'Content Moderator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const cleanId = decodeURIComponent(id || '').trim().replace(/\/+$/, '');
    const body = await req.json();

    const existing: any = await query('SELECT * FROM blogs WHERE id = ? OR slug = ? OR LOWER(slug) = LOWER(?) LIMIT 1', [cleanId, cleanId, cleanId]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }

    const current = existing[0];
    const targetId = current.id;
    const title = body.title !== undefined ? body.title : current.title;
    const slug = body.slug !== undefined ? body.slug : current.slug;
    const content = body.body !== undefined ? body.body : (body.content !== undefined ? body.content : current.content);
    const excerpt = body.seoDesc !== undefined ? body.seoDesc : (body.excerpt !== undefined ? body.excerpt : current.excerpt);
    // Guard: if the client sends back a URL reference (i.e. the image URL we gave it on GET),
    // do NOT overwrite the stored base64. Only update if a real base64 or new URL is provided.
    let imageToStore = current.image;
    if (body.image !== undefined) {
      const incomingImage = body.image as string;
      const isOurUrlRef = incomingImage.startsWith('/api/blogs/') || incomingImage.startsWith('http://localhost') || incomingImage.startsWith('https://');
      const isBase64 = incomingImage.startsWith('data:');
      if (isBase64) {
        // New image was uploaded
        imageToStore = incomingImage;
      } else if (!isOurUrlRef) {
        // Some other value — store as-is
        imageToStore = incomingImage;
      }
      // else: it's our own URL reference, skip overwriting the stored image
    }
    const category = body.category !== undefined ? body.category : current.category;
    const author = body.author !== undefined ? body.author : current.author;
    const status = body.status !== undefined ? (body.status === 'Published' ? 'Published' : 'Draft') : current.status;
    const rawPublishedAt = body.publishedAt !== undefined ? body.publishedAt : (body.date !== undefined ? body.date : current.published_at);
    const publishedAt = parsePublishedAt(rawPublishedAt);

    await execute(
      `UPDATE blogs SET 
        title = ?,
        slug = ?,
        content = ?,
        excerpt = ?,
        image = ?,
        category = ?,
        author = ?,
        status = ?,
        published_at = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [title, slug, content, excerpt, imageToStore, category, author, status, publishedAt, targetId]
    );


    const now = Date.now();
    const updatedBlog = {
      id: targetId,
      title,
      slug,
      body: content,
      category,
      author,
      status,
      seoDesc: excerpt,
      seoTitle: title,
      // Return URL reference so the response is not huge
      image: `/api/blogs/${targetId}/image?v=${now}`,
      date: formatDbDate(publishedAt || current.created_at),
      publishedAt: formatDbDate(publishedAt),
      tags: '',
      metaKeywords: '',
      readingTime: 5,
    };

    return NextResponse.json({ success: true, blog: updatedBlog }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const cleanId = decodeURIComponent(id || '').trim().replace(/\/+$/, '');
    const existing: any = await query('SELECT id FROM blogs WHERE id = ? OR slug = ? OR LOWER(slug) = LOWER(?) LIMIT 1', [cleanId, cleanId, cleanId]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });
    }
    await execute('DELETE FROM blogs WHERE id = ?', [existing[0].id]);
    
    return NextResponse.json({
      success: true,
      message: 'Blog deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
