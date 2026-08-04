# EasyFr8 API Documentation

**Version:** 0.1.0  
**Base URL (Local):** `http://localhost:3001/api`  
**Base URL (Production):** `https://adminfr8.vnvision.in/api`  
**Authentication:** JWT via cookie session (set on login)  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [CMS Routes](#cms-routes)
3. [Admin CMS Routes](#admin-cms-routes)
4. [Ports](#ports)
5. [Containers](#containers)
6. [Freight Types](#freight-types)
7. [Shipment Types](#shipment-types)
8. [Freight Modes](#freight-modes)
9. [Freight Rates (Legacy)](#freight-rates-legacy)
10. [Freight Rates (Advanced)](#freight-rates-advanced)
11. [Locations](#locations)
12. [Enquiries](#enquiries)
13. [Bookings](#bookings)
14. [Blogs](#blogs)
15. [Media](#media)
16. [Users](#users)
17. [Terms (Incoterms)](#terms-incoterms)
18. [Settings](#settings)
19. [Audit Logs](#audit-logs)
20. [Statistics & Partners](#statistics--partners)
21. [Sync & Utility](#sync--utility)

---

## Authentication

### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "biswa@easyfr8.com",
  "password": "admin123"
}
```

**Response 200:**
```json
{
  "success": true,
  "user": {
    "id": "user-admin-001",
    "name": "Biswa Admin",
    "email": "biswa@easyfr8.com",
    "role": "Administrator"
  }
}
```

**Response 401:**
```json
{ "error": "Invalid credentials" }
```

**Used By:** Login page (`/login`)

---

### POST /api/auth/logout
Clears session cookie.

**Response 200:**
```json
{ "success": true }
```

---

### GET /api/auth/profile
Returns authenticated user profile.

**Auth Required:** Yes  
**Response 200:**
```json
{
  "id": "user-admin-001",
  "name": "Biswa Admin",
  "email": "biswa@easyfr8.com",
  "role": "Administrator",
  "status": "Active"
}
```

---

### POST /api/auth/change-password
Change the authenticated user's password.

**Request Body:**
```json
{
  "currentPassword": "admin123",
  "newPassword": "newSecurePassword"
}
```

---

## CMS Routes

### GET /api/cms
Returns the full CMS data object (used by React user panel).

**Auth Required:** No (public)  
**Used By:** React user panel CmsContext

---

### GET /api/cms/hero-slides
Returns active hero slides for the user panel homepage.

**Auth Required:** No (public)  
**Response 200:**
```json
{
  "slides": [
    {
      "id": "slide-001",
      "title": "Global Freight Solutions",
      "subtitle": "Your trusted partner",
      "description": "...",
      "buttonText": "Get a Quote",
      "buttonUrl": "/booking",
      "image": "https://...",
      "status": "active",
      "sortOrder": 1
    }
  ]
}
```

---

### GET/PUT /api/cms/about
Get or update the About page content.

### GET/PUT /api/cms/footer
Get or update the Footer content.

---

## Admin CMS Routes

### GET /api/admin/cms/hero-slides
### POST /api/admin/cms/hero-slides

**Auth Required:** Yes

**POST Request Body:**
```json
{
  "title": "Slide Title",
  "subtitle": "Subtitle text",
  "description": "Description",
  "buttonText": "Learn More",
  "buttonUrl": "/services/ocean-freight",
  "image": "base64_or_url",
  "status": "active",
  "sortOrder": 1
}
```

### GET/PUT/DELETE /api/admin/cms/hero-slides/[id]
CRUD for individual hero slides.

### GET/POST /api/admin/cms/industries
### GET/PUT/DELETE /api/admin/cms/industries/[id]
Manage industries served section.

### GET/POST /api/admin/cms/partners
### GET/PUT/DELETE /api/admin/cms/partners/[id]
Manage partner logos.

### GET/POST /api/admin/cms/statistics
### GET/PUT/DELETE /api/admin/cms/statistics/[id]
Manage statistics/counters section.

---

## Ports

### GET /api/ports
List all ports with optional search and pagination.

**Query Params:**
- `search` — Filter by port name, code, or country
- `page` — Page number (default: 1)
- `limit` — Records per page (default: 50)

**Response 200:**
```json
{
  "ports": [
    {
      "id": "loc-sgpin",
      "port_code": "SGPIN",
      "port_name": "Singapore Port",
      "country": "Singapore",
      "locode": "SGPIN"
    }
  ],
  "total": 6008,
  "page": 1,
  "limit": 50
}
```

---

### POST /api/ports
Create a new port.

**Request Body:**
```json
{
  "port_code": "USNYC",
  "port_name": "New York Port",
  "country": "United States",
  "locode": "USNYC"
}
```

---

### GET /api/ports/[id]
### PUT /api/ports/[id]
### DELETE /api/ports/[id]
Individual port CRUD operations.

---

### GET /api/ports/template
Download the XLSX import template.

**Response:** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`  
**Filename:** `Port_Import_Template.xlsx`  
**Columns:** Port Code, Port Name, Country, LOCODE

---

### POST /api/ports/import
Bulk import ports from XLSX or CSV.

**Request:** `multipart/form-data`  
- `file` — XLSX or CSV file

**Response 200:**
```json
{
  "success": true,
  "imported": 145,
  "skipped": 3,
  "errors": [
    { "row": 5, "error": "Missing port_code" }
  ]
}
```

---

### GET /api/ports/export
Export ports to XLSX or CSV.

**Query Params:**
- `format` — `xlsx` or `csv` (default: xlsx)

---

## Containers

### GET /api/containers
List all containers.

**Response 200:**
```json
{
  "containers": [
    {
      "id": "container-20gp",
      "name": "20ft Standard Dry (20GP)",
      "description": "Standard 20-foot dry container.",
      "size": "20ft",
      "status": "active"
    }
  ]
}
```

---

### POST /api/containers
### GET/PUT/DELETE /api/containers/[id]
Container CRUD.

### GET /api/containers/template
Download `Container_Import_Template.xlsx`.

**Columns:** Container ID, Container Name, Description, Size (20ft/40ft/45ft), Status (active/inactive)

### POST /api/containers/import
Bulk import with validation preview.

**Returns validation stats:** total rows, valid rows, invalid rows, duplicate IDs, invalid sizes.

### GET /api/containers/export
Export to XLSX/CSV with optional format/filter params.

---

## Freight Types

### GET /api/freight-types
Returns all freight types.

**Response 200:**
```json
{
  "freightTypes": [
    { "id": "mode-ocean", "name": "Ocean Freight", "status": "active", "sort_order": 1 },
    { "id": "mode-air", "name": "Air Freight", "status": "active", "sort_order": 2 }
  ]
}
```

### POST /api/freight-types
### GET/PUT/DELETE /api/freight-types/[id]

---

## Shipment Types

### GET /api/shipment-types
Returns all shipment types, linked to freight_type_id.

**Response 200:**
```json
{
  "shipmentTypes": [
    {
      "id": "shipment-fcl",
      "freight_type_id": "mode-ocean",
      "name": "FCL (Full Container Load)",
      "description": "Full container shipping for large volume cargo.",
      "status": "active"
    }
  ]
}
```

### POST /api/shipment-types
### GET/PUT/DELETE /api/shipment-types/[id]

---

## Freight Modes

### GET /api/freight/modes
### POST /api/freight/modes
### GET/PUT/DELETE /api/freight/modes/[id]
Transport mode management (alias for freight types grouping).

---

## Freight Rates (Legacy)

The `rates` table is the legacy simple pricing table.

### GET /api/rates
List all legacy rates.

**Response 200:**
```json
{
  "rates": [
    {
      "id": "rate-001",
      "origin": "Singapore",
      "destination": "Mumbai",
      "container": "20GP",
      "cost": 1200.00,
      "transit": 8,
      "validity": "2025-12-31"
    }
  ]
}
```

### POST /api/rates
### GET/PUT/DELETE /api/rates/[id]
### POST /api/rates/bulk
Bulk create/update rates.

### GET /api/rates/history
Returns rate modification history from `rate_activity_logs`.

---

## Freight Rates (Advanced)

The advanced `freight_rates` table links to all reference tables.

### GET /api/freight-rates
### POST /api/freight-rates
### GET/PUT/DELETE /api/freight-rates/[id]
### POST /api/freight-rates/import
Bulk import freight rates from XLSX/CSV.

**Rate Structure:**
```json
{
  "freight_mode_id": "mode-ocean",
  "shipment_type_id": "shipment-fcl",
  "origin_id": "loc-sgpin",
  "destination_id": "loc-inbom",
  "container_id": "container-20gp",
  "price": 1200.00,
  "currency": "USD",
  "transit_time": 8,
  "carrier": "CMA CGM",
  "status": "active"
}
```

---

## Locations

### GET /api/locations
### POST /api/locations
### GET/PUT/DELETE /api/locations/[id]

Port location reference data (7 seeded records).

---

## Enquiries

### GET /api/enquiries
List all enquiries.

**Response 200:**
```json
{
  "enquiries": [
    {
      "id": "enq-001",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0001",
      "subject": "FCL Rate to Rotterdam",
      "notes": "...",
      "status": "New",
      "source": "Web Form",
      "created_at": "2026-08-01T10:00:00Z"
    }
  ]
}
```

**Statuses:** New, In Progress, Responded, Closed

### POST /api/enquiries
**Used By:** React user panel Contact form

### GET/PUT/DELETE /api/enquiries/[id]

---

## Bookings

### GET /api/bookings
### POST /api/bookings
**Used By:** React user panel Booking page

### GET/PUT/DELETE /api/bookings/[id]

---

## Blogs

### GET /api/blogs
List all blogs.

**Response 200:**
```json
{
  "blogs": [
    {
      "id": "blog-001",
      "title": "Ocean Freight Trends 2025",
      "slug": "ocean-freight-trends-2025",
      "excerpt": "...",
      "image": "https://...",
      "category": "Industry News",
      "author": "easyfr8",
      "status": "Published",
      "published_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

**Statuses:** Published, Draft, Archived

### POST /api/blogs
### GET/PUT/DELETE /api/blogs/[id]
**Used By:** React user panel Blog single page (`/blog/:slugOrId`)

---

## Media

### GET /api/media
List all uploaded media files.

### POST /api/media
Upload a new file.

**Request:** `multipart/form-data`  
- `file` — The media file to upload

**Response 200:**
```json
{
  "id": "media-001",
  "filename": "hero-image.jpg",
  "url": "http://localhost:3001/images/hero-image.jpg",
  "size": 102400,
  "mime_type": "image/jpeg"
}
```

### DELETE /api/media/[id]
Delete a media file.

---

## Users

### GET /api/users
List all admin users.

### POST /api/users
Create a new user.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@easyfr8.com",
  "phone": "+91-9876543210",
  "password": "securePassword",
  "role": "Manager",
  "status": "Active"
}
```

**Roles:** Administrator, Manager, Content Moderator, Customer

### GET/PUT/DELETE /api/users/[id]

---

## Terms (Incoterms)

### GET /api/terms
### POST /api/terms
### GET/PUT/DELETE /api/terms/[id]
Manage international trade Incoterms.

---

## Settings

### GET /api/settings
Returns all system settings.

### GET/PUT /api/settings/[section]
Get or update a specific settings section.

**Sections:** general, email, freight, notifications, etc.

---

## Audit Logs

### GET /api/audit-logs
Returns system audit log entries.

**Response 200:**
```json
{
  "logs": [
    {
      "id": 1,
      "user_id": "user-admin-001",
      "user_name": "Biswa Admin",
      "action": "Updated freight rate: Singapore → Mumbai",
      "ip_address": "127.0.0.1",
      "created_at": "2026-08-04T10:00:00Z"
    }
  ]
}
```

### DELETE /api/audit-logs/clear
Clears all audit log entries. **Admin only.**

---

## Statistics & Partners

### GET /api/statistics
Returns homepage statistics counters.

### GET /api/industries
Returns industries served data.

### GET /api/partners
Returns partner company data.

---

## Sync & Utility

### POST /api/admin/sync-master
Synchronizes master data between admin and user panel.

### GET /api/airports
Returns airport reference data.

### GET /api/test-db
Tests database connectivity.

**Response 200:**
```json
{ "status": "ok", "message": "Database connection successful" }
```
