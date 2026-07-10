'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useData } from '../context/DataContext';

interface HeaderProps {
  isMobileActive: boolean;
  setIsMobileActive: (active: boolean) => void;
}

export default function Header({ isMobileActive, setIsMobileActive }: HeaderProps) {
  const { theme, toggleTheme, auditLogs, currentUser, logout, showToast } = useData();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const renderAvatar = (src?: string, name?: string, className?: string) => {
    if (src) {
      return <img className={className} src={src} alt="Avatar" />;
    }
    const initials = name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'BS';
    return (
      <div className={`${className} avatar-initials`}>
        {initials}
      </div>
    );
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    if (paths.length === 0) return { section: 'Console', current: 'Dashboard' };

    const formatName = (str: string) => {
      if (str === 'cms') return 'Website CMS';
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    if (paths[0] === 'documentation') {
      return { section: 'Guides', current: 'User Manual' };
    }

    return {
      section: 'Console',
      current: formatName(paths[0]),
    };
  };

  const breadcrumbs = getBreadcrumbs();
  const recentLogs = auditLogs.slice(0, 3);

  const handleLogout = () => {
    logout();
    showToast('Ending administrator session... Logged out.', 'info');
    router.push('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="hamburger-btn"
          id="hamburger-btn"
          title="Open Menu"
          onClick={() => setIsMobileActive(!isMobileActive)}
        >
          <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            viewBox="0 0 24 24"
            style={{ width: '24px', height: '24px' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="breadcrumb">
          <span>{breadcrumbs.section}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{breadcrumbs.current}</span>
        </div>

        <div className="search-container">
          <svg
            className="search-icon"
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search modules, users, reports, settings..."
          />
        </div>
      </div>

      <div className="header-right">
        <Link href="/documentation" className="doc-btn" title="Open Documentation" id="doc-btn">
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span>Documentation</span>
        </Link>

        <div className="header-actions">
          {/* Theme Toggle */}
          <button
            className="action-btn"
            id="theme-toggle"
            title="Switch Theme"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                />
              </svg>
            ) : (
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Notifications Dropdown */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              className="action-btn"
              id="notif-trigger"
              title="Notifications"
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {recentLogs.length > 0 && <span className="notification-badge"></span>}
            </button>

            {/* Dropdown container */}
            <div className={`notifications-dropdown ${notifOpen ? 'active' : ''}`}>
              <div className="notifications-header">
                <h4>Notifications</h4>
                <button
                  className="clear-notif-btn"
                  onClick={() => {
                    showToast('Notifications marked as read.', 'success');
                    setNotifOpen(false);
                  }}
                >
                  Mark all as read
                </button>
              </div>
              <div className="notifications-list">
                {recentLogs.length === 0 ? (
                  <div
                    style={{
                      padding: 'var(--space-6) var(--space-4)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                    }}
                  >
                    No new notifications.
                  </div>
                ) : (
                  recentLogs.map((log) => {
                    let badgeClass = '';
                    if (log.action.includes('added') || log.action.includes('Created')) {
                      badgeClass = 'success';
                    } else if (
                      log.action.includes('Deactivated') ||
                      log.action.includes('Deleted') ||
                      log.action.includes('Rejected')
                    ) {
                      badgeClass = 'warning';
                    }
                    return (
                      <div key={log.id} className="notification-item">
                        <div className={`notif-icon ${badgeClass}`}>
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                          </svg>
                        </div>
                        <div className="notif-details">
                          <p>{log.action}</p>
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="notifications-footer">
                <Link href="/settings" onClick={() => setNotifOpen(false)}>
                  View all activity logs
                </Link>
              </div>
            </div>
          </div>

          {/* User Profile dropdown */}
          <div className="user-profile" ref={profileRef}>
            <button
              className="profile-trigger"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
            >
              {renderAvatar(currentUser?.avatar, currentUser?.name, 'profile-avatar')}
              <div className="profile-info">
                <span className="profile-name">{currentUser?.name || 'Biswajit Shaw'}</span>
                <span className="profile-role">{currentUser?.role || 'Administrator'}</span>
              </div>
            </button>

            <div className={`profile-dropdown ${profileOpen ? 'active' : ''}`}>
              <div className="dropdown-user-header">
                {renderAvatar(currentUser?.avatar, currentUser?.name, 'dropdown-user-avatar')}
                <div className="dropdown-user-details">
                  <span
                    className="profile-name"
                    style={{ fontWeight: 600, display: 'block', fontSize: '0.85rem' }}
                  >
                    {currentUser?.name || 'Biswajit Shaw'}
                  </span>
                  <span className="dropdown-user-email">{currentUser?.email || 'biswa@easyfr8.com'}</span>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <ul className="dropdown-menu-list">
                <li>
                  <Link href="/settings" className="dropdown-menu-item" onClick={() => setProfileOpen(false)}>
                    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>My Profile & settings</span>
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="dropdown-menu-item" onClick={() => setProfileOpen(false)}>
                    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="9" y1="9" x2="21" y2="9"/></svg>
                    <span>System audit logs</span>
                  </Link>
                </li>
                <li>
                  <button
                    className="dropdown-menu-item logout-btn-trigger"
                    onClick={handleLogout}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
