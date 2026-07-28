const mysql = require('mysql2/promise');

async function syncLocal() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'easyfr8',
    password: 'easyfr8_password',
    database: 'easyfr8'
  });

  try {
    await conn.beginTransaction();

    await conn.query(`
      INSERT INTO freight_types (id, name, status, sort_order) VALUES
      ('mode-ocean', 'Ocean Freight', 'active', 1),
      ('mode-air', 'Air Freight', 'active', 2),
      ('ocean-freight', 'Ocean Freight', 'active', 1),
      ('air-freight', 'Air Freight', 'active', 2)
      ON DUPLICATE KEY UPDATE name=VALUES(name), status='active';
    `);

    await conn.query(`
      INSERT INTO shipment_types (id, freight_type_id, name, description, status) VALUES
      ('shipment-fcl', 'mode-ocean', 'FCL (Full Container Load)', 'Full container shipping for large volume cargo.', 'active'),
      ('shipment-lcl', 'mode-ocean', 'LCL (Less than Container Load)', 'Shared container space for smaller shipments.', 'active'),
      ('shipment-air-std', 'mode-air', 'Air Freight Standard', 'Standard air cargo transport.', 'active'),
      ('shiptype-fcl', 'mode-ocean', 'FCL (Full Container Load)', 'Full Container Load', 'active'),
      ('shiptype-lcl', 'mode-ocean', 'LCL (Less than Container Load)', 'Less Container Load', 'active'),
      ('shiptype-air', 'mode-air', 'Air Cargo', 'Air Cargo shipment', 'active')
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status='active';
    `);

    await conn.query(`
      INSERT INTO ports (id, port_code, port_name, country, locode) VALUES
      ('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'CLACH'),
      ('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'CNSHA'),
      ('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'INBOM'),
      ('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'INNSV'),
      ('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'NLRTM'),
      ('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'SGPIN'),
      ('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'USLAX'),
      ('port-clach', 'CLACH', 'Achao Port', 'Chile', 'CLACH'),
      ('port-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'SGPIN')
      ON DUPLICATE KEY UPDATE port_name=VALUES(port_name), country=VALUES(country);
    `);

    await conn.query(`
      INSERT INTO locations (id, port_code, name, country, status) VALUES
      ('loc-clach', 'CLACH', 'Achao Port', 'Chile', 'active'),
      ('loc-cnsha', 'CNSHA', 'Shanghai Port', 'China', 'active'),
      ('loc-inbom', 'INBOM', 'Mumbai Port', 'India', 'active'),
      ('loc-innsv', 'INNSV', 'Nhava Sheva', 'India', 'active'),
      ('loc-nlrtm', 'NLRTM', 'Rotterdam Port', 'Netherlands', 'active'),
      ('loc-sgpin', 'SGPIN', 'Singapore Port', 'Singapore', 'active'),
      ('loc-uslax', 'USLAX', 'Los Angeles Port', 'United States', 'active')
      ON DUPLICATE KEY UPDATE name=VALUES(name), country=VALUES(country), status='active';
    `);

    await conn.query(`
      INSERT INTO containers (id, name, description, status) VALUES
      ('container-20gp', '20ft Standard Dry (20GP)', 'Standard 20-foot dry container.', 'active'),
      ('container-40gp', '40ft Standard Dry (40GP)', 'Standard 40-foot dry container.', 'active'),
      ('container-40hc', '40ft High Cube (40HC)', 'High cube 40-foot container for voluminous cargo.', 'active'),
      ('container-40oth', '40ft Open Top High (40OTH)', '40ft open top high container for oversized cargo.', 'active'),
      ('cont-20gp', '20ft Standard Dry (20GP)', '20ft Dry Standard Container', 'active'),
      ('cont-40hc', '40ft High Cube (40HC)', '40ft High Cube Container', 'active'),
      ('cont-40ot', '40ft Open Top High (40OTH)', '40ft Open Top Container', 'active')
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), status='active';
    `);

    await conn.commit();
    console.log('✅ Local Database Master Synchronization SUCCESS!');

    const [ports] = await conn.query('SELECT port_code, port_name FROM ports');
    console.log('PORTS:', ports);

    const [containers] = await conn.query('SELECT id, name FROM containers');
    console.log('CONTAINERS:', containers);

    await conn.end();
  } catch (err) {
    await conn.rollback();
    console.error('Sync error:', err.message);
  }
}

syncLocal();
