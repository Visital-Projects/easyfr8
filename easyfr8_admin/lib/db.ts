/**
 * lib/db.ts — MySQL database layer
 *
 * Exposes the same readDb() / writeDb() interface as before so that
 * all existing app/api/** route files continue to work unchanged.
 * The underlying storage has moved from lib/easyfr8_db.json → MySQL.
 */

import mysql from 'mysql2/promise';
import {
  defaultCMSData,
  defaultEnquiries,
  defaultRates,
  defaultUsers,
  defaultDocuments,
  defaultBlogs,
  defaultAuditLogs,
  defaultAppSettings,
  defaultHeroSlides,
  defaultPartners,
  defaultStatistics,
  defaultIndustries,
  CMSData,
  Service,
  FAQ,
  Enquiry,
  FreightRate,
  UserAccount,
  KYCDocument,
  Blog,
  AuditLog,
  AppSettings,
  HeroSlide,
  Partner,
  Statistic,
  Industry,
} from './store';

// ─── DatabaseSchema (same shape as before) ────────────────────────────────────
export interface DatabaseSchema {
  cms: CMSData;
  enquiries: Enquiry[];
  rates: FreightRate[];
  users: UserAccount[];
  documents: KYCDocument[];
  blogs: Blog[];
  auditLogs: AuditLog[];
  appSettings: AppSettings;
  heroSlides: HeroSlide[];
  partners: Partner[];
  statistics: Statistic[];
  industries: Industry[];
  services?: Service[];
  faqs?: FAQ[];
}

// Prevents connection pool leaks during Next.js hot-reloading
const globalForDb = globalThis as unknown as {
  db: mysql.Pool | undefined;
  initialized?: boolean;
  initPromise?: Promise<void>;
};

export const db =
  globalForDb.db ??
  mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
    waitForConnections: true,
    connectionLimit: 25,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

