# EasyFr8 Changelog

All notable changes to the EasyFr8 platform are documented here.

---

## [0.1.0] — 2026-08-04

### Infrastructure
- ✅ Docker Compose configured with 3 services: MySQL 8, Next.js Admin, phpMyAdmin
- ✅ MySQL health check implemented (mysqladmin ping with 10 retries)
- ✅ Named volumes for MySQL data and uploads persistence
- ✅ easyfr8_network bridge network for inter-service communication
- ✅ phpMyAdmin moved from port 8080 to 8088 (conflicts with EnterpriseDB)
- ✅ Admin app rebuilt successfully with Docker (Node 20 Alpine, 3-stage build)
- ✅ DB_HOST configured for Docker internal communication (mysql service name)
- ✅ MySQL schema auto-initialized via docker-entrypoint-initdb.d

### Admin Panel — Core
- ✅ Next.js 16.2.10 admin application operational on port 3001
- ✅ JWT-based authentication (login/logout/profile/change-password)
- ✅ Session guard in dashboard layout with redirect to /login
- ✅ Collapsible sidebar with 17 navigation items
- ✅ Mobile-responsive sidebar with drawer overlay
- ✅ DataContext global state management
- ✅ Preloader component with animation
- ✅ Header component with user menu
- ✅ Pagination component (reusable)

### Admin Panel — Modules
- ✅ Dashboard with KPI cards, SVG line chart, audit log timeline, rate status widget
- ✅ Website CMS (hero slides, about, footer, industries, partners, statistics)
- ✅ Media Library (upload, list, delete)
- ✅ Blog & Updates (CRUD with slug, status, category, featured image)
- ✅ Bookings management
- ✅ Freight Types CRUD
- ✅ Shipment Types CRUD (linked to freight types)
- ✅ Incoterms/Terms CRUD
- ✅ Ports Manager (CRUD + Bulk Import + Bulk Export + Template Download)
- ✅ Container Manager (CRUD + Bulk Import + Bulk Export + Template Download + size filter)
- ✅ Freight Rates (CRUD + bulk import + rate history + activity log)
- ✅ Enquiries (CRUD + status management)
- ✅ Users (CRUD + role management)
- ✅ System Settings
- ✅ Locations management
- ✅ Freight Modes management
- ✅ Documentation page

### Ports Manager — Bulk Features
- ✅ Download Template button (generates Port_Import_Template.xlsx)
- ✅ Import button with modal
- ✅ Drag-and-drop file upload (XLSX and CSV)
- ✅ Preview with validation statistics (total/valid/invalid/duplicates)
- ✅ Row-level error reporting
- ✅ Import valid rows only
- ✅ Export button (XLSX/CSV format selection)
- ✅ Export selected rows feature

### Container Manager — Bulk Features
- ✅ Download Template button (generates Container_Import_Template.xlsx)
- ✅ Import button with modal
- ✅ Drag-and-drop file upload (XLSX and CSV)
- ✅ Validation preview with stats (total/valid/invalid/duplicates/invalid sizes)
- ✅ Import valid rows only
- ✅ Export button (XLSX/CSV)
- ✅ Export selected rows
- ✅ Size filter (20ft/40ft/45ft)

### APIs
- ✅ 64 API route files implemented
- ✅ All routes compiled in Docker build (68 pages, 0 errors)
- ✅ Auth routes: login, logout, profile, change-password
- ✅ CMS routes (public + admin)
- ✅ Full CRUD for: ports, containers, freight-types, shipment-types, terms, locations, users, enquiries, bookings, blogs, media, freight-rates, rates
- ✅ Bulk import for: ports, containers, freight-rates
- ✅ Export for: ports, containers
- ✅ Template for: ports, containers
- ✅ Rate history and activity log
- ✅ Audit log API (list + clear)
- ✅ Settings API (get + update by section)
- ✅ Test-db health endpoint
- ✅ Admin sync-master endpoint

### Database
- ✅ MySQL 8 schema with 20 tables
- ✅ utf8mb4 character set for full Unicode support
- ✅ Seed data: freight types, shipment types, locations, ports, containers, freight rates, default admin user
- ✅ 6,008 ports imported successfully
- ✅ Audit log table with indexed user_id and created_at
- ✅ Rate activity log table for freight rate change tracking

### User Panel (React/Vite)
- ✅ Vite + React 19 application
- ✅ React Router v7 routing
- ✅ CmsContext for fetching admin API data
- ✅ Home page (CMS-driven)
- ✅ About page
- ✅ Contact page with enquiry form
- ✅ Tools page
- ✅ Blog single page (by slug or ID)
- ✅ Booking form page
- ✅ Rates display page
- ✅ Dynamic service detail page
- ✅ Volumetric Weight Calculator tool
- ✅ Incoterms guide page
- ✅ Legacy route redirects (ocean-freight-forwarding, etc.)
- ✅ Preloader with 3.5s minimum display

### Documentation (This Audit)
- ✅ PROJECT_AUDIT_REPORT.md
- ✅ PROJECT_DOCUMENTATION.md
- ✅ API_DOCUMENTATION.md
- ✅ DATABASE_DOCUMENTATION.md
- ✅ DOCKER_DOCUMENTATION.md
- ✅ ADMIN_DOCUMENTATION.md
- ✅ USER_DOCUMENTATION.md
- ✅ PROJECT_STATUS.md
- ✅ CHANGELOG.md
- ✅ SCREENSHOT_INDEX.md

---

## [Pre-0.1.0] — Development History

### Infrastructure Fixes Applied
- Fixed MySQL ETIMEDOUT by configuring DB_HOST correctly for Docker network
- Fixed EADDRINUSE by configuring unique port binding per service
- Added MySQL health check to prevent premature admin startup
- Fixed phpMyAdmin port conflict (moved from 8080 to 8088)
- Fixed Docker build to use proper node:20-alpine image
- Added uploads volume for media file persistence

---

## Pending for Next Release

- [ ] Password hashing with bcrypt
- [ ] Email notifications for enquiries
- [ ] Automated E2E tests with Playwright
- [ ] Documents module UI page
- [ ] Re-enable React Docker service
- [ ] Role-based API guards
- [ ] Rate limiting on APIs
- [ ] Error monitoring (Sentry)
- [ ] Automated backup strategy
