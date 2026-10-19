# EasyFr8 Comprehensive System Analysis & Source of Truth

**Document Version:** 1.0.0  
**Analysis Date:** September 11, 2026  
**System Status:** Development / Local Windows XAMPP Environment  
**Mode:** Analysis-Only (No project source code files were modified during this analysis)

---

## 1. Executive Summary

EasyFr8 is an end-to-end digital freight forwarding platform designed to streamline ocean and air freight procurement, dynamic rate matching, port management, customer enquiries, shipment bookings, and public web presence for MSMEs.

The project consists of two coordinated applications connected to a single relational database:
1. **`easyfr8_admin`**: A Next.js 16.2.10 (React 19, Turbopack) application serving both as the Admin Dashboard UI (port 3001) and the central backend REST API (`/api/*`).
2. **`easyfr8 react`**: A standalone Vite 8.1.1 / React 19 single-page application (port 3000) delivering the public-facing portal, dynamic quote widget, incoterms / volumetric calculators, CMS-driven content, and client booking forms.
3. **Database**: MySQL running locally on XAMPP (`127.0.0.1:3306`, database: `easyfr8`), containing 22 tables including a comprehensive global catalog of **6,010 ports** and airports.

This report establishes the complete architectural baseline, investigates existing runtime errors and timeout behaviors, audits data null-safety, and details the structural requirements for scaling freight pricing without combinatorial explosion.

---

## 2. Project Architecture

### High-Level Component Flow

```
[ Public Customer Browser ]           [ Admin / Operations Browser ]
             │                                      │
             ▼                                      ▼
    easyfr8 react (Vite:3000)             easyfr8_admin (Next.js:3001)
   (Public Pages, Search Widget,          (Dashboard UI & Auth Sessions)
    Booking Form, Calculators)                      │
             │                                      │
             │ (HTTP JSON API requests)             │ (Internal / External API requests)
             └──────────────────┬───────────────────┘
                                ▼
                   easyfr8_admin REST API (Next.js App Router)
                                │
                                ▼
                       mysql2 Connection Pool
                                │
                                ▼
                       XAMPP MySQL Database (easyfr8:3306)
                      (22 Tables, 6,010 Ports, Rates, CMS)
```

### Key Technical Specifications

| Characteristic | Admin App (`easyfr8_admin`) | Public Web App (`easyfr8 react`) |
| :--- | :--- | :--- |
| **Framework / Bundler** | Next.js 16.2.10 (Turbopack) | Vite 8.1.1 (`@vitejs/plugin-react`) |
| **Language** | TypeScript 5.x | JavaScript (ESModules, JSX) |
| **React Version** | React 19.2.4 & React-DOM 19.2.4 | React 19.2.7 & React-DOM 19.2.7 |
| **Routing Architecture** | Next.js App Router (`app/` directory) | React Router DOM v7 (`react-router-dom: ^7.18.1`) |
| **HTTP Client** | Axios 1.18.1 + Native `fetch` | Axios 1.18.1 + Native `fetch` |
| **File Processing** | ExcelJS 4.4.0, XLSX 0.18.5 | Client-side CSV/Blob generation |
| **Local Port** | `http://localhost:3001` | `http://localhost:3000` |
| **Database Driver** | `mysql2/promise: ^3.22.5` | None (accesses DB strictly through REST API) |

---

## 3. Complete Directory Structure

