import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getImageUrl } from '../services/api';

export default function BlogSingle() {
  const { slugOrId } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    async function fetchBlog() {
      try {
        setLoading(true);
        const data = await api.get('/blogs');
        const found = data.find(b => b.slug === slugOrId || b.id === slugOrId);
        if (found) {
          setBlog(found);
          setError(null);
        } else {
          setError('Blog post not found');
        }
      } catch (err) {
        setError('Failed to fetch blog post: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBlog();
  }, [slugOrId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '150px 20px', textAlign: 'center' }}>
        <h3>Loading article...</h3>
        <div style={{ margin: '20px auto', width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #f3f3f3', borderTop: '4px solid #d64238', animation: 'spin 1s linear infinite' }}></div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="container" style={{ padding: '150px 20px', textAlign: 'center' }}>
        <h3>{error || 'Blog post not found'}</h3>
        <Link to="/" className="fh-btn btn" style={{ marginTop: '20px', display: 'inline-block' }}>Back to Home</Link>
      </div>
    );
  }

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">{blog.title}</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="breadcrumb-area">
          <div className="container">
            <div className="row">
              <div className="col-md-8 col-sm-12 col-xs-12 site-breadcrumb">
                <nav className="breadcrumb">
                  <a className="home" href="/"><span>Home</span></a>
                  <i className="fa fa-angle-right" aria-hidden="true" style={{ margin: '0 8px' }}></i>
                  <span>Blogs</span>
                  <i className="fa fa-angle-right" aria-hidden="true" style={{ margin: '0 8px' }}></i>
                  <span>{blog.title}</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Detail Section */}
      <div className="service_dtl1 secpadd">
        <div className="container">
          <div className="row">
            <div className="col-md-9 col-md-offset-1.5" style={{ margin: '0 auto', float: 'none' }}>
              <div className="blog-wrapper single-post">
                {blog.image && (
                  <div className="entry-thumbnail" style={{ marginBottom: '30px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={getImageUrl(blog.image)} alt={blog.title} style={{ width: '100%', maxHeight: '480px', objectFit: 'cover' }} />
                  </div>
                )}
                
                <div className="entry-header" style={{ marginBottom: '25px' }}>
                  <div className="entry-meta" style={{ marginBottom: '12px', fontSize: '13px', color: '#888', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span className="meta author"><i className="fa fa-user" style={{ marginRight: '6px' }}></i>by {blog.author || 'easyfr8'}</span>
                    <span className="meta date"><i className="fa fa-calendar" style={{ marginRight: '6px' }}></i>{blog.date}</span>
                    <span className="meta category"><i className="fa fa-folder-open" style={{ marginRight: '6px' }}></i>{blog.category}</span>
                    {blog.readingTime && <span className="meta reading-time"><i className="fa fa-clock-o" style={{ marginRight: '6px' }}></i>{blog.readingTime} min read</span>}
                  </div>
                  <h2 className="entry-title" style={{ fontSize: '30px', fontWeight: 700, lineHeight: '40px', color: '#1a1a1a', margin: 0 }}>{blog.title}</h2>
                </div>

                <div className="entry-content" style={{ fontSize: '16px', lineHeight: '28px', color: '#555', whiteSpace: 'pre-line' }}>
                  {blog.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
