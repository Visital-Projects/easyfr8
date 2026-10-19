import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCms } from '../../context/CmsContext'
import { getImageUrl, normalizeCategory } from '../../services/api'

// Fallback images
import defaultServImg from '../../assets/images/main-slider/serv-2.jpg'

export default function ServiceDetail() {
  const { slug } = useParams()
  const { cms, loading, submitEnquiry } = useCms()

  // Find the service that matches the URL slug or pathname split
  const currentSlug = slug || window.location.pathname.split('/').filter(Boolean).pop() || ''
  const normalizedSlug = currentSlug.toLowerCase().trim()

  const serviceData = (cms?.services || []).find(s => {
    if (!s) return false
    const sSlug = (s.slug || '').toLowerCase().trim()
    const sTitleSlug = (s.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    const sId = String(s.id)
    return sSlug === normalizedSlug || sTitleSlug === normalizedSlug || sId === currentSlug
  })

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  // While CMS data is still loading from backend, display a clean loading placeholder
  if (loading && !serviceData) {
    return (
      <div id="page">
        <div className="page-header title-area">
          <div className="header-title">
            <div className="container">
              <div className="row">
                <div className="col-md-12 col-sm-12 col-xs-12">
                  <h1 className="page-title">Loading Service...</h1>
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
            <p style={{ marginTop: '16px', color: '#64748b', fontSize: '15px' }}>Retrieving service details...</p>
          </div>
        </div>
      </div>
    )
  }

  // If loading has completed and the service is not found:
  // Strictly follow requirement: Do NOT redirect to Ocean Freight Forwarding or services[0]!
  if (!serviceData) {
    return (
      <div id="page">
        <div className="page-header title-area">
          <div className="header-title">
            <div className="container">
              <div className="row">
                <div className="col-md-12 col-sm-12 col-xs-12">
                  <h1 className="page-title">Service Not Found</h1>
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
                    <span>Service Not Found</span>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="service_dtl1 secpadd" style={{ padding: '80px 0' }}>
          <div className="container" style={{ maxWidth: '750px', textAlign: 'center' }}>
            <div style={{ background: '#fff', padding: '50px 30px', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '48px', color: '#d64238', marginBottom: '16px' }}>⚠️</div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                Service Not Found
              </h2>
              <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '25px' }}>
                We could not find any active service matching <strong>"{currentSlug}"</strong>. It may have been renamed, deactivated, or removed.
              </p>
              <div>
                <Link to="/" className="fh-btn btn" style={{ background: '#d64238', color: '#fff', padding: '12px 30px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600, display: 'inline-block' }}>
                  Return to Homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill in all required fields.')
      return
    }
    try {
      setSubmitting(true)
      await submitEnquiry({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        service: serviceData.title,
        message: formData.message,
        source: `${serviceData.title} Quote Page`
      })
      alert('Thank you! Your quote request has been submitted successfully.')
      setFormData({ name: '', email: '', phone: '', message: '' })
    } catch {
      alert('Failed to submit quote request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const parseServiceDetails = (service) => {
    const defaultDesc = service.desc || ''
    const defaultAdvantages = []

    if (!service.details) {
      return { desc: defaultDesc, advantages: defaultAdvantages }
    }

    const parts = service.details.split('\n\nAdvantages:\n')
    const desc = parts[0] || defaultDesc
    let advantages = defaultAdvantages

    if (parts[1]) {
      advantages = parts[1]
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean)
    }
    return { desc, advantages }
  }

  const { desc, advantages } = parseServiceDetails(serviceData)
  const currentCategory = normalizeCategory(serviceData.category)
  const categoryTitle = currentCategory === 'value-added' ? 'Value Added Services' : 'Core Services'
  const categoryPath = currentCategory === 'value-added' ? '/services/value-added-services' : '/services/core-services'

  // Banner image resolution
  const bannerStyle = serviceData.bannerImage
    ? { backgroundImage: `url(${getImageUrl(serviceData.bannerImage)})` }
    : {}

  return (
    <>
      {/* Page Header */}
      <div className="page-header title-area" style={bannerStyle}>
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title"> {serviceData.title}</h1>
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
                  <Link to={categoryPath}><span>{categoryTitle}</span></Link>
                  <i className="fa fa-angle-right" aria-hidden="true"></i>
                  <span> {serviceData.title}</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Page Header end */}

      {/* services Welcome sec */}
      <div className="service_dtl1 secpadd">
        <div className="container">
          <div className="row">
            {/* Sidebar widgets */}
            <div className="col-md-3">
              <div className="widget services-menu-widget">
                <h4 className="widget-title">Our Services</h4>
                <ul className="menu service-menu">
                  {(cms?.services || [])
                    .filter(s => s.active && normalizeCategory(s.category) === currentCategory)
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                    .map(service => {
                      const path = service.slug ? `/services/${service.slug}` : `/services/${service.id}`
                      const isCurrent = service.id === serviceData.id || service.slug === serviceData.slug
                      return (
                        <li key={service.id} className={`menu-item${isCurrent ? ' current-menu-item' : ''}`}>
                          <Link to={path}>{service.title}</Link>
                        </li>
                      )
                    })}
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
                      <p>Tollfree: {cms.contact?.phones?.[0] || '+91 7011 874 347'}</p>
                    </div>

                    <div className="detail email">
                      <i className="flaticon-message-1"></i>
                      <h5>Mail Us at</h5>
                      <p>{cms.contact?.emails?.join(', ') || 'info@easyfr8.com'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="col-md-9">
              <div className="servdtlimg margbtm30">
                <img 
                  src={serviceData.image ? getImageUrl(serviceData.image) : defaultServImg} 
                  alt={serviceData.title} 
                  style={{ width: '100%', height: 'auto', maxHeight: '450px', objectFit: 'cover' }} 
                />
              </div>
              <div className="row paddsec">
                <div className="col-md-12">
                  <div className="abotinforgt">
                    <div className="fh-section-title clearfix f25 text-left version-dark paddbtm40">
                      <h2>Description</h2>
                    </div>
                    <p style={{ whiteSpace: 'pre-line' }}>{desc}</p>
                  </div>
                </div>
              </div>

              {advantages.length > 0 && (
                <>
                  <hr className="margtb40" />
                  <div className="fh-section-title f20 clearfix text-left version-dark paddbtm40">
                    <h2>Advantages</h2>
                  </div>
                  <div className="row">
                    <div className="box-content">
                      <ul>
                        {advantages.map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              <hr className="margtb40" />

              <div className="fh-section-title f20 clearfix text-left version-dark paddbtm40">
                <h2>Request a Quote</h2>
              </div>

              <div className="row">
                <div style={{ width: '100%' }} className="col-md-8 col-sm-12">
                  <form onSubmit={handleSubmit} className="fh-contact-form">
                    <div className="row">
                      <div className="col-md-6 col-sm-6">
                        <div className="form-group">
                          <input 
                            type="text" 
                            className="form-control" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            placeholder="Your Name *" 
                            required 
                          />
                        </div>
                      </div>

                      <div className="col-md-6 col-sm-6">
                        <div className="form-group">
                          <input 
                            type="email" 
                            className="form-control" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            placeholder="Your Email *" 
                            required 
                          />
                        </div>
                      </div>

                      <div className="col-md-6 col-sm-6">
                        <div className="form-group">
                          <input 
                            type="tel" 
                            className="form-control" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                            placeholder="Phone Number *" 
                            required 
                          />
                        </div>
                      </div>

                      <div className="col-md-6 col-sm-6">
                        <div className="form-group">
                          <select 
                            className="form-control" 
                            value={formData.service || serviceData.title} 
                            onChange={e => setFormData({...formData, service: e.target.value})} 
                            required
                          >
                            {cms.services.filter(s => s.active).map(s => (
                              <option key={s.id} value={s.title}>{s.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="col-md-12">
                        <div className="form-group">
                          <textarea 
                            className="form-control" 
                            rows="4" 
                            value={formData.message} 
                            onChange={e => setFormData({...formData, message: e.target.value})} 
                            placeholder="Additional Details (Optional)"
                          />
                        </div>
                      </div>

                      <div className="col-md-12">
                        <button type="submit" disabled={submitting} className="fh-btn btn">
                          {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