```
easyfr8/
├── .env.docker
├── docker-compose.yml
├── easyfr8 (2).sql                   # 3.95MB canonical SQL database backup
├── easyfr8 react/                    # Public frontend (Vite React SPA)
│   ├── .env                          # VITE_API_URL=http://localhost:3001/api
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx                   # React Router route registry
│       ├── main.jsx                  # Root bootstrap
│       ├── context/
│       │   └── CmsContext.jsx        # Global CMS, slides, partners, testimonials state
│       ├── pages/
│       │   ├── Home.jsx              # Main landing page with dynamic rate search widget
│       │   ├── About.jsx             # Company mission and team overview
│       │   ├── Contact.jsx           # Contact form and office info
│       │   ├── Rates.jsx             # Public search results and quote enquiry submission
│       │   ├── Booking.jsx           # Comprehensive shipment booking form
│       │   ├── Tools.jsx             # Logistics utilities navigation
│       │   ├── BlogSingle.jsx        # Individual blog post viewer
│       │   ├── services/
│       │   │   └── ServiceDetail.jsx # Dynamic & backward-compatible service pages
│       │   └── tools/
│       │       ├── VolumetricWeightCalculator.jsx
│       │       └── Incoterms.jsx
│       └── services/
│           └── api.js                # Axios client with image resolver & auth interceptor
└── easyfr8_admin/                    # Admin Dashboard & Next.js REST Backend
    ├── .env                          # DB credentials, ports, JWT secret, API base URLs
    ├── package.json
    ├── next.config.ts                # Turbopack root config
    ├── tsconfig.json
    ├── context/
    │   └── DataContext.tsx           # Global state hydration for all admin modules
    ├── lib/
    │   ├── db.ts                     # MySQL connection pool, readDb/writeDb compatibility layer
    │   ├── schema.sql                # Complete schema DDL & initial seed scripts
    │   ├── store.ts                  # TypeScript models, default seed data
    │   └── csvUtils.ts               # CSV/Excel parsing and file export utilities
    ├── services/
    │   ├── api.ts                    # Admin frontend service abstractions
    │   ├── axios.ts                  # Axios instance with 10s timeout & bearer token injector
    │   └── endpoints.ts              # API endpoint path registry
    ├── app/
    │   ├── layout.tsx                # Root layout, styles, Providers wrapper
    │   ├── page.tsx                  # Root redirect (points to /dashboard)
    │   ├── login/
    │   │   └── page.tsx              # Admin authentication login screen
    │   ├── (dashboard)/
    │   │   ├── layout.tsx            # Protected dashboard layout (Sidebar, Header, Preloader)
    │   │   ├── dashboard/page.tsx    # Operational metrics & enquiry charts
    │   │   ├── rates/page.tsx        # Freight rates table, filter, modal CRUD, Excel/CSV I/O
    │   │   ├── ports/page.tsx        # Port manager with 6,000+ ports, modal CRUD, Excel I/O
    │   │   ├── containers/page.tsx   # Container sizing (20GP, 40GP, 40HC, etc.)
    │   │   ├── freight-modes/page.tsx# High-level freight modes (Ocean, Air)
    │   │   ├── freight-types/page.tsx# Freight type models and sort ordering
    │   │   ├── shipment-types/page.tsx# Shipment categories (FCL, LCL, Air Std)
    │   │   ├── locations/page.tsx    # Legacy port/terminal location mappings
    │   │   ├── bookings/page.tsx     # Client freight booking reviews & status transitions
    │   │   ├── enquiries/page.tsx    # Customer leads and quote enquiries
    │   │   ├── blogs/page.tsx        # Blog article publishing and auto-slugging
    │   │   ├── cms/page.tsx          # Multi-tab homepage, about, and static CMS editor
    │   │   ├── media/page.tsx        # Base64/media file storage and replacements
    │   │   ├── settings/page.tsx     # System, SMTP, SMS, Gateway, and Profile settings
    │   │   ├── terms/page.tsx        # Commercial Incoterms management
    │   │   └── users/page.tsx        # Admin user accounts and permissions
    │   └── api/                      # Next.js Serverless / App Router REST API endpoints
    │       ├── auth/
    │       ├── bookings/
    │       ├── cms/
    │       ├── containers/
    │       ├── enquiries/
    │       ├── freight/
    │       ├── freight-rates/
    │       ├── freight-types/
    │       ├── locations/
    │       ├── media/
    │       ├── ports/
    │       ├── rates/
    │       ├── settings/
    │       ├── shipment-types/
    │       ├── terms/
    │       ├── test-db/
    │       └── users/
```

---

## 4. Route & Page Inventory

### Public React Application (`easyfr8 react`)

| Route Path | Component | Primary Purpose | API Dependencies |
| :--- | :--- | :--- | :--- |
| `/` | `Home.jsx` | Landing page, hero slider, dynamic rate search widget, partner carousels | `GET /freight-types`, `GET /containers`, `GET /shipment-types`, `GET /ports?search=`, `GET /cms` |
| `/rates` | `Rates.jsx` | Matched rate display, carrier cost breakdown, booking enquiry submission | `GET /freight-rates`, `GET /freight/modes`, `GET /shipment-types`, `GET /locations`, `GET /containers`, `POST /enquiries` |
| `/booking` | `Booking.jsx` | Full freight booking submission form with ports, modes, container types | `GET /freight-types`, `GET /shipment-types`, `GET /terms`, `GET /ports`, `GET /containers`, `POST /bookings` |
| `/about` | `About.jsx` | Mission, vision, core values, company history | `GET /cms` (aboutUs block) |
| `/contact` | `Contact.jsx` | Customer support contact details, enquiry submission form | `GET /cms`, `POST /enquiries` |
| `/tools` | `Tools.jsx` | Utilities index (calculators, incoterms) | Static / CMS data |
| `/tools/volumetric-weight-calculator` | `VolumetricWeightCalculator.jsx` | Air and ocean volumetric weight calculator (CBM & dimensional ratios) | Client-side formula |
| `/tools/incoterms` | `Incoterms.jsx` | Comprehensive guide on FOB, CIF, EXW, DDP, DAP responsibilities | `GET /terms` |
| `/blog/:slugOrId` | `BlogSingle.jsx` | Individual blog post content viewer with reading time & tags | `GET /blogs` |
| `/services/:slug` | `ServiceDetail.jsx` | Dynamic service details page based on CMS service definitions | `GET /cms` (services block) |

### Admin Application (`easyfr8_admin`)

