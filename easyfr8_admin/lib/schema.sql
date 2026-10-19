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

-- ─── APP SETTINGS (single row JSON store for SMTP, SMS, payment, site config) ─
CREATE TABLE IF NOT EXISTS app_settings (
  id          INT          NOT NULL DEFAULT 1,
  data        LONGTEXT     NOT NULL COMMENT 'Full AppSettings JSON',
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
  transhipment_id VARCHAR(64) DEFAULT NULL,
  container_id VARCHAR(64),
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  local_thc DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  documentation_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  customs_clearance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  other_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  transit_time INT NOT NULL DEFAULT 0,
  carrier VARCHAR(255) DEFAULT NULL,
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

-- ─── KYC DOCUMENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_documents (
  id         VARCHAR(64)  NOT NULL,
  `user`     VARCHAR(255) NOT NULL DEFAULT '',
  name       VARCHAR(512) NOT NULL DEFAULT '',
  type       VARCHAR(128) NOT NULL DEFAULT '',
  date       DATE         NOT NULL,
  status     ENUM('Pending Review','Approved','Rejected') NOT NULL DEFAULT 'Pending Review',
  remarks    TEXT,
  file_url   TEXT         NOT NULL DEFAULT '#',
  file_type  VARCHAR(64)  NOT NULL DEFAULT 'pdf',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_kyc_user   (`user`(191)),
  INDEX idx_kyc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── SERVICES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id               VARCHAR(64)  NOT NULL,
  title            VARCHAR(255) NOT NULL,
  slug             VARCHAR(255) NOT NULL UNIQUE,
  category         VARCHAR(64)  NOT NULL DEFAULT 'core',
  icon             VARCHAR(128) NOT NULL DEFAULT 'anchor',
  description      TEXT,
  long_description LONGTEXT,
  details          LONGTEXT,
  image            LONGTEXT,
  banner_image     LONGTEXT,
  sort_order       INT          NOT NULL DEFAULT 0,
  show_on_homepage TINYINT(1)   NOT NULL DEFAULT 1,
  active           TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_services_sort (sort_order),
  INDEX idx_services_category (category),
  INDEX idx_services_active (active),
  INDEX idx_services_homepage (show_on_homepage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── FAQS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id          VARCHAR(64)  NOT NULL,
  category    VARCHAR(128) NOT NULL DEFAULT 'General',
  question    VARCHAR(512) NOT NULL,
  answer      TEXT         NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faqs_sort (sort_order),
  INDEX idx_faqs_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