/** One-time safe schema verification and seeding across process/hot-reload lifecycle */
export async function ensureInitialized(): Promise<void> {
  if (globalForDb.initialized) return;
  if (globalForDb.initPromise) return globalForDb.initPromise;

  globalForDb.initPromise = (async () => {
    try {
      const pool = db;

      // Auto-create media table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`media\` (
          \`id\` VARCHAR(64) NOT NULL,
          \`file_name\` VARCHAR(255) NOT NULL,
          \`file_url\` LONGTEXT NOT NULL,
          \`file_type\` VARCHAR(64) NOT NULL,
          \`file_size\` VARCHAR(64) NOT NULL,
          \`uploaded_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create services table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`services\` (
          \`id\` VARCHAR(64) NOT NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`slug\` VARCHAR(255) NOT NULL UNIQUE,
          \`category\` VARCHAR(64) NOT NULL DEFAULT 'core',
          \`icon\` VARCHAR(128) NOT NULL DEFAULT 'anchor',
          \`description\` TEXT,
          \`long_description\` LONGTEXT,
          \`details\` LONGTEXT,
          \`image\` LONGTEXT,
          \`banner_image\` LONGTEXT,
          \`sort_order\` INT NOT NULL DEFAULT 0,
          \`show_on_homepage\` TINYINT(1) NOT NULL DEFAULT 1,
          \`active\` TINYINT(1) NOT NULL DEFAULT 1,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_services_sort\` (\`sort_order\`),
          INDEX \`idx_services_category\` (\`category\`),
          INDEX \`idx_services_active\` (\`active\`),
          INDEX \`idx_services_homepage\` (\`show_on_homepage\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create faqs table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`faqs\` (
          \`id\` VARCHAR(64) NOT NULL,
          \`category\` VARCHAR(128) NOT NULL DEFAULT 'General',
          \`question\` VARCHAR(512) NOT NULL,
          \`answer\` TEXT NOT NULL,
          \`sort_order\` INT NOT NULL DEFAULT 0,
          \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_faqs_sort\` (\`sort_order\`),
          INDEX \`idx_faqs_active\` (\`is_active\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create kyc_documents table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`kyc_documents\` (
          \`id\` VARCHAR(64) NOT NULL,
          \`user\` VARCHAR(255) NOT NULL DEFAULT '',
          \`name\` VARCHAR(512) NOT NULL DEFAULT '',
          \`type\` VARCHAR(128) NOT NULL DEFAULT '',
          \`date\` DATE NOT NULL,
          \`status\` ENUM('Pending Review','Approved','Rejected') NOT NULL DEFAULT 'Pending Review',
          \`remarks\` TEXT,
          \`file_url\` TEXT NOT NULL DEFAULT '#',
          \`file_type\` VARCHAR(64) NOT NULL DEFAULT 'pdf',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_kyc_user\` (\`user\`(191)),
          INDEX \`idx_kyc_status\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create rate_activity_logs table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`rate_activity_logs\` (
          \`id\` VARCHAR(64) NOT NULL,
          \`rate_id\` VARCHAR(64) NOT NULL,
          \`action_type\` ENUM('create', 'update', 'delete') NOT NULL,
          \`old_value\` TEXT,
          \`new_value\` TEXT,
          \`updated_by\` VARCHAR(255) NOT NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create freight_types table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS freight_types (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          sort_order INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create shipment_types table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS shipment_types (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          freight_type_id VARCHAR(64) NOT NULL,
          name VARCHAR(128) NOT NULL,
          description TEXT,
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create locations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS locations (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          port_code VARCHAR(32) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          country VARCHAR(128) NOT NULL,
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create ports table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ports (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          port_code VARCHAR(32) NOT NULL,
          port_name VARCHAR(255) NOT NULL,
          country VARCHAR(128) NOT NULL,
          locode VARCHAR(32),
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create containers table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS containers (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          description TEXT,
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Auto-create freight_rates table
      await pool.query(`
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
          carrier VARCHAR(255) NOT NULL,
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed initial rates if freight_rates table is empty
      const [rateRows]: any = await pool.query('SELECT COUNT(*) as count FROM freight_rates');
      if (rateRows && rateRows[0] && rateRows[0].count === 0) {
        await pool.query("INSERT INTO freight_types (id, name, status, sort_order) VALUES ('mode-ocean', 'Ocean Freight', 'active', 1), ('mode-air', 'Air Freight', 'active', 2) ON DUPLICATE KEY UPDATE name=VALUES(name)");
        await pool.query("INSERT INTO shipment_types (id, freight_type_id, name, description, status) VALUES ('shipment-fcl', 'mode-ocean', 'FCL (Full Container Load)', 'Full container shipping for large volume cargo.', 'active'), ('shipment-lcl', 'mode-ocean', 'LCL (Less than Container Load)', 'Shared container space for smaller shipments.', 'active'), ('shipment-air-std', 'mode-air', 'Air Freight Standard', 'Standard air cargo transport.', 'active') ON DUPLICATE KEY UPDATE name=VALUES(name)");
        await pool.query("INSERT INTO locations (id, port_code, name, country, status) VALUES ('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'active'), ('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'active'), ('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'active'), ('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'active'), ('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'active'), ('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'active'), ('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'active') ON DUPLICATE KEY UPDATE name=VALUES(name)");
        await pool.query("INSERT INTO ports (id, port_code, port_name, country, locode) VALUES ('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'SGPIN'), ('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'CLACH'), ('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'INNSV'), ('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'NLRTM'), ('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'CNSHA'), ('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'USLAX'), ('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'INBOM') ON DUPLICATE KEY UPDATE port_name=VALUES(port_name)");
        await pool.query("INSERT INTO containers (id, name, description, status) VALUES ('container-20gp', '20ft Standard Dry (20GP)', 'Standard 20-foot dry container.', 'active'), ('container-40gp', '40ft Standard Dry (40GP)', 'Standard 40-foot dry container.', 'active'), ('container-40hc', '40ft High Cube (40HC)', 'High cube 40-foot container for voluminous cargo.', 'active'), ('container-40oth', '40ft Open Top High (40OTH)', '40ft open top high container for oversized cargo.', 'active') ON DUPLICATE KEY UPDATE name=VALUES(name)");
        await pool.query("INSERT INTO freight_rates (id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status) VALUES ('frate-sgpin-clach-40oth', 'mode-ocean', 'shipment-fcl', 'loc-sgpin', 'loc-clach', 'container-40oth', 3500.00, 'USD', 30, 'Maersk Line', 'active'), ('frate-cnsha-uslax-40gp', 'mode-ocean', 'shipment-fcl', 'loc-cnsha', 'loc-uslax', 'container-40gp', 3800.00, 'USD', 16, 'MSC', 'active'), ('frate-sgpin-inbom-20gp', 'mode-ocean', 'shipment-fcl', 'loc-sgpin', 'loc-inbom', 'container-20gp', 1200.00, 'USD', 8, 'CMA CGM', 'active') ON DUPLICATE KEY UPDATE price=VALUES(price)");
        console.log('[DB] Auto-seeded freight_rates and lookup tables.');
      }

      // Seed admin user if users table is empty
      const [userRows]: any = await pool.query('SELECT COUNT(*) as count FROM users');
      if (userRows && userRows[0] && userRows[0].count === 0) {
        await pool.query(
          "INSERT INTO users (id, name, email, phone, password, role, status) VALUES ('user-admin-001', 'Biswa Admin', 'biswa@easyfr8.com', '+91-9999999999', 'admin123', 'Administrator', 'Active') ON DUPLICATE KEY UPDATE status='Active'"
        );
        console.log('[DB] Auto-seeded default admin user.');
      }

      globalForDb.initialized = true;
    } catch (err) {
      console.error('[DB] ensureInitialized error:', err);
    } finally {
      globalForDb.initPromise = undefined;
    }
  })();

  return globalForDb.initPromise;
}