| Dashboard Route | Page Component | Functional Scope | Primary APIs Used |
| :--- | :--- | :--- | :--- |
| `/login` | `app/login/page.tsx` | Admin session authentication | `POST /api/auth/login` |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | KPI widgets, 7/30-day enquiry trend charts, recent audit logs | `DataContext` hydration |
| `/rates` | `app/(dashboard)/rates/page.tsx` | Dynamic freight rates matrix, multi-field search, Add/Edit modal, audit history modal, CSV/Excel import & export | `GET/POST /api/freight-rates`, `PUT/DELETE /api/freight-rates/[id]`, `GET /api/rates/history`, `POST /api/freight-rates/import` |
| `/ports` | `app/(dashboard)/ports/page.tsx` | 6,010 ports & airports inventory, autocomplete search, Add/Edit modal, Excel/CSV batch import with row validation preview and error report download | `GET/POST /api/ports`, `PUT/DELETE /api/ports/[id]`, `POST /api/ports/import`, `GET /api/ports/export`, `GET /api/ports/template` |
| `/containers` | `app/(dashboard)/containers/page.tsx` | Shipping container specifications, sizing, batch import/export | `GET/POST/PUT/DELETE /api/containers` |
| `/bookings` | `app/(dashboard)/bookings/page.tsx` | Customer booking records, cargo detail inspector, status updates (`Pending`, `Confirmed`, `Completed`) | `GET /api/bookings`, `PUT /api/bookings/[id]`, `DELETE /api/bookings/[id]` |
| `/enquiries` | `app/(dashboard)/enquiries/page.tsx` | Inbound quote leads, follow-up notes, operator assignment, status management | `GET/POST /api/enquiries`, `PUT/DELETE /api/enquiries/[id]` |
| `/freight-modes` | `app/(dashboard)/freight-modes/page.tsx` | Primary freight mode categories (Ocean Freight, Air Freight) | `GET/POST/PUT/DELETE /api/freight/modes` |
| `/freight-types` | `app/(dashboard)/freight-types/page.tsx` | Freight type definitions, status, sort orders | `GET/POST/PUT/DELETE /api/freight-types` |
| `/shipment-types` | `app/(dashboard)/shipment-types/page.tsx` | Mode-specific shipment types (FCL, LCL, Air Standard) | `GET/POST/PUT/DELETE /api/shipment-types` |
| `/terms` | `app/(dashboard)/terms/page.tsx` | Commercial trade terms (FOB, CIF, EXW) | `GET/POST/PUT/DELETE /api/terms` |
| `/blogs` | `app/(dashboard)/blogs/page.tsx` | Editorial blog management, live preview, auto-slug generation, image compression | `GET/POST /api/blogs`, `PUT/DELETE /api/blogs/[id]` |
| `/cms` | `app/(dashboard)/cms/page.tsx` | Multi-tab CMS controller (Hero slides, About, Services, FAQs, Contact, SEO, Partners, Stats, Industries) | `GET/POST /api/cms`, `GET/POST /api/admin/cms/*` |
| `/media` | `app/(dashboard)/media/page.tsx` | Central media library for uploaded images and branding assets | `GET/POST/PUT/DELETE /api/media` |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Company profile, password changes, SMTP settings, SMS gateways, payment keys, tax rules, site configs | `GET /api/settings`, `PUT /api/settings/[section]`, `POST /api/auth/change-password` |
| `/users` | `app/(dashboard)/users/page.tsx` | Administrative user accounts, roles (`Administrator`, `Manager`, `Content Moderator`), status | `GET/POST /api/users`, `PUT/DELETE /api/users/[id]` |

---

## 5. Component Architecture

### Admin Application Component Hierarchy

```
RootLayout (app/layout.tsx)
└── Providers (components/Providers.tsx)
    └── DataProvider (context/DataContext.tsx)
        └── DashboardLayout (app/(dashboard)/layout.tsx)
            ├── Preloader (components/Preloader.tsx) [Conditional]
            ├── Sidebar (components/Sidebar.tsx)
            ├── Header (components/Header.tsx)
            └── Page Content
                ├── RatesPage
                │   ├── ImportRatesModal (components/ImportRatesModal.tsx)
                │   ├── Rate Add/Edit Modal
                │   └── Rate Activity Audit Modal
                ├── PortsPage
                │   ├── Import Ports Modal & Validation Preview
                │   └── Port Add/Edit Modal
                └── Pagination (components/Pagination.tsx)
```

### Public React Application Component Hierarchy

```
CmsProvider (src/context/CmsContext.jsx)
└── BrowserRouter (react-router-dom)
    └── AppLayout
        ├── Preloader (Controlled timer & fadeout)
        ├── Navbar (src/components/Navbar.jsx)
        ├── Page Views (Home, Rates, Booking, About, Contact, Services, Tools)
        └── Footer (src/components/Footer.jsx)
```

---

## 6. Complete API Inventory

