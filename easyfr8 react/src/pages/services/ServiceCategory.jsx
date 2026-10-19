import { useEffect } from 'react'
import { useSearchParams, useLocation, useParams, Link } from 'react-router-dom'
import { useCms } from '../../context/CmsContext'
import { getImageUrl, getServiceIconClass, normalizeCategory } from '../../services/api'
import defaultServImg from '../../assets/images/main-slider/serv-2.jpg'

export default function ServiceCategory({ category: propCategory }) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { categorySlug } = useParams()
  const { cms, loading } = useCms()

  // Determine active category from query params, props, or path
  const queryCategory = searchParams.get('category')
  let activeCategory = 'core'

  if (queryCategory) {
    activeCategory = normalizeCategory(queryCategory)
  } else if (propCategory && propCategory !== 'all') {
    activeCategory = normalizeCategory(propCategory)
  } else if (categorySlug && categorySlug !== 'all') {
    activeCategory = normalizeCategory(categorySlug)
  } else if (location.pathname.toLowerCase().includes('value-added')) {
    activeCategory = 'value-added'
  } else if (location.pathname.toLowerCase().includes('core')) {
    activeCategory = 'core'
  }

  const isValueAdded = activeCategory === 'value-added'
  const categoryTitle = isValueAdded ? 'Value Added Services' : 'Core Services'
  const categoryDesc = isValueAdded
    ? 'Specialized value-added logistics solutions including customs compliance, container freight stations, enterprise contract handling, and comprehensive cargo transit protection.'
    : 'Comprehensive core freight forwarding and multimodal transportation services tailored to move your cargo across global sea, air, and overland networks.'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeCategory])

  // Filter and sort services strictly by active status and CMS sortOrder
  const allActiveServices = (cms?.services || []).filter(s => s.active)
  const coreServices = allActiveServices
    .filter(s => normalizeCategory(s.category) === 'core')
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  const valueAddedServices = allActiveServices
    .filter(s => normalizeCategory(s.category) === 'value-added')
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

  const displayedServices = isValueAdded ? valueAddedServices : coreServices

  if (loading && (!cms?.services || cms.services.length === 0)) {
    return (
      <div id="page">
        <div className="page-header title-area">
          <div className="header-title">
            <div className="container">
              <div className="row">
                <div className="col-md-12">
                  <h1 className="page-title">{categoryTitle}</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="service_dtl1 secpadd" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div className="container">
            <div style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              border: '3px solid #d64238',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ marginTop: '16px', color: '#64748b', fontSize: '15px' }}>Loading {categoryTitle}...</p>
          </div>
        </div>
      </div>
    )
  }

  const renderServiceCard = (service, catBadge) => {
    const path = service.slug ? `/services/${service.slug}` : `/services/${service.id}`
    const iconClass = getServiceIconClass(service.icon)
    return (
      <div key={service.id} className="col-md-6 col-sm-6 col-xs-12" style={{ display: 'flex' }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
          <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
            <img
              src={service.image ? getImageUrl(service.image) : defaultServImg}
              alt={service.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <span style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(2, 8, 59, 0.85)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: '3px'
            }}>
              {catBadge}
            </span>
          </div>

          <div style={{ padding: '24px', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span className="fh-icon" style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d64238',
                  fontSize: '20px',
                  flexShrink: 0
                }}>
                  <i className={iconClass}></i>
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                  <Link to={path} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {service.title}
                  </Link>
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                {service.desc || 'Reliable and comprehensive logistics solutions provided by EasyFr8.'}
              </p>
            </div>

            <div>
              <Link
                to={path}
                className="fh-btn btn"
                style={{
                  background: '#d64238',
                  color: '#fff',
                  padding: '8px 20px',
                  fontSize: '13px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Learn More</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">{categoryTitle}</h1>
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
                  <Link to="/services"><span>Services</span></Link>
                  <i className="fa fa-angle-right" aria-hidden="true"></i>
                  <span>{categoryTitle}</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="service_dtl1 secpadd">
        <div className="container">
          <div className="row">
            {/* Sidebar widgets */}
            <div className="col-md-3">
              <div className="widget services-menu-widget">
                <h4 className="widget-title">Service Categories</h4>
                <ul className="menu service-menu">
                  <li className={`menu-item${!isValueAdded ? ' current-menu-item' : ''}`}>
                    <Link to="/services?category=core">
                      Core Services ({coreServices.length})
                    </Link>
                  </li>
                  <li className={`menu-item${isValueAdded ? ' current-menu-item' : ''}`}>
                    <Link to="/services?category=value-added">
                      Value Added Services ({valueAddedServices.length})
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="widget_text widget widget_custom_html">
                <h4 className="widget-title">Our Brochures</h4>
                <div className="textwidget custom-html-widget">
                  <div className="download">
                    <div className="item-download">
                      <a href="#" target="_blank"><i className="fa fa-file-pdf-o" aria-hidden="true"></i>Service Brochure.Pdf</a>
                    </div>
                    <div className="item-download">
                      <a href="#" target="_blank"><i className="fa fa-file-word-o" aria-hidden="true"></i>About Company.Doc</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="widget_text widget widget_custom_html">
                <h4 className="widget-title">Contact Us</h4>
                <div className="textwidget custom-html-widget">
                  <div className="cargo-contact-widget">
                    <div className="detail phone">
                      <i className="flaticon-phone-call"></i>
                      <h5>Call us on</h5>
                      <p>Tollfree: {cms?.contact?.phones?.[0] || '+91 7011 874 347'}</p>
                    </div>

                    <div className="detail email">
                      <i className="flaticon-message-1"></i>
                      <h5>Mail Us at</h5>
                      <p>{cms?.contact?.emails?.join(', ') || 'info@easyfr8.com'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="col-md-9">
              <div className="abotinforgt margbtm40">
                <div className="fh-section-title clearfix f25 text-left version-dark paddbtm20">
                  <h2>{categoryTitle}</h2>
                </div>
                <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.7' }}>
                  {categoryDesc}
                </p>
              </div>

              <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: '30px 0' }}>
                {displayedServices.length > 0 ? (
                  displayedServices.map(service => renderServiceCard(service, categoryTitle))
                ) : (
                  <div className="col-md-12">
                    <div style={{ background: '#f8fafc', padding: '40px', textAlign: 'center', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                      <p style={{ margin: 0, color: '#64748b' }}>No active services found in this category.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
