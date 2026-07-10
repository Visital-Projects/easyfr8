import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCms } from '../../context/CmsContext'
import { getImageUrl } from '../../services/api'

// Fallback images
import defaultServImg from '../../assets/images/main-slider/serv-2.jpg'

export default function ServiceDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { cms, submitEnquiry } = useCms()

  // Find the service that matches the URL slug or pathname split
  const currentSlug = slug || window.location.pathname.split('/').pop()
  const serviceData = cms.services.find(s => s.slug === currentSlug || s.title.toLowerCase().replace(/\s+/g, '-') === currentSlug)

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  // Redirect if service doesn't exist
  useEffect(() => {
    if (!serviceData) {
      // Fallback redirection or check if it matches a path
      const matched = cms.services.find(s => s.active)
      if (matched && matched.slug) {
        navigate(`/services/${matched.slug}`, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
    window.scrollTo(0, 0)
  }, [slug, serviceData, navigate, cms.services])

  if (!serviceData) return null

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
    } catch (err) {
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
                  <a className="home" href="/"><span>Home</span></a>
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
                  {cms.services
                    .filter(s => s.active)
                    .filter(s => (s.category || 'core') === (serviceData.category || 'core'))
                    .map(service => {
                      const path = service.slug ? `/services/${service.slug}` : '/services'
                      const isCurrent = service.id === serviceData.id
                      return (
                        <li key={service.id} className={`menu-item${isCurrent ? ' current-menu-item' : ''}`}>
                          <a href={path}>{service.title}</a>
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