| Method | Route Path | Handler / Purpose | DB Table(s) Accessed | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user, return simulated JWT | `users` | No |
| `POST` | `/api/auth/logout` | Terminate session | None | Yes |
| `GET` | `/api/auth/profile` | Retrieve active authenticated user profile | `users` | Yes (Bearer) |
| `PUT` | `/api/auth/profile` | Update profile name, email, phone, avatar | `users`, `audit_logs` | Yes (Bearer) |
| `POST` | `/api/auth/change-password` | Change user account password | `users`, `audit_logs` | Yes (Bearer) |
| `GET` | `/api/settings` | Retrieve global `appSettings` JSON | `app_settings` | No |
| `PUT` | `/api/settings/[section]` | Update specific settings block (`smtp`, `payment`, `site`) | `app_settings` | No / Admin |
| `GET` | `/api/freight-rates` | List dynamic freight rates with joined port/mode/container names | `freight_rates`, `ports`, `freight_types`, `shipment_types`, `containers` | No |
| `POST` | `/api/freight-rates` | Create new freight rate record | `freight_rates`, `rate_activity_logs`, `audit_logs` | No / Admin |
| `PUT` | `/api/freight-rates/[id]` | Update existing freight rate | `freight_rates`, `rate_activity_logs`, `audit_logs` | No / Admin |
| `DELETE` | `/api/freight-rates/[id]` | Delete freight rate | `freight_rates`, `rate_activity_logs`, `audit_logs` | No / Admin |
| `POST` | `/api/freight-rates/import` | Batch import rates from Excel/CSV | `freight_rates`, `ports`, `freight_types`, `containers` | No / Admin |
| `GET` | `/api/rates/history` | Rate modification audit history | `rate_activity_logs` | No / Admin |
| `GET` | `/api/rates` | Legacy rates list from single JSON store | `rates` | No |
| `POST` | `/api/rates` | Legacy rate create | `rates`, `rate_activity_logs` | No / Admin |
| `GET` | `/api/ports` | Search and filter global ports catalog (supports query string `?search=&freight_type=`) | `ports` | No |
| `POST` | `/api/ports` | Insert new port | `ports` | No / Admin |
| `PUT` | `/api/ports/[id]` | Update port metadata | `ports` | No / Admin |
| `DELETE` | `/api/ports/[id]` | Delete port record | `ports` | No / Admin |
| `GET` | `/api/ports/export` | Stream XLSX or CSV export of ports | `ports` | No / Admin |
| `POST` | `/api/ports/import` | Multi-phase import validation, duplicate detection, and batch insertion | `ports` | No / Admin |
| `GET` | `/api/ports/template` | Generate formatted Excel template with in-sheet dropdown rules | None (ExcelJS) | No |
| `GET` | `/api/containers` | List standard shipping container types | `containers` | No |
| `POST/PUT/DEL` | `/api/containers/*` | CRUD container dimensions and names | `containers` | No / Admin |
| `GET` | `/api/freight-types` | List freight categories | `freight_types` | No |
| `POST/PUT/DEL` | `/api/freight-types/*` | CRUD freight categories | `freight_types` | No / Admin |
| `GET` | `/api/freight/modes` | Alias route for freight types | `freight_types` | No |
| `GET` | `/api/shipment-types` | List shipment types filtered by freight type | `shipment_types` | No |
| `POST/PUT/DEL` | `/api/shipment-types/*` | CRUD shipment types | `shipment_types` | No / Admin |
| `GET` | `/api/terms` | List commercial Incoterms | `terms` | No |
| `POST/PUT/DEL` | `/api/terms/*` | CRUD Incoterms | `terms` | No / Admin |
| `GET` | `/api/bookings` | Retrieve all customer bookings with joined route details | `bookings`, `ports`, `containers`, `freight_types`, `terms` | No / Admin |
| `POST` | `/api/bookings` | Submit new customer shipment booking | `bookings` | No |
| `PUT/DELETE` | `/api/bookings/[id]` | Update booking status (`Pending` → `Confirmed`) or remove | `bookings` | No / Admin |
| `GET` | `/api/enquiries` | Retrieve customer quote enquiries | `enquiries` | No / Admin |
| `POST` | `/api/enquiries` | Submit inbound enquiry lead | `enquiries` | No |
| `PUT/DELETE` | `/api/enquiries/[id]` | Update enquiry notes/status or delete | `enquiries` | No / Admin |
| `GET` | `/api/cms` | Retrieve public website CMS content | `cms_data` | No |
| `POST` | `/api/cms` | Update CMS content | `cms_data` | No / Admin |
| `GET/POST` | `/api/admin/cms/hero-slides` | Manage homepage hero slider items | `hero_slides` | No / Admin |
| `GET/POST` | `/api/admin/cms/partners` | Manage partner logos carousel | `partners` | No / Admin |
| `GET/POST` | `/api/admin/cms/statistics` | Manage homepage counter statistics | `statistics` | No / Admin |
| `GET/POST` | `/api/admin/cms/industries` | Manage industries served cards | `industries` | No / Admin |
| `GET/POST/DEL` | `/api/media/*` | Media library upload, replacement, deletion | `media` | No / Admin |
| `GET/POST/PUT` | `/api/blogs/*` | Blog content management and retrieval | `blogs` | No |
| `GET/POST` | `/api/audit-logs/*` | Read and clear system activity audit logs | `audit_logs` | No / Admin |
| `GET` | `/api/test-db` | Verify live connection to MySQL on XAMPP | Internal MySQL query (`SELECT NOW()`) | No |

---

## 7. Database Schema Analysis

The MySQL database `easyfr8` contains **22 tables**.

### Schema DDL & Actual Table Details

