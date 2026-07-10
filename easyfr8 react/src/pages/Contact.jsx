import { useState } from 'react'
import { useCms } from '../context/CmsContext'

export default function Contact() {
  const { cms, submitEnquiry } = useCms()
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      alert('Name and Email are required fields.');
      return;
    }
    try {
      setSubmitting(true)
      setError(null)
      await submitEnquiry({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        service: 'Contact Page Form',
        message: formData.message,
        source: 'Contact Page'
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">Contact</h1>
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
                  <span>Contact</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <section className="contactpagesec secpadd">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="fh-section-title clearfix f25 text-left version-dark paddbtm40">
                <h2>Contact Details</h2>
              </div>
              <p className="margbtm30">If you have any questions about what we offer for consumers or for business, you can always email us or call us via the below details. We'll reply within 24 hours.</p>
              {error && <div style={{ color: 'red', margin: '0 0 20px 0', fontWeight: 'bold' }}>{error}</div>}
              <div className="row">
                <div className="col-md-6 col-sm-12">
                  <div className="fh-contact-box type-address">
                    <i className="flaticon-pin"></i>
                    <h4 className="box-title">Address</h4>
                    <div className="desc">
                      <p>{cms.contact.officeAddress}</p>
                    </div>
                  </div>
                  <div className="fh-contact-box type-email">
                    <i className="flaticon-business"></i>
                    <h4 className="box-title">Mail Us at</h4>
                    <div className="desc">
                      <p>{cms.contact.emails.join(' | ')}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6 col-sm-12">
                  <div className="fh-contact-box type-phone">
                    <i className="flaticon-phone-call"></i>
                    <h4 className="box-title">Call us on</h4>
                    <div className="desc">
                      <p>{cms.contact.phones.join(' | ')}</p>
                    </div>
                  </div>
                  <div className="fh-contact-box type-social">
                    <i className="flaticon-share"></i>
                    <h4 className="box-title">We are social</h4>
                    <ul className="clearfix">
                      {cms.contact.socialLinks.facebook && <li className="facebook"><a href={cms.contact.socialLinks.facebook} target="_blank" rel="noreferrer"><i className="fa fa-facebook"></i></a></li>}
                      {cms.contact.socialLinks.linkedin && <li className="linkedin"><a href={cms.contact.socialLinks.linkedin} target="_blank" rel="noreferrer"><i className="fa fa-linkedin"></i></a></li>}
                      {cms.contact.socialLinks.twitter && <li className="twitter"><a href={cms.contact.socialLinks.twitter} target="_blank" rel="noreferrer"><i className="fa fa-twitter"></i></a></li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="contactpagform graybg secpadd">
        <div className="container">
          <div className="fh-section-title clearfix f25 text-center version-dark paddbtm40">
            <h2>Leave Your Message</h2>
          </div>
          <p className="paddbtm40 text-center">If you have any questions about the services we provide simply use the form below. We try and respond to all<br />queries and comments within 24 hours.</p>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#28a745', fontSize: '18px' }}>
              <i className="fa fa-check-circle" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
              <p>Thank you! Your message has been sent. We'll reply within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="contact-form" noValidate>
              <div className="fh-form fh-form-3">
                <div className="row">
                  <div className="col-md-6 col-sm-6 col-xs-12">
                    <p className="field"><input name="name" value={formData.name} onChange={handleChange} placeholder="Your Name*" type="text" required /></p>
                    <p className="field"><input name="email" value={formData.email} onChange={handleChange} placeholder="Email Address*" type="email" required /></p>
                    <p className="field"><input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" type="text" /></p>
                  </div>
                  <div className="col-md-6 col-sm-6 col-xs-12">
                    <p className="field single-field">
                      <textarea name="message" value={formData.message} onChange={handleChange} cols="40" rows="10" placeholder="Your Message..."></textarea>
                    </p>
                  </div>
                  <div className="col-md-12 col-sm-12 col-xs-12">
                    <p className="field submit">
                      <button className="fh-btn" type="submit">Submit</button>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Google Map */}
      <div className="google-map-area">
        <div className="google-map" style={{ height: '500px', width: '100%', overflow: 'hidden' }}>
          <iframe
            src={cms.contact?.socialLinks?.googleMapsEmbed || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3504.6531981609164!2d77.27057567470759!3d28.550141963455406!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce3ae130d1539%3A0x22c2847a082fcb6e!2s101!5e0!3m2!1sen!2sin!4v1771226710213!5m2!1sen!2sin"}
            width="100%"
            height="500"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Easyfr8 Location"
          ></iframe>
        </div>
      </div>
    </div>
  )
}
