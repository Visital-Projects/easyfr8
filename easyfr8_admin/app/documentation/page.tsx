'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useData } from '../../context/DataContext';
import '../../styles/documentation.css';

interface SearchItem {
  id: string;
  title: string;
  body: string;
}

export default function DocumentationPage() {
  const { theme, toggleTheme, showToast } = useData();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState('#introduction');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({ flow: true });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);

  const searchIndex: SearchItem[] = [
    { id: '#introduction',        title: 'Introduction',               body: 'Overview of the EasyFr8 Admin Panel purpose and role-based access.' },
    { id: '#workflow-diagram',    title: 'Admin → MySQL → React Flow', body: 'Dynamic data pipeline from admin forms to MySQL to React frontend.' },
    { id: '#screen-login',        title: 'Login Page',                 body: 'Authentication screen for admin staff. Email and password form.' },
    { id: '#screen-dashboard',    title: 'Dashboard Overview',         body: 'Metric cards, recent activities, and quick navigation.' },
    { id: '#screen-cms',          title: 'Website CMS Manager',        body: 'Homepage, About, Services, FAQ, Contact, Media, Partners, Statistics.' },
    { id: '#screen-blogs',        title: 'Blog & Updates',             body: 'Publish industry articles, notices, and shipping updates.' },
    { id: '#screen-freight-types',title: 'Freight Types Manager',      body: 'Ocean Freight, Air Freight configurations controlling booking tabs.' },
    { id: '#screen-shipment-types',title:'Shipment Types (FCL/LCL)',   body: 'FCL and LCL options bound to parent freight type.' },
    { id: '#screen-terms',        title: 'Incoterms (Terms)',          body: 'FOB, CIF, EXW trade terms loaded into booking checkout form.' },
    { id: '#screen-ports',        title: 'Ports Manager',              body: 'Port codes and names for origin/destination autocomplete dropdowns.' },
    { id: '#screen-containers',   title: 'Container Manager',          body: '20 GP, 40 HC, 40 Open Top sizes for FCL rate search and booking.' },
    { id: '#screen-rates',        title: 'Freight Rates Grid',         body: 'Price matrix matching mode, shipment type, origin, destination, container.' },
    { id: '#screen-bookings',     title: 'Booking Management',         body: 'Client shipment requests, status workflow, cargo notes.' },
    { id: '#screen-enquiries',    title: 'Enquiry Management',         body: 'Customer freight quote requests and follow-up notes.' },
    { id: '#screen-documents',    title: 'User Documents',             body: 'KYC uploads, import/export licences, address proofs.' },
    { id: '#screen-users',        title: 'User Management',            body: 'Admin staff accounts, roles, and access levels.' },
    { id: '#screen-settings',     title: 'System Settings',            body: 'Platform configuration, logo upload, password management.' },
    { id: '#button-docs',         title: 'Button Reference',           body: 'Full breakdown of Add, Save, Edit, Delete, Upload, Status Toggle.' },
    { id: '#website-conn',        title: 'User Website Integration',   body: 'Zero static data — all content fetched from API and MySQL.' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      setShowBackToTop(scrollTop > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('.doc-section[id]');
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection('#' + entry.target.id);
        });
      },
      { rootMargin: '-60px 0px -70% 0px', threshold: 0 }
    );
    sections.forEach((s) => observer.current?.observe(s));
    return () => sections.forEach((s) => observer.current?.unobserve(s));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(searchIndex.filter((i) => i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q)));
  }, [searchQuery]);

  const scrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileSidebarOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const toggleAcc = (k: string) => setOpenAccordions((p) => ({ ...p, [k]: !p[k] }));

  const navItem = (id: string, label: string) => (
    <a className={`doc-nav-item ${activeSection === id ? 'active' : ''}`} href={id} onClick={(e) => scrollTo(e, id)}>{label}</a>
  );

  // Reusable screenshot block
  const Screenshot = ({ file, caption }: { file: string; caption: string }) => (
    <div className="doc-screenshot" style={{ margin: '20px 0' }}>
      <div className="doc-screenshot-header">📷 {caption}</div>
      <img src={`/documentation/screenshots/${file}`} alt={caption} style={{ width: '100%', display: 'block', borderRadius: '0 0 6px 6px' }} />
    </div>
  );

  // Reusable action table
  const ActionTable = ({ rows }: { rows: [string, string, string][] }) => (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr><th>Button / Control</th><th>What it Does</th><th>Database / API Trigger</th></tr>
        </thead>
        <tbody>
          {rows.map(([btn, what, api], i) => (
            <tr key={i}>
              <td><strong>{btn}</strong></td>
              <td>{what}</td>
              <td><code style={{ fontSize: '12px' }}>{api}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div className="doc-progress-bar" style={{ width: `${scrollProgress}%` }}></div>

      {/* Top Nav */}
      <nav className="doc-topbar">
        <button className="doc-mobile-menu-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} aria-label="Open navigation">
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Link className="doc-topbar-logo" href="/dashboard">
          <img src="/assets/easyfr8.png" alt="EasyFr8 Logo" style={{ height: '32px' }} />
        </Link>
        <div className="doc-topbar-divider"></div>
        <span className="doc-topbar-title">Complete Operations Manual</span>
        <div className="doc-topbar-spacer"></div>
        <div className="doc-topbar-search" onClick={() => setSearchOpen(true)}>
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search manual… (Ctrl+K)" readOnly />
        </div>
        <div className="doc-topbar-actions">
          <button className="doc-theme-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark'
              ? <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /></svg>
              : <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            }
          </button>
          <Link href="/dashboard" className="doc-topbar-btn">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span>Back to Admin</span>
          </Link>
        </div>
      </nav>

      <div className="doc-layout">
        {/* Sidebar */}
        <aside className={`doc-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`} id="doc-sidebar">
          <div className="doc-nav-section">
            <p className="doc-nav-section-title">Getting Started</p>
            {navItem('#introduction', 'Introduction')}
            {navItem('#workflow-diagram', 'Admin → MySQL → React')}
          </div>
          <div className="doc-nav-section">
            <p className="doc-nav-section-title">Console</p>
            {navItem('#screen-login', 'Login Page')}
            {navItem('#screen-dashboard', 'Dashboard')}
          </div>
          <div className="doc-nav-section">
            <p className="doc-nav-section-title">Site Configuration</p>
            {navItem('#screen-cms', 'Website CMS')}
            {navItem('#screen-blogs', 'Blog & Updates')}
          </div>
          <div className="doc-nav-section">
            <p className="doc-nav-section-title">Freight Operations</p>
            {navItem('#screen-bookings', 'Bookings')}
            {navItem('#screen-freight-types', 'Freight Types')}
            {navItem('#screen-shipment-types', 'Shipment Types')}
            {navItem('#screen-terms', 'Incoterms (Terms)')}
            {navItem('#screen-ports', 'Ports Manager')}
            {navItem('#screen-containers', 'Container Manager')}
            {navItem('#screen-rates', 'Freight Rates')}
            {navItem('#screen-enquiries', 'Enquiries')}
          </div>
          <div className="doc-nav-section">
            <p className="doc-nav-section-title">Administration</p>
            {navItem('#screen-documents', 'User Documents')}
            {navItem('#screen-users', 'Users')}
            {navItem('#screen-settings', 'System Settings')}
          </div>
          <div className="doc-nav-section">
            <p className="doc-nav-section-title">References</p>
            {navItem('#button-docs', 'Button Reference')}
            {navItem('#website-conn', 'Website Integration')}
          </div>
        </aside>

        {/* Main */}
        <main className="doc-main" id="doc-main">

          {/* HERO */}
          <div className="doc-hero">
            <div className="doc-hero-title">EasyFr8 Admin Manual</div>
            <div className="doc-hero-desc">Complete visual guide covering every page, every button, and every form field in the Admin Panel — with live screenshots and database action breakdowns.</div>
            <div className="doc-hero-tags">
              <span className="doc-hero-tag">v2.0 Dynamic</span>
              <span className="doc-hero-tag">17 Modules</span>
              <span className="doc-hero-tag">Live Screenshots</span>
              <span className="doc-hero-tag">MySQL Pipeline</span>
            </div>
          </div>

          {/* INTRODUCTION */}
          <section className="doc-section" id="introduction">
            <h1 className="doc-section-title">Introduction</h1>
            <div className="doc-section-body">
              <p>The <strong>EasyFr8 Admin Panel</strong> is the central control workspace. Every dropdown, every rate, every port name, and every piece of content visible on the user-facing React website originates from this panel. There are <strong>zero hardcoded values</strong> on the frontend — everything is driven by MySQL data managed here.</p>
              <div className="doc-callout doc-callout-note">
                <strong>Sidebar Structure (as shown):</strong><br />
                <strong>CONSOLE:</strong> Dashboard<br />
                <strong>SITE CONFIGURATION:</strong> Website CMS · Blog &amp; Updates<br />
                <strong>FREIGHT OPERATIONS:</strong> Bookings · Freight Types · Shipment Types · Incoterms · Ports Manager · Container Manager · Freight Rates · Enquiries<br />
                <strong>ADMINISTRATION:</strong> User Documents · Users · System Settings
              </div>
            </div>
          </section>

          {/* WORKFLOW */}
          <section className="doc-section" id="workflow-diagram">
            <h1 className="doc-section-title">Admin → MySQL → React Workflow</h1>
            <div className="doc-section-body">
              <div style={{ background: 'var(--doc-code-bg)', border: '1px solid var(--doc-border)', padding: '24px', borderRadius: '8px', margin: '16px 0', fontFamily: 'monospace', fontSize: '13px', lineHeight: '2' }}>
                <div style={{ color: '#f15a24', fontWeight: 700 }}>① Admin Panel (localhost:3001)</div>
                <div style={{ paddingLeft: '20px' }}>Fill form → Click Save button</div>
                <div style={{ color: '#0056b3', fontWeight: 700 }}>② Next.js API Route Handler</div>
                <div style={{ paddingLeft: '20px' }}>POST /api/ports · PUT /api/freight-rates/[id] · DELETE /api/containers/[id]</div>
                <div style={{ color: '#28a745', fontWeight: 700 }}>③ MySQL Database (XAMPP)</div>
                <div style={{ paddingLeft: '20px' }}>INSERT / UPDATE / DELETE rows in tables: ports · freight_rates · containers · bookings</div>
                <div style={{ color: '#6f42c1', fontWeight: 700 }}>④ React User Website (localhost:3000)</div>
                <div style={{ paddingLeft: '20px' }}>Fetches /api/ports → Shows in autocomplete dropdown instantly</div>
              </div>
              <div className="doc-accordion">
                <button className={`doc-accordion-trigger ${openAccordions['flow'] ? 'open' : ''}`} onClick={() => toggleAcc('flow')}>
                  Example: Admin adds Port "Mumbai (INMUN)"
                </button>
                <div className={`doc-accordion-body ${openAccordions['flow'] ? 'open' : ''}`}>
                  <p>Admin goes to Ports Manager → clicks <strong>+ Add Port</strong> → enters Code: <code>INMUN</code>, Name: <code>Mumbai</code>, Country: <code>India</code>, Type: <code>Ocean</code> → clicks <strong>Save</strong>. The API runs <code>INSERT INTO ports</code>. Next time a user types "Mum" in the homepage Origin field, the autocomplete dropdown shows "Mumbai (INMUN)" from the live database.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── LOGIN ── */}
          <section className="doc-section" id="screen-login">
            <h2 className="doc-section-title">1. Login Page</h2>
            <div className="doc-section-body">
              <Screenshot file="login_page.png" caption="EasyFr8 Admin — Login Page" />
              <p>Secure entry point for all administrative staff. Credentials are validated against the <code>users</code> MySQL table.</p>
              <ActionTable rows={[
                ['Email Input', 'Enter registered admin email address', 'Validated against users table on submit'],
                ['Password Input', 'Enter account password (hidden)', 'Compared to bcrypt hash in database'],
                ['Login Button', 'Submit credentials and start session', 'POST /api/auth/login → sets JWT cookie'],
              ]} />
            </div>
          </section>

          {/* ── DASHBOARD ── */}
          <section className="doc-section" id="screen-dashboard">
            <h2 className="doc-section-title">2. Dashboard Overview</h2>
            <div className="doc-section-body">
              <Screenshot file="dashboard_page.png" caption="EasyFr8 Admin — Dashboard" />
              <p>The landing console after login. Shows real-time platform statistics and quick access controls.</p>
              <ActionTable rows={[
                ['Metric Cards (Rates / Ports / Bookings)', 'Display total active record counts from MySQL', 'GET /api/statistics (counts all key tables)'],
                ['Sidebar Navigation Links', 'Jump to any admin module instantly', 'Client-side Next.js routing — no page reload'],
                ['<< Collapse Button (top of sidebar)', 'Minimize sidebar to expand workspace', 'Toggles local UI state only'],
                ['Profile Dropdown (top-right)', 'Shows current user role and logout link', 'Logout: DELETE /api/auth/logout (clears cookie)'],
                ['Notifications Bell Icon', 'Displays last 10 system audit log entries', 'GET /api/audit-logs (live database query)'],
                ['Theme Toggle (Sun/Moon)', 'Switch between Light and Dark mode', 'Saves to localStorage, applies CSS variables'],
              ]} />
            </div>
          </section>

          {/* ── CMS ── */}
          <section className="doc-section" id="screen-cms">
            <h2 className="doc-section-title">3. Website CMS Manager</h2>
            <div className="doc-section-body">
              <Screenshot file="cms_page.png" caption="EasyFr8 Admin — Website CMS (Overview)" />
              <p>The Website CMS Manager is a multi-tab interface designed to manage all dynamic contents of the frontend user website. Here is a detailed breakdown of each of the 11 CMS subsections, complete with full-page screenshots and control references.</p>

              {/* 1. Homepage */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.1 Homepage / Hero Slides</h3>
                <p>Configures the homepage slider component including background banners, headers, descriptions, and CTA destination buttons.</p>
                <Screenshot file="cms_homepage.png" caption="CMS Tab: Homepage / Hero Banner Settings" />
                <ActionTable rows={[
                  ['+ Add Slide / New Slide', 'Opens slide creation panel.', 'POST /api/admin/cms/hero-slides'],
                  ['Title & Subtitle Fields', 'Text fields controlling main banner slogans.', 'Stored in cms_hero_slides'],
                  ['Image Upload Button', 'Selects banner graphic (stored under public/uploads).', 'Uploads media file path to slide record'],
                  ['CTA Link / Text', 'Input fields setting target button URL and label.', 'Updates action links on home carousel']
                ]} />
              </div>

              {/* 2. About */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.2 About Page</h3>
                <p>Manages company descriptions, history paragraphs, vision statements, and introductory team graphics.</p>
                <Screenshot file="cms_about.png" caption="CMS Tab: About Page Content Editor" />
                <ActionTable rows={[
                  ['Company Bio Textarea', 'Rich/plain text block describing history and mission.', 'PUT /api/cms with section=about'],
                  ['Vision / Mission Inputs', 'Distinct cards setting company core principles.', 'Updates dynamic about section blocks'],
                  ['Save About Details', 'Saves updated blocks and updates user view.', 'Commits to database content configuration']
                ]} />
              </div>

              {/* 3. Services */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.3 Services Page</h3>
                <p>Controls custom cards for logistics services offered (e.g., Customs Clearance, Warehousing, Local Haulage) displayed on the main services menu.</p>
                <Screenshot file="cms_services.png" caption="CMS Tab: Services Offered Cards Manager" />
                <ActionTable rows={[
                  ['+ Add Service Card', 'Creates a new logistics service feature block.', 'POST /api/cms with service data'],
                  ['Service Icon Selector', 'Allows choosing graphic icons to represent the service.', 'Stored as class reference/image path'],
                  ['Service Details Editor', 'Configures specific capabilities and features list.', 'Updates /services page descriptions']
                ]} />
              </div>

              {/* 4. FAQ */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.4 FAQ Page</h3>
                <p>Maintains dynamic accordion elements containing customer support question-and-answer pairs.</p>
                <Screenshot file="cms_faq.png" caption="CMS Tab: FAQ Question Accordions Manager" />
                <ActionTable rows={[
                  ['+ Add FAQ Row', 'Inserts blank row for question and answer values.', 'POST /api/cms section=faq'],
                  ['Question / Answer Inputs', 'Define title text and matching dropdown description.', 'Updates FAQ accordion blocks'],
                  ['Sort Order Value', 'Set numerical index mapping display ordering.', 'Controls list sort in frontend queries']
                ]} />
              </div>

              {/* 5. Contact */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.5 Contact Page</h3>
                <p>Maintains physical office coordinates, help desk phone numbers, social handles, and Google Maps embed codes.</p>
                <Screenshot file="cms_contact.png" caption="CMS Tab: Contact Details & Office Locations" />
                <ActionTable rows={[
                  ['Address Fields', 'Configure mailing and physical headquarters coordinates.', 'PUT /api/cms with section=contact'],
                  ['Help Desk Lines', 'Direct helpline telephone and email support parameters.', 'Instantly changes header contact links'],
                  ['Google Maps Embed Code', 'Accepts raw iframe maps coordinates for interactive widgets.', 'Renders dynamically inside website footer']
                ]} />
              </div>

              {/* 6. Static */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.6 Static Content</h3>
                <p>Controls legal disclosures, cookies notices, terms of service agreements, and global privacy policies.</p>
                <Screenshot file="cms_static.png" caption="CMS Tab: Static Texts & Policy Documents" />
                <ActionTable rows={[
                  ['Privacy Policy Editor', 'HTML-supported rich textarea setting policy clauses.', 'PUT /api/cms section=privacy'],
                  ['Terms & Conditions Block', 'Defines customer shipping agreement clauses.', 'PUT /api/cms section=terms'],
                  ['Save Policies Button', 'Applies configurations changes immediately.', 'Flushes cached text files dynamically']
                ]} />
              </div>

              {/* 7. Media */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.7 Media Library</h3>
                <p>An integrated repository manager allowing uploading and managing graphics asset, banner files, and client-downloadable documents.</p>
                <Screenshot file="cms_media.png" caption="CMS Tab: Asset Media Library Manager" />
                <ActionTable rows={[
                  ['Upload New File', 'Drag-and-drop or select graphics/PDF files to upload.', 'POST /api/admin/cms/media-upload'],
                  ['Copy URL Link', 'Copies path identifier to clipboard to use inside editor fields.', 'Links to uploaded asset location'],
                  ['Delete Media Button', 'Removes file from repository folder.', 'Deletes physical asset and references']
                ]} />
              </div>

              {/* 8. SEO */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.8 SEO Defaults</h3>
                <p>Manages global search engine optimizations settings, including site-wide meta titles, default keywords, search descriptions, and robot directives.</p>
                <Screenshot file="cms_seo.png" caption="CMS Tab: Global SEO Meta Tag Defaults" />
                <ActionTable rows={[
                  ['Default Meta Title', 'Sets global document title string for browser tabs.', 'Renders site-wide meta headers'],
                  ['Meta Description Field', 'Controls standard summary snippet seen on search engines.', 'Renders meta description tags'],
                  ['Keywords Input Box', 'Define commas-separated keyword tags for indexing.', 'Updates meta keywords lists']
                ]} />
              </div>

              {/* 9. Partners */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.9 Partners Grid</h3>
                <p>Manages shipping partners, logistics carriers, and client brand logos showcased on the homepage sliding carousel.</p>
                <Screenshot file="cms_partners.png" caption="CMS Tab: Partners & Shipping Line Logos Grid" />
                <ActionTable rows={[
                  ['+ Add Partner Brand', 'Opens card creator for partner brand names and logos.', 'POST /api/admin/cms/partners'],
                  ['Brand Image Selector', 'Uploads and crops company logo files.', 'Saves file link inside partner list'],
                  ['Delete Partner Card', 'Removes partner entry from homepage grid.', 'DELETE /api/admin/cms/partners/[id]']
                ]} />
              </div>

              {/* 10. Statistics */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.10 Statistics Metrics</h3>
                <p>Controls numeric statistics counters showcasing company achievements (e.g., "15+ Years Experience", "150+ Countries Reached") on the homepage.</p>
                <Screenshot file="cms_statistics.png" caption="CMS Tab: Dynamic Achievement Counters Settings" />
                <ActionTable rows={[
                  ['Statistic Label Input', 'Text setting metric explanation (e.g. "Countries Served").', 'Stored inside cms_statistics'],
                  ['Target Number Value', 'Configure numeric digit to show (e.g. "150").', 'Controls frontend rolling counter animations'],
                  ['Save Metrics Config', 'Saves the counter array config.', 'PUT /api/admin/cms/statistics/[id]']
                ]} />
              </div>

              {/* 11. Industries */}
              <div className="doc-cms-subsection" style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px', margin: '24px 0' }}>
                <h3 className="doc-section-subtitle" style={{ margin: '0 0 8px 0' }}>3.11 Industries Management</h3>
                <p>Configures custom industries cards served (e.g. Automotive, Pharmaceuticals, FMCG) containing descriptions and background images.</p>
                <Screenshot file="cms_industries.png" caption="CMS Tab: Industries Served Cards Editor" />
                <ActionTable rows={[
                  ['+ Add Industry Category', 'Opens entry panel for a new target cargo industry.', 'POST /api/admin/cms/industries'],
                  ['Industry Name / Info', 'Main titles and subheadings text fields.', 'Updates dynamic cards components'],
                  ['Delete Industry Button', 'Removes category card from website lists.', 'DELETE /api/admin/cms/industries/[id]']
                ]} />
              </div>

            </div>
          </section>

          {/* ── BLOGS ── */}
          <section className="doc-section" id="screen-blogs">
            <h2 className="doc-section-title">4. Blog &amp; Updates</h2>
            <div className="doc-section-body">
              <Screenshot file="blogs_page.png" caption="EasyFr8 Admin — Blog & Updates" />
              <p>Publish shipping industry articles, blank sailing notices, and regulatory updates to the website blog.</p>
              <ActionTable rows={[
                ['+ Add Blog Post', 'Opens form for title, content, category, and featured image', 'POST /api/blogs → inserts into blogs table'],
                ['Save Blog Post', 'Saves draft or publishes the article to website', 'PUT /api/blogs/[id] with published=true'],
                ['Edit Button', 'Re-opens the blog post editor with existing content', 'GET /api/blogs/[id] → pre-fills form'],
                ['Delete Button', 'Permanently removes the blog post', 'DELETE /api/blogs/[id]'],
              ]} />
            </div>
          </section>

          {/* ── FREIGHT TYPES ── */}
          <section className="doc-section" id="screen-freight-types">
            <h2 className="doc-section-title">5. Freight Types Manager</h2>
            <div className="doc-section-body">
              <Screenshot file="freight_types_page.png" caption="EasyFr8 Admin — Freight Types (List View)" />
              <p>Defines the top-level transport categories. These directly control which tabs appear in the homepage booking widget (e.g. "Ocean Freight" tab, "Air Freight" tab).</p>
              <Screenshot file="freight_types_add_modal.png" caption="EasyFr8 Admin — Add Freight Type Modal" />
              <ActionTable rows={[
                ['+ Add Freight Type', 'Opens popup with: ID · Name · Sort Order · Status fields', 'POST /api/freight-types → inserts into freight_types'],
                ['Save (popup)', 'Stores the new freight type to MySQL', 'INSERT INTO freight_types (id, name, sort_order, status)'],
                ['Edit Button', 'Pre-fills popup with existing row values', 'PUT /api/freight-types/[id] on save'],
                ['Delete Button', 'Shows confirmation dialog, then removes', 'DELETE /api/freight-types/[id] — cascades to shipment_types'],
                ['Status Toggle', 'Active = visible on website · Inactive = hidden', 'PUT /api/freight-types/[id] {status: "inactive"}'],
              ]} />
            </div>
          </section>

          {/* ── SHIPMENT TYPES ── */}
          <section className="doc-section" id="screen-shipment-types">
            <h2 className="doc-section-title">6. Shipment Types (FCL / LCL)</h2>
            <div className="doc-section-body">
              <Screenshot file="shipment_types_page.png" caption="EasyFr8 Admin — Shipment Types (List View)" />
              <p>Sub-categories bound to a parent Freight Type. FCL and LCL are child options of Ocean Freight. They appear as radio buttons on the booking widget when "Ocean Freight" is selected.</p>
              <Screenshot file="shipment_types_add_modal.png" caption="EasyFr8 Admin — Add Shipment Type Modal" />
              <ActionTable rows={[
                ['+ Add Shipment Type', 'Opens popup: Parent Freight Type (dropdown) · Name · Description · Status', 'POST /api/shipment-types'],
                ['Freight Type dropdown (in popup)', 'Selects parent mode — dynamically loaded from freight_types table', 'GET /api/freight-types populates dropdown'],
                ['Save (popup)', 'Stores shipment type linked to parent freight type', 'INSERT INTO shipment_types (freight_type_id, name, ...)'],
                ['Edit Button', 'Re-opens popup with existing row values', 'PUT /api/shipment-types/[id] on save'],
                ['Delete Button', 'Confirms then removes shipment type', 'DELETE /api/shipment-types/[id]'],
              ]} />
            </div>
          </section>

          {/* ── TERMS ── */}
          <section className="doc-section" id="screen-terms">
            <h2 className="doc-section-title">7. Incoterms (Terms)</h2>
            <div className="doc-section-body">
              <Screenshot file="terms_page.png" caption="EasyFr8 Admin — Incoterms List View" />
              <p>International trade terms (FOB, CIF, EXW, etc.) used in the checkout booking form as a required selection dropdown.</p>
              <Screenshot file="terms_add_modal.png" caption="EasyFr8 Admin — Add Incoterm Modal" />
              <ActionTable rows={[
                ['+ Add Incoterm', 'Opens popup: Term Code (e.g. FOB) · Status', 'POST /api/terms → inserts into terms table'],
                ['Save (popup)', 'Stores the trade term — instantly available in booking checkout form', 'INSERT INTO terms (id, name, status)'],
                ['Edit Button', 'Allows renaming or changing term status', 'PUT /api/terms/[id]'],
                ['Delete Button', 'Permanently removes the term from booking options', 'DELETE /api/terms/[id]'],
                ['Status = Inactive', 'Hides term from the booking checkout dropdown', 'User website filters WHERE status = "active"'],
              ]} />
            </div>
          </section>

          {/* ── PORTS ── */}
          <section className="doc-section" id="screen-ports">
            <h2 className="doc-section-title">8. Ports Manager</h2>
            <div className="doc-section-body">
              <Screenshot file="ports_page.png" caption="EasyFr8 Admin — Ports Manager (List View)" />
              <p>Every port code and name visible in the homepage search autocomplete and booking form dropdowns comes from this table. Adding a port here makes it immediately searchable on the frontend.</p>
              <Screenshot file="ports_add_modal.png" caption="EasyFr8 Admin — Add Port Modal" />
              <ActionTable rows={[
                ['+ Add Port', 'Opens popup with all 5 required fields', 'POST /api/ports → inserts into ports table'],
                ['Port Code field', 'UN/LOCODE format (5 chars, e.g. INMUN, SGPIN)', 'Stored as unique identifier — used in URL query params'],
                ['Port Name field', 'Human-readable name (e.g. "Mumbai")', 'Shown in autocomplete suggestions and booking form'],
                ['Country field', 'Country the port belongs to', 'Displayed alongside port name in dropdowns'],
                ['Freight Type field', 'Ocean = sea port · Air = airport/cargo terminal', 'Filters which ports appear when user selects Ocean vs Air tab'],
                ['Save (popup)', 'Commits new port to database', 'INSERT INTO ports — frontend shows it in autocomplete instantly'],
                ['Edit Button', 'Modify port code, name, country, or type', 'PUT /api/ports/[id]'],
                ['Delete Button', 'Removes port — disappears from all dropdowns', 'DELETE /api/ports/[id]'],
              ]} />
            </div>
          </section>

          {/* ── CONTAINERS ── */}
          <section className="doc-section" id="screen-containers">
            <h2 className="doc-section-title">9. Container Manager</h2>
            <div className="doc-section-body">
              <Screenshot file="containers_page.png" caption="EasyFr8 Admin — Container Manager (List View)" />
              <p>Manages available shipping container types. These populate the Container dropdown in the homepage FCL rate search and in the booking form.</p>
              <Screenshot file="containers_add_modal.png" caption="EasyFr8 Admin — Add Container Modal" />
              <ActionTable rows={[
                ['+ Add Container', 'Opens popup: Name · Description · Size · Status', 'POST /api/containers → inserts into containers table'],
                ['Name field', 'Container label shown to users (e.g. "40 HC", "20 GP")', 'Displayed in homepage container dropdown'],
                ['Description field', 'Internal specification text (e.g. "40\' High Cube")', 'Stored for reference — shown in admin table'],
                ['Size field', 'Physical size identifier (e.g. "40ft", "20ft")', 'Used for rate matching logic'],
                ['Save (popup)', 'Commits new container type to database', 'INSERT INTO containers — available in frontend instantly'],
                ['Edit Button', 'Modify container name, specs, or status', 'PUT /api/containers/[id]'],
                ['Delete Button', 'Removes container — disappears from rate search', 'DELETE /api/containers/[id] (SET NULL on freight_rates)'],
              ]} />
            </div>
          </section>

          {/* ── FREIGHT RATES ── */}
          <section className="doc-section" id="screen-rates">
            <h2 className="doc-section-title">10. Freight Rates Grid</h2>
            <div className="doc-section-body">
              <Screenshot file="rates_page.png" caption="EasyFr8 Admin — Freight Rates Grid (List View)" />
              <p>The pricing matrix. When a user searches for a route on the website (e.g. Singapore → Mumbai, 40 HC, FCL), the system matches against rows in this table and returns the price and transit time.</p>
              <Screenshot file="rates_add_modal.png" caption="EasyFr8 Admin — Add Freight Rate Modal (all 9 fields)" />

              <h3 className="doc-section-subtitle">Add Freight Rate Popup — All Fields Explained</h3>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead><tr><th>Field</th><th>Input Type</th><th>What It Controls</th><th>Data Source</th></tr></thead>
                  <tbody>
                    <tr><td><strong>Freight Mode</strong></td><td>Dropdown</td><td>Top-level transport category (Ocean / Air)</td><td>Loaded from <code>freight_types</code> table</td></tr>
                    <tr><td><strong>Shipment Type</strong></td><td>Dropdown</td><td>Sub-option (FCL / LCL / Air Cargo) — updates when Mode changes</td><td>Filtered from <code>shipment_types</code> by freight_type_id</td></tr>
                    <tr><td><strong>Origin Location</strong></td><td>Dropdown</td><td>Departure port/airport</td><td>Loaded from <code>ports</code> table</td></tr>
                    <tr><td><strong>Destination Location</strong></td><td>Dropdown</td><td>Arrival port/airport</td><td>Loaded from <code>ports</code> table</td></tr>
                    <tr><td><strong>Container</strong></td><td>Dropdown</td><td>Container size (required for FCL)</td><td>Loaded from <code>containers</code> table</td></tr>
                    <tr><td><strong>Price (USD)</strong></td><td>Number</td><td>Freight cost shown to users on rate results page</td><td>Entered manually — stored in <code>freight_rates.price</code></td></tr>
                    <tr><td><strong>Transit Time</strong></td><td>Number</td><td>Days to destination — shown alongside rate</td><td>Entered manually — stored in <code>freight_rates.transit_time</code></td></tr>
                    <tr><td><strong>Carrier</strong></td><td>Text</td><td>Shipping line name (e.g. Maersk, MSC)</td><td>Entered manually — stored in <code>freight_rates.carrier</code></td></tr>
                    <tr><td><strong>Status</strong></td><td>Select</td><td>Active = shown in search results · Inactive = hidden</td><td>Filters on <code>WHERE status = "active"</code></td></tr>
                  </tbody>
                </table>
              </div>

              <ActionTable rows={[
                ['+ Add Freight Rate', 'Opens the Add Rate popup with all 9 fields pre-populated with defaults', 'No DB action yet — initializes form state'],
                ['Save Button (popup)', 'Submits all 9 fields and creates new rate row', 'POST /api/freight-rates → INSERT INTO freight_rates'],
                ['Edit Button', 'Opens popup with existing rate values for modification', 'PUT /api/freight-rates/[id] on save'],
                ['Delete Button', 'Confirms then permanently removes rate', 'DELETE /api/freight-rates/[id]'],
              ]} />
            </div>
          </section>

          {/* ── BOOKINGS ── */}
          <section className="doc-section" id="screen-bookings">
            <h2 className="doc-section-title">11. Booking Management</h2>
            <div className="doc-section-body">
              <Screenshot file="bookings_page.png" caption="EasyFr8 Admin — Booking Management" />
              <p>Receives and manages shipment booking requests submitted by users on the React website checkout form.</p>
              <div className="doc-callout doc-callout-tip">
                <strong>User Journey:</strong> Homepage search → Rate results → Booking form → Submit → Booking appears here in <strong>Pending</strong> status.
              </div>
              <ActionTable rows={[
                ['Status Dropdown (Pending / Confirmed / Completed)', 'Change the shipment processing stage', 'PUT /api/bookings/[id] {status: "Confirmed"}'],
                ['View Details / Cargo Notes', 'Expand full booking — client name, email, phone, cargo description', 'Reads from bookings table payload (no new query)'],
                ['Delete Booking Button', 'Permanently removes the booking record', 'DELETE /api/bookings/[id] → removes from MySQL'],
              ]} />
            </div>
          </section>

          {/* ── ENQUIRIES ── */}
          <section className="doc-section" id="screen-enquiries">
            <h2 className="doc-section-title">12. Enquiry Management</h2>
            <div className="doc-section-body">
              <Screenshot file="enquiries_page.png" caption="EasyFr8 Admin — Enquiries" />
              <p>Collects customer freight quote enquiries submitted via the website contact/enquiry form.</p>
              <ActionTable rows={[
                ['View Enquiry Row', 'Read customer name, email, route, and message details', 'Fetched from enquiries table (GET /api/enquiries)'],
                ['Delete Button', 'Removes handled or spam enquiries from the list', 'DELETE /api/enquiries/[id]'],
              ]} />
            </div>
          </section>

          {/* ── DOCUMENTS ── */}
          <section className="doc-section" id="screen-documents">
            <h2 className="doc-section-title">13. User Documents</h2>
            <div className="doc-section-body">
              <Screenshot file="documents_page.png" caption="EasyFr8 Admin — User Documents" />
              <p>Manages KYC/compliance documents uploaded by registered users (import/export licences, address proofs, tax filings).</p>
              <ActionTable rows={[
                ['View Document', 'Preview or download the uploaded file', 'Links to file path stored in documents table'],
                ['Approve / Reject Status', 'Mark document as verified or rejected', 'PUT /api/documents/[id] {status: "approved"}'],
                ['Delete Button', 'Removes document record and file', 'DELETE /api/documents/[id]'],
              ]} />
            </div>
          </section>

          {/* ── USERS ── */}
          <section className="doc-section" id="screen-users">
            <h2 className="doc-section-title">14. User Management</h2>
            <div className="doc-section-body">
              <Screenshot file="users_page.png" caption="EasyFr8 Admin — Users" />
              <p>Manages all administrative staff accounts — their roles, access levels, and login credentials.</p>
              <ActionTable rows={[
                ['+ Add User', 'Opens user creation form: name, email, password, role', 'POST /api/users → hashes password, inserts into users'],
                ['Role Selector', 'Assign role: Administrator / Manager / Moderator', 'Stored in users.role — controls permission gates'],
                ['Edit Button', 'Modify name, email, or role of existing admin user', 'PUT /api/users/[id]'],
                ['Delete Button', 'Removes admin account from the panel', 'DELETE /api/users/[id]'],
              ]} />
            </div>
          </section>

          {/* ── SETTINGS ── */}
          <section className="doc-section" id="screen-settings">
            <h2 className="doc-section-title">15. System Settings</h2>
            <div className="doc-section-body">
              <Screenshot file="settings_page.png" caption="EasyFr8 Admin — System Settings" />
              <p>Platform-wide configuration including branding, contact details, and security options.</p>
              <ActionTable rows={[
                ['Company Name / Logo Upload', 'Updates the logo and company identity used across admin', 'PUT /api/settings/general → saves to settings table'],
                ['Email Configuration', 'SMTP settings for notification emails', 'PUT /api/settings/email'],
                ['Change Password', 'Updates the current logged-in admin\'s password', 'PUT /api/auth/profile with newPassword field'],
                ['Save Settings Button', 'Commits all configuration changes to database', 'PUT /api/settings/[section]'],
              ]} />
            </div>
          </section>

          {/* ── BUTTON REFERENCE ── */}
          <section className="doc-section" id="button-docs">
            <h1 className="doc-section-title">Universal Button Reference</h1>
            <div className="doc-section-body">
              <p>These button types appear consistently across <strong>every module</strong> in the admin panel:</p>
              <ActionTable rows={[
                ['+ Add / + New Button', 'Opens a blank creation popup/modal for that module', 'Initializes empty form state — no DB action yet'],
                ['Save Button (inside popup)', 'Submits all form fields and creates the new record', 'POST /api/<module> → INSERT INTO <table>'],
                ['Edit Button (table row)', 'Re-opens the popup pre-filled with that row\'s data', 'GET current values → PUT /api/<module>/[id] on submit'],
                ['Delete Button (table row)', 'Shows a confirm dialog then permanently removes', 'DELETE /api/<module>/[id] → removes MySQL row'],
                ['Upload Button', 'Accepts image/PDF files and stores them on the server', 'Multipart POST → saves to public/uploads/ → DB stores URL'],
                ['Status Active/Inactive Toggle', 'Shows or hides this record on the user website', 'PUT with {status: "inactive"} → frontend filters it out'],
                ['Cancel / Close Button (popup)', 'Discards changes and closes the popup', 'No DB action — resets form state'],
              ]} />
            </div>
          </section>

          {/* ── WEBSITE INTEGRATION ── */}
          <section className="doc-section" id="website-conn">
            <h1 className="doc-section-title">User Website Integration</h1>
            <div className="doc-section-body">
              <p>The React user website (<code>localhost:3000</code>) has <strong>zero static data</strong>. Everything is fetched from the API in real time:</p>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead><tr><th>Frontend UI Element</th><th>API Endpoint</th><th>Admin Module That Controls It</th></tr></thead>
                  <tbody>
                    <tr><td>Ocean / Air tabs on homepage</td><td>GET /api/freight-types</td><td>Freight Types Manager</td></tr>
                    <tr><td>FCL / LCL radio buttons</td><td>GET /api/shipment-types</td><td>Shipment Types Manager</td></tr>
                    <tr><td>Origin / Destination autocomplete</td><td>GET /api/ports?search=...</td><td>Ports Manager</td></tr>
                    <tr><td>Container size dropdown</td><td>GET /api/containers</td><td>Container Manager</td></tr>
                    <tr><td>Rate search results (price, carrier, days)</td><td>GET /api/freight-rates?origin=...&dest=...</td><td>Freight Rates Grid</td></tr>
                    <tr><td>Booking form Incoterms dropdown</td><td>GET /api/terms</td><td>Incoterms (Terms)</td></tr>
                    <tr><td>Homepage hero banner text & images</td><td>GET /api/cms/hero-slides</td><td>Website CMS → Homepage</td></tr>
                    <tr><td>Partners logo grid</td><td>GET /api/partners</td><td>Website CMS → Partners</td></tr>
                    <tr><td>Statistics metric cards</td><td>GET /api/statistics</td><td>Website CMS → Statistics</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* Back to Top */}
      <button className={`doc-back-top ${showBackToTop ? 'visible' : ''}`} id="doc-back-top" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
      </button>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="doc-search-overlay open" id="doc-search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="doc-search-container" onClick={(e) => e.stopPropagation()}>
            <div className="doc-search-header">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" id="doc-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search manual contents..." autoFocus />
              <button className="doc-search-close" onClick={() => setSearchOpen(false)}>&times;</button>
            </div>
            <div className="doc-search-results" id="doc-search-results">
              {searchResults.length > 0 ? searchResults.map((item) => (
                <a key={item.id} className="doc-search-result" href={item.id} onClick={(e) => scrollTo(e, item.id)}>
                  <div className="doc-search-result-icon">
                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <div className="doc-search-result-title">{item.title}</div>
                    <div className="doc-search-result-section">{item.body.slice(0, 100)}...</div>
                  </div>
                </a>
              )) : (
                <div className="doc-search-empty">{searchQuery ? `No results for "${searchQuery}"` : 'Type to search… (Ctrl+K)'}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