// Kick off initialization asynchronously without blocking module load
if (!globalForDb.initialized) {
  ensureInitialized().catch((err) => console.error('[DB] Background init failed:', err));
}

export function getPool(): mysql.Pool {
  if (!globalForDb.initialized && !globalForDb.initPromise) {
    ensureInitialized().catch((err) => console.error('[DB] getPool init failed:', err));
  }
  return db;
}

export default db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateVal: any): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


/** Run a query safely, return rows (or []) on error */
export async function query<T = any>(sql: string, values?: any[]): Promise<T[]> {
  try {
    const [rows] = await getPool().query(sql, values);
    return rows as T[];
  } catch (err) {
    console.error('[DB] Query error:', sql.slice(0, 120), err);
    return [];
  }
}

/** Upsert a single row */
export async function execute(sql: string, values?: any[]): Promise<void> {
  try {
    await getPool().query(sql, values);
  } catch (err) {
    console.error('[DB] Execute error:', sql.slice(0, 120), err);
    throw err;
  }
}

// ─── CMS helpers ──────────────────────────────────────────────────────────────

async function readCmsRow(): Promise<CMSData> {
  const rows = await query<{ data: string }>('SELECT data FROM cms_data WHERE id = 1');
  let cms: CMSData = defaultCMSData;
  if (rows.length > 0) {
    try {
      cms = JSON.parse(rows[0].data) as CMSData;
    } catch {
      cms = defaultCMSData;
    }
  }

  // Authoritative Source of Truth: load services & faqs directly from normalized SQL tables!
  const [dbServices, dbFaqs] = await Promise.all([
    getServices(),
    getFaqs()
  ]);

  if (dbServices && dbServices.length > 0) {
    cms.services = dbServices;
  }
  if (dbFaqs && dbFaqs.length > 0) {
    cms.faqs = dbFaqs;
  }

  if (cms.contact && !cms.contact.footerAbout) {
    cms.contact.footerAbout = 'EasyFr8 simplifies global trade supply chains through instant digital freight rate booking and automated compliance tracking.';
  }

  return cms;
}