```sql
-- 1. Global Ports & Airports Catalog (6,010 records)
CREATE TABLE ports (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  port_code    VARCHAR(10)  NOT NULL UNIQUE,
  port_name    VARCHAR(255) NOT NULL,
  country      VARCHAR(100) NOT NULL,
  locode       VARCHAR(20)  DEFAULT NULL,
  freight_type VARCHAR(64)  NOT NULL DEFAULT 'Ocean', -- 'Ocean' (6,008 rows) | 'Air' (2 rows)
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (port_code)
);

-- 2. Dynamic Freight Rates (6 records currently seeded)
CREATE TABLE freight_rates (
  id               VARCHAR(64)   NOT NULL PRIMARY KEY,
  freight_mode_id  VARCHAR(64)   NOT NULL,
  shipment_type_id VARCHAR(64)   NOT NULL,
  origin_id        VARCHAR(64)   NOT NULL,
  destination_id   VARCHAR(64)   NOT NULL,
  container_id     VARCHAR(64)   DEFAULT NULL,
  price            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency         VARCHAR(10)   NOT NULL DEFAULT 'USD',
  transit_time     INT(11)       NOT NULL DEFAULT 0,
  carrier          VARCHAR(255)  DEFAULT NULL,         -- NULLABLE (Carrier is intentionally optional)
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (freight_mode_id),
  INDEX (shipment_type_id),
  INDEX (origin_id),
  INDEX (destination_id),
  INDEX (container_id)
);

-- 3. Freight Modes & Types
CREATE TABLE freight_types (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(128) NOT NULL,
  status     ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order INT(11)      NOT NULL DEFAULT 0,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Shipment Types
CREATE TABLE shipment_types (
  id              VARCHAR(64)  NOT NULL PRIMARY KEY,
  freight_type_id VARCHAR(64)  NOT NULL,
  name            VARCHAR(128) NOT NULL,
  description     TEXT,
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Containers
CREATE TABLE containers (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  description TEXT,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Customer Shipment Bookings
CREATE TABLE bookings (
  id                VARCHAR(64)  NOT NULL PRIMARY KEY,
  booking_no        VARCHAR(64)  NOT NULL,
  user_name         VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(64)  DEFAULT '',
  freight_type_id   VARCHAR(64)  NOT NULL,
  shipment_type_id  VARCHAR(64)  NOT NULL,
  term_id           VARCHAR(64)  NOT NULL,
  loading_port_id   VARCHAR(64)  NOT NULL,
  discharge_port_id VARCHAR(64)  NOT NULL,
  container_id      VARCHAR(64)  DEFAULT NULL,
  cargo_details     TEXT,
  status            ENUM('Pending','Confirmed','Completed') NOT NULL DEFAULT 'Pending',
  created_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. App Settings & Configuration (JSON document)
CREATE TABLE app_settings (
  id         INT(11)  NOT NULL PRIMARY KEY DEFAULT 1,
  data       LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 8. CMS Homepage & Site Content (JSON document)
CREATE TABLE cms_data (
  id         INT(11)  NOT NULL PRIMARY KEY DEFAULT 1,
  data       LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 9. Commercial Incoterms
CREATE TABLE terms (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(128) NOT NULL,
  status     ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. Admin Users
CREATE TABLE users (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  phone      VARCHAR(64)  DEFAULT '',
  password   VARCHAR(512) NOT NULL DEFAULT 'admin123',
  role       ENUM('Administrator','Manager','Content Moderator','Customer') NOT NULL DEFAULT 'Customer',
  status     ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  avatar     VARCHAR(512) DEFAULT '',
  reg_date   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME     DEFAULT NULL,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Additional Auxiliary Tables
- `audit_logs`: Timestamped system administrator operations log.
- `rate_activity_logs`: Historical diff records for rate creation, updates, and removals.
- `enquiries`: Customer leads and quote requests generated from public quote forms.
- `blogs`: Editorial articles with slugs, HTML body, author, and publication statuses.
- `hero_slides`, `partners`, `statistics`, `industries`: Content management relational tables for the homepage.
- `media`: Base64 and URL assets uploaded through the Admin Media Library.
- `locations`: Legacy 7-port seed table superseded by `ports`.
- `rates`: Legacy simple freight rate table (used by fallback store).

---

## 8. Port System Analysis

### Current Status
- **Total Ports in Database:** **6,010 records**.
- **Distribution:**
  - `Ocean`: **6,008 maritime ports** (e.g., Shanghai `CNSHA`, Rotterdam `NLRTM`, Singapore `SGPIN`, Los Angeles `USLAX`, Nhava Sheva `INNSV`).
  - `Air`: **2 airports** currently designated with `freight_type = 'Air'` (`AMS` Amsterdam Schiphol, `SIN` Singapore Changi).
- **Primary Keys:** Unique string IDs (e.g., `port-AMS`, `loc-sgpin`, `port-USLAX-841`).
- **Unique Constraint:** `port_code` (`VARCHAR(10)` UNIQUE) enforced in MySQL.

### Architectural Scalability Assessment
1. **Frontend Autocomplete Performance:**
   - Both the public search widget (`Home.jsx`) and admin modals query `/api/ports?search=<query>&freight_type=<type>`.
   - The query executes `SELECT * FROM ports WHERE (port_name LIKE ? OR port_code LIKE ? OR country LIKE ?) AND freight_type = ? ORDER BY port_name ASC`.
   - In MySQL, `LIKE '%query%'` cannot use standard B-Tree index prefixes and performs a full-table scan of 6,010 rows.
   - While 6,010 rows scan in ~3–10ms locally in MySQL, this will degrade under concurrent traffic. Adding a `FULLTEXT(port_code, port_name, country)` index or caching active ports in-memory will ensure sub-millisecond lookups.
2. **Combinatorial Risk:**
   - **Critical Rule:** Never attempt to create a static pre-computed distance matrix for 6,010 ports ($6,010 \times 6,010 = 36,120,100$ combinations). Doing so would inflate database storage to gigabytes and make rate updates unmaintainable.

---

## 9. Freight Rates & Pricing Architecture

### Current Implementation Flow

```
Admin Form (`rates/page.tsx`)
    │ (Validation: Origin, Dest, Mode, Shipment Type, Container required if Ocean, Carrier OPTIONAL)
    ▼
