import { NextResponse } from 'next/server';
import { execute, query, getBlogs } from '@/lib/db';
import { Blog } from '@/lib/store';
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

export async function GET() {
  try {
    const rows: any[] = await query(
      'SELECT id, title, slug, content, excerpt, category, author, status, published_at, created_at, updated_at FROM blogs ORDER BY created_at DESC'
    );
    const blogs = rows.map((r: any) => ({
      id: r.id,
      title: r.title ?? '',
      slug: r.slug ?? '',
      body: r.content ?? '',
      category: r.category ?? '',
      tags: '',
      status: r.status === 'Published' ? 'Published' : 'Draft',
      image: `/api/blogs/${r.id}/image?v=${new Date(r.updated_at || Date.now()).getTime()}`,
      date: formatDbDate(r.published_at || r.created_at),
      author: r.author ?? 'easyfr8',
      seoTitle: r.title ?? '',
      seoDesc: r.excerpt ?? '',
      metaKeywords: '',
      publishedAt: formatDbDate(r.published_at),
      readingTime: 5,
    }));
    return NextResponse.json(blogs, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager', 'Content Moderator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const blog: Blog = await req.json();
    const id = blog.id || `BLG-${Math.floor(100 + Math.random() * 900)}`;
    const title = blog.title || '';
    const slug = blog.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const content = blog.body !== undefined ? blog.body : (blog as any).content || '';
    const excerpt = blog.seoDesc || '';
    const image = blog.image || '';
    const category = blog.category || 'General';
    const author = blog.author || 'easyfr8';
    const status = blog.status === 'Published' ? 'Published' : 'Draft';
    const rawPublishedAt = blog.publishedAt || (status === 'Published' ? new Date().toISOString() : null);
    const publishedAt = parsePublishedAt(rawPublishedAt);

    await execute(`
      INSERT INTO blogs (id, title, slug, content, excerpt, image, category, author, status, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [id, title, slug, content, excerpt, image, category, author, status, publishedAt]);

    blog.id = id;
    blog.slug = slug;
    blog.body = content;
    blog.publishedAt = formatDbDate(publishedAt);
    blog.date = formatDbDate(publishedAt || new Date());
    return NextResponse.json({ success: true, blog }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
