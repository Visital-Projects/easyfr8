'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { Blog } from '../../../lib/store';
import Pagination from '../../../components/Pagination';
import { slugify, estimateReadingTime } from '../../../lib/csvUtils';

const ROWS_PER_PAGE = 5;

function compressImageBase64(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      const fallbackReader = new FileReader();
      fallbackReader.onload = (e) => resolve(e.target?.result as string);
      fallbackReader.readAsDataURL(file);
    };
    reader.readAsDataURL(file);
  });
}

export default function BlogsPage() {
  const { blogs, addBlog, updateBlog, deleteBlog, users, showToast } = useData();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft'>('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Form Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // Editor Fields
  const [blogTitle, setBlogTitle] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogBody, setBlogBody] = useState('');
  const [blogCategory, setBlogCategory] = useState('Industry Updates');
  const [blogStatus, setBlogStatus] = useState<'Published' | 'Draft'>('Published');
  const [blogImage, setBlogImage] = useState('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&h=250');
  const [blogTags, setBlogTags] = useState('');
  const [blogAuthor, setBlogAuthor] = useState(users[0]?.name || 'easyfr8');
  const [isCustomAuthor, setIsCustomAuthor] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  // Preview Dialog State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlog, setPreviewBlog] = useState<Partial<Blog> | null>(null);

  // Auto-slug generation
  useEffect(() => {
    if (!editingBlog && blogTitle) {
      setBlogSlug(slugify(blogTitle));
    }
  }, [blogTitle, editingBlog]);

  // Filtered & Paginated lists
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            blog.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            blog.tags?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || blog.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [blogs, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredBlogs.length / ROWS_PER_PAGE);
  const paginatedBlogs = filteredBlogs.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
  };

  const handleOpenAddBlog = () => {
    setEditingBlog(null);
    setBlogTitle('');
    setBlogSlug('');
    setBlogBody('');
    setBlogCategory('Industry Updates');
    setBlogStatus('Published');
    setBlogImage('');
    setBlogTags('');
    setBlogAuthor(users[0]?.name || 'easyfr8');
    setIsCustomAuthor(false);
    setSeoTitle('');
    setSeoDesc('');
    setMetaKeywords('');
    setScheduledDate('');
    setDrawerOpen(true);
  };

  const handleOpenEditBlog = async (blog: Blog) => {
    setEditingBlog(blog);
    setBlogTitle(blog.title);
    setBlogSlug(blog.slug || '');
    setBlogBody(blog.body || '');
    setBlogCategory(blog.category);
    setBlogStatus(blog.status);
    setBlogImage(blog.image);
    setBlogTags(blog.tags || '');
    const currentAuthor = blog.author || users[0]?.name || 'easyfr8';
    setBlogAuthor(currentAuthor);
    setIsCustomAuthor(false);
    setSeoTitle(blog.seoTitle || '');
    setSeoDesc(blog.seoDesc || '');
    setMetaKeywords(blog.metaKeywords || '');
    setScheduledDate(blog.publishedAt ? blog.publishedAt.slice(0, 10) : '');
    setDrawerOpen(true);

    try {
      const res = await fetch(`/api/blogs/${encodeURIComponent(blog.id)}`);
      const data = await res.json();
      if (data.success && data.blog) {
        if (data.blog.body !== undefined) {
          setBlogBody(data.blog.body);
        }
        if (data.blog.publishedAt) {
          setScheduledDate(data.blog.publishedAt.slice(0, 10));
        } else if (data.blog.publishedAt === '') {
          setScheduledDate('');
        }
      }
    } catch (e) {
      console.error('Failed to load fresh blog details:', e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 1200, 800, 0.8);
      setBlogImage(compressed);
    }
  };

  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim()) {
      showToast('Title is required.', 'danger');
      return;
    }

    const calculatedTime = estimateReadingTime(blogBody);
    const dateStr = new Date().toISOString().split('T')[0];
    const finalPublishedAt = scheduledDate ? scheduledDate.slice(0, 10) : (blogStatus === 'Published' ? dateStr : '');

    const blogData: Partial<Blog> = {
      title: blogTitle,
      slug: blogSlug || slugify(blogTitle),
      body: blogBody,
      category: blogCategory,
      tags: blogTags,
      status: blogStatus,
      image: blogImage,
      author: blogAuthor,
      seoTitle: seoTitle || blogTitle,
      seoDesc: seoDesc || blogTitle,
      metaKeywords,
      publishedAt: finalPublishedAt,
      date: finalPublishedAt || dateStr,
      readingTime: calculatedTime,
    };

    if (editingBlog) {
      updateBlog(editingBlog.id, blogData);
      showToast(`Updated blog: '${blogTitle}'`, 'success');
    } else {
      const newBlog: Blog = {
        id: `BLG-${Math.floor(100 + Math.random() * 900)}`,
        title: blogTitle,
        slug: blogSlug || slugify(blogTitle),
        body: blogBody,
        category: blogCategory,
        tags: blogTags,
        status: blogStatus,
        image: blogImage,
        date: finalPublishedAt || dateStr,
        author: blogAuthor,
        seoTitle: seoTitle || blogTitle,
        seoDesc: seoDesc || blogTitle,
        metaKeywords: metaKeywords,
        publishedAt: finalPublishedAt,
        readingTime: calculatedTime,
      };
      addBlog(newBlog);
      showToast(`Created blog: '${blogTitle}'`, 'success');
    }
    setDrawerOpen(false);
  };

  const handleDeleteBlog = (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      deleteBlog(id);
      showToast('Blog post deleted.', 'warning');
    }
  };

  // Helper formatting for editor
  const insertMarkdown = (syntax: string) => {
    const textarea = document.getElementById('blog-body-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selected = text.substring(start, end);
    
    let replacement = '';
    if (syntax === 'bold') replacement = `**${selected || 'bold text'}**`;
    else if (syntax === 'italic') replacement = `*${selected || 'italic text'}*`;
    else if (syntax === 'heading') replacement = `### ${selected || 'Heading'}\n`;
    else if (syntax === 'link') replacement = `[${selected || 'Link label'}](https://example.com)`;

    setBlogBody(before + replacement + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 100);
  };

  const handleOpenPreview = () => {
    setPreviewBlog({
      title: blogTitle,
      body: blogBody,
      category: blogCategory,
      image: blogImage,
      tags: blogTags,
      author: blogAuthor,
      readingTime: estimateReadingTime(blogBody),
      publishedAt: scheduledDate || new Date().toISOString().split('T')[0],
    });
    setPreviewOpen(true);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Blog & Updates Editorial Desk</h1>
          <p className="page-subtitle">Publish new industry insights, compliance updates, and blank sailing notices.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddBlog}>+ Create Article</button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className={`btn ${statusFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setStatusFilter('All'); setCurrentPage(1); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>All Articles</button>
          <button className={`btn ${statusFilter === 'Published' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setStatusFilter('Published'); setCurrentPage(1); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Published</button>
          <button className={`btn ${statusFilter === 'Draft' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setStatusFilter('Draft'); setCurrentPage(1); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Drafts</button>
        </div>
        <div style={{ flex: 1, maxWidth: '320px', position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search articles by title or tag..."
            style={{ height: '36px' }}
          />
        </div>
      </div>

      {/* BLOG CARDS GRID */}
      <div className="blogs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        {paginatedBlogs.map((blog) => (
          <div key={blog.id} className="blog-card" style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ position: 'relative', height: '160px' }}>
              <img src={blog.image} alt={blog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span className={`status-pill ${blog.status === 'Published' ? 'status-active' : 'status-warning'}`} style={{
                position: 'absolute',
                top: 'var(--space-3)',
                left: 'var(--space-3)',
              }}>
                {blog.status}
              </span>
            </div>
            <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                <span>{blog.category}</span>
                <span>{blog.readingTime || 3} min read</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)', flex: 1, lineHeight: '1.4' }}>{blog.title}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {blog.body || 'No description preview.'}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto' }}>
                <button className="btn btn-secondary" onClick={() => handleOpenEditBlog(blog)} style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDeleteBlog(blog.id)} style={{ padding: '6px', fontSize: '0.75rem' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}

        {paginatedBlogs.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No articles match your current filter settings.
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} totalRows={filteredBlogs.length} rowsPerPage={ROWS_PER_PAGE} onPageChange={handlePageChange} />

      {/* CREATE/EDIT BLOG DRAWER */}
      {drawerOpen && (
        <div className="drawer-overlay active" style={{ display: 'flex', zIndex: 100 }}>
          <div className="drawer-container" style={{ maxWidth: '780px' }}>
            <div className="drawer-header">
              <h3>{editingBlog ? 'Edit Blog Article' : 'Create Blog Article'}</h3>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveBlog}>
              <div className="drawer-body" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                
                {/* Left Side: Main Content */}
                <div>
                  <div className="form-group">
                    <label className="form-label">Article Title *</label>
                    <input type="text" className="form-control" value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="e.g. Essential Customs Bond Guide" required />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Blog Slug</label>
                    <input type="text" className="form-control" value={blogSlug} onChange={(e) => setBlogSlug(e.target.value)} placeholder="auto-generated-slug" />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Article Body Content</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertMarkdown('bold')} style={{ padding: '2px 6px', fontSize: '0.7rem' }}><b>B</b></button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertMarkdown('italic')} style={{ padding: '2px 6px', fontSize: '0.7rem' }}><i>I</i></button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertMarkdown('heading')} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>H3</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertMarkdown('link')} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>Link</button>
                      </div>
                    </div>
                    <textarea
                      id="blog-body-textarea"
                      className="form-control"
                      value={blogBody}
                      onChange={(e) => setBlogBody(e.target.value)}
                      rows={12}
                      placeholder="Write blog content here (Supports markdown syntax)..."
                      required
                    ></textarea>
                  </div>
                </div>

                {/* Right Side: Metadata / SEO / Options */}
                <div>
                  <div className="form-group">
                    <label className="form-label">Category Segment</label>
                    <select className="form-control" value={blogCategory} onChange={(e) => setBlogCategory(e.target.value)}>
                      <option value="Industry Updates">Industry Updates</option>
                      <option value="Compliance Guides">Compliance Guides</option>
                      <option value="Regulations">Regulations</option>
                      <option value="Corporate News">Corporate News</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tags (comma-separated)</label>
                    <input type="text" className="form-control" value={blogTags} onChange={(e) => setBlogTags(e.target.value)} placeholder="e.g. shipping, customs, carbon" />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Author</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomAuthor(!isCustomAuthor)}
                        style={{ background: 'none', border: 'none', color: '#d64238', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      >
                        {isCustomAuthor ? 'Select from team' : 'Custom author'}
                      </button>
                    </div>
                    {isCustomAuthor ? (
                      <input
                        type="text"
                        className="form-control"
                        value={blogAuthor}
                        onChange={(e) => setBlogAuthor(e.target.value)}
                        placeholder="Enter author name"
                        required
                      />
                    ) : (
                      <select
                        className="form-control"
                        value={blogAuthor}
                        onChange={(e) => setBlogAuthor(e.target.value)}
                      >
                        {blogAuthor && !users.some((u) => u.name === blogAuthor) && (
                          <option value={blogAuthor}>{blogAuthor}</option>
                        )}
                        {users.map((u) => (
                          <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Publication Status</label>
                    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                      <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center' }}>
                        <input type="radio" name="blog_status" checked={blogStatus === 'Published'} onChange={() => setBlogStatus('Published')} />
                        <span className="checkbox-mark" style={{ borderRadius: '50%' }}></span>
                        <span style={{ fontSize: '0.85rem', marginLeft: 'var(--space-2)' }}>Published</span>
                      </label>
                      <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center' }}>
                        <input type="radio" name="blog_status" checked={blogStatus === 'Draft'} onChange={() => setBlogStatus('Draft')} />
                        <span className="checkbox-mark" style={{ borderRadius: '50%' }}></span>
                        <span style={{ fontSize: '0.85rem', marginLeft: 'var(--space-2)' }}>Draft</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Scheduled Publish Date</label>
                    <input type="date" className="form-control" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Featured Article Banner</label>
                    <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '10px', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{blogImage ? 'Replace Image (Upload New)' : 'Upload Image from Computer'}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>

                    {blogImage ? (
                      <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                        <img src={blogImage} alt="Featured Preview" style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
                        <button
                          type="button"
                          onClick={() => setBlogImage('')}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Remove Image
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        No banner uploaded yet.
                      </div>
                    )}

                    <div style={{ marginTop: '4px' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Or External Image URL / Media Path:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={blogImage}
                        onChange={(e) => setBlogImage(e.target.value)}
                        placeholder="https://... or /api/media/..."
                        style={{ height: '30px', fontSize: '0.75rem', marginTop: '2px' }}
                      />
                    </div>
                  </div>

                  {/* SEO collapse panel */}
                  <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '12px' }}>
                    <legend style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0 6px', color: 'var(--text-muted)' }}>SEO Meta Settings</legend>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>SEO Title</label>
                      <input type="text" className="form-control" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={{ height: '28px', fontSize: '0.75rem' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>SEO Description</label>
                      <textarea className="form-control" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} style={{ fontSize: '0.75rem' }}></textarea>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Meta Keywords</label>
                      <input type="text" className="form-control" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} style={{ height: '28px', fontSize: '0.75rem' }} />
                    </div>
                  </fieldset>

                </div>

              </div>
              <div className="drawer-footer" style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleOpenPreview} style={{ marginRight: 'auto' }}>Preview Render</button>
                <button type="button" className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Article</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARTICLE PREVIEW MODAL */}
      {previewOpen && previewBlog && (
        <div className="modal-overlay active" style={{ display: 'flex', zIndex: 200 }}>
          <div className="modal-container" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>Landing Page Preview</h3>
              <button className="modal-close" onClick={() => setPreviewOpen(false)}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <img src={previewBlog.image} alt="" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', marginBottom: '16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>Category: <b>{previewBlog.category}</b></span>
                <span>{previewBlog.readingTime} min read</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>{previewBlog.title}</h2>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <span>By {previewBlog.author}</span>
                <span>·</span>
                <span>Published {previewBlog.publishedAt}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {previewBlog.body || 'No content written yet.'}
              </div>
              {previewBlog.tags && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {previewBlog.tags.split(',').map((t, idx) => (
                    <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      #{t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPreviewOpen(false)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
