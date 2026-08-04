# EasyFr8 Database Documentation

**Engine:** MySQL 8  
**Database:** `easyfr8`  
**Character Set:** `utf8mb4`  
**Collation:** `utf8mb4_unicode_ci`  
**Schema File:** `easyfr8_admin/lib/schema.sql`  
**Verified:** 2026-08-04 via `docker compose exec mysql`

---

## Table of Contents

1. [Overview](#overview)
2. [Tables](#tables)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Seed Data](#seed-data)
6. [Connection Configuration](#connection-configuration)

---

## Overview

| Total Tables | 20 |
|---|---|
| Total Seeded Records | 30+ |
| Live Data (verified) | ports: 6,008 rows · containers: 4 · freight_rates: 2 · users: 1 |

---

## Tables

### 1. `users`
Admin panel user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | Unique user ID |
| name | VARCHAR(255) | NOT NULL | Display name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Login email |
| phone | VARCHAR(64) | | Phone number |
| password | VARCHAR(512) | NOT NULL | Password (plain text in dev — **hash in prod**) |
| role | ENUM | NOT NULL | Administrator / Manager / Content Moderator / Customer |
| status | ENUM | NOT NULL | Active / Inactive |
| avatar | VARCHAR(512) | | Avatar URL |
| reg_date | DATETIME | NOT NULL | Registration timestamp |
| last_login | DATETIME | | Last login timestamp |
| created_at | DATETIME | NOT NULL | Auto-generated |
| updated_at | DATETIME | NOT NULL | Auto-updated |

**Indexes:** `uq_email` (UNIQUE on email)  
**Live Rows:** 1 (`biswa@easyfr8.com`, role: Administrator)

---

### 2. `cms_data`
Single-row JSON store for homepage/about/services/FAQs/contact/SEO content.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, DEFAULT 1 | Always row 1 |
| data | LONGTEXT | NOT NULL | Full CMS JSON blob |
| updated_at | DATETIME | NOT NULL | Auto-updated |

**Pattern:** Single-row JSON store — UPSERT on id=1

---

### 3. `hero_slides`
Homepage banner/carousel slides.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | Unique slide ID |
| title | VARCHAR(255) | NOT NULL | Slide headline |
| subtitle | VARCHAR(255) | NOT NULL | Sub-headline |
| description | TEXT | | Full description |
| button_text | VARCHAR(128) | NOT NULL | CTA button label |
| button_url | VARCHAR(512) | NOT NULL | CTA URL |
| image | LONGTEXT | | URL or base64 image |
| status | ENUM | NOT NULL | active / inactive |
| sort_order | INT | NOT NULL | Display ordering |
| created_at | DATETIME | NOT NULL | |
| updated_at | DATETIME | NOT NULL | |

---

### 4. `partners`
Partner company logos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| name | VARCHAR(255) | NOT NULL | Company name |
| logo | LONGTEXT | | URL or base64 |
| website_url | VARCHAR(512) | | Partner website |
| status | ENUM | NOT NULL | active / inactive |
| sort_order | INT | NOT NULL | |
| created_at/updated_at | DATETIME | | |

---

### 5. `statistics`
Homepage statistics/counter widgets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| label | VARCHAR(255) | NOT NULL | Counter label (e.g. "Shipments Delivered") |
| value | VARCHAR(64) | NOT NULL | Counter value (e.g. "10,000+") |
| icon | VARCHAR(128) | NOT NULL | Flaticon class |
| status | ENUM | NOT NULL | active / inactive |
| sort_order | INT | NOT NULL | |

---

### 6. `industries`
Industries served section of the website.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) PK | |
| title | VARCHAR(255) | Industry name |
| description | TEXT | Brief description |
| icon | VARCHAR(128) | Flaticon class |
| status | ENUM | active / inactive |
| sort_order | INT | |

---

### 7. `blogs`
Blog posts and news articles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| title | VARCHAR(512) | NOT NULL | Post title |
| slug | VARCHAR(512) | | URL slug |
| content | LONGTEXT | | Full post body (HTML) |
| excerpt | TEXT | | Summary |
| image | LONGTEXT | | Featured image URL |
| category | VARCHAR(128) | | Blog category |
| author | VARCHAR(128) | DEFAULT 'easyfr8' | |
| status | ENUM | NOT NULL | Published / Draft / Archived |
| published_at | DATETIME | | |
| created_at/updated_at | DATETIME | | |

**Indexes:** `idx_slug` on slug(191), `idx_status` on status  
**Live Rows:** 0

---

### 8. `enquiries`
Customer freight enquiries from contact form.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| name | VARCHAR(255) | NOT NULL | Customer name |
| email | VARCHAR(255) | NOT NULL | Customer email |
| phone | VARCHAR(64) | | Customer phone |
| subject | VARCHAR(512) | | Enquiry subject |
| notes | TEXT | | Message body |
| assigned_to | VARCHAR(255) | | Assigned admin |
| source | VARCHAR(128) | DEFAULT 'Web Form' | Enquiry source |
| status | ENUM | NOT NULL | New / In Progress / Responded / Closed |
| created_at/updated_at | DATETIME | | |

**Indexes:** `idx_status` on status

---

### 9. `rates` (Legacy)
Simple freight pricing table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| origin | VARCHAR(255) | NOT NULL | Origin location |
| destination | VARCHAR(255) | NOT NULL | Destination location |
| container | VARCHAR(128) | | Container type |
| cost | DECIMAL(12,2) | NOT NULL | Price |
| transit | INT | NOT NULL | Transit days |
| validity | VARCHAR(64) | | Rate validity date |
| created_at/updated_at | DATETIME | | |

---

### 10. `audit_logs`
System action audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PK, AUTO_INCREMENT | |
| user_id | VARCHAR(64) | | Actor user ID |
| user_name | VARCHAR(255) | | Actor display name |
| action | TEXT | NOT NULL | Action description |
| ip_address | VARCHAR(64) | | Request IP |
| created_at | DATETIME | NOT NULL | |

**Indexes:** `idx_user_id`, `idx_created_at`

---

### 11. `freight_types`
Top-level freight categories (Ocean Freight, Air Freight).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| name | VARCHAR(128) | NOT NULL | Category name |
| status | ENUM | NOT NULL | active / inactive |
| sort_order | INT | NOT NULL | |
| created_at/updated_at | DATETIME | | |

**Seeded:** mode-ocean (Ocean Freight), mode-air (Air Freight)

---

### 12. `shipment_types`
Shipment sub-categories linked to freight types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| freight_type_id | VARCHAR(64) | NOT NULL | FK → freight_types.id |
| name | VARCHAR(128) | NOT NULL | |
| description | TEXT | | |
| status | ENUM | NOT NULL | active / inactive |
| created_at/updated_at | DATETIME | | |

**Seeded:** shipment-fcl (FCL), shipment-lcl (LCL), shipment-air-std (Air Standard)

---

### 13. `locations`
Port location reference data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| port_code | VARCHAR(32) | NOT NULL, UNIQUE | Port code |
| name | VARCHAR(255) | NOT NULL | Port name |
| country | VARCHAR(128) | NOT NULL | Country |
| status | ENUM | NOT NULL | active / inactive |
| created_at/updated_at | DATETIME | | |

**Seeded:** 7 records (Singapore, Chile, India×2, Netherlands, China, USA)

---

### 14. `ports`
Extended port database (used by Ports Manager).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| port_code | VARCHAR(32) | NOT NULL | Port code |
| port_name | VARCHAR(255) | NOT NULL | Full port name |
| country | VARCHAR(128) | NOT NULL | Country |
| locode | VARCHAR(32) | | UN/LOCODE |
| created_at/updated_at | DATETIME | | |

**Live Rows:** 6,008 (bulk imported)

---

### 15. `containers`
Shipping container type definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| name | VARCHAR(128) | NOT NULL | Container name |
| description | TEXT | | Details |
| status | ENUM | NOT NULL | active / inactive |
| created_at/updated_at | DATETIME | | |

**Seeded:** 20GP, 40GP, 40HC, 40OTH  
**Live Rows:** 4

---

### 16. `freight_rates`
Advanced freight pricing (linked to all reference tables).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| freight_mode_id | VARCHAR(64) | NOT NULL | FK → freight_types.id |
| shipment_type_id | VARCHAR(64) | NOT NULL | FK → shipment_types.id |
| origin_id | VARCHAR(64) | NOT NULL | FK → locations.id |
| destination_id | VARCHAR(64) | NOT NULL | FK → locations.id |
| container_id | VARCHAR(64) | | FK → containers.id |
| price | DECIMAL(12,2) | NOT NULL | Rate in currency |
| currency | VARCHAR(10) | NOT NULL DEFAULT 'USD' | |
| transit_time | INT | NOT NULL | Days |
| carrier | VARCHAR(255) | NOT NULL | Carrier name |
| status | ENUM | NOT NULL | active / inactive |
| created_at/updated_at | DATETIME | | |

**Live Rows:** 2

---

### 17. `rate_activity_logs`
Audit trail for freight rate changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(64) | PK | |
| rate_id | VARCHAR(64) | NOT NULL | Rate being changed |
| action_type | ENUM | NOT NULL | create / update / delete |
| old_value | TEXT | | Previous JSON snapshot |
| new_value | TEXT | | New JSON snapshot |
| updated_by | VARCHAR(255) | NOT NULL | Admin who made change |
| created_at | DATETIME | NOT NULL | |

---

### 18. `media`
Media library file records.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) PK | |
| filename | VARCHAR(255) | Original filename |
| url | VARCHAR(512) | Public URL |
| size | INT | File size in bytes |
| mime_type | VARCHAR(128) | MIME type |
| created_at | DATETIME | |

---

### 19. `terms`
Incoterms and trade terms definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) PK | |
| name | VARCHAR(255) | Term name (e.g. FOB) |
| description | TEXT | Full explanation |
| status | ENUM | active / inactive |
| created_at/updated_at | DATETIME | |