Rate ID Generation: Frontend generates `frate-${Math.floor(100 + Math.random() * 900)}`
    │ (If ID not provided, backend generates fallback: `frate-${Math.floor(100 + Math.random() * 900)}`)
    ▼
HTTP POST /api/freight-rates
    │ (Validates container presence if ocean; treats carrier as nullable: `carrier || null`)
    ▼
MySQL INSERT INTO freight_rates
    │ (Stores carrier as VARCHAR(255) NULL)
    ▼
Audit Log & Activity Diff:
    `logRateActivity(rateId, 'create', null, rate, operator)`
    ▼
Response 200 OK → UI re-fetches list (`fetchData()`)
```

### Public Search & Matching Flow
```
Customer Search Widget (`Home.jsx`)
    │ (Selects Mode, Shipment Type, Origin Port, Dest Port, Container Type)
    ▼
Redirects to `/rates?mode_id=...&origin_id=...&destination_id=...&container_id=...`
    ▼
Rates.jsx calls:
    `GET /api/freight-rates?mode_id=...&origin_id=...&destination_id=...&container_id=...`
    ▼
Backend executes exact match:
    `WHERE fr.freight_mode_id = ? AND fr.origin_id = ? AND fr.destination_id = ? AND fr.container_id = ?`
    ▼
If match found:
    Displays matched Carrier, Transit Days, Price ($).
If no direct rate exists:
    Displays empty state with "Custom Quote Requested" enquiry button.
```

### Current vs. Planned Architecture

| Dimension | Current Implementation | Planned Scalable Direction |
| :--- | :--- | :--- |
| **Pricing Model** | Static route rates (Point-to-Point direct lookup table) | Dynamic rule-based pricing engine |
| **Ocean Freight** | Exact port-to-port match in `freight_rates` | Sea distance / nautical miles $\times$ base TEU rate $+$ carrier surcharges (BAF, CAF, THC) |
| **Air Freight** | Exact airport match; container nullable | Great-circle distance $\times$ chargeable weight rate (actual vs volumetric weight using $1:6000$ ratio) |
| **Carrier Assignment** | Optional per rate line (`carrier: string \| null`) | Carrier contracts / tiers or spot rates mapped dynamically |
| **Routing Intelligence** | No intermediate transit routing | Future Searoutes API / routing engine for maritime pathing & distance |

---

## 10. Runtime Errors & Investigations

### Error 1: `TypeError: Cannot read properties of null (reading 'toLowerCase')`

- **Location:** `easyfr8_admin/app/(dashboard)/rates/page.tsx`
- **Original Source Code Line:**
  ```typescript
  // Before fix:
  const filteredRates = rates.filter((r) =>
    r.carrier.toLowerCase().includes(searchQuery.toLowerCase()) || ...
  );
  ```
- **Root Cause:**
  1. The business rule explicitly allows Carrier to be optional in the database (`carrier = NULL`).
  2. When the backend returned `{ carrier: null }`, client-side execution of `r.carrier.toLowerCase()` threw an uncaught TypeError, crashing the React component tree inside Next.js / Turbopack.
  3. Other fields (`origin_name`, `destination_name`) and `log.actionType` also lacked consistent null coalescing.
- **Resolution Strategy Applied:**
  - Replaced unsafe expression with single lowercased query and null-coalesced accessors:
    ```typescript
    const query = (searchQuery ?? '').toLowerCase();
    const filteredRates = rates.filter((r) =>
      (r.carrier ?? '').toLowerCase().includes(query) ||
      (r.origin_name ?? '').toLowerCase().includes(query) ||
      (r.origin_code ?? '').toLowerCase().includes(query) ||
      (r.destination_name ?? '').toLowerCase().includes(query) ||
      (r.destination_code ?? '').toLowerCase().includes(query) ||
      (r.id ?? '').toLowerCase().includes(query)
    );
    ```
  - Updated `interface FreightRate` to `carrier: string | null`.
  - Updated edit form initialization: `setFormCarrier(rate.carrier || '')`.
  - Updated history badge: `{(log.actionType ?? '').toUpperCase()}`.

---

### Error 2: `GET /settings failed: timeout of 10000ms exceeded`

- **Location:** `easyfr8_admin/services/axios.ts` → `SettingsService.get()` → `/api/settings`
- **Root Cause Investigation:**
  1. **Axios Configuration:** In `easyfr8_admin/services/axios.ts`, `timeout` was configured to `10000` (10 seconds).
  2. **Base URL Resolution:** In Next.js client-side execution, Axios was configured with:
     ```typescript
     baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
     ```
     When `NEXT_PUBLIC_API_BASE_URL` was previously set to an external or unreachable address (or when the server was hung on cold database compilation), requests to `/settings` exceeded 10,000ms and threw `ApiError: GET /settings failed: timeout of 10000ms exceeded`.
  3. **Backend Route Performance:** Direct curl and PowerShell measurement against the local server (`http://localhost:3001/api/settings`) confirmed:
     - The endpoint exists and returns `200 OK` in **~115ms**.
     - SQL query executed: `SELECT data FROM app_settings WHERE id = 1`.
  4. **Frontend Architecture Flaw:** In `easyfr8_admin/context/DataContext.tsx`, the `loadData()` effect executed 9 heavy API requests concurrently on mount via `Promise.all`:
     ```typescript
     Promise.all([
       CMSService.getHomepage(),
       EnquiryService.getList(),
       RateService.getList(),
       UserService.getList(),
       BlogService.getList(),
       AuditLogService.getList(),
       SettingsService.get(),
       MediaService.getList(),
       RateService.getHistory(),
     ]);
     ```
     If MySQL was not ready or connection pool limits were saturated during Next.js Turbopack compilation, requests backed up past the strict 10s Axios limit.

