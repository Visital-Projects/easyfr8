import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import logoImg from '../assets/images/easyfr8.png'
import api, { getImageUrl, normalizeCategory } from '../services/api'

const defaultFooterData = {
  contact: {
    phones: ['+91 7011 874 347', '+91 8076 466 266'],
    emails: ['info@easyfr8.com', 'support@easyfr8.com'],
    officeAddress: 'Value Envision India Pvt Ltd, Bank More, Dhanbad, Jharkhand - 826001',
    socialLinks: {
      twitter: 'https://twitter.com/easyfr8',
      linkedin: 'https://linkedin.com/company/easyfr8',
      facebook: 'https://facebook.com/easyfr8',
      instagram: '',
      youtube: '',
      whatsapp: '',
      googleMapsEmbed: ''
    },
    copyright: 'Copyright @ 2025 vnvision, All Right Reserved',
    logoImage: '',
    footerAbout: 'EasyFr8 simplifies global trade supply chains through instant digital freight rate booking and automated compliance tracking.',
  },
  services: [
    { id: 1, title: 'Ocean Freight Forwarding', icon: 'anchor', desc: 'Global container shipping with flexible contract rates.', active: true },
    { id: 2, title: 'Air Freight Forwarding', icon: 'plane', desc: 'Next-flight-out express delivery for urgent cargo.', active: true },
    { id: 3, title: 'Road Freight Forwarding', icon: 'truck', desc: 'Reliable domestic port-to-warehouse drayage transport.', active: true },
    { id: 4, title: 'Warehousing', icon: 'package', desc: 'Secure storage and rapid distributions.', active: true },
    { id: 5, title: 'Custom Clearance', icon: 'shield', desc: 'Automated compliance clearing and duty payments.', active: true },
    { id: 6, title: 'CFS', icon: 'box', desc: 'Container Freight Station handling and consolidation.', active: true },
    { id: 7, title: 'Contract Handling', icon: 'briefcase', desc: 'Enterprise logistics contract execution and planning.', active: true },
    { id: 8, title: 'Cargo Insurance', icon: 'umbrella', desc: 'Comprehensive cargo transit liability coverage.', active: true }
  ]
};

export default function Footer() {
  const [footerData, setFooterData] = useState(defaultFooterData)

  useEffect(() => {
    let active = true
    api.get(`/cms/footer?t=${Date.now()}`)
      .then(res => {
        if (active && res && res.contact && res.services) {
          setFooterData(res)
        }
      })
      .catch(err => {
        console.error('Failed to load footer CMS data:', err)
      })
    return () => { active = false }
  }, [])

  const { contact, services } = footerData

  return (
    <>
      {/* footer sec */}
      <div className="footer-widgets widgets-area">
        <div className="contact-widget">
          <div className="container">
            <div className="row">
              <div className="contact col-md-3 col-xs-12 col-sm-12">
                <Link to="/" className="footer-logo"><img src={contact.logoImage ? getImageUrl(contact.logoImage) : logoImg} alt="Footer Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} /></Link>
              </div>
              <div className="contact col-md-3 col-xs-12 col-sm-12">
                <i className="flaticon-signs"></i>
                <p style={{ fontSize: '14px', lineHeight: '20px' }}>{contact.officeAddress}</p>
              </div>
              <div className="contact col-md-3 col-xs-12 col-sm-12">
                <i className="flaticon-phone-call"></i>
                <p style={{ fontSize: '15px' }}>Toll Free Number :</p>
                <h4 style={{ fontSize: '15px' }}>{contact.phones?.join(', ') || ''}</h4>
              </div>
              <div className="contact col-md-3 col-xs-12 col-sm-12">
                <i className="flaticon-message"></i>
                <p style={{ fontSize: '15px' }}>E-Mail:</p>
                <h4 style={{ fontSize: '15px' }}>{contact.emails?.join(', ') || ''}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-sidebars">
          <div className="container">
            <div className="row">
              {/* About */}
              <div className="footer-sidebar footer-1 col-xs-12 col-sm-6 col-md-4">
                <div className="widget widget_text">
                  <h4 className="widget-title">About Easyfr8</h4>
                  <div className="textwidget">
                    <p>{contact.footerAbout || ''}</p>
                  </div>
                </div>
                <div className="widget cargohub-social-links-widget">
                  <div className="list-social style-1">
                    {contact.socialLinks?.facebook && <a href={contact.socialLinks.facebook} target="_blank" rel="noreferrer"><i className="fa fa-facebook"></i></a>}
                    {contact.socialLinks?.linkedin && <a href={contact.socialLinks.linkedin} target="_blank" rel="noreferrer"><i className="fa fa-linkedin"></i></a>}
                    {contact.socialLinks?.twitter && <a href={contact.socialLinks.twitter} target="_blank" rel="noreferrer"><i className="fa fa-twitter"></i></a>}
                  </div>
                </div>
              </div>

              {/* Core Services */}
              <div className="footer-sidebar footer-2 col-xs-12 col-sm-6 col-md-4">
                <div className="widget widget_nav_menu">
                  <h4 className="widget-title">
                    <Link to="/services/core-services" style={{ color: 'inherit' }}>Core Services</Link>
                  </h4>
                  <div className="menu-service-menu-container">
                    <ul className="menu">
                      {services?.filter(s => s.active && normalizeCategory(s.category) === 'core').map(service => {
                        const path = service.slug ? `/services/${service.slug}` : `/services/${service.id}`;
                        return (
                          <li key={service.id}><Link to={path}>{service.title}</Link></li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Value Added Services */}
              <div className="footer-sidebar footer-2 col-xs-12 col-sm-6 col-md-4">
                <div className="widget widget_nav_menu">
                  <h4 className="widget-title">
                    <Link to="/services/value-added-services" style={{ color: 'inherit' }}>Value-Added Services</Link>
                  </h4>
                  <div className="menu-service-menu-container">
                    <ul className="menu">
                      {services?.filter(s => s.active && normalizeCategory(s.category) === 'value-added').map(service => {
                        const path = service.slug ? `/services/${service.slug}` : `/services/${service.id}`;
                        return (
                          <li key={service.id}><Link to={path}>{service.title}</Link></li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* footer sec end */}

      {/* copyright sec */}
      <footer className="site-footer">
        <div className="container">
          <div className="row">
            <div className="footer-copyright col-md-6 col-sm-12 col-sx-12">
              <div className="site-info">{contact.copyright || "Copyright @ 2025 vnvision, All Right Reserved"}</div>
            </div>
          </div>
        </div>
      </footer>
      {/* copyright sec end */}
    </>
  )
}
