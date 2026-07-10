const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('Running booking tables migration...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
  });

  // Disable foreign keys to allow dropping/creating tables safely
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

  await conn.query('DROP TABLE IF EXISTS freight_rates;');
  await conn.query('DROP TABLE IF EXISTS bookings;');
  await conn.query('DROP TABLE IF EXISTS ports;');
  await conn.query('DROP TABLE IF EXISTS containers;');
  await conn.query('DROP TABLE IF EXISTS terms;');
  await conn.query('DROP TABLE IF EXISTS shipment_types;');
  await conn.query('DROP TABLE IF EXISTS freight_types;');

  // Create tables
  await conn.query(`
    CREATE TABLE freight_types (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE shipment_types (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      freight_type_id VARCHAR(64) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (freight_type_id) REFERENCES freight_types(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE terms (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE ports (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      port_code VARCHAR(10) NOT NULL UNIQUE,
      port_name VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      freight_type VARCHAR(64) NOT NULL DEFAULT 'Ocean',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE containers (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      size VARCHAR(50),
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE bookings (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      booking_no VARCHAR(64) NOT NULL UNIQUE,
      user_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(100),
      freight_type_id VARCHAR(64) NOT NULL,
      shipment_type_id VARCHAR(64) NOT NULL,
      term_id VARCHAR(64) NOT NULL,
      loading_port_id VARCHAR(64) NOT NULL,
      discharge_port_id VARCHAR(64) NOT NULL,
      container_id VARCHAR(64) NULL,
      cargo_details TEXT,
      status ENUM('Pending', 'Confirmed', 'Completed') NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (freight_type_id) REFERENCES freight_types(id),
      FOREIGN KEY (shipment_type_id) REFERENCES shipment_types(id),
      FOREIGN KEY (term_id) REFERENCES terms(id),
      FOREIGN KEY (loading_port_id) REFERENCES ports(id),
      FOREIGN KEY (discharge_port_id) REFERENCES ports(id),
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE freight_rates (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      freight_mode_id VARCHAR(64) NOT NULL,
      shipment_type_id VARCHAR(64) NOT NULL,
      origin_id VARCHAR(64) NOT NULL,
      destination_id VARCHAR(64) NOT NULL,
      container_id VARCHAR(64) NULL,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      transit_time INT NOT NULL DEFAULT 0,
      carrier VARCHAR(255) NOT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (freight_mode_id) REFERENCES freight_types(id) ON DELETE CASCADE,
      FOREIGN KEY (shipment_type_id) REFERENCES shipment_types(id) ON DELETE CASCADE,
      FOREIGN KEY (origin_id) REFERENCES ports(id) ON DELETE CASCADE,
      FOREIGN KEY (destination_id) REFERENCES ports(id) ON DELETE CASCADE,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('✔ Tables initialized successfully.');

  // Seed default Freight Types
  const ftypes = [
    { id: 'ocean-freight', name: 'Ocean Freight', status: 'active', sort_order: 1 },
    { id: 'air-freight', name: 'Air Freight', status: 'active', sort_order: 2 }
  ];
  for (const ft of ftypes) {
    await conn.query(
      'INSERT INTO freight_types (id, name, status, sort_order) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), sort_order=VALUES(sort_order)',
      [ft.id, ft.name, ft.status, ft.sort_order]
    );
  }

  // Seed Shipment Types
  const shiptypes = [
    { id: 'shiptype-fcl', freight_type_id: 'ocean-freight', name: 'FCL', description: 'Full Container Load', status: 'active' },
    { id: 'shiptype-lcl', freight_type_id: 'ocean-freight', name: 'LCL', description: 'Less Container Load', status: 'active' },
    { id: 'shiptype-air', freight_type_id: 'air-freight', name: 'Air Cargo', description: 'Air Cargo shipment', status: 'active' }
  ];
  for (const st of shiptypes) {
    await conn.query(
      'INSERT INTO shipment_types (id, freight_type_id, name, description, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status=VALUES(status)',
      [st.id, st.freight_type_id, st.name, st.description, st.status]
    );
  }

  // Seed Incoterms (Terms)
  const terms = [
    { id: 'term-fob', name: 'FOB', status: 'active' },
    { id: 'term-cif', name: 'CIF', status: 'active' },
    { id: 'term-exw', name: 'EXW', status: 'active' }
  ];
  for (const t of terms) {
    await conn.query(
      'INSERT INTO terms (id, name, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)',
      [t.id, t.name, t.status]
    );
  }

  // Seed Ports (with INMUN, SGPIN, CLACH, CNAQG, IDBDJ)
  const ports = [
    { id: 'port-inmun', port_code: 'INMUN', port_name: 'Mumbai', country: 'India', freight_type: 'Ocean', status: 'active' },
    { id: 'port-sgpin', port_code: 'SGPIN', port_name: 'Singapore', country: 'Singapore', freight_type: 'Ocean', status: 'active' },
    { id: 'port-clach', port_code: 'CLACH', port_name: 'Achao Chile', country: 'Chile', freight_type: 'Ocean', status: 'active' },
    { id: 'port-cnaqg', port_code: 'CNAQG', port_name: 'Anqing China', country: 'China', freight_type: 'Ocean', status: 'active' },
    { id: 'port-idbdj', port_code: 'IDBDJ', port_name: 'Banjarmasin Indonesia', country: 'Indonesia', freight_type: 'Ocean', status: 'active' },
    { id: 'port-sin', port_code: 'SIN', port_name: 'Singapore Changi', country: 'Singapore', freight_type: 'Air', status: 'active' },
    { id: 'port-ams', port_code: 'AMS', port_name: 'Amsterdam Schiphol', country: 'Netherlands', freight_type: 'Air', status: 'active' }
  ];
  for (const p of ports) {
    await conn.query(
      'INSERT INTO ports (id, port_code, port_name, country, freight_type, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE port_code=VALUES(port_code), port_name=VALUES(port_name), country=VALUES(country), freight_type=VALUES(freight_type), status=VALUES(status)',
      [p.id, p.port_code, p.port_name, p.country, p.freight_type, p.status]
    );
  }

  // Seed Containers (with 20 GP, 40 HC, 40 Open Top)
  const containers = [
    { id: 'cont-20gp', name: '20 GP', description: "20' Dry Standard Container", size: '20ft', status: 'active' },
    { id: 'cont-40hc', name: '40 HC', description: "40' High Cube Container", size: '40ft', status: 'active' },
    { id: 'cont-40ot', name: '40 Open Top', description: "40' Open Top Container", size: '40ft', status: 'active' }
  ];
  for (const c of containers) {
    await conn.query(
      'INSERT INTO containers (id, name, description, size, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), size=VALUES(size), status=VALUES(status)',
      [c.id, c.name, c.description, c.size, c.status]
    );
  }

  // Seed default Freight Rates
  const rates = [
    {
      id: 'rate-sgp-cla-ot',
      freight_mode_id: 'ocean-freight',
      shipment_type_id: 'shiptype-fcl',
      origin_id: 'port-sgpin',
      destination_id: 'port-clach',
      container_id: 'cont-40ot',
      price: 3500.00,
      currency: 'USD',
      transit_time: 30,
      carrier: 'Maersk Line',
      status: 'active'
    },
    {
      id: 'rate-sgp-inm-hc',
      freight_mode_id: 'ocean-freight',
      shipment_type_id: 'shiptype-fcl',
      origin_id: 'port-sgpin',
      destination_id: 'port-inmun',
      container_id: 'cont-40hc',
      price: 500.00,
      currency: 'USD',
      transit_time: 12,
      carrier: 'MSC',
      status: 'active'
    }
  ];
  for (const r of rates) {
    await conn.query(
      `INSERT INTO freight_rates 
        (id, freight_mode_id, shipment_type_id, origin_id, destination_id, container_id, price, currency, transit_time, carrier, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         freight_mode_id=VALUES(freight_mode_id),
         shipment_type_id=VALUES(shipment_type_id),
         origin_id=VALUES(origin_id),
         destination_id=VALUES(destination_id),
         container_id=VALUES(container_id),
         price=VALUES(price),
         currency=VALUES(currency),
         transit_time=VALUES(transit_time),
         carrier=VALUES(carrier),
         status=VALUES(status)`,
      [r.id, r.freight_mode_id, r.shipment_type_id, r.origin_id, r.destination_id, r.container_id, r.price, r.currency, r.transit_time, r.carrier, r.status]
    );
  }

  console.log('✔ Seeded dynamic booking tables with default testing parameters.');
  await conn.end();
}

main().catch(console.error);