---

## 11. NULL / Data-Safety Audit

A repository-wide scan for unsafe string calls on nullable database fields revealed the following risk areas:

| File Path | Code Location | Variable | Risk / Current Behavior | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `app/(dashboard)/rates/page.tsx` | Line 255 | `r.carrier` | Fixed: now uses `(r.carrier ?? '').toLowerCase()` | Complete |
| `app/(dashboard)/ports/page.tsx` | Line 398 | `p.port_name`, `p.port_code`, `p.country` | Unsafe if port fields are NULL | Add `(p.port_name ?? '').toLowerCase()` |
| `app/(dashboard)/containers/page.tsx` | Line 392 | `c.name`, `c.id`, `c.description` | `description` can be NULL in database | Add `(c.description ?? '').toLowerCase()` |
| `app/(dashboard)/users/page.tsx` | Line 46 | `u.phone` | `phone` is nullable in `users` | Safe: uses `u.phone?.toLowerCase()` or coalescing |
| `app/(dashboard)/blogs/page.tsx` | Line 102 | `blog.tags` | `tags` is nullable in database | Already uses optional chaining `blog.tags?.toLowerCase()` |
| `app/(dashboard)/bookings/page.tsx` | Line 85 | `b.user_name`, `b.email` | If client email is missing, search crashes | Add `(b.email ?? '').toLowerCase()` |
| `easyfr8 react/src/pages/Rates.jsx` | Line 104 | `selectedRate.carrier` | Public rate summary displays `Carrier: ${selectedRate.carrier}` | Safeguard with `${selectedRate.carrier \|\| 'Standard Carrier'}` |

---

## 12. Security Audit

1. **Hardcoded Secrets & Token Simulation:**
   - In `app/api/auth/login/route.ts` and `app/api/auth/change-password/route.ts`, tokens are generated using client-side `btoa()` encoding with a static secret key (`easyfr8_admin_secret_key_123`). This is not a cryptographically signed HMAC SHA-256 JWT. Anyone can forge an admin token by crafting the JSON payload.
2. **Plaintext Passwords:**
   - Passwords in the `users` table are stored in plaintext (`admin123`). The change password endpoint updates passwords directly without `bcrypt` or `argon2` hashing.
3. **Missing Authentication on Critical Endpoints:**
   - Multiple administrative endpoints (`/api/freight-rates`, `/api/ports`, `/api/containers`, `/api/settings`) do not enforce `Authorization: Bearer <token>` middleware verification before executing mutations (`POST`, `PUT`, `DELETE`).
4. **CORS Headers:**
   - Endpoints in `app/api/settings/route.ts` return `access-control-allow-origin: https://easyfr8.vnvision.in`. Local cross-origin requests from `localhost:3000` could be blocked unless wildcards or explicit origins are configured.

---

## 13. Performance & Scalability Audit

1. **Large Unpaginated Queries:**
   - `GET /api/ports` without search parameters returns all **6,010 records** in a single JSON payload (~850KB uncompressed).
   - In `easyfr8_admin/app/(dashboard)/ports/page.tsx`, the entire array is stored in React component state, causing DOM rendering slowdowns when displaying rows.
2. **Missing Pagination in API Endpoints:**
   - Both `ports` and `freight-rates` lack `LIMIT` and `OFFSET` server-side pagination.
3. **N+1 and Missing Indexes:**
   - In `freight_rates`, foreign key columns `origin_id`, `destination_id`, and `container_id` have indexes, but composite lookups for route matching `(origin_id, destination_id, container_id)` could benefit from a composite B-Tree index.

