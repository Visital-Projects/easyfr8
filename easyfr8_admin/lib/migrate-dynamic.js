const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('Running dynamic tables migration...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
  });

  // 1. Create freight_modes
  await conn.query(`
    CREATE TABLE IF NOT EXISTS freight_modes (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. Create shipment_types
  await conn.query(`
    CREATE TABLE IF NOT EXISTS shipment_types (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      mode_id VARCHAR(64) NOT NULL,
      name VARCHAR(100) NOT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (mode_id) REFERENCES freight_modes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. Create locations
  await conn.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      port_code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      type VARCHAR(64) NOT NULL DEFAULT 'Ocean',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. Create containers
  await conn.query(`
    CREATE TABLE IF NOT EXISTS containers (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. Create freight_rates
  await conn.query(`
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
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (freight_mode_id) REFERENCES freight_modes(id) ON DELETE CASCADE,
      FOREIGN KEY (shipment_type_id) REFERENCES shipment_types(id) ON DELETE CASCADE,
      FOREIGN KEY (origin_id) REFERENCES locations(id) ON DELETE CASCADE,
      FOREIGN KEY (destination_id) REFERENCES locations(id) ON DELETE CASCADE,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✔ Tables created successfully.');

  // Seeding default data
  // Modes
  const modes = [
    { id: 'mode-ocean', name: 'Ocean Freight', status: 'active' },
    { id: 'mode-air', name: 'Air Freight', status: 'active' },
  ];
  for (const m of modes) {
    await conn.query(
      'INSERT INTO freight_modes (id, name, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)',
      [m.id, m.name, m.status]
    );
  }

  // Shipment Types
  const shipmentTypes = [
    { id: 'shipment-fcl', mode_id: 'mode-ocean', name: 'FCL', status: 'active' },
    { id: 'shipment-lcl', mode_id: 'mode-ocean', name: 'LCL', status: 'active' },
    { id: 'shipment-air', mode_id: 'mode-air', name: 'Air Cargo', status: 'active' },
  ];
  for (const s of shipmentTypes) {
    await conn.query(
      'INSERT INTO shipment_types (id, mode_id, name, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE mode_id=VALUES(mode_id), name=VALUES(name), status=VALUES(status)',
      [s.id, s.mode_id, s.name, s.status]
    );
  }

  // Locations
  const locations = [
    { id: 'loc-sgpin', port_code: 'SGPIN', name: 'Singapore', country: 'Singapore', type: 'Ocean' },
    { id: 'loc-clach', port_code: 'CLACH', name: 'Achao Chile', country: 'Chile', type: 'Ocean' },
    { id: 'loc-inbom', port_code: 'INBOM', name: 'Mumbai', country: 'India', type: 'Ocean' },
    { id: 'loc-innsv', port_code: 'INNSV', name: 'Nhava Sheva', country: 'India', type: 'Ocean' },
    { id: 'loc-nlrtm', port_code: 'NLRTM', name: 'Rotterdam', country: 'Netherlands', type: 'Ocean' },
    { id: 'loc-cnsha', port_code: 'CNSHA', name: 'Shanghai', country: 'China', type: 'Ocean' },
    { id: 'loc-uslax', port_code: 'USLAX', name: 'Los Angeles', country: 'United States', type: 'Ocean' },
    { id: 'loc-sin', port_code: 'SIN', name: 'Singapore Changi', country: 'Singapore', type: 'Air' },
    { id: 'loc-ams', port_code: 'AMS', name: 'Amsterdam Schiphol', country: 'Netherlands', type: 'Air' },
    { id: 'loc-pvg', port_code: 'PVG', name: 'Shanghai Pudong', country: 'China', type: 'Air' }
  ];
  for (const l of locations) {
    await conn.query(
      'INSERT INTO locations (id, port_code, name, country, type) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE port_code=VALUES(port_code), name=VALUES(name), country=VALUES(country), type=VALUES(type)',
      [l.id, l.port_code, l.name, l.country, l.type]
    );
  }

  // Containers
  const containers = [
    { id: 'container-20gp', name: "20' Dry Standard", description: '20ft GP Container', status: 'active' },
    { id: 'container-40gp', name: "40' Dry Standard", description: '40ft GP Container', status: 'active' },
    { id: 'container-40hc', name: "40' Dry High", description: '40ft HC Container', status: 'active' },
    { id: 'container-40oth', name: "40' Open Top High", description: '40ft Open Top High Cube Container', status: 'active' },
  ];
  for (const c of containers) {
    await conn.query(
      'INSERT INTO containers (id, name, description, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status=VALUES(status)',
      [c.id, c.name, c.description, c.status]
    );
  }

  // Freight Rates
  const rates = [
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
  for (const r of rates) {
    await conn.query(
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

  console.log('✔ Seeded dynamic tables data.');

  await conn.end();
}

main().catch(console.error);