---

### 20. `bookings`
Customer freight booking records from user panel.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) PK | |
| (various booking fields) | | Origin, destination, cargo details |
| status | ENUM | Pending / Confirmed / Cancelled |
| created_at/updated_at | DATETIME | |

---

## Relationships

```
freight_types ──< shipment_types
freight_types ──< freight_rates (via freight_mode_id)
shipment_types ──< freight_rates
locations ──< freight_rates (origin + destination)
containers ──< freight_rates
freight_rates ──< rate_activity_logs
users ──< audit_logs
```

---

## Indexes

| Table | Index | Columns | Type |
|-------|-------|---------|------|
| users | uq_email | email | UNIQUE |
| blogs | idx_slug | slug(191) | INDEX |
| blogs | idx_status | status | INDEX |
| enquiries | idx_status | status | INDEX |
| audit_logs | idx_user_id | user_id | INDEX |
| audit_logs | idx_created_at | created_at | INDEX |
| locations | (on port_code) | port_code | UNIQUE |

---

## Seed Data

Run automatically on first Docker startup via `schema.sql` mounted in `/docker-entrypoint-initdb.d/`.

| Table | Seeded Records |
|-------|---------------|
| freight_types | Ocean Freight, Air Freight |
| shipment_types | FCL, LCL, Air Standard |
| locations | 7 global ports |
| ports | 7 global ports |
| containers | 20GP, 40GP, 40HC, 40OTH |
| freight_rates | 3 sample routes |
| users | biswa@easyfr8.com (Administrator) |

---

## Connection Configuration

### Local Development
```
Host: 127.0.0.1
Port: 3306
Database: easyfr8
Username: easyfr8
Password: easyfr8_password
```

### Docker Internal
```
Host: mysql  (Docker service name)
Port: 3306
Database: easyfr8
Username: easyfr8
Password: easyfr8_password
```

### phpMyAdmin Access
URL: http://localhost:8088  
User: root  
Password: rootpassword  
(or use easyfr8/easyfr8_password for limited access)