async function writeCmsRow(cms: CMSData): Promise<void> {
  // If services are present in the update, persist each directly to MySQL services table
  if (Array.isArray(cms.services)) {
    for (let i = 0; i < cms.services.length; i++) {
      const s = cms.services[i];
      const id = String(s.id);
      const title = s.title || '';
      const slug = s.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const category = (s.category && String(s.category).toLowerCase().includes('value')) ? 'value-added' : 'core';
      const icon = s.icon || 'anchor';
      const desc = s.desc || '';
      const details = s.details || '';
      const image = s.image || '';
      const bannerImage = s.bannerImage || '';
      const sortOrder = typeof s.sortOrder === 'number' ? s.sortOrder : i + 1;
      const showOnHomepage = s.show_on_homepage !== false ? 1 : 0;
      const active = s.active !== false ? 1 : 0;

      await execute(`
        INSERT INTO services (
          id, title, slug, category, icon, description, details, image, banner_image, sort_order, show_on_homepage, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          slug = VALUES(slug),
          category = VALUES(category),
          icon = VALUES(icon),
          description = VALUES(description),
          details = VALUES(details),
          image = VALUES(image),
          banner_image = VALUES(banner_image),
          sort_order = VALUES(sort_order),
          show_on_homepage = VALUES(show_on_homepage),
          active = VALUES(active),
          updated_at = NOW()
      `, [id, title, slug, category, icon, desc, details, image, bannerImage, sortOrder, showOnHomepage, active]);
    }
  }

  // If faqs are present in the update, persist each directly to MySQL faqs table
  if (Array.isArray(cms.faqs)) {
    for (let i = 0; i < cms.faqs.length; i++) {
      const f = cms.faqs[i];
      const id = String(f.id);
      const category = f.category || 'General';
      const question = f.question || '';
      const answer = f.answer || '';
      const sortOrder = typeof (f as any).sort_order === 'number' ? (f as any).sort_order : i + 1;
      const isActive = f.published !== false ? 1 : 0;

      await execute(`
        INSERT INTO faqs (
          id, category, question, answer, sort_order, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          category = VALUES(category),
          question = VALUES(question),
          answer = VALUES(answer),
          sort_order = VALUES(sort_order),
          is_active = VALUES(is_active),
          updated_at = NOW()
      `, [id, category, question, answer, sortOrder, isActive]);
    }
  }

  // Persist core non-collection CMS settings into cms_data for compatibility.
  // Exclude services and faqs: normalized tables are the source of truth,
  // and duplicating base64 images inside cms_data exceeds MySQL max_allowed_packet.
  const { services: _s, faqs: _f, ...cmsDataToStore } = cms;
  await execute(
    'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [JSON.stringify(cmsDataToStore)]
  );
}

// ─── AppSettings helpers ──────────────────────────────────────────────────────

async function readAppSettingsRow(): Promise<AppSettings> {
  const rows = await query<{ data: string }>('SELECT data FROM app_settings WHERE id = 1');
  if (rows.length > 0) {
    try {
      const parsed = JSON.parse(rows[0].data) as AppSettings;
      return { ...defaultAppSettings, ...parsed };
    } catch {
      return defaultAppSettings;
    }
  }
  // Bootstrap default row
  await execute(
    'INSERT INTO app_settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE id=id',
    [JSON.stringify(defaultAppSettings)]
  );
  return defaultAppSettings;
}

async function writeAppSettingsRow(settings: AppSettings): Promise<void> {
  await execute(
    'INSERT INTO app_settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [JSON.stringify(settings)]
  );
}

// ─── Row mappers: DB row → TypeScript shape ───────────────────────────────────

function rowToHeroSlide(r: any): HeroSlide {
  return {
    id: r.id,
    title: r.title ?? '',
    subtitle: r.subtitle ?? '',
    description: r.description ?? '',
    button_text: r.button_text ?? '',
    button_url: r.button_url ?? '',
    image: r.image ?? '',
    status: r.status ?? 'active',
    sort_order: r.sort_order ?? 1,
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
    updated_at: r.updated_at ? String(r.updated_at) : new Date().toISOString(),
  };
}

function rowToPartner(r: any): Partner {
  return {
    id: r.id,
    name: r.name ?? '',
    logo: r.logo ?? '',
    websiteUrl: r.website_url ?? '',
    status: r.status ?? 'active',
    sort_order: r.sort_order ?? 1,
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
    updated_at: r.updated_at ? String(r.updated_at) : new Date().toISOString(),
  };
}

function rowToStatistic(r: any): Statistic {
  return {
    id: r.id,
    label: r.label ?? '',
    value: r.value ?? '',
    icon: r.icon ?? 'flaticon-transport-9',
    status: r.status ?? 'active',
    sort_order: r.sort_order ?? 1,
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
    updated_at: r.updated_at ? String(r.updated_at) : new Date().toISOString(),
  };
}

