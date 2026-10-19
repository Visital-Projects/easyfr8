import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCms } from '../context/CmsContext'
import { useUserAuth } from '../pages/user/UserAuthContext'
import logoImg from '../assets/images/easyfr8.png'
import { getImageUrl, normalizeCategory } from '../services/api'

const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function Navbar() {
  const { cms } = useCms()
  const { user, isAuthenticated, loading, logout } = useUserAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()
  const accountMenuRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      // original scripts.min.js scrolls trigger at 'l' (topbar outerHeight = 60px)
      setScrolled(window.scrollY > 60)
    }

    const handleResize = () => {
      // Desktop breakpoint is 992px; mobile nav handles < 992px
      setIsMobile(window.innerWidth < 992)
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

  // Close mobile nav and user dropdown on route change
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [location])

  // Click outside and escape key handling for user dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen])

  const handleLogout = async () => {
    setDropdownOpen(false)
    setMobileOpen(false)
    await logout()
  }

  // Determine top position of .site-header dynamically (topbar height = 46px)
  const headerTop = scrolled ? '0px' : (isMobile ? '0px' : '46px')

  return (
    <>
      {/* Topbar */}
      <div 
        id="fh-header-minimized" 
        className={`fh-header-minimized fh-header-v1${scrolled ? ' minimized' : ''}`}
      ></div>
      <div id="topbar" className="topbar">
        <div className="navbar-container">
          {/* LEFT: Spacer for grid/flex balance to ensure center alignment */}
          <div className="topbar-spacer" aria-hidden="true"></div>

          {/* CENTER: Phone + Email */}
          <div className="topbar-center topbar-widgets">
            <div id="cargo-office-location-widget-2" className="widget cargo-office-location-widget">
              <div className="office-location clearfix">
                <ul className="topbar-office active">
                  {cms?.contact?.phones?.[0] && <li><i className="flaticon-telephone" aria-hidden="true"></i>Phone {cms.contact.phones[0]}</li>}
                  {cms?.contact?.emails?.[0] && <li><i className="flaticon-web" aria-hidden="true"></i>{cms.contact.emails[0]}</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT: Social + Search */}
          <div className="topbar-right topbar-widgets text-right">
            <div className="widget cargohub-social-links-widget">
              <div className="list-social style-1">
                {cms?.contact?.socialLinks?.facebook && <a href={cms.contact.socialLinks.facebook} target="_blank" rel="noreferrer"><i className="fa fa-facebook"></i></a>}
                {cms?.contact?.socialLinks?.linkedin && <a href={cms.contact.socialLinks.linkedin} target="_blank" rel="noreferrer"><i className="fa fa-linkedin"></i></a>}
                {cms?.contact?.socialLinks?.twitter && <a href={cms.contact.socialLinks.twitter} target="_blank" rel="noreferrer"><i className="fa fa-twitter"></i></a>}
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
          <div className="navbar-container mobile_relative">
            <div className="navbar-row">
              {/* LEFT: Logo (Single Instance) */}
              <div className="site-logo">
                <Link to="/" className="logo">
                  <img
                    src={cms.contact?.logoImage ? getImageUrl(cms.contact.logoImage) : logoImg}
                    alt="Easyfr8"
                    className="site-main-logo logo-light show-logo"
                  />
                </Link>
                <h1 className="site-title"><Link to="/">Easyfr8</Link></h1>
                <h2 className="site-description">Connecting Global Markets Seamlessly</h2>
              </div>

              {/* CENTER: Navigation Menu */}
              <div className="site-menu">
                <nav id="site-navigation" className="main-nav primary-nav nav">
                  <ul className="menu">
                    <li><Link to="/about">About us</Link></li>

                    <li className="has-children services-menu-item tools-menu-item">
                      <Link to="/services" className="dropdown-toggle">Services</Link>
                      <ul className="sub-menu tools-dropdown services-dropdown">
                        <li>
                          <Link to="/services/core-services">
                            Core Services
                          </Link>
                        </li>
                        <li>
                          <Link to="/services/value-added-services">
                            Value Added Services
                          </Link>
                        </li>
                      </ul>
                    </li>

                    <li className="has-children tools-menu-item">
                      <Link to="#">Tools</Link>
                      <ul className="sub-menu tools-dropdown">
                        <li>
                          <Link to="/tools/volumetric-weight-calculator">
                            Volumetric Weight Calculator
                          </Link>
                        </li>
                        <li>
                          <Link to="/tools/incoterms">
                            Incoterms
                          </Link>
                        </li>
                      </ul>
                    </li>

                    <li><Link to="/blogs">Blogs</Link></li>
                    <li><Link to="/contact">Contact</Link></li>
                  </ul>
                </nav>
              </div>

              {/* RIGHT: Get A Quote Button & User Login / Account Dropdown */}
              <div className="navbar-cta-wrap">
                <Link to="/contact" className="navbar-cta-btn">
                  Get A Quote
                </Link>

                {loading && !user && localStorage.getItem('easyfr8_token') ? (
                  <div
                    style={{
                      width: '110px',
                      height: '40px',
                      borderRadius: '2px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className="fa fa-spinner fa-spin" style={{ color: '#94a3b8' }}></i>
                  </div>
                ) : isAuthenticated ? (
                  <div className="navbar-user-account-container" ref={accountMenuRef}>
                    <button
                      type="button"
                      className={`navbar-user-account-btn${dropdownOpen ? ' active' : ''}`}
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                      aria-label="User Account Menu"
                      id="navbar-user-account-btn"
                    >
                      <div className="navbar-user-avatar-chip">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name || 'Account'} className="navbar-user-avatar-img" />
                        ) : (
                          <span>{getInitials(user?.name)}</span>
                        )}
                      </div>
                      <span className="navbar-user-display-name">
                        {user?.name || 'My Account'}
                      </span>
                      <i className={`fa fa-chevron-down navbar-user-caret${dropdownOpen ? ' open' : ''}`}></i>
                    </button>

                    {dropdownOpen && (
                      <div className="navbar-user-dropdown-menu" role="menu" aria-labelledby="navbar-user-account-btn">
                        <div className="navbar-user-dropdown-header">
                          <div className="user-name">{user?.name || 'Shipper Account'}</div>
                          <div className="user-email">{user?.email || ''}</div>
                          <div className="user-badge">{user?.role || 'Verified Shipper'}</div>
                        </div>
                        <ul className="navbar-user-dropdown-list">
                          <li>
                            <Link
                              to="/user/dashboard"
                              className="navbar-user-dropdown-item"
                              role="menuitem"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <i className="fa fa-dashboard"></i>
                              <span>My Account / Dashboard</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/user/bookings"
                              className="navbar-user-dropdown-item"
                              role="menuitem"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <i className="fa fa-ship"></i>
                              <span>My Bookings</span>
                            </Link>
                          </li>
                          <li className="navbar-user-dropdown-divider" role="separator"></li>
                          <li>
                            <button
                              type="button"
                              className="navbar-user-dropdown-item navbar-user-logout-btn"
                              role="menuitem"
                              onClick={handleLogout}
                            >
                              <i className="fa fa-sign-out"></i>
                              <span>Logout</span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/user/login"
                    className="navbar-user-login-btn"
                  >
                    User Login
                  </Link>
                )}
              </div>
            </div>

            {/* Hamburger Toggle */}
            <a
              href="#"
              className="navbar-toggle"
              onClick={(e) => { e.preventDefault(); setMobileOpen(!mobileOpen) }}
            >
              <span></span>
              <span></span>
              <span></span>
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
          <li><Link to="/about" onClick={() => setMobileOpen(false)}>About us</Link></li>
          <li className="has-children">
            <Link to="/services/core-services" onClick={() => setMobileOpen(false)}>Core Services</Link>
            <ul className="sub-menu">
              {(cms?.services || [])
                .filter(s => s.active && normalizeCategory(s.category) === 'core')
                .map(service => {
                  const path = service.slug ? `/services/${service.slug}` : `/services/${service.id}`;
                  return (
                    <li key={service.id}><Link to={path} onClick={() => setMobileOpen(false)}>{service.title}</Link></li>
                  );
                })}
            </ul>
          </li>
          <li className="has-children">
            <Link to="/services/value-added-services" onClick={() => setMobileOpen(false)}>Value Added Services</Link>
            <ul className="sub-menu">
              {(cms?.services || [])
                .filter(s => s.active && normalizeCategory(s.category) === 'value-added')
                .map(service => {
                  const path = service.slug ? `/services/${service.slug}` : `/services/${service.id}`;
                  return (
                    <li key={service.id}><Link to={path} onClick={() => setMobileOpen(false)}>{service.title}</Link></li>
                  );
                })}
            </ul>
          </li>
          <li><Link to="/tools" onClick={() => setMobileOpen(false)}>Tools</Link></li>
          <li><Link to="/blogs" onClick={() => setMobileOpen(false)}>Blogs</Link></li>
          <li><Link to="/contact" onClick={() => setMobileOpen(false)}>Contact</Link></li>
          <li className="extra-menu-item menu-item-button-link">
            <Link to="/contact" className="fh-btn btn" onClick={() => setMobileOpen(false)}>Get A Quote</Link>
          </li>
          {isAuthenticated ? (
            <>
              <li className="extra-menu-item" style={{ marginTop: '15px', padding: '12px 16px', background: '#f8fafc', borderRadius: '4px', borderLeft: '4px solid #d64238' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#d64238', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0, overflow: 'hidden' }}>
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name || 'Account'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{getInitials(user?.name)}</span>
                    )}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {user?.name || 'My Account'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {user?.email}
                    </div>
                  </div>
                </div>
              </li>
              <li>
                <Link to="/user/dashboard" onClick={() => setMobileOpen(false)}>
                  <i className="fa fa-dashboard" style={{ marginRight: '8px', color: '#d64238' }}></i> My Account / Dashboard
                </Link>
              </li>
              <li>
                <Link to="/user/bookings" onClick={() => setMobileOpen(false)}>
                  <i className="fa fa-ship" style={{ marginRight: '8px', color: '#d64238' }}></i> My Bookings
                </Link>
              </li>
              <li className="extra-menu-item menu-item-button-link" style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="fh-btn btn"
                  style={{ width: '100%', background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5', padding: '10px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={handleLogout}
                >
                  <i className="fa fa-sign-out" style={{ marginRight: '6px' }}></i> Logout
                </button>
              </li>
            </>
          ) : (
            <li className="extra-menu-item menu-item-button-link" style={{ marginTop: '10px' }}>
              <Link
                to="/user/login"
                className="fh-btn btn navbar-user-login-mobile-btn"
                onClick={() => setMobileOpen(false)}
              >
                User Login
              </Link>
            </li>
          )}
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
