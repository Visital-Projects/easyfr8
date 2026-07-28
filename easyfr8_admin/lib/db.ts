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
}

// Prevents connection pool leaks during Next.js hot-reloading
const globalForDb = globalThis as unknown as {
  db: mysql.Pool | undefined;
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
    connectionLimit: 10,
  });

// Dynamically adjust packet limit on connection creation to support large CMS payloads
db.on('connection', (connection) => {
  // Cast to any to bypass strict promise pool typings and type error parameters explicitly
  const rawConn = connection as any;

  // Auto-create media table if not exists
  rawConn.query(`
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
  `, (err: any) => {
    if (err) console.error('[DB] Failed to auto-create media table:', err);
  });

  // Auto-create rate_activity_logs table if not exists
  rawConn.query(`
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
  `, (err: any) => {
    if (err) console.error('[DB] Failed to auto-create rate_activity_logs table:', err);
  });

  // Auto-create freight_types table
  rawConn.query(`
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
  rawConn.query(`
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
  rawConn.query(`
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
  rawConn.query(`
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
  rawConn.query(`
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
  rawConn.query(`
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
  `, () => {
    // Seed initial rates if freight_rates table is empty
    rawConn.query('SELECT COUNT(*) as count FROM freight_rates', (err: any, rows: any) => {
      if (!err && rows && rows[0] && rows[0].count === 0) {
        // Seed Modes
        rawConn.query("INSERT INTO freight_types (id, name, status, sort_order) VALUES ('mode-ocean', 'Ocean Freight', 'active', 1), ('mode-air', 'Air Freight', 'active', 2) ON DUPLICATE KEY UPDATE name=VALUES(name)");
        // Seed Shipment Types
        rawConn.query("INSERT INTO shipment_types (id, freight_type_id, name, description, status) VALUES ('shipment-fcl', 'mode-ocean', 'FCL (Full Container Load)', 'Full container shipping for large volume cargo.', 'active'), ('shipment-lcl', 'mode-ocean', 'LCL (Less than Container Load)', 'Shared container space for smaller shipments.', 'active'), ('shipment-air-std', 'mode-air', 'Air Freight Standard', 'Standard air cargo transport.', 'active') ON DUPLICATE KEY UPDATE name=VALUES(name)");
        // Seed Locations & Ports
        rawConn.query("INSERT INTO locations (id, port_code, name, country, status) VALUES ('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'active'), ('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'active'), ('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'active'), ('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'active'), ('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'active'), ('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'active'), ('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'active') ON DUPLICATE KEY UPDATE name=VALUES(name)");
        rawConn.query("INSERT INTO ports (id, port_code, port_name, country, locode) VALUES ('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'SGPIN'), ('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'CLACH'), ('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'INNSV'), ('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'NLRTM'), ('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'CNSHA'), ('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'USLAX'), ('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'INBOM') ON DUPLICATE KEY UPDATE port_name=VALUES(port_name)");
        // Seed Containers
        rawConn.query("INSERT INTO containers (id, name, description, status) VALUES ('container-20gp', '20ft Standard Dry (20GP)', 'Standard 20-foot dry container.', 'active'), ('container-40gp', '40ft Standard Dry (40GP)', 'Standard 40-foot dry container.', 'active'), ('container-40hc', '40ft High Cube (40HC)', 'High cube 40-foot container for voluminous cargo.', 'active'), ('container-40oth', '40ft Open Top High (40OTH)', '40ft open top high container for oversized cargo.', 'active') ON DUPLICATE KEY UPDATE name=VALUES(name)");
        // Seed Rates
        rawConn.query("INSERT INTO freight_rates (id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status) VALUES ('frate-sgpin-clach-40oth', 'mode-ocean', 'shipment-fcl', 'loc-sgpin', 'loc-clach', 'container-40oth', 3500.00, 'USD', 30, 'Maersk Line', 'active'), ('frate-cnsha-uslax-40gp', 'mode-ocean', 'shipment-fcl', 'loc-cnsha', 'loc-uslax', 'container-40gp', 3800.00, 'USD', 16, 'MSC', 'active'), ('frate-sgpin-inbom-20gp', 'mode-ocean', 'shipment-fcl', 'loc-sgpin', 'loc-inbom', 'container-20gp', 1200.00, 'USD', 8, 'CMA CGM', 'active') ON DUPLICATE KEY UPDATE price=VALUES(price)");
        console.log('[DB] Auto-seeded freight_rates and lookup tables.');
      }
    });

    // Seed admin user if users table is empty
    rawConn.query('SELECT COUNT(*) as count FROM users', (err: any, rows: any) => {
      if (!err && rows && rows[0] && rows[0].count === 0) {
        rawConn.query(
          "INSERT INTO users (id, name, email, phone, password, role, status) VALUES ('user-admin-001', 'Biswa Admin', 'biswa@easyfr8.com', '+91-9999999999', 'admin123', 'Administrator', 'Active') ON DUPLICATE KEY UPDATE status='Active'",
          (insertErr: any) => {
            if (!insertErr) console.log('[DB] Auto-seeded default admin user.');
          }
        );
      }
    });
  });
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

export function getPool(): mysql.Pool {
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
  if (rows.length > 0) {
    try {
      const cms = JSON.parse(rows[0].data) as CMSData;
      let changed = false;
      
      if (cms.contact && !cms.contact.footerAbout) {
        cms.contact.footerAbout = 'EasyFr8 simplifies global trade supply chains through instant digital freight rate booking and automated compliance tracking.';
        changed = true;
      }
      
      // Auto-migrate services if they are missing slugs or have incorrect outdated names
      if (
        !cms.services || 
        cms.services.length === 0 || 
        cms.services.some(s => !s.slug || s.title.includes('FCL/LCL') || s.title.includes('Expedited'))
      ) {
        cms.services = defaultCMSData.services;
        changed = true;
      }
      
      if (changed) {
        await execute(
          'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
          [JSON.stringify(cms)]
        );
      }
      
      return cms;
    } catch {
      return defaultCMSData;
    }
  }
  // Bootstrap default row
  await execute(
    'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE id=id',
    [JSON.stringify(defaultCMSData)]
  );
  return defaultCMSData;
}

async function writeCmsRow(cms: CMSData): Promise<void> {
  await execute(
    'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [JSON.stringify(cms)]
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

// In-memory cache of serialized table states to prevent redundant heavy writes
const lastStateCache: {
  cms?: string;
  heroSlides?: string;
  partners?: string;
  statistics?: string;
  industries?: string;
  blogs?: string;
  enquiries?: string;
  rates?: string;
  users?: string;
} = {};

// ─── readDb() — assemble full DatabaseSchema from MySQL ───────────────────────

export async function readDb(): Promise<DatabaseSchema> {
  try {
    const [
      cms,
      heroSlideRows,
      partnerRows,
      statisticRows,
      industryRows,
      blogRows,
      enquiryRows,
      rateRows,
      userRows,
      auditLogRows,
    ] = await Promise.all([
      readCmsRow(),
      query('SELECT * FROM hero_slides ORDER BY sort_order ASC'),
      query('SELECT * FROM partners ORDER BY sort_order ASC'),
      query('SELECT * FROM statistics ORDER BY sort_order ASC'),
      query('SELECT * FROM industries ORDER BY sort_order ASC'),
      query('SELECT * FROM blogs ORDER BY created_at DESC'),
      query('SELECT * FROM enquiries ORDER BY created_at DESC'),
      query('SELECT * FROM rates ORDER BY created_at DESC'),
      query('SELECT * FROM users ORDER BY created_at ASC'),
      query('SELECT * FROM audit_logs ORDER BY created_at DESC'),
    ]);

    const result: DatabaseSchema = {
      cms,
      heroSlides:  heroSlideRows.map(rowToHeroSlide),
      partners:    partnerRows.map(rowToPartner),
      statistics:  statisticRows.map(rowToStatistic),
      industries:  industryRows.map(rowToIndustry),
      blogs:       blogRows.map(rowToBlog),
      enquiries:   enquiryRows.map(rowToEnquiry),
      rates:       rateRows.map(rowToRate),
      users:       userRows.map(rowToUser),
      documents:   defaultDocuments,   // KYC docs kept in memory for now
      auditLogs:   auditLogRows.map(rowToAuditLog),
      appSettings: defaultAppSettings,
    };

    // Cache current states
    lastStateCache.cms = JSON.stringify(result.cms);
    lastStateCache.heroSlides = JSON.stringify(result.heroSlides);
    lastStateCache.partners = JSON.stringify(result.partners);
    lastStateCache.statistics = JSON.stringify(result.statistics);
    lastStateCache.industries = JSON.stringify(result.industries);
    lastStateCache.blogs = JSON.stringify(result.blogs);
    lastStateCache.enquiries = JSON.stringify(result.enquiries);
    lastStateCache.rates = JSON.stringify(result.rates);
    lastStateCache.users = JSON.stringify(result.users);

    return result;
  } catch (err) {
    console.error('[DB] readDb() failed — returning defaults:', err);
    return {
      cms: defaultCMSData,
      enquiries: defaultEnquiries,
      rates: defaultRates,
      users: defaultUsers,
      documents: defaultDocuments,
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

// ─── writeDb() — persist full DatabaseSchema back to MySQL ────────────────────
//
// Called by existing route files that modify db.X and then call writeDb(db).
// We diff what changed by re-syncing each table collection.

export async function writeDb(db: DatabaseSchema): Promise<void> {
  try {
    const promises: Promise<void>[] = [];

    const cmsStr = JSON.stringify(db.cms);
    if (cmsStr !== lastStateCache.cms) {
      promises.push(writeCmsRow(db.cms).then(() => { lastStateCache.cms = cmsStr; }));
    }

    const slides = db.heroSlides || [];
    const slidesStr = JSON.stringify(slides);
    if (slidesStr !== lastStateCache.heroSlides) {
      promises.push(syncHeroSlides(slides).then(() => { lastStateCache.heroSlides = slidesStr; }));
    }

    const partners = db.partners || [];
    const partnersStr = JSON.stringify(partners);
    if (partnersStr !== lastStateCache.partners) {
      promises.push(syncPartners(partners).then(() => { lastStateCache.partners = partnersStr; }));
    }

    const stats = db.statistics || [];
    const statsStr = JSON.stringify(stats);
    if (statsStr !== lastStateCache.statistics) {
      promises.push(syncStatistics(stats).then(() => { lastStateCache.statistics = statsStr; }));
    }

    const industries = db.industries || [];
    const industriesStr = JSON.stringify(industries);
    if (industriesStr !== lastStateCache.industries) {
      promises.push(syncIndustries(industries).then(() => { lastStateCache.industries = industriesStr; }));
    }

    const blogs = db.blogs || [];
    const blogsStr = JSON.stringify(blogs);
    if (blogsStr !== lastStateCache.blogs) {
      promises.push(syncBlogs(blogs).then(() => { lastStateCache.blogs = blogsStr; }));
    }

    const enquiries = db.enquiries || [];
    const enquiriesStr = JSON.stringify(enquiries);
    if (enquiriesStr !== lastStateCache.enquiries) {
      promises.push(syncEnquiries(enquiries).then(() => { lastStateCache.enquiries = enquiriesStr; }));
    }

    const rates = db.rates || [];
    const ratesStr = JSON.stringify(rates);
    if (ratesStr !== lastStateCache.rates) {
      promises.push(syncRates(rates).then(() => { lastStateCache.rates = ratesStr; }));
    }

    const users = db.users || [];
    const usersStr = JSON.stringify(users);
    if (usersStr !== lastStateCache.users) {
      promises.push(syncUsers(users).then(() => { lastStateCache.users = usersStr; }));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (err) {
    console.error('[DB] writeDb() failed:', err);
    throw err;
  }
}

// ─── Sync helpers — upsert all rows for each collection ──────────────────────

async function syncHeroSlides(slides: HeroSlide[]): Promise<void> {
  for (const s of slides) {
    await execute(
      `INSERT INTO hero_slides (id, title, subtitle, description, button_text, button_url, image, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), subtitle=VALUES(subtitle), description=VALUES(description),
         button_text=VALUES(button_text), button_url=VALUES(button_url), image=VALUES(image),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [s.id, s.title, s.subtitle, s.description, s.button_text, s.button_url, s.image, s.status, s.sort_order]
    );
  }
}

async function syncPartners(partners: Partner[]): Promise<void> {
  for (const p of partners) {
    await execute(
      `INSERT INTO partners (id, name, logo, website_url, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), logo=VALUES(logo), website_url=VALUES(website_url),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [p.id, p.name, p.logo, p.websiteUrl || '', p.status, p.sort_order]
    );
  }
}

async function syncStatistics(stats: Statistic[]): Promise<void> {
  for (const s of stats) {
    await execute(
      `INSERT INTO statistics (id, label, value, icon, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         label=VALUES(label), value=VALUES(value), icon=VALUES(icon),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [s.id, s.label, s.value, s.icon, s.status, s.sort_order]
    );
  }
}

async function syncIndustries(industries: Industry[]): Promise<void> {
  for (const i of industries) {
    await execute(
      `INSERT INTO industries (id, title, description, icon, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), description=VALUES(description), icon=VALUES(icon),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [i.id, i.title, i.desc, i.icon, i.status, i.sort_order]
    );
  }
}

async function syncBlogs(blogs: Blog[]): Promise<void> {
  for (const b of blogs) {
    await execute(
      `INSERT INTO blogs (id, title, slug, content, excerpt, image, category, author, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), slug=VALUES(slug), content=VALUES(content), excerpt=VALUES(excerpt),
         image=VALUES(image), category=VALUES(category), author=VALUES(author),
         status=VALUES(status), published_at=VALUES(published_at), updated_at=NOW()`,
      [
        b.id, b.title, b.slug || '', b.body || '', b.seoDesc || '',
        b.image || '', b.category || '', b.author || 'easyfr8', b.status || 'Draft',
        b.publishedAt || b.date || null,
      ]
    );
  }
}

async function syncEnquiries(enquiries: Enquiry[]): Promise<void> {
  for (const e of enquiries) {
    await execute(
      `INSERT INTO enquiries (id, name, email, subject, notes, assigned_to, source, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), email=VALUES(email), subject=VALUES(subject), notes=VALUES(notes),
         assigned_to=VALUES(assigned_to), source=VALUES(source), status=VALUES(status), updated_at=NOW()`,
      [e.id, e.name, e.email, e.subject || '', e.notes || '', e.assignedTo || '', e.source || 'Web Form', e.status || 'New']
    );
  }
}

async function syncRates(rates: FreightRate[]): Promise<void> {
  for (const r of rates) {
    await execute(
      `INSERT INTO rates (id, origin, destination, container, cost, transit, validity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         origin=VALUES(origin), destination=VALUES(destination), container=VALUES(container),
         cost=VALUES(cost), transit=VALUES(transit), validity=VALUES(validity), updated_at=NOW()`,
      [r.id, r.origin, r.destination, r.container || '', r.cost || 0, r.transit || 0, r.validity || '']
    );
  }
}

async function syncUsers(users: UserAccount[]): Promise<void> {
  for (const u of users) {
    await execute(
      `INSERT INTO users (id, name, email, phone, role, status, avatar, reg_date, last_login, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), email=VALUES(email), phone=VALUES(phone), role=VALUES(role),
         status=VALUES(status), avatar=VALUES(avatar), last_login=VALUES(last_login), updated_at=NOW()`,
      [
        u.id, u.name, u.email, u.phone || '', u.role || 'Customer',
        u.status || 'Active', u.avatar || '', u.regDate || null, u.lastLogin || null,
      ]
    );
  }
}

// ─── Direct targeted helpers (used by specific admin routes) ──────────────────

function invalidateCache(table: string) {
  if (table === 'hero_slides') lastStateCache.heroSlides = undefined;
  else if (table === 'partners') lastStateCache.partners = undefined;
  else if (table === 'statistics') lastStateCache.statistics = undefined;
  else if (table === 'industries') lastStateCache.industries = undefined;
  else if (table === 'blogs') lastStateCache.blogs = undefined;
  else if (table === 'enquiries') lastStateCache.enquiries = undefined;
  else if (table === 'rates') lastStateCache.rates = undefined;
  else if (table === 'users') lastStateCache.users = undefined;
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
  await execute(
    'INSERT INTO audit_logs (user_id, user_name, action, ip_address) VALUES (?, ?, ?, ?)',
    [userId, userName, action, ipAddress || null]
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
