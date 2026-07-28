-- ============================================================
-- EasyFr8 MySQL Schema
-- Run this once: mysql -u root -p easyfr8 < lib/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS easyfr8 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE easyfr8;

-- ─── CMS (single row JSON store for homepage/about/services/faqs/contact/seo) ─
CREATE TABLE IF NOT EXISTS cms_data (
  id          INT          NOT NULL DEFAULT 1,
  data        LONGTEXT     NOT NULL COMMENT 'Full CMSData JSON',
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── HERO SLIDES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hero_slides (
  id          VARCHAR(64)  NOT NULL,
  title       VARCHAR(255) NOT NULL DEFAULT '',
  subtitle    VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT,
  button_text VARCHAR(128) NOT NULL DEFAULT '',
  button_url  VARCHAR(512) NOT NULL DEFAULT '',
  image       LONGTEXT     COMMENT 'URL or base64',
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order  INT          NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── PARTNERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id          VARCHAR(64)  NOT NULL,
  name        VARCHAR(255) NOT NULL DEFAULT '',
  logo        LONGTEXT     COMMENT 'URL or base64',
  website_url VARCHAR(512) DEFAULT '',
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order  INT          NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── STATISTICS / COUNTERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS statistics (
  id          VARCHAR(64)  NOT NULL,
  label       VARCHAR(255) NOT NULL DEFAULT '',
  value       VARCHAR(64)  NOT NULL DEFAULT '',
  icon        VARCHAR(128) NOT NULL DEFAULT 'flaticon-transport-9',
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order  INT          NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── INDUSTRIES SERVED ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS industries (
  id          VARCHAR(64)  NOT NULL,
  title       VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT,
  icon        VARCHAR(128) NOT NULL DEFAULT 'flaticon-transport-1',
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order  INT          NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── BLOGS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blogs (
  id          VARCHAR(64)  NOT NULL,
  title       VARCHAR(512) NOT NULL DEFAULT '',
  slug        VARCHAR(512) DEFAULT '',
  content     LONGTEXT,
  excerpt     TEXT,
  image       LONGTEXT     COMMENT 'URL or base64',
  category    VARCHAR(128) DEFAULT '',
  author      VARCHAR(128) DEFAULT 'easyfr8',
  status      ENUM('Published','Draft','Archived') NOT NULL DEFAULT 'Draft',
  published_at DATETIME    DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_slug (slug(191)),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── ENQUIRIES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id          VARCHAR(64)  NOT NULL,
  name        VARCHAR(255) NOT NULL DEFAULT '',
  email       VARCHAR(255) NOT NULL DEFAULT '',
  phone       VARCHAR(64)  DEFAULT '',
  subject     VARCHAR(512) DEFAULT '',
  notes       TEXT,
  assigned_to VARCHAR(255) DEFAULT '',
  source      VARCHAR(128) DEFAULT 'Web Form',
  status      ENUM('New','In Progress','Responded','Closed') NOT NULL DEFAULT 'New',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── FREIGHT RATES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rates (
  id          VARCHAR(64)  NOT NULL,
  origin      VARCHAR(255) NOT NULL DEFAULT '',
  destination VARCHAR(255) NOT NULL DEFAULT '',
  container   VARCHAR(128) DEFAULT '',
  cost        DECIMAL(12,2) NOT NULL DEFAULT 0,
  transit     INT          NOT NULL DEFAULT 0 COMMENT 'transit days',
  validity    VARCHAR(64)  DEFAULT '',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── ADMIN USERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(64)  NOT NULL,
  name        VARCHAR(255) NOT NULL DEFAULT '',
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(64)  DEFAULT '',
  password    VARCHAR(512) NOT NULL DEFAULT 'admin123',
  role        ENUM('Administrator','Manager','Content Moderator','Customer') NOT NULL DEFAULT 'Customer',
  status      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  avatar      VARCHAR(512) DEFAULT '',
  reg_date    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login  DATETIME     DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     VARCHAR(64)  DEFAULT NULL,
  user_name   VARCHAR(255) DEFAULT NULL,
  action      TEXT         NOT NULL,
  ip_address  VARCHAR(64)  DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── DYNAMIC FREIGHT TABLES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freight_types (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shipment_types (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  freight_type_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  port_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(128) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ports (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  port_code VARCHAR(32) NOT NULL,
  port_name VARCHAR(255) NOT NULL,
  country VARCHAR(128) NOT NULL,
  locode VARCHAR(32),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS containers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS freight_rates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  freight_mode_id VARCHAR(64) NOT NULL,
  shipment_type_id VARCHAR(64) NOT NULL,
  origin_id VARCHAR(64) NOT NULL,
  destination_id VARCHAR(64) NOT NULL,
  container_id VARCHAR(64),
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  transit_time INT NOT NULL DEFAULT 0,
  carrier VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_activity_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  rate_id VARCHAR(64) NOT NULL,
  action_type ENUM('create', 'update', 'delete') NOT NULL,
  old_value TEXT,
  new_value TEXT,
  updated_by VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default dynamic tables
INSERT INTO freight_types (id, name, status, sort_order) VALUES 
('mode-ocean', 'Ocean Freight', 'active', 1), 
('mode-air', 'Air Freight', 'active', 2) 
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO shipment_types (id, freight_type_id, name, description, status) VALUES 
('shipment-fcl', 'mode-ocean', 'FCL (Full Container Load)', 'Full container shipping for large volume cargo.', 'active'), 
('shipment-lcl', 'mode-ocean', 'LCL (Less than Container Load)', 'Shared container space for smaller shipments.', 'active'), 
('shipment-air-std', 'mode-air', 'Air Freight Standard', 'Standard air cargo transport.', 'active') 
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO locations (id, port_code, name, country, status) VALUES 
('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'active'), 
('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'active'), 
('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'active'), 
('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'active'), 
('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'active'), 
('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'active'), 
('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'active') 
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO ports (id, port_code, port_name, country, locode) VALUES 
('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'SGPIN'), 
('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'CLACH'), 
('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'INNSV'), 
('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'NLRTM'), 
('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'CNSHA'), 
('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'USLAX'), 
('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'INBOM') 
ON DUPLICATE KEY UPDATE port_name=VALUES(port_name);

INSERT INTO containers (id, name, description, status) VALUES 
('container-20gp', '20ft Standard Dry (20GP)', 'Standard 20-foot dry container.', 'active'), 
('container-40gp', '40ft Standard Dry (40GP)', 'Standard 40-foot dry container.', 'active'), 
('container-40hc', '40ft High Cube (40HC)', 'High cube 40-foot container for voluminous cargo.', 'active'), 
('container-40oth', '40ft Open Top High (40OTH)', '40ft open top high container for oversized cargo.', 'active') 
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO freight_rates (id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status) VALUES 
('frate-sgpin-clach-40oth', 'mode-ocean', 'shipment-fcl', 'loc-sgpin', 'loc-clach', 'container-40oth', 3500.00, 'USD', 30, 'Maersk Line', 'active'), 
('frate-cnsha-uslax-40gp', 'mode-ocean', 'shipment-fcl', 'loc-cnsha', 'loc-uslax', 'container-40gp', 3800.00, 'USD', 16, 'MSC', 'active'), 
('frate-sgpin-inbom-20gp', 'mode-ocean', 'shipment-fcl', 'loc-sgpin', 'loc-inbom', 'container-20gp', 1200.00, 'USD', 8, 'CMA CGM', 'active') 
ON DUPLICATE KEY UPDATE price=VALUES(price);

-- ─── DEFAULT ADMIN USER ───────────────────────────────────────────────────────
INSERT INTO users (id, name, email, phone, password, role, status)
VALUES ('user-admin-001', 'Biswa Admin', 'biswa@easyfr8.com', '+91-9999999999', 'admin123', 'Administrator', 'Active')
ON DUPLICATE KEY UPDATE status='Active';