function rowToIndustry(r: any): Industry {
  return {
    id: r.id,
    title: r.title ?? '',
    desc: r.description ?? '',
    icon: r.icon ?? 'flaticon-transport-1',
    status: r.status ?? 'active',
    sort_order: r.sort_order ?? 1,
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
    updated_at: r.updated_at ? String(r.updated_at) : new Date().toISOString(),
  };
}

function rowToBlog(r: any): Blog {
  return {
    id: r.id,
    title: r.title ?? '',
    slug: r.slug ?? '',
    body: r.content ?? '',
    category: r.category ?? '',
    tags: '',
    status: (r.status === 'Published') ? 'Published' : 'Draft',
    image: r.image ?? '',
    date: r.published_at ? formatDate(r.published_at) : formatDate(r.created_at),
    author: r.author ?? 'easyfr8',
    seoTitle: r.title ?? '',
    seoDesc: r.excerpt ?? '',
    metaKeywords: '',
    publishedAt: r.published_at ? formatDate(r.published_at) : '',
    readingTime: 5,
  };
}

function rowToEnquiry(r: any): Enquiry {
  return {
    id: r.id,
    name: r.name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    subject: r.subject ?? '',
    date: r.created_at ? formatDate(r.created_at) : formatDate(new Date()),
    status: r.status ?? 'New',
    notes: r.notes ?? '',
    assignedTo: r.assigned_to ?? '',
    source: r.source ?? 'Web Form',
  };
}

function rowToRate(r: any): FreightRate {
  return {
    id: r.id,
    origin: r.origin ?? '',
    destination: r.destination ?? '',
    container: r.container ?? '',
    cost: Number(r.cost) ?? 0,
    transit: Number(r.transit) ?? 0,
    validity: r.validity ?? '',
  };
}

function rowToAuditLog(r: any): AuditLog {
  return {
    id: r.id,
    user: r.user_name || 'System',
    action: r.action,
    timestamp: r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')
  };
}

function rowToUser(r: any): UserAccount {
  return {
    id: r.id,
    name: r.name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    role: r.role ?? 'Customer',
    status: r.status ?? 'Active',
    regDate: formatDate(r.reg_date),
    lastLogin: formatDate(r.last_login),
    avatar: r.avatar ?? '',
  };
}

function rowToKYCDocument(r: any): KYCDocument {
  return {
    id: r.id,
    user: r.user ?? '',
    name: r.name ?? '',
    type: r.type ?? '',
    date: r.date ? formatDate(r.date) : formatDate(new Date()),
    status: r.status ?? 'Pending Review',
    remarks: r.remarks ?? '',
    fileUrl: r.file_url ?? '#',
    fileType: r.file_type ?? 'pdf',
  };
}

function rowToService(r: any): Service {
  return {
    id: isNaN(Number(r.id)) ? r.id : Number(r.id),
    title: r.title ?? '',
    slug: r.slug ?? '',
    category: (r.category && String(r.category).toLowerCase().includes('value')) ? 'value-added' : 'core',
    icon: r.icon ?? 'anchor',
    desc: r.description ?? '',
    active: Boolean(r.active),
    show_on_homepage: Boolean(r.show_on_homepage),
    details: r.details ?? '',
    image: r.image ?? '',
    bannerImage: r.banner_image ?? '',
    sortOrder: Number(r.sort_order) || 1,
  };
}

function rowToFaq(r: any): FAQ {
  return {
    id: isNaN(Number(r.id)) ? r.id : Number(r.id),
    category: r.category ?? 'General',
    question: r.question ?? '',
    answer: r.answer ?? '',
    published: Boolean(r.is_active),
    sort_order: Number(r.sort_order) || 1,
  };
}

// ─── Targeted Single-Table Getters (Used by single-resource API routes) ───────

export async function getServices(onlyActive = false): Promise<Service[]> {
  const sql = onlyActive
    ? 'SELECT * FROM services WHERE active = 1 ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM services ORDER BY sort_order ASC, id ASC';
  const rows = await query(sql);
  return rows.map(rowToService);
}

