# EasyFr8 Project Documentation

**Version:** 0.1.0  
**Last Updated:** 2026-08-04  
**Stack:** Next.js 16.2.10 · React 19 · MySQL 8 · Vite · Docker

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Admin Panel Modules](#admin-panel-modules)
5. [User Panel Pages](#user-panel-pages)
6. [Authentication System](#authentication-system)
7. [CMS System](#cms-system)
8. [Freight Operations](#freight-operations)
9. [Media Library](#media-library)
10. [Data Management](#data-management)
11. [Environment Configuration](#environment-configuration)

---

## Project Overview

EasyFr8 is a full-stack freight forwarding management platform consisting of:

- **Admin Panel** — Next.js 16 server-side application for managing all freight operations
- **User Panel** — React/Vite SPA for customers to browse services, book shipments, and check rates
- **Backend API** — Next.js API routes serving both admin and user panels
- **Database** — MySQL 8 with 20 tables managing all business data
- **Docker** — Containerized deployment with 3 services

### Production URLs
- Admin Panel: https://adminfr8.vnvision.in
- User Panel: https://easyfr8.vnvision.in

### Local Development URLs
- Admin Panel: http://localhost:3001
- User Panel: http://localhost:3000
- phpMyAdmin: http://localhost:8088

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Docker Network                   │
│                 easyfr8_network                  │
│                                                  │
│  ┌─────────────────┐    ┌──────────────────┐    │
│  │  easyfr8_admin  │    │  easyfr8_mysql   │    │
│  │  Next.js 16     │───▶│  MySQL 8         │    │
│  │  Port: 3001     │    │  Port: 3306      │    │
│  └─────────────────┘    └──────────────────┘    │
│                                ▲                 │
│  ┌─────────────────┐           │                 │
│  │ easyfr8_phpmyadmin│─────────┘                 │
│  │  phpMyAdmin      │                            │
│  │  Port: 8088      │                            │
│  └─────────────────┘                            │
└─────────────────────────────────────────────────┘

  ┌─────────────────────────────┐
  │  easyfr8 react (LOCAL ONLY) │
  │  Vite + React 19            │
  │  Port: 3000                 │
  │  [Docker service disabled]  │
  └─────────────────────────────┘
```

---

## Repository Structure

```
easyfr8/                              # Root
├── docker-compose.yml                # Docker orchestration (3 services)
├── .env.docker                       # Docker environment variables
├── .gitignore                        # Git ignore rules
├── PROJECT_AUDIT_REPORT.md           # ← This audit
├── PROJECT_DOCUMENTATION.md         # ← This document
├── docs/                             # Existing docs
│   └── Admin Panel Documentation v1.1.pdf
│
├── easyfr8_admin/                    # Next.js Admin Application
│   ├── app/
│   │   ├── (dashboard)/              # Protected dashboard pages (17 modules)
│   │   │   ├── layout.tsx            # Auth guard + sidebar layout
│   │   │   ├── dashboard/page.tsx    # Main dashboard KPIs
│   │   │   ├── cms/page.tsx
│   │   │   ├── media/page.tsx
│   │   │   ├── blogs/page.tsx
│   │   │   ├── bookings/page.tsx
│   │   │   ├── freight-types/page.tsx
│   │   │   ├── shipment-types/page.tsx
│   │   │   ├── terms/page.tsx        # Incoterms
│   │   │   ├── ports/page.tsx        # Ports Manager
│   │   │   ├── containers/page.tsx   # Container Manager
│   │   │   ├── rates/page.tsx        # Freight Rates
│   │   │   ├── enquiries/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── locations/page.tsx
│   │   │   ├── freight-modes/page.tsx
│   │   │   └── documentation/page.tsx
│   │   ├── api/                      # 64 API route files
│   │   ├── login/                    # Public login page
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Root redirect
│   │
│   ├── components/                   # 6 shared components
│   │   ├── Sidebar.tsx               # Navigation sidebar (17 links)
│   │   ├── Header.tsx                # Top header with user menu
│   │   ├── Preloader.tsx             # Loading spinner
│   │   ├── Pagination.tsx            # Reusable pagination
│   │   ├── Providers.tsx             # Context providers wrapper
│   │   └── ImportRatesModal.tsx      # Rates import modal
│   │
│   ├── context/
│   │   └── DataContext.tsx           # Global state (27,985 bytes)
│   │
│   ├── lib/
│   │   ├── db.ts                     # MySQL connection + all queries
│   │   ├── schema.sql                # Database schema + seed data
│   │   ├── store.ts                  # Data store layer
│   │   ├── csvUtils.ts               # CSV parsing utilities
│   │   ├── migrate.ts                # Database migration script
│   │   └── easyfr8_db.json           # DB export snapshot (335KB)
│   │
│   ├── styles/
│   │   └── dashboard.css             # Admin panel styles
│   │
│   ├── public/                       # Static assets
│   ├── Dockerfile                    # 3-stage build (deps→builder→runner)
│   ├── .env                          # Local development env
│   ├── .env.production               # Production env template
│   ├── next.config.ts                # Next.js configuration
│   ├── tsconfig.json                 # TypeScript config
│   └── package.json                  # Dependencies
│
└── easyfr8 react/                    # React User Panel (Vite)
    ├── src/
    │   ├── App.jsx                   # Router + AppLayout
    │   ├── pages/                    # 7+ pages
    │   │   ├── Home.jsx
    │   │   ├── About.jsx
    │   │   ├── Contact.jsx
    │   │   ├── Tools.jsx
    │   │   ├── BlogSingle.jsx
    │   │   ├── Booking.jsx
    │   │   ├── Rates.jsx
    │   │   └── services/ServiceDetail.jsx
    │   ├── components/               # Navbar, Footer, etc.
    │   ├── context/CmsContext.jsx    # CMS data fetching context
    │   └── services/                 # API service functions
    ├── Dockerfile                    # Nginx-based build
    ├── nginx.conf                    # Nginx config for React SPA
    └── package.json                  # Vite + React 19
```

---

## Admin Panel Modules

### 1. Dashboard (`/dashboard`)
**Purpose:** Overview of all system KPIs and recent activity.  
**Components:**
- Metric cards: Enquiries, Users, Active Rates, Rate Sync Status, Pending Enquiries, Filtered Enquiries, Published Blogs
- SVG line chart: Platform Enquiries Trend (filterable by 7d/30d/month/all)
- Recent Activity timeline from audit_logs
- Freight Rate Update Status widget
- Quick Admin Shortcuts grid

**Data Sources:** DataContext (enquiries, rates, users, auditLogs, rateHistory)  
**Known Issue:** "Published Blogs" card is hardcoded to `3` — not reading from database.

---

### 2. Website CMS (`/cms`)
**Purpose:** Manage all website content from admin.  
**Features:** Hero slides, About section, Footer, Industries, Partners, Statistics  
**API:** `/api/cms`, `/api/admin/cms/*`  
**DB Table:** `cms_data`

---

### 3. Media Library (`/media`)
**Purpose:** Upload and manage media files for CMS and blog use.  
**Features:** Image upload, file listing, delete  
**API:** `/api/media`, `/api/media/[id]`  
**DB Table:** `media`

---

### 4. Blog & Updates (`/blogs`)
**Purpose:** Create and manage blog posts and news articles.  
**Features:** Create, edit, delete blogs; set status (Published/Draft/Archived)  
**API:** `/api/blogs`, `/api/blogs/[id]`  
**DB Table:** `blogs` (0 rows currently)  
**Fields:** title, slug, content, excerpt, image, category, author, status, published_at

---

### 5. Bookings (`/bookings`)
**Purpose:** View and manage freight bookings submitted via user panel.  
**API:** `/api/bookings`, `/api/bookings/[id]`  
**DB Table:** `bookings`

---

### 6. Freight Types (`/freight-types`)
**Purpose:** Manage freight categories (Ocean Freight, Air Freight, etc.)  
**Features:** CRUD operations, status toggle  
**API:** `/api/freight-types`, `/api/freight-types/[id]`  
**DB Table:** `freight_types`  
**Seeded Data:** Ocean Freight (mode-ocean), Air Freight (mode-air)

---

### 7. Shipment Types (`/shipment-types`)
**Purpose:** Manage shipment categories (FCL, LCL, Air Standard)  
**Features:** CRUD, linked to freight_type  
**API:** `/api/shipment-types`, `/api/shipment-types/[id]`  
**DB Table:** `shipment_types`

---

### 8. Incoterms (`/terms`)
**Purpose:** Manage international trade terms (Incoterms).  
**API:** `/api/terms`, `/api/terms/[id]`  
**DB Table:** `terms`

---

### 9. Ports Manager (`/ports`)
**Purpose:** Manage global shipping port database.  
**Features:**
- CRUD operations
- Bulk Import (XLSX/CSV) with validation preview
- Bulk Export (XLSX/CSV)
- Download Import Template
- Search and pagination
- Row selection for selective export

**API:** `/api/ports` (5 endpoints)  
**DB Table:** `ports` (6,008 live rows)  
**Fields:** id, port_code, port_name, country, locode

---

### 10. Container Manager (`/containers`)
**Purpose:** Manage shipping container types.  
**Features:**
- CRUD operations
- Bulk Import (XLSX/CSV) with validation, preview stats
- Bulk Export (XLSX/CSV with format options)
- Download Import Template (`Container_Import_Template.xlsx`)
- Size filter (20ft/40ft/45ft)
- Multi-select rows + "Export Selected"
- Search and pagination

**API:** `/api/containers` (5 endpoints)  
**DB Table:** `containers` (4 live rows)  
**Seeded:** 20GP, 40GP, 40HC, 40OTH  
**Fields:** id, name, description, size, status

---

### 11. Freight Rates (`/rates`)
**Purpose:** Manage freight pricing routes.  
**Features:** CRUD, bulk import from CSV, history tracking  
**API:** `/api/rates` (4 endpoints), `/api/freight-rates` (3 endpoints)  
**DB Tables:** `rates`, `freight_rates`, `rate_activity_logs`

---

### 12. Enquiries (`/enquiries`)
**Purpose:** View and respond to customer freight enquiries.  
**Features:** View, status management, notes  
**API:** `/api/enquiries`, `/api/enquiries/[id]`  
**DB Table:** `enquiries`  
**Statuses:** New, In Progress, Responded, Closed

---

### 13. Users (`/users`)
**Purpose:** Manage admin panel users.  
**Features:** Create, edit, delete users; role management  
**API:** `/api/users`, `/api/users/[id]`  
**DB Table:** `users` (1 live row: biswa@easyfr8.com)  
**Roles:** Administrator, Manager, Content Moderator, Customer

---

### 14. Settings (`/settings`)
**Purpose:** System-wide configuration management.  
**API:** `/api/settings`, `/api/settings/[section]`

---

### 15. Locations (`/locations`)
**Purpose:** Manage port location reference data.  
**API:** `/api/locations`, `/api/locations/[id]`  
**DB Table:** `locations` (7 seeded rows)

---

### 16. Freight Modes (`/freight-modes`)
**Purpose:** Alias view for managing freight transport modes.  
**API:** `/api/freight/modes`, `/api/freight/modes/[id]`  
**DB Table:** `freight_types`

---

### 17. Documentation (`/documentation`)
**Purpose:** Built-in admin panel documentation page.  
**Features:** Static reference documentation

---

## User Panel Pages

Running at http://localhost:3000 (Vite dev server) or https://easyfr8.vnvision.in.

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Home | / | ✅ CMS-driven |
| 2 | About | /about | ✅ |
| 3 | Contact | /contact | ✅ |
| 4 | Tools | /tools | ✅ |
| 5 | Blog Single | /blog/:slugOrId | ✅ |
| 6 | Booking | /booking | ✅ |
| 7 | Rates | /rates | ✅ |
| 8 | Service Detail | /services/:slug | ✅ Dynamic |
| 9 | Volumetric Calculator | /tools/volumetric-weight-calculator | ✅ |
| 10 | Incoterms Guide | /tools/incoterms | ✅ |

**Legacy routes also supported:** /ocean-freight-forwarding, /air-freight-forwarding, /road-freight-forwarding, /warehousing, /door-to-door-delivery, /packaging-storage, /contract-handling, /cargo-insurance

**CmsContext** fetches data from the admin API endpoints to power the user panel content dynamically.

---

## Authentication System

- **Method:** JWT-based session authentication
- **Login Endpoint:** `POST /api/auth/login`
- **Session Storage:** Client-side via DataContext
- **Guard:** Dashboard layout checks `sessionActive` and redirects to `/login` if false
- **Default Admin:** biswa@easyfr8.com / admin123 (**Change in production**)
- **Roles:** Administrator, Manager, Content Moderator, Customer

---

## CMS System

The CMS system allows the admin to control all website-facing content without code changes.

**Managed Content:**
- Hero slides (title, subtitle, description, button, image, order)
- About section
- Footer content
- Industry categories
- Partner logos
- Statistics/counters

**Flow:** Admin edits → Saved to MySQL `cms_data` / individual tables → User panel fetches via `/api/cms/*` → Rendered on website

---

## Freight Operations

The freight operations stack handles the core business logic:

1. **Freight Types** — Top-level categories (Ocean, Air)
2. **Freight Modes** — Transport modes linked to types
3. **Shipment Types** — Sub-categories (FCL, LCL, Air Standard)
4. **Locations/Ports** — Origin/destination port database
5. **Containers** — Container size configurations
6. **Freight Rates** — Pricing matrix: origin × destination × container × mode
7. **Bookings** — Customer booking records

---

## Media Library

The media library manages uploaded files:

- Upload via admin UI
- Files stored in Docker volume `uploads_data` (mounted at `/app/uploads`)
- Accessible via `IMAGE_URL` environment variable
- Records stored in MySQL `media` table

---

## Environment Configuration

### Local Development (`.env`)
```
NODE_ENV=development
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=easyfr8
DB_USERNAME=easyfr8
DB_PASSWORD=easyfr8_password
JWT_SECRET=easyfr8_secret_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
UPLOAD_PATH=uploads
IMAGE_URL=http://localhost:3001/images
USER_PANEL_URL=http://localhost:3000
```

### Docker (`.env.docker`)
Same as local but DB_HOST points to `mysql` service name within Docker network.

### Production (`.env.production`)
```
NODE_ENV=production
DB_HOST=127.0.0.1  (aaPanel server)
DB_DATABASE=easyfr8
NEXT_PUBLIC_API_BASE_URL=https://adminfr8.vnvision.in/api
USER_PANEL_URL=https://easyfr8.vnvision.in
```
