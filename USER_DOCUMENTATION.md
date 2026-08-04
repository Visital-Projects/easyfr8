# EasyFr8 User Panel Documentation

**Version:** 0.1.0  
**Framework:** React 19 + Vite  
**Local URL:** http://localhost:3000  
**Production URL:** https://easyfr8.vnvision.in

---

## Overview

The EasyFr8 user panel is a React single-page application (SPA) that provides the public-facing website for the freight forwarding service.

It fetches all content dynamically from the admin panel API, making it CMS-driven.

---

## Technology Stack

| Library | Version |
|---------|---------|
| React | ^19.2.7 |
| React DOM | ^19.2.7 |
| React Router DOM | ^7.18.1 |
| Axios | ^1.18.1 |
| Vite | ^8.1.1 |

---

## Pages

### 1. Home (`/`)
The main landing page. All content is CMS-driven via the admin panel.

**Content Sections:**
- Hero slider (managed via Admin → Hero Slides)
- Services section
- Statistics/counters
- Industries served
- Partner logos
- Blog preview section
- Contact CTA

**Data Sources:**
- `GET /api/cms/hero-slides` — Carousel slides
- `GET /api/cms` — Full CMS data object
- `GET /api/statistics` — Counter widgets
- `GET /api/industries` — Industries section
- `GET /api/partners` — Partner logos

---

### 2. About (`/about`)
Company information page.

**Content:** CMS-driven from admin About section.  
**Data Source:** `GET /api/cms/about` or full CMS blob

---

### 3. Contact (`/contact`)
Contact and enquiry submission form.

**Features:**
- Contact form (name, email, phone, message)
- Submits to `POST /api/enquiries`
- Google Maps or static map (if configured)
- Company address and contact details

---

### 4. Tools (`/tools`)
Landing page for freight utility tools.

**Tool Links:**
- Volumetric Weight Calculator (`/tools/volumetric-weight-calculator`)
- Incoterms Guide (`/tools/incoterms`)

---

### 5. Blog Single (`/blog/:slugOrId`)
Individual blog post page. Accepts both URL slug and ID.

**Data Source:** `GET /api/blogs/[id]`  
**Fields displayed:** Title, image, content, category, author, published_at

---

### 6. Booking (`/booking`)
Freight booking request form.

**Features:**
- Shipment details form (origin, destination, cargo type, weight, dimensions)
- Contact information
- Submits to `POST /api/bookings`

---

### 7. Rates (`/rates`)
Public freight rate search and display.

**Features:**
- Origin/destination selection
- Container type filter
- Rate search results
- Data Source: `GET /api/rates` (or `/api/freight-rates`)

---

### 8. Service Detail (`/services/:slug`)
Dynamic service information page.

**Supported Slugs:**
- ocean-freight-forwarding
- air-freight-forwarding
- road-freight-forwarding
- warehousing
- door-to-door-delivery
- packaging-storage
- contract-handling
- cargo-insurance

**Legacy Routes:** Old-format URLs (e.g. `/ocean-freight-forwarding`) are mapped to `/services/:slug` for backward compatibility.

---

### 9. Volumetric Weight Calculator (`/tools/volumetric-weight-calculator`)
Calculates volumetric (dimensional) weight for air freight shipments.

**Formula:** `Length × Width × Height ÷ 5000 = Volumetric Weight (kg)`

---

### 10. Incoterms Guide (`/tools/incoterms`)
Reference guide for international trade terms.

**Data Source:** `GET /api/terms` (if connected) or static content

---

## Application Architecture

```
App.jsx
├── CmsProvider (CmsContext)
│   └── BrowserRouter
│       └── AppLayout
│           ├── Preloader
│           ├── Navbar
│           ├── <Routes> (all pages)
│           └── Footer
```

### CmsContext
The `CmsContext` provider (`src/context/CmsContext.jsx`) is responsible for:
- Fetching CMS data from the admin API on app mount
- Providing data to all child components
- Managing loading state (triggers preloader)

**Base URL:** Configured in `.env` as `VITE_API_BASE_URL`

---

## Environment Variables (React)

| Variable | Local Value | Production Value | Description |
|----------|-------------|-----------------|-------------|
| VITE_API_BASE_URL | http://localhost:3001 | https://adminfr8.vnvision.in | Admin API base URL |

**File:** `easyfr8 react/.env`

---

## Preloader

The React app includes a preloader that:
- Shows the EasyFr8 logo animation on first load
- Waits minimum **3.5 seconds** regardless of load time
- Fades out over **500ms** once CMS data is loaded

---

## Running Locally

```bash
cd "easyfr8 react"
npm install
npm run dev
# Available at http://localhost:3000
```

---

## Building for Production

```bash
npm run build
# Output: dist/ directory
```

The production build is served via Nginx (see `nginx.conf`).

---

## Nginx Configuration (Production)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

All routes serve `index.html` for SPA routing to work correctly.

---

## Docker (Disabled in Current Setup)

The Docker service for the React app is defined but commented out in `docker-compose.yml`:

```yaml
# easyfr8_user:
#   build:
#     context: ./easyfr8 react
#     dockerfile: Dockerfile
#   ports:
#     - "3000:80"
```

To re-enable: uncomment the service block in `docker-compose.yml` and run `docker compose up -d easyfr8_user`.

---

## Known Issues

| Issue | Status |
|-------|--------|
| Docker container disabled | Known |
| No blog content in DB | Known |
| CMS content may be empty on fresh install | Expected — populate via Admin CMS |
