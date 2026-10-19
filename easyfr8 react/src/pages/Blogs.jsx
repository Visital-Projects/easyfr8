import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../services/api';

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    window.scrollTo(0, 0);

    async function fetchBlogs() {
      try {
        setLoading(true);
        const data = await api.get(`/blogs?t=${Date.now()}`);
        const list = Array.isArray(data) ? data : (data?.blogs || []);
        // Only show published blogs on public archive
        const published = list.filter(b => b.status === 'Published');
        setBlogs(published);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load blog posts.');
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, []);

  const categories = ['All', ...new Set(blogs.map(b => b.category).filter(Boolean))];

  const filteredBlogs = blogs.filter(b => {
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.body?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">Industry Insights & Articles</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="breadcrumb-area">
          <div className="container">
            <div className="row">
              <div className="col-md-8 col-sm-12 col-xs-12 site-breadcrumb">
                <nav className="breadcrumb">
                  <Link className="home" to="/"><span>Home</span></Link>
                  <i className="fa fa-angle-right" aria-hidden="true"></i>
                  <span>Blogs</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Archive Section */}
      <section className="secpadd" style={{ padding: '60px 0', background: '#f8fafc' }}>
        <div className="container">
          {/* Filter and Search Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '40px',
            background: '#fff',
            padding: '20px 24px',
            borderRadius: '6px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#64748b', textTransform: 'uppercase', marginRight: '6px' }}>
                Category:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: selectedCategory === cat ? '1px solid #d64238' : '1px solid #e2e8f0',
                    background: selectedCategory === cat ? '#d64238' : '#fff',
                    color: selectedCategory === cat ? '#fff' : '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ width: '100%', maxWidth: '280px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ height: '38px', fontSize: '14px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b' }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#d64238', marginBottom: '15px' }}></i>
              <p style={{ fontSize: '16px' }}>Loading articles...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#dc2626' }}>
              <p>{error}</p>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', background: '#fff', borderRadius: '6px' }}>
              <h3 style={{ color: '#334155', fontWeight: 600 }}>No articles found</h3>
              <p style={{ color: '#64748b', marginTop: '8px' }}>Try clearing your search term or selecting a different category.</p>
            </div>
          ) : (
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
              {filteredBlogs.map(blog => {
                const blogDate = new Date(blog.date || blog.publishedAt || Date.now());
                const dayStr = String(blogDate.getDate()).padStart(2, '0');
                const monthStr = blogDate.toLocaleString('default', { month: 'short' });
                const yearStr = blogDate.getFullYear();
                const targetLink = `/blogs/${encodeURIComponent(blog.slug || blog.id)}`;

                return (
                  <div key={blog.id} className="col-md-4 col-sm-6 col-xs-12" style={{ marginBottom: '35px', display: 'flex' }}>
                    <div style={{
                      background: '#fff',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}>
                      {/* Thumbnail with Date Badge */}
                      <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                        <Link to={targetLink}>
                          <img
                            src={getImageUrl(blog.image)}
                            alt={blog.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.3s'
                            }}
                            onError={(e) => {
                              e.currentTarget.src = '/images/blog/blog-placeholder.jpg';
                            }}
                          />
                        </Link>
                        <div style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '12px',
                          background: '#d64238',
                          color: '#fff',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          textAlign: 'center',
                          lineHeight: '1.1'
                        }}>
                          <span style={{ display: 'block', fontSize: '16px', fontWeight: 800 }}>{dayStr}</span>
                          <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>{monthStr}</span>
                        </div>
                      </div>

                      {/* Content Summary */}
                      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', display: 'flex', gap: '12px' }}>
                          <span><i className="fa fa-user" style={{ color: '#d64238', marginRight: '5px' }}></i>{blog.author || 'easyfr8'}</span>
                          {blog.category && (
                            <span><i className="fa fa-tag" style={{ color: '#d64238', marginRight: '5px' }}></i>{blog.category}</span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', lineHeight: '1.4' }}>
                          <Link to={targetLink} style={{ color: '#0f172a', textDecoration: 'none' }}>
                            {blog.title}
                          </Link>
                        </h3>

                        <p style={{
                          fontSize: '14px',
                          color: '#475569',
                          lineHeight: '1.6',
                          marginBottom: '20px',
                          flex: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {blog.seoDesc || blog.excerpt || (blog.body ? blog.body.replace(/<[^>]+>/g, '').slice(0, 140) + '...' : '')}
                        </p>

                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                          <Link
                            to={targetLink}
                            style={{
                              color: '#d64238',
                              fontWeight: 700,
                              fontSize: '13px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            Read Full Story <i className="fa fa-arrow-right"></i>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
