'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileActive: boolean;
  setIsMobileActive: (active: boolean) => void;
}

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileActive,
  setIsMobileActive,
}: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { type: 'section', title: 'Console' },
    {
      type: 'link',
      title: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    { type: 'section', title: 'Site Configuration' },
    {
      type: 'link',
      title: 'Website CMS',
      href: '/cms',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="9" y1="9" x2="21" y2="9" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Media Library',
      href: '/media',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Blog & Updates',
      href: '/blogs',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M16 8h2M16 12h2M16 16h2M6 8h6v8H6z" />
        </svg>
      ),
    },
    { type: 'section', title: 'Freight Operations' },
    {
      type: 'link',
      title: 'Bookings',
      href: '/bookings',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'User Documents',
      href: '/documents',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Freight Types',
      href: '/freight-types',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Shipment Types',
      href: '/shipment-types',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Incoterms (Terms)',
      href: '/terms',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Ports Manager',
      href: '/ports',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Container Manager',
      href: '/containers',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Freight Rates',
      href: '/rates',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      type: 'link',
      title: 'Enquiries',
      href: '/enquiries',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },

    {
      type: 'link',
      title: 'Users',
      href: '/users',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
        </svg>
      ),
    },
    { type: 'section', title: 'Settings' },
    {
      type: 'link',
      title: 'System Settings',
      href: '/settings',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.5 1z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${
          isMobileActive ? 'mobile-active' : ''
        }`}
        id="sidebar"
      >
        <div className="sidebar-logo-container">
          <Link href="/dashboard" className="sidebar-logo">
            <img src="/assets/easyfr8.png" alt="EasyFr8 Logo" className="logo-image" />
          </Link>
          <button
            className="sidebar-toggle-btn"
            id="sidebar-toggle"
            title="Collapse Sidebar"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <svg
              stroke="currentColor"
              fill="none"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ width: '18px', height: '18px' }}
            >
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item, idx) => {
            if (item.type === 'section') {
              return (
                <li key={idx} className="menu-section-title">
                  {item.title}
                </li>
              );
            }

            const active = pathname === item.href;
            return (
              <li key={idx} className={`menu-item ${active ? 'active' : ''}`}>
                <Link href={item.href!} className="menu-link" onClick={() => setIsMobileActive(false)}>
                  {item.icon}
                  <span className="menu-text">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
      
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebar-overlay ${isMobileActive ? 'active' : ''}`}
        onClick={() => setIsMobileActive(false)}
      ></div>
    </>
  );
}