export async function getServiceById(id: string | number): Promise<Service | null> {
  const rows = await query('SELECT * FROM services WHERE id = ? OR slug = ? LIMIT 1', [String(id), String(id)]);
  return rows.length > 0 ? rowToService(rows[0]) : null;
}

export async function createService(s: Partial<Service>): Promise<Service> {
  const id = String(s.id || Date.now());
  const title = s.title || 'New Service';
  let slug = s.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!slug) slug = `service-${Date.now()}`;

  // Ensure unique slug so it does not overwrite another service
  const existingSlug = await query('SELECT id FROM services WHERE slug = ? AND id != ? LIMIT 1', [slug, id]);
  if (existingSlug.length > 0) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const category = (s.category && String(s.category).toLowerCase().includes('value')) ? 'value-added' : 'core';
  const icon = s.icon || 'anchor';
  const desc = s.desc || '';
  const details = s.details || '';
  const image = s.image || '';
  const bannerImage = s.bannerImage || '';
  const rows: any = await query('SELECT COUNT(*) as count FROM services');
  const total = (rows && rows[0] && rows[0].count) ? Number(rows[0].count) : 0;
  const sortOrder = typeof s.sortOrder === 'number' ? s.sortOrder : total + 1;
  const showOnHomepage = s.show_on_homepage !== false ? 1 : 0;
  const active = s.active !== false ? 1 : 0;

  await execute(`
    INSERT INTO services (
      id, title, slug, category, icon, description, details, image, banner_image, sort_order, show_on_homepage, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      slug = VALUES(slug),
      category = VALUES(category),
      icon = VALUES(icon),
      description = VALUES(description),
      details = VALUES(details),
      image = VALUES(image),
      banner_image = VALUES(banner_image),
      sort_order = VALUES(sort_order),
      show_on_homepage = VALUES(show_on_homepage),
      active = VALUES(active),
      updated_at = NOW()
  `, [id, title, slug, category, icon, desc, details, image, bannerImage, sortOrder, showOnHomepage, active]);

  const created = await getServiceById(id);
  if (!created) {
    throw new Error('Failed to retrieve created service');
  }
  return created;
}

