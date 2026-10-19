'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Blog {
  id: string;
  title: string;
  slug: string;
  body: string;
  category?: string;
  tags?: string;
  status: string;
  image?: string;
  date?: string;
  author?: string;
  seoTitle?: string;
  seoDesc?: string;
  publishedAt?: string;
  readingTime?: number;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicBlogDetailPage(props: PageProps) {
  // Unwrap Next.js 16 dynamic route params
  const unwrappedParams = props?.params ? use(props.params) : null;
  const clientParams = useParams();
  const router = useRouter();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);

  // Extract raw slug from either unwrapped promise or client navigation hook
  const rawParamSlug = unwrappedParams?.slug || (clientParams?.slug as string) || '';

  // Decode to canonical string to handle spaces and punctuation
  let decodedSlug = '';
  try {
    decodedSlug = decodeURIComponent(rawParamSlug).trim().replace(/\/+$/, '');
  } catch {
    decodedSlug = String(rawParamSlug).trim().replace(/\/+$/, '');
  }

  useEffect(() => {
    if (!decodedSlug) {
      setError('Article slug is missing.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchBlog() {
      try {
        setLoading(true);
        setError(null);
        setImgError(false);

        // Fetch dynamic blog data from GET /api/blogs/[slug] using encodeURIComponent
        const encodedSlug = encodeURIComponent(decodedSlug);
        const res = await fetch(`/api/blogs/${encodedSlug}?t=${Date.now()}`, {
          cache: 'no-store',
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success && data.blog) {
          setBlog(data.blog);
        } else {
          setError(data.error || 'Blog not found');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load blog article');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchBlog();

    return () => {
      isMounted = false;
    };
  }, [decodedSlug]);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Render formatted body text / newlines / headings / lists cleanly
  const renderFormattedBody = (content?: string) => {
    if (!content) return null;

    // If string already contains HTML tags (e.g. from rich text editor)
    const hasHtml = /<[a-z][\s\S]*>/i.test(content);
    if (hasHtml) {
      return (
        <div
          className="blog-prose"
          style={{ lineHeight: '1.85', fontSize: '1.08rem', color: 'var(--text-secondary)' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    // Split paragraphs by double newline or single newline
    const blocks = content.split(/\n\s*\n/);

    return (
      <div className="blog-prose" style={{ lineHeight: '1.85', fontSize: '1.08rem', color: 'var(--text-secondary)' }}>
        {blocks.map((block, idx) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // H1/H2 Heading (# Heading)
          if (trimmed.startsWith('# ')) {
            return (
              <h2
                key={idx}
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: '2rem',
                  marginBottom: '1rem',
                  lineHeight: 1.3,
                }}
              >
                {trimmed.replace(/^#\s+/, '')}
              </h2>
            );
          }

          // H2/H3 Subheading (## Heading)
          if (trimmed.startsWith('## ')) {
            return (
              <h3
                key={idx}
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: '1.75rem',
                  marginBottom: '0.75rem',
                  lineHeight: 1.35,
                }}
              >
                {trimmed.replace(/^##\s+/, '')}
              </h3>
            );
          }

          // H4 Subheading (### Heading)
          if (trimmed.startsWith('### ')) {
            return (
              <h4
                key={idx}
                style={{
                  fontSize: '1.18rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginTop: '1.5rem',
                  marginBottom: '0.5rem',
                  lineHeight: 1.4,
                }}
              >
                {trimmed.replace(/^###\s+/, '')}
              </h4>
            );
          }

          // Bullet list items
          if (trimmed.includes('\n- ') || trimmed.startsWith('- ') || trimmed.includes('\n* ') || trimmed.startsWith('* ')) {
            const lines = trimmed.split('\n');
            return (
              <ul key={idx} style={{ paddingLeft: '1.5rem', margin: '1rem 0' }}>
                {lines.map((line, lIdx) => {
                  const itemText = line.replace(/^[-*]\s+/, '').trim();
                  if (!itemText) return null;
                  return (
                    <li key={lIdx} style={{ marginBottom: '0.5rem' }}>
                      {itemText}
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Normal paragraph with line-break preservation
          return (
            <p key={idx} style={{ marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Public Header / Navbar */}
      <header
        style={{
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo / Brand */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #0c1239 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '18px',
              }}
            >
              E
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>EasyFr8</span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1 }}>Global Logistics</span>
            </div>
          </Link>

          {/* Navigation link */}
          <Link
            href="/blogs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-soft)',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Articles
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px 20px 80px' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          {/* Breadcrumb Area */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Home
            </Link>
            <span>/</span>
            <Link href="/blogs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Blogs
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {blog?.title || decodedSlug}
            </span>
          </nav>

          {/* Loading State */}
          {loading && (
            <div
              style={{
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '60px 30px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  margin: '0 auto 16px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '3px solid var(--border-color)',
                  borderTopColor: 'var(--color-primary)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Loading Article...
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Retrieving insights from EasyFr8 network.
              </p>
            </div>
          )}

          {/* Error / 404 State */}
          {!loading && (error || !blog) && (
            <div
              style={{
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '60px 30px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-soft)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                {error === 'Blog not found' ? 'Article Not Found' : 'Unable to Load Article'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                {error || 'We could not find the requested blog post. It may have been archived or the URL might be incorrect.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/blogs"
                  style={{
                    display: 'inline-block',
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Browse All Blogs
                </Link>
                <Link
                  href="/"
                  style={{
                    display: 'inline-block',
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}

          {/* Blog Content State */}
          {!loading && blog && (
            <article
              style={{
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(24px, 5vw, 48px)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* Category, Date & Reading Time Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {blog.category && (
                  <span
                    style={{
                      background: 'var(--color-primary-soft)',
                      color: 'var(--color-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {blog.category}
                  </span>
                )}
                {(blog.date || blog.publishedAt) && (
                  <time style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {formatDate(blog.date || blog.publishedAt)}
                  </time>
                )}
                {blog.readingTime && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    • {blog.readingTime} min read
                  </span>
                )}
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  color: 'var(--text-primary)',
                  marginBottom: '20px',
                  letterSpacing: '-0.5px',
                }}
              >
                {blog.title}
              </h1>

              {/* Author Byline */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingBottom: '24px',
                  marginBottom: '28px',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}
                >
                  {(blog.author || 'E').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {blog.author || 'EasyFr8 Editorial Team'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Supply Chain & Logistics Insights
                  </div>
                </div>
              </div>

              {/* Featured Image with Fallback Container */}
              <div style={{ marginBottom: '36px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {blog.image && !imgError ? (
                  <img
                    src={blog.image}
                    alt={blog.title}
                    onError={() => setImgError(true)}
                    style={{
                      width: '100%',
                      maxHeight: '480px',
                      objectFit: 'cover',
                      display: 'block',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-hover)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      minHeight: '260px',
                      background: 'linear-gradient(135deg, #0c1239 0%, #1e293b 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      padding: '30px 20px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                    }}
                  >
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--color-primary)', marginBottom: '12px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                      {blog.category || 'Global Freight Update'}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>
                      EasyFr8 Logistics Intelligence
                    </span>
                  </div>
                )}
              </div>

              {/* Formatted Body Content */}
              <div style={{ marginBottom: '40px' }}>
                {renderFormattedBody(blog.body)}
              </div>

              {/* Article Footer & Return Button */}
              <div
                style={{
                  paddingTop: '24px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <Link
                  href="/blogs"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-soft)',
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to All Articles
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: blog.title,
                        url: window.location.href,
                      }).catch(() => {});
                    } else if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Article link copied to clipboard!');
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Article
                </button>
              </div>
            </article>
          )}
        </div>
      </main>

      {/* Public Footer */}
      <footer
        style={{
          background: 'var(--surface-card)',
          borderTop: '1px solid var(--border-color)',
          padding: '24px 20px',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          Copyright © {new Date().getFullYear()} EasyFr8. All Rights Reserved. Connecting Global Markets Seamlessly.
        </div>
      </footer>
    </div>
  );
}
