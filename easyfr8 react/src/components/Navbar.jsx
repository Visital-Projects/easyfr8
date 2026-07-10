import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCms } from '../context/CmsContext'
import logoImg from '../assets/images/easyfr8.png'
import { getImageUrl } from '../services/api'

export default function Navbar() {
  const { cms } = useCms()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      // original scripts.min.js scrolls trigger at 'l' (topbar outerHeight = 60px)
      setScrolled(window.scrollY > 60)
    }

    const handleResize = () => {
      // hide-topbar-mobile hides topbar under 1200px wide
      setIsMobile(window.innerWidth < 1200)
    }

    // Initial triggers
    handleScroll()
    handleResize()

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location])

  // Determine top position of .site-header dynamically
  const headerTop = scrolled ? '0px' : (isMobile ? '0px' : '60px')

  return (
    <>
      {/* Topbar */}
      <div 
        id="fh-header-minimized" 
        className={`fh-header-minimized fh-header-v1${scrolled ? ' minimized' : ''}`}
      ></div>
      <div id="topbar" className="topbar">
        <div className="container">
          <div className="topbar-left topbar-widgets text-left" style={{ marginLeft: '280px' }}>
            <div id="cargo-office-location-widget-2" className="widget cargo-office-location-widget">
              <div className="office-location clearfix">
                <ul className="topbar-office active" style={{ paddingBottom: '5px' }}>
                  <li><i className="flaticon-telephone" aria-hidden="true"></i>Phone {cms.contact.phones[0]}</li>
                  <li><i className="flaticon-web" aria-hidden="true"></i>{cms.contact.emails[0]}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="topbar-right topbar-widgets text-right" style={{ marginRight: '300px' }}>
            <div className="widget cargohub-social-links-widget">
              <div className="list-social style-1">
                {cms.contact.socialLinks.facebook && <a href={cms.contact.socialLinks.facebook} target="_blank" rel="noreferrer"><i className="fa fa-facebook"></i></a>}
                {cms.contact.socialLinks.linkedin && <a href={cms.contact.socialLinks.linkedin} target="_blank" rel="noreferrer"><i className="fa fa-linkedin"></i></a>}
                {cms.contact.socialLinks.twitter && <a href={cms.contact.socialLinks.twitter} target="_blank" rel="noreferrer"><i className="fa fa-twitter"></i></a>}
              </div>
            </div>
            <div className="widget cargo-search-widget">
              <div className="topbar-search topbar-search-1">
                <a href="#" className="toggle-search" id="toggle-search"><i className="fa fa-search" aria-hidden="true"></i></a>
                <form className="search-form" action="#">
                  <i className="fa fa-search" aria-hidden="true"></i>
                  <input type="search" className="search-field" placeholder="Search..." defaultValue="" />
                  <input type="submit" className="search-submit" value="Search" />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* topbar end */}

      {/* Masthead / Main Header */}
      <header 
        id="masthead" 
        className={`site-header clearfix${scrolled ? ' minimized' : ''}`}
        style={{ top: headerTop }}
      >
        <div className="header-main clearfix">
          <div className="container mobile_relative">
            <div className="row">
              {/* Logo */}
              <div className="site-logo col-md-3 col-sm-6 col-xs-6">
                <Link to="/" className="logo">
                  <img src={cms.contact?.logoImage ? getImageUrl(cms.contact.logoImage) : logoImg} alt="Easyfr8" className="logo-light show-logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                  <img src={cms.contact?.logoImage ? getImageUrl(cms.contact.logoImage) : logoImg} alt="Easyfr8" className="logo-dark hide-logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                </Link>
                <h1 className="site-title"><Link to="/">Easyfr8</Link></h1>
                <h2 className="site-description">Connecting Global Markets Seamlessly</h2>
              </div>

              {/* Desktop Nav */}
              <div className="site-menu col-md-9 col-sm-6 col-xs-6">
                <nav id="site-navigation" style={{ marginTop: '5px' }} className="main-nav primary-nav nav">
                  <ul className="menu">
                    <li style={{ marginLeft: '50px' }}><Link to="/about">About us</Link></li>

                    <li className="has-children">
                      <Link to="#" className="dropdown-toggle">Services</Link>
                      <ul className="sub-menu">
                        <li className="has-children">
                          <a href="#">Core Services</a>
                          <ul className="sub-menu">
                            {cms.services
                              .filter(s => s.active)
                              .filter((s, idx) => s.category ? s.category === 'core' : idx < 4)
                              .map(service => {
                                const path = service.slug ? `/services/${service.slug}` : '/services';
                                return (
                                  <li key={service.id}><Link to={path}>{service.title}</Link></li>
                                );
                              })}
                          </ul>
                        </li>
                        <li className="has-children">
                          <a href="#">Value Added Services</a>
                          <ul className="sub-menu">
                            {cms.services
                              .filter(s => s.active)
                              .filter((s, idx) => s.category ? s.category === 'value-added' : idx >= 4)
                              .map(service => {
                                const path = service.slug ? `/services/${service.slug}` : '/services';
                                return (
                                  <li key={service.id}><Link to={path}>{service.title}</Link></li>
                                );
                              })}
                          </ul>
                        </li>
                      </ul>
                    </li>

                    <li className="has-children">
                      <Link to="#">Tools</Link>
                      <ul className="sub-menu">
                        <li><Link to="/tools/volumetric-weight-calculator">Volumetric Weight Calculator</Link></li>
                        <li><Link to="/tools/incoterms">Incoterms</Link></li>
                      </ul>
                    </li>

                    <li><Link to="/contact">Contact</Link></li>
                    <li className="extra-menu-item menu-item-button-link" style={{ marginLeft: '30px', display: 'inline-block', verticalAlign: 'middle' }}>
                      <Link to="/contact" style={{
                        background: '#d64238',
                        color: 'white',
                        padding: '18px 38px',
                        borderRadius: '0px',
                        fontWeight: '700',
                        fontSize: '15px',
                        display: 'inline-block',
                        lineHeight: '1.2',
                        border: 'none',
                        transition: 'background 0.3s ease'
                      }}>Get A Quote</Link>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>

            {/* Hamburger Toggle */}
            <a
              href="#"
              className="navbar-toggle"
              onClick={(e) => { e.preventDefault(); setMobileOpen(!mobileOpen) }}
            >
              <span className="navbar-icon">
                <span className="navbars-line"></span>
              </span>
            </a>
          </div>
        </div>
      </header>
      {/* masthead end */}

      {/* Mobile Nav */}
      <div
        className={`primary-mobile-nav header-v1${mobileOpen ? ' open' : ''}`}
        id="primary-mobile-nav"
        role="navigation"
      >
        <a href="#" className="close-canvas-mobile-panel" onClick={(e) => { e.preventDefault(); setMobileOpen(false) }}>×</a>
        <ul className="menu">
          <li><Link to="/about">About us</Link></li>
          {cms.services.filter(s => s.active).map(service => {
            const path = service.slug ? `/services/${service.slug}` : '/services';
            return (
              <li key={service.id}><Link to={path}>{service.title}</Link></li>
            );
          })}
          <li><Link to="/tools">Tools</Link></li>
          <li><Link to="/contact">Contact</Link></li>
          <li className="extra-menu-item menu-item-button-link">
            <Link to="/contact" className="fh-btn btn">Get A Quote</Link>
          </li>
        </ul>
      </div>
      <div
        id="off-canvas-layer"
        className={`off-canvas-layer${mobileOpen ? ' active' : ''}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      {/* Scroll to top */}
      <a id="scroll-top" className="backtotop" href="#page-top"><i className="fa fa-angle-up"></i></a>
    </>
  )
}
