# EasyFr8 Admin Panel Guide

**Version:** 0.1.0  
**URL:** http://localhost:3001 (local) | https://adminfr8.vnvision.in (production)  
**Stack:** Next.js 16.2.10 · React 19 · MySQL 8

---

## Getting Started

### Default Login
- **URL:** http://localhost:3001/login
- **Email:** biswa@easyfr8.com
- **Password:** admin123

> ⚠️ Change the default password immediately in a production environment.

### Navigation
The sidebar contains all modules grouped into sections:
- **Console:** Dashboard
- **Site Configuration:** Website CMS, Media Library, Blog & Updates
- **Freight Operations:** Bookings, Freight Types, Shipment Types, Incoterms, Ports Manager, Container Manager, Freight Rates, Enquiries, Users
- **Settings:** System Settings

---

## Module Guides

### Dashboard (`/dashboard`)
The main overview page showing all key performance indicators.

**KPI Cards Row 1:**
| Card | Data Source |
|------|-------------|
| Enquiries Received | Total enquiry count from DB |
| Registered Users | Total user count from DB |
| Active Freight Rates | Rates table count |
| Rate Sync Status | Always shows "Synced" |

**KPI Cards Row 2:**
| Card | Data Source |
|------|-------------|
| Pending Enquiries | Enquiries with status "New" or "In Progress" |
| Filtered Enquiries | Enquiries in selected date range |
| Published Blogs | ⚠️ Hardcoded to 3 (bug — actual DB count is 0) |

**Chart:** Enquiries trend over time (7d/30d/month/all). Hover data points for values.

**Recent Activity:** Last 6 audit log entries.

**Freight Rate Status:** Active vs expired rate counts + last rate modification.

**Quick Actions:** Direct links to Upload Rate CSV, Add Freight Route, Edit CMS, Settings, Enquiries.

---

### Website CMS (`/cms`)
Control all website-facing content without code changes.

**Managed Sections:**
- Hero Slides — Homepage banner carousel
- About — Company info and statistics
- Footer — Footer links and company details
- Industries — Industries served section
- Partners — Partner company logos

**To add a Hero Slide:**
1. Go to `/cms`
2. Click "Add Slide"
3. Fill in Title, Subtitle, Description, Button text/URL, Image
4. Set Status to "active" and Sort Order
5. Save

---

### Media Library (`/media`)
Upload and manage images and files used across the platform.

**Supported formats:** Images (JPG, PNG, GIF, WebP), PDF, documents  
**Files stored:** `/app/uploads` inside Docker container (mounted to `uploads_data` volume)  
**Public URL format:** `http://localhost:3001/images/[filename]`

**To upload:** Click "Upload Media" → select file → confirm upload.

---

### Blog & Updates (`/blogs`)
Manage blog posts and news articles.

**Status flow:** Draft → Published → Archived

**Fields:**
- Title, Slug (auto-generated), Content (HTML), Excerpt
- Featured Image (from Media Library or URL)
- Category, Author, Status, Published Date

**To publish a blog post:**
1. Create with status "Draft"
2. Add content
3. Change status to "Published"
4. Set published_at date

---

### Bookings (`/bookings`)
View and manage freight booking requests from the user panel.

**Bookings come from:** User panel `/booking` page form submissions.

---

### Freight Types (`/freight-types`)
Top-level freight mode categories.

**Default seeded values:**
- Ocean Freight (mode-ocean)
- Air Freight (mode-air)

**To add a freight type:** Click "+ Add Freight Type" → enter name → save.

---

### Shipment Types (`/shipment-types`)
Sub-categories of freight types (e.g. FCL under Ocean Freight).

**Default seeded values:**
- FCL (Full Container Load) — Ocean
- LCL (Less than Container Load) — Ocean
- Air Freight Standard — Air

---

### Incoterms (`/terms`)
International trade terms (FOB, CIF, DAP, etc.)

Add trade terms with name and full description for display on the user panel.

---

### Ports Manager (`/ports`)
Manage the global port database (6,008 ports currently).

#### Features:

**Download Template**
- Click "Download Template" button
- Downloads `Port_Import_Template.xlsx`
- Fill in: Port Code, Port Name, Country, LOCODE

**Import Ports**
1. Click "Import" button
2. Drag-and-drop or browse for XLSX/CSV file
3. Review validation preview (total/valid/invalid rows)
4. Click "Import Valid Rows" to commit

**Export Ports**
1. Click "Export" button
2. Select format (XLSX or CSV)
3. Optionally select specific rows first for "Export Selected"
4. File downloads automatically

**Search:** Type in the search box to filter by port name, code, or country.

**Pagination:** Configurable rows per page.

---

### Container Manager (`/containers`)
Manage shipping container type configurations.

#### Features (same as Ports Manager):
- **Download Template** → `Container_Import_Template.xlsx`
- **Import** with validation preview and stats
- **Export** to XLSX/CSV
- **Size Filter** — filter by 20ft, 40ft, 45ft
- **Export Selected** — select checkboxes then export only selected rows

**Default containers:**
| Name | ID | Description |
|------|-----|-------------|
| 20ft Standard Dry (20GP) | container-20gp | Standard 20-foot |
| 40ft Standard Dry (40GP) | container-40gp | Standard 40-foot |
| 40ft High Cube (40HC) | container-40hc | High cube |
| 40ft Open Top High (40OTH) | container-40oth | Oversized cargo |

---

### Freight Rates (`/rates`)
Manage freight pricing for origin–destination–container combinations.

**Two rate systems:**
1. **Legacy Rates** (`rates` table) — Simple: origin text, destination text, container, cost, transit
2. **Advanced Rates** (`freight_rates` table) — Full linked: origin port, destination port, container, freight mode, shipment type, carrier, currency

**Import rates:** Use "Import CSV" button with ImportRatesModal component.

**Rate History:** View all rate changes in the activity log sidebar.

---

### Enquiries (`/enquiries`)
Manage customer freight enquiries from the contact form.

**Workflow:**
1. New enquiry arrives (status: "New")
2. Assign to team member
3. Update status to "In Progress"
4. After response → "Responded"
5. Close when resolved → "Closed"

---

### Users (`/users`)
Manage admin panel user accounts.

**Roles and Permissions:**

| Role | Access Level |
|------|-------------|
| Administrator | Full access to all modules |
| Manager | Most modules (no user management) |
| Content Moderator | CMS, Blog, Media only |
| Customer | Read-only (for customer accounts) |

**To create a user:**
1. Click "+ Add User"
2. Enter Name, Email, Password, Phone
3. Select Role and Status
4. Save

---

### System Settings (`/settings`)
Platform-wide configuration including:
- General settings (company name, timezone)
- Email configuration
- Freight configuration
- Notification preferences

---

## Authentication

### Login Flow
1. Navigate to `/login` (or any protected route)
2. Enter email and password
3. JWT token stored in session
4. Redirected to `/dashboard`

### Logout
Click the user avatar/name in the top header → "Logout"

### Change Password
Settings → Profile → Change Password

---

## Responsive Design

The admin panel is fully responsive:
- **Desktop:** Full sidebar always visible
- **Tablet:** Sidebar collapses to icons
- **Mobile:** Sidebar hidden, toggle button shows drawer overlay

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Sidebar | Sidebar collapse button |
| Close mobile menu | Click overlay |

---

## Error States

| Error | Cause | Solution |
|-------|-------|---------|
| "Session expired" | JWT expired | Log in again |
| "Unable to connect" | DB connection issue | Check Docker containers |
| Empty table | No data in DB | Import data or create records |