export async function updateService(id: string | number, s: Partial<Service>): Promise<Service | null> {
  const existing = await getServiceById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (s.title !== undefined) { updates.push('title = ?'); values.push(s.title); }
  if (s.slug !== undefined) {
    let slug = s.slug;
    const existingSlug = await query('SELECT id FROM services WHERE slug = ? AND id != ? LIMIT 1', [slug, String(existing.id)]);
    if (existingSlug.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }
    updates.push('slug = ?');
    values.push(slug);
  }
  if (s.category !== undefined) {
    const cat = String(s.category).toLowerCase().includes('value') ? 'value-added' : 'core';
    updates.push('category = ?'); values.push(cat);
  }
  if (s.icon !== undefined) { updates.push('icon = ?'); values.push(s.icon); }
  if (s.desc !== undefined) { updates.push('description = ?'); values.push(s.desc); }
  if (s.details !== undefined) { updates.push('details = ?'); values.push(s.details); }
  if (s.image !== undefined) { updates.push('image = ?'); values.push(s.image); }
  if (s.bannerImage !== undefined) { updates.push('banner_image = ?'); values.push(s.bannerImage); }
  if (s.sortOrder !== undefined) { updates.push('sort_order = ?'); values.push(Number(s.sortOrder) || 1); }
  if (s.show_on_homepage !== undefined) { updates.push('show_on_homepage = ?'); values.push(s.show_on_homepage ? 1 : 0); }
  if (s.active !== undefined) { updates.push('active = ?'); values.push(s.active ? 1 : 0); }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(String(existing.id));
    await execute(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  return getServiceById(existing.id);
}

export async function deleteService(id: string | number): Promise<boolean> {
  const result: any = await getPool().query('DELETE FROM services WHERE id = ? OR slug = ?', [String(id), String(id)]);
  return (result[0]?.affectedRows || 0) > 0;
}

export async function getFaqs(onlyPublished = false): Promise<FAQ[]> {
  const sql = onlyPublished
    ? 'SELECT * FROM faqs WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM faqs ORDER BY sort_order ASC, id ASC';
  const rows = await query(sql);
  return rows.map(rowToFaq);
}

export async function getFaqById(id: string | number): Promise<FAQ | null> {
  const rows = await query('SELECT * FROM faqs WHERE id = ? LIMIT 1', [String(id)]);
  return rows.length > 0 ? rowToFaq(rows[0]) : null;
}

export async function createFaq(f: Partial<FAQ>): Promise<FAQ> {
  const id = String(f.id || Date.now());
  const category = f.category || 'General';
  const question = f.question || '';
  const answer = f.answer || '';
  const [countRows]: any = await query('SELECT COUNT(*) as count FROM faqs');
  const sortOrder = typeof (f as any).sort_order === 'number' ? (f as any).sort_order : (countRows[0]?.count || 0) + 1;
  const isActive = f.published !== false ? 1 : 0;

  await execute(`
    INSERT INTO faqs (id, category, question, answer, sort_order, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      category = VALUES(category),
      question = VALUES(question),
      answer = VALUES(answer),
      sort_order = VALUES(sort_order),
      is_active = VALUES(is_active),
      updated_at = NOW()
  `, [id, category, question, answer, sortOrder, isActive]);

  return (await getFaqById(id))!;
}

export async function updateFaq(id: string | number, f: Partial<FAQ>): Promise<FAQ | null> {
  const existing = await getFaqById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (f.category !== undefined) { updates.push('category = ?'); values.push(f.category); }
  if (f.question !== undefined) { updates.push('question = ?'); values.push(f.question); }
  if (f.answer !== undefined) { updates.push('answer = ?'); values.push(f.answer); }
  if ((f as any).sort_order !== undefined) { updates.push('sort_order = ?'); values.push((f as any).sort_order); }
  if (f.published !== undefined) { updates.push('is_active = ?'); values.push(f.published ? 1 : 0); }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(String(existing.id));
    await execute(`UPDATE faqs SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  return getFaqById(id);
}

export async function deleteFaq(id: string | number): Promise<boolean> {
  const result: any = await getPool().query('DELETE FROM faqs WHERE id = ?', [String(id)]);
  return (result[0]?.affectedRows || 0) > 0;
}

export async function getCmsData(): Promise<CMSData> {
  return readCmsRow();
}

export async function getAppSettings(): Promise<AppSettings> {
  return readAppSettingsRow();
}

export async function getHeroSlides(includeRawImage = false): Promise<HeroSlide[]> {
  if (includeRawImage) {
    const rows = await query('SELECT * FROM hero_slides ORDER BY sort_order ASC');
    return rows.map(rowToHeroSlide);
  }
  const rows = await query(
    'SELECT id, title, subtitle, description, button_text, button_url, status, sort_order, created_at, updated_at FROM hero_slides ORDER BY sort_order ASC'
  );
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title ?? '',
    subtitle: r.subtitle ?? '',
    description: r.description ?? '',
    button_text: r.button_text ?? '',
    button_url: r.button_url ?? '',
    image: `/api/admin/cms/hero-slides/${r.id}/image?v=${new Date(r.updated_at || Date.now()).getTime()}`,
    status: r.status ?? 'active',
    sort_order: r.sort_order ?? 1,
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
    updated_at: r.updated_at ? String(r.updated_at) : new Date().toISOString(),
  }));
}

export async function getPartners(): Promise<Partner[]> {
  const rows = await query('SELECT * FROM partners ORDER BY sort_order ASC, id ASC');
  return rows.map(rowToPartner);
}

export async function getStatistics(): Promise<Statistic[]> {
  const rows = await query('SELECT * FROM statistics ORDER BY sort_order ASC');
  return rows.map(rowToStatistic);
}

export async function getIndustries(): Promise<Industry[]> {
  const rows = await query('SELECT * FROM industries ORDER BY sort_order ASC');
  return rows.map(rowToIndustry);
}

export async function getBlogs(): Promise<Blog[]> {
  const rows = await query('SELECT * FROM blogs ORDER BY created_at DESC');
  return rows.map(rowToBlog);
}

export async function getEnquiries(): Promise<Enquiry[]> {
  const rows = await query('SELECT * FROM enquiries ORDER BY created_at DESC');
  return rows.map(rowToEnquiry);
}

export async function getRates(): Promise<FreightRate[]> {
  const rows = await query('SELECT * FROM rates ORDER BY created_at DESC');
  return rows.map(rowToRate);
}

export async function getUsers(): Promise<UserAccount[]> {
  const rows = await query('SELECT * FROM users ORDER BY created_at ASC');
  return rows.map(rowToUser);
}

export async function getKYCDocuments(): Promise<KYCDocument[]> {
  const rows = await query('SELECT * FROM kyc_documents ORDER BY created_at DESC');
  return rows.map(rowToKYCDocument);
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const rows = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
  return rows.map(rowToAuditLog);
}

export {
  rowToHeroSlide,
  rowToPartner,
  rowToStatistic,
  rowToIndustry,
  rowToBlog,
  rowToEnquiry,
  rowToRate,
  rowToAuditLog,
  rowToUser,
  rowToKYCDocument,
  rowToService,
  rowToFaq,
};

// ─── readDb() — assemble full DatabaseSchema from MySQL ───────────────────────

export async function readDb(): Promise<DatabaseSchema> {
  try {
    const [
      cms,
      appSettings,
      heroSlides,
      partners,
      statistics,
      industries,
      blogs,
      enquiries,
      rates,
      users,
      auditLogs,
      documents,
    ] = await Promise.all([
      getCmsData(),
      getAppSettings(),
      getHeroSlides(),
      getPartners(),
      getStatistics(),
      getIndustries(),
      getBlogs(),
      getEnquiries(),
      getRates(),
      getUsers(),
      getAuditLogs(),
      getKYCDocuments(),
    ]);

    const result: DatabaseSchema = {
      cms,
      heroSlides,
      partners,
      statistics,
      industries,
      blogs,
      enquiries,
      rates,
      users,
      documents,
      auditLogs,
      appSettings,
    };

    return result;
  } catch (err) {
    console.error('[DB] readDb() failed — returning defaults:', err);
    return {
      cms: defaultCMSData,
      enquiries: defaultEnquiries,
      rates: defaultRates,
      users: defaultUsers,
      documents: [],
      blogs: defaultBlogs,
      auditLogs: defaultAuditLogs,
      appSettings: defaultAppSettings,
      heroSlides: defaultHeroSlides,
      partners: defaultPartners,
      statistics: defaultStatistics,
      industries: defaultIndustries,
    };
  }
}

// ─── writeDb() — direct persistence without WeakMap or in-memory diffing ─────

export async function writeDb(database: DatabaseSchema): Promise<void> {
  if (database.cms) {
    await writeCmsRow(database.cms);
  }
  if (database.appSettings) {
    await writeAppSettingsRow(database.appSettings);
  }
}




export function invalidateCache(table?: string): void {
  // Retained for backward compatibility
}

/** Delete a record from any table by id column */
export async function deleteById(table: string, id: string): Promise<void> {
  await execute(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
  invalidateCache(table);
}

/** Update any table row by id */
export async function updateById(table: string, id: string, fields: Record<string, any>): Promise<void> {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  await execute(`UPDATE \`${table}\` SET ${setClause}, updated_at = NOW() WHERE id = ?`, [...values, id]);
  invalidateCache(table);
}

/** Append audit log event to audit_logs table */
export async function logAuditEvent(
  userId: string | null,
  userName: string | null,
  action: string,
  ipAddress?: string | null
): Promise<void> {
  const safeAction = typeof action === 'string' && action.length > 500 ? action.slice(0, 500) + '...' : action;
  await execute(
    'INSERT INTO audit_logs (user_id, user_name, action, ip_address) VALUES (?, ?, ?, ?)',
    [userId, userName, safeAction, ipAddress || null]
  );
}

/** Append rate change activity log */
export async function logRateActivity(
  rateId: string,
  actionType: 'create' | 'update' | 'delete',
  oldValue: any | null,
  newValue: any | null,
  updatedBy: string
): Promise<void> {
  const id = `RLG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await execute(
    'INSERT INTO rate_activity_logs (id, rate_id, action_type, old_value, new_value, updated_by) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id,
      rateId,
      actionType,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      updatedBy
    ]
  );
}
