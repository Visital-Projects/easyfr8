import React, { useState } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useUserAuth } from './UserAuthContext';
import RouteEnquiryModal from '../../components/RouteEnquiryModal';
import logoImg from '../../assets/images/easyfr8.png';
import './user-portal.css';

export default function UserPortalLayout({ children }) {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/user/login');
  };

  const shipperName = user?.name || 'Shipper Workspace';
  const shipperEmail = user?.email || '';
  const shipperPhone = user?.phone || '';
  const avatarUrl = user?.avatar;

  const initials = shipperName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'EF';

  return (
    <div className="user-portal-root">
      {/* ── Dedicated User Portal Header Bar ── */}
      <header className="portal-header-bar">
        <div className="portal-header-left">
          <Link to="/user/dashboard" className="portal-header-brand" title="EasyFr8 Shipper Portal">
            <img src={logoImg} alt="EasyFr8" className="portal-header-logo" />
            <span className="portal-header-badge">Shipper Portal</span>
          </Link>
        </div>

        <div className="portal-header-right">
          <Link to="/" className="portal-header-public-link" title="Visit EasyFr8 Public Website">
            <i className="fa fa-globe"></i>
            <span>Public Website</span>
          </Link>
          <div className="portal-header-user-chip">
            <span className="portal-header-user-avatar">{initials}</span>
            <span className="portal-header-user-name">{shipperName}</span>
          </div>
          <button
            type="button"
            className="portal-header-logout"
            onClick={handleLogout}
            title="Log out of User Portal"
          >
            <i className="fa fa-sign-out"></i>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ── Main Portal Workspace Container ── */}
      <div className="user-portal-container">
        {/* Top Shipper Banner */}
        <div className="portal-topbar">
          <div className="portal-topbar-shipper">
            {avatarUrl && avatarUrl.length > 5 ? (
              <img
                src={avatarUrl}
                alt={shipperName}
                className="portal-topbar-logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="portal-topbar-initials">{initials}</div>
            )}
            <div>
              <h2 className="portal-topbar-title">{shipperName}</h2>
              <div className="portal-topbar-subtitle">
                <span><i className="fa fa-envelope-o"></i> {shipperEmail}</span>
                {shipperPhone && <span><i className="fa fa-phone"></i> {shipperPhone}</span>}
                <span><i className="fa fa-check-circle" style={{ color: '#38bdf8' }}></i> Verified Shipper</span>
              </div>
            </div>
          </div>

          <div className="portal-topbar-actions">
            <button
              type="button"
              className="portal-btn-quote"
              onClick={() => setIsQuoteModalOpen(true)}
            >
              <i className="fa fa-plus-circle"></i> Submit Quote Request
            </button>
            <button
              type="button"
              className="portal-btn-logout"
              onClick={handleLogout}
            >
              <i className="fa fa-sign-out"></i> Logout
            </button>
          </div>
        </div>

        {/* Portal Sub-navigation Bar */}
        <nav className="portal-nav-tabs">
          <NavLink
            to="/user/dashboard"
            className={({ isActive }) => `portal-nav-tab ${isActive ? 'active' : ''}`}
          >
            <i className="fa fa-dashboard"></i> Dashboard
          </NavLink>
          <NavLink
            to="/user/bookings"
            className={({ isActive }) => `portal-nav-tab ${isActive ? 'active' : ''}`}
          >
            <i className="fa fa-ship"></i> My Bookings
          </NavLink>
          <NavLink
            to="/user/documents"
            className={({ isActive }) => `portal-nav-tab ${isActive ? 'active' : ''}`}
          >
            <i className="fa fa-file-text-o"></i> Document Management & Compliance
          </NavLink>
          <NavLink
            to="/user/enquiries"
            className={({ isActive }) => `portal-nav-tab ${isActive ? 'active' : ''}`}
          >
            <i className="fa fa-comments-o"></i> Enquiry Tracker & Quotations
          </NavLink>
          <NavLink
            to="/user/profile"
            className={({ isActive }) => `portal-nav-tab ${isActive ? 'active' : ''}`}
          >
            <i className="fa fa-building-o"></i> Profile & Branding
          </NavLink>
        </nav>

        {/* Active Page Content */}
        <main className="portal-main-area">{children || <Outlet />}</main>
      </div>

      {/* ── Dedicated User Portal Footer ── */}
      <footer className="portal-footer">
        <div className="portal-footer-inner">
          <span>&copy; {new Date().getFullYear()} EasyFr8 Logistics. Dedicated Shipper Portal.</span>
          <div className="portal-footer-links">
            <NavLink to="/user/dashboard">Dashboard</NavLink>
            <NavLink to="/user/bookings">Bookings</NavLink>
            <NavLink to="/user/documents">Documents</NavLink>
            <NavLink to="/user/enquiries">Enquiries</NavLink>
            <NavLink to="/user/profile">Settings</NavLink>
          </div>
        </div>
      </footer>

      {/* Embedded Route & Quote Enquiry Modal */}
      <RouteEnquiryModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        searchContext={{
          reason: 'custom_quote',
          modeName: 'Ocean Freight',
          originText: 'Custom Port / Origin',
          destinationText: 'Custom Destination',
        }}
        onSuccess={() => {
          setIsQuoteModalOpen(false);
        }}
      />
    </div>
  );
}
