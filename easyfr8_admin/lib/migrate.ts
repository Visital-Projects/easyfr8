/**
 * lib/migrate.ts — One-time migration script
 *
 * Reads data from the existing easyfr8_db.json and inserts
 * everything into the MySQL database tables.
 *
 * Usage (run once, from the easyfr8_api directory):
 *   node --experimental-specifier-resolution=node --loader ts-node/esm lib/migrate.ts
 *
 * Or via the npm script:
 *   npm run migrate
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const DB_FILE = path.join(process.cwd(), 'lib', 'easyfr8_db.json');

async function main() {
  console.log('\n🚀 EasyFr8 MySQL Migration\n');

  // ── 1. Read existing JSON ──────────────────────────────────────────────────
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ easyfr8_db.json not found at', DB_FILE);
    process.exit(1);
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(raw);
  console.log('✔ Loaded easyfr8_db.json');

  // ── 2. Connect to MySQL ────────────────────────────────────────────────────
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    port:     Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });

  // Create the database if it doesn't exist
  const dbName = process.env.DB_DATABASE || 'easyfr8';
  await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await pool.query(`USE \`${dbName}\``);
  console.log(`✔ Using database: ${dbName}`);

  // ── 3. Run schema ──────────────────────────────────────────────────────────
  const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schemaSql);
    console.log('✔ Schema applied (tables created if not exist)');
  }

  // ── 4. Migrate cms_data ────────────────────────────────────────────────────
  const cmsJson = JSON.stringify(db.cms || {});
  await pool.execute(
    'INSERT INTO cms_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [cmsJson]
  );
  console.log('✔ CMS data migrated');

  // ── 5. Migrate hero_slides ────────────────────────────────────────────────
  const heroSlides: any[] = db.heroSlides || [];
  for (const s of heroSlides) {
    await pool.execute(
      `INSERT INTO hero_slides (id, title, subtitle, description, button_text, button_url, image, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE title=VALUES(title), subtitle=VALUES(subtitle), description=VALUES(description),
         button_text=VALUES(button_text), button_url=VALUES(button_url), image=VALUES(image),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [s.id, s.title || '', s.subtitle || '', s.description || '', s.button_text || '', s.button_url || '', s.image || '', s.status || 'active', s.sort_order || 1]
    );
  }
  console.log(`✔ Hero slides migrated: ${heroSlides.length} rows`);

  // ── 6. Migrate partners ───────────────────────────────────────────────────
  const partners: any[] = db.partners || [];
  for (const p of partners) {
    await pool.execute(
      `INSERT INTO partners (id, name, logo, website_url, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE name=VALUES(name), logo=VALUES(logo), website_url=VALUES(website_url),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [p.id, p.name || '', p.logo || '', p.websiteUrl || '', p.status || 'active', p.sort_order || 1]
    );
  }
  console.log(`✔ Partners migrated: ${partners.length} rows`);

  // ── 7. Migrate statistics ─────────────────────────────────────────────────
  const statistics: any[] = db.statistics || [];
  for (const s of statistics) {
    await pool.execute(
      `INSERT INTO statistics (id, label, value, icon, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE label=VALUES(label), value=VALUES(value), icon=VALUES(icon),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [s.id, s.label || '', s.value || '', s.icon || 'flaticon-transport-9', s.status || 'active', s.sort_order || 1]
    );
  }
  console.log(`✔ Statistics migrated: ${statistics.length} rows`);

  // ── 8. Migrate industries ─────────────────────────────────────────────────
  const industries: any[] = db.industries || [];
  for (const i of industries) {
    await pool.execute(
      `INSERT INTO industries (id, title, description, icon, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), icon=VALUES(icon),
         status=VALUES(status), sort_order=VALUES(sort_order), updated_at=NOW()`,
      [i.id, i.title || '', i.desc || '', i.icon || 'flaticon-transport-1', i.status || 'active', i.sort_order || 1]
    );
  }
  console.log(`✔ Industries migrated: ${industries.length} rows`);

  // ── 9. Migrate blogs ──────────────────────────────────────────────────────
  const blogs: any[] = db.blogs || [];
  for (const b of blogs) {
    await pool.execute(
      `INSERT INTO blogs (id, title, slug, content, excerpt, image, category, author, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE title=VALUES(title), slug=VALUES(slug), content=VALUES(content),
         excerpt=VALUES(excerpt), image=VALUES(image), category=VALUES(category), author=VALUES(author),
         status=VALUES(status), published_at=VALUES(published_at), updated_at=NOW()`,
      [b.id, b.title || '', b.slug || '', b.content || '', b.excerpt || '', b.image || '',
       b.category || '', b.author || 'easyfr8', b.status || 'Draft', b.publishedAt || b.date || null]
    );
  }
  console.log(`✔ Blogs migrated: ${blogs.length} rows`);

  // ── 10. Migrate enquiries ─────────────────────────────────────────────────
  const enquiries: any[] = db.enquiries || [];
  for (const e of enquiries) {
    await pool.execute(
      `INSERT INTO enquiries (id, name, email, subject, notes, assigned_to, source, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), subject=VALUES(subject),
         notes=VALUES(notes), assigned_to=VALUES(assigned_to), source=VALUES(source), status=VALUES(status), updated_at=NOW()`,
      [e.id, e.name || '', e.email || '', e.subject || '', e.notes || '', e.assignedTo || '', e.source || 'Web Form', e.status || 'New']
    );
  }
  console.log(`✔ Enquiries migrated: ${enquiries.length} rows`);

  // ── 11. Migrate rates ─────────────────────────────────────────────────────
  const rates: any[] = db.rates || [];
  for (const r of rates) {
    await pool.execute(
      `INSERT INTO rates (id, origin, destination, container, cost, transit, validity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE origin=VALUES(origin), destination=VALUES(destination), container=VALUES(container),
         cost=VALUES(cost), transit=VALUES(transit), validity=VALUES(validity), updated_at=NOW()`,
      [r.id, r.origin || '', r.destination || '', r.container || '', r.cost || 0, r.transit || 0, r.validity || '']
    );
  }
  console.log(`✔ Rates migrated: ${rates.length} rows`);

  // ── 12. Migrate users ─────────────────────────────────────────────────────
  const users: any[] = db.users || [];
  for (const u of users) {
    await pool.execute(
      `INSERT INTO users (id, name, email, phone, role, status, avatar, reg_date, last_login, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), phone=VALUES(phone),
         role=VALUES(role), status=VALUES(status), avatar=VALUES(avatar), updated_at=NOW()`,
      [u.id, u.name || '', u.email || '', u.phone || '', u.role || 'Customer',
       u.status || 'Active', u.avatar || '', u.regDate || null, u.lastLogin || null]
    );
  }
  console.log(`✔ Users migrated: ${users.length} rows`);

  // ── 13. Migrate dynamic freight tables ────────────────────────────────────
  console.log('Running dynamic freight tables migration...');
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

  await pool.query(`
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
  `);

  // Seed default dynamic tables
  const dynamicModes = [
    { id: 'mode-ocean', name: 'Ocean Freight', status: 'active', sort_order: 1 },
    { id: 'mode-air', name: 'Air Freight', status: 'active', sort_order: 2 },
  ];
  for (const m of dynamicModes) {
    await pool.query(
      'INSERT INTO freight_types (id, name, status, sort_order) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), sort_order=VALUES(sort_order)',
      [m.id, m.name, m.status, m.sort_order]
    );
  }

  const dynamicShipmentTypes = [
    { id: 'shipment-fcl', freight_type_id: 'mode-ocean', name: 'FCL (Full Container Load)', description: 'Full container shipping for large volume cargo.', status: 'active' },
    { id: 'shipment-lcl', freight_type_id: 'mode-ocean', name: 'LCL (Less than Container Load)', description: 'Shared container space for smaller shipments.', status: 'active' },
    { id: 'shipment-air-std', freight_type_id: 'mode-air', name: 'Air Freight Standard', description: 'Standard air cargo transport.', status: 'active' },
  ];
  for (const st of dynamicShipmentTypes) {
    await pool.query(
      'INSERT INTO shipment_types (id, freight_type_id, name, description, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE freight_type_id=VALUES(freight_type_id), name=VALUES(name), description=VALUES(description), status=VALUES(status)',
      [st.id, st.freight_type_id, st.name, st.description, st.status]
    );
  }

  const dynamicLocations = [
    { id: 'loc-sgpin', port_code: 'SGPIN', name: 'Singapore Port', country: 'Singapore', status: 'active' },
    { id: 'loc-clach', port_code: 'CLACH', name: 'Achao Port', country: 'Chile', status: 'active' },
    { id: 'loc-innsv', port_code: 'INNSV', name: 'Nhava Sheva', country: 'India', status: 'active' },
    { id: 'loc-nlrtm', port_code: 'NLRTM', name: 'Rotterdam Port', country: 'Netherlands', status: 'active' },
    { id: 'loc-cnsha', port_code: 'CNSHA', name: 'Shanghai Port', country: 'China', status: 'active' },
    { id: 'loc-uslax', port_code: 'USLAX', name: 'Los Angeles Port', country: 'United States', status: 'active' },
    { id: 'loc-inbom', port_code: 'INBOM', name: 'Mumbai Port', country: 'India', status: 'active' },
  ];
  for (const l of dynamicLocations) {
    await pool.query(
      'INSERT INTO locations (id, port_code, name, country, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE port_code=VALUES(port_code), name=VALUES(name), country=VALUES(country), status=VALUES(status)',
      [l.id, l.port_code, l.name, l.country, l.status]
    );
    await pool.query(
      'INSERT INTO ports (id, port_code, port_name, country, locode) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE port_code=VALUES(port_code), port_name=VALUES(port_name), country=VALUES(country), locode=VALUES(locode)',
      [l.id, l.port_code, l.name, l.country, l.port_code]
    );
  }

  const dynamicContainers = [
    { id: 'container-20gp', name: '20ft Standard Dry (20GP)', description: 'Standard 20-foot dry container.', status: 'active' },
    { id: 'container-40gp', name: '40ft Standard Dry (40GP)', description: 'Standard 40-foot dry container.', status: 'active' },
    { id: 'container-40hc', name: '40ft High Cube (40HC)', description: 'High cube 40-foot container for voluminous cargo.', status: 'active' },
    { id: 'container-40oth', name: '40ft Open Top High (40OTH)', description: '40ft open top high container for oversized cargo.', status: 'active' },
  ];
  for (const c of dynamicContainers) {
    await pool.query(
      'INSERT INTO containers (id, name, description, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status=VALUES(status)',
      [c.id, c.name, c.description, c.status]
    );
  }

  const dynamicRates = [
    {
      id: 'frate-sgpin-clach-40oth',
      freight_mode_id: 'mode-ocean',
      shipment_type_id: 'shipment-fcl',
      origin_id: 'loc-sgpin',
      destination_id: 'loc-clach',
      container_id: 'container-40oth',
      price: 3500.00,
      currency: 'USD',
      transit_time: 30,
      carrier: 'Maersk Line',
      status: 'active'
    },
    {
      id: 'frate-cnsha-uslax-40gp',
      freight_mode_id: 'mode-ocean',
      shipment_type_id: 'shipment-fcl',
      origin_id: 'loc-cnsha',
      destination_id: 'loc-uslax',
      container_id: 'container-40gp',
      price: 3800.00,
      currency: 'USD',
      transit_time: 16,
      carrier: 'MSC',
      status: 'active'
    },
    {
      id: 'frate-sgpin-inbom-20gp',
      freight_mode_id: 'mode-ocean',
      shipment_type_id: 'shipment-fcl',
      origin_id: 'loc-sgpin',
      destination_id: 'loc-inbom',
      container_id: 'container-20gp',
      price: 1200.00,
      currency: 'USD',
      transit_time: 8,
      carrier: 'CMA CGM',
      status: 'active'
    }
  ];
  for (const r of dynamicRates) {
    await pool.query(
      `INSERT INTO freight_rates (id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         freight_mode_id=VALUES(freight_mode_id), shipment_type_id=VALUES(shipment_type_id),
         origin_id=VALUES(origin_id), destination_id=VALUES(destination_id),
         container_id=VALUES(container_id), price=VALUES(price), currency=VALUES(currency),
         transit_time=VALUES(transit_time), carrier=VALUES(carrier), status=VALUES(status)`,
      [r.id, r.freight_mode_id, r.shipment_type_id, r.origin_id, r.destination_id, r.container_id, r.price, r.currency, r.transit_time, r.carrier, r.status]
    );
  }
  console.log('✔ Dynamic freight tables and rates migrated successfully.');

  // ── Done ──────────────────────────────────────────────────────────────────
  await pool.end();
  console.log('\n✅ Migration complete! All data is now in MySQL.\n');
  console.log('Next steps:');
  console.log('  1. Start your dev server: npm run dev');
  console.log('  2. Test connection: http://localhost:3001/api/test-db');
  console.log('  3. Open Admin Panel: http://localhost:3001');
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