---

## 14. Deployment Analysis

### Local Development Architecture
- **Host OS:** Windows local development machine.
- **Database:** XAMPP MySQL daemon (`mysqld.exe`) running standalone on `127.0.0.1:3306`.
- **Admin App:** Node.js v25 running Next.js dev server on port `3001` (`npm run dev`).
- **Public React App:** Node.js running Vite dev server on port `3000` (`npm run dev`).

### Production Deployment Considerations
- In production (`aaPanel` or cloud VPS as documented in `AA_PANEL_DEPLOYMENT.txt`), Next.js runs behind PM2 / Nginx reverse proxy with HTTPS.
- Database passwords and JWT secrets must be loaded from strict environment variables rather than falling back to defaults.
- Port search and auto-complete must be optimized with server-side pagination and Redis or in-memory caching to avoid database connection exhaustion.

---

## 15. Strategic Architecture: Scalable Distance & Pricing Engine

To support 6,000+ ports across Ocean and Air freight without combinatorial explosion, the following target architecture is recommended:

```
                  ┌─────────────────────────────────────┐
                  │          Shipment Request           │
                  │ (Origin Port, Dest Port, Cargo Qty) │
                  └──────────────────┬──────────────────┘
                                     │
                   ┌─────────────────┴─────────────────┐
                   ▼                                   ▼
        [ Ocean Freight Flow ]               [ Air Freight Flow ]
                   │                                   │
      Origin / Destination Sea Port        Origin / Destination Airport
      Coordinates / LOCODE                 IATA Airport Lat/Long Coordinates
                   │                                   │
                   ▼                                   ▼
        Maritime Route Routing Engine       Great-Circle Haversine Formula
        (e.g., Searoutes API / Waypoints)   Distance (Kilometers / Nautical Miles)
                   │                                   │
                   ▼                                   ▼
        Calculated Sea Distance             Calculated Air Distance
                   │                                   │
                   └─────────────────┬─────────────────┘
                                     │
                                     ▼
                     [ Dynamic Pricing Calculation ]
             Rate = Base Distance Rate (per NM / Km)
                  + TEU Container Tier (Ocean) OR Chargeable Weight (Air)
                  + Bunker / Fuel Adjustment Factor (BAF / FSC)
                  + Terminal Handling Charges (Origin THC + Dest THC)
                  + Optional Carrier Surcharge (if carrier selected)
                                     │
                                     ▼
                     [ Instant Transparent Quote ]
```

### Advantages of This Engine:
1. **Zero Record Proliferation:** Storage requires only **6,010 port coordinate records** and a single **pricing rule set** (~50 records) rather than 36 million combinations.
2. **Carrier Agnostic:** If a carrier is not selected, generic standard market baseline rates apply. If a carrier is specified (e.g., Maersk, MSC), carrier-specific contractual multipliers apply.
3. **Seamless Air & Ocean Support:** Supports FCL (per container size), LCL (per CBM), and Air Cargo (per kg chargeable weight).

---

## 16. Prioritized Issue Roadmap

### Phase 1: Critical Stability & Security (Immediate)
1. **Fix Plaintext Passwords & Auth Tokens:** Integrate `bcryptjs` password hashing and signed JWT verification in `app/api/auth/*`.
2. **Complete Null-Safety across Admin Tables:** Apply `(val ?? '').toLowerCase()` safeguards to `ports/page.tsx`, `containers/page.tsx`, and `bookings/page.tsx`.
3. **Add Server-Side Pagination for Ports:** Update `GET /api/ports` to support `limit` and `page` parameters to prevent loading 6,010 records into the client DOM simultaneously.

### Phase 2: Functional Optimization (Next Step)
1. **Air Freight Port Expansion:** Augment the 2 existing airports in `ports` to cover major international IATA airport hubs.
2. **Carrier Rate Management:** Ensure carrier dropdown and optional carrier handling are consistently reflected across all import and export templates.
3. **Enquiry-to-Booking Workflow:** Enable one-click conversion of verified customer enquiries into confirmed bookings.

### Phase 3: Dynamic Distance Pricing (Future Phase)
1. **Store Lat/Long for Global Ports:** Add `latitude` and `longitude` columns to the `ports` table.
2. **Integrate Great-Circle / Routing Calculator:** Implement distance-based freight calculation algorithms.
3. **Zone / Distance Matrix:** Create tiered geographic zones for regional shipping calculations.

---

## 17. Files That Would Need Modification in Future Tasks

- `easyfr8_admin/app/(dashboard)/ports/page.tsx` (Add client pagination and null-safe filtering)
- `easyfr8_admin/app/(dashboard)/containers/page.tsx` (Add null-safe filtering)
- `easyfr8_admin/app/api/ports/route.ts` (Add server-side `limit`/`offset` support)
- `easyfr8_admin/app/api/auth/login/route.ts` (Implement cryptographic JWT signing and password hashing)
- `easyfr8_admin/app/api/auth/change-password/route.ts` (Implement hashed password storage)
- `easyfr8 react/src/pages/Rates.jsx` (Add null-safe fallback for carrier display)

---
*Report generated and committed to project root as `easyfr8_project_analysis.md`.*
