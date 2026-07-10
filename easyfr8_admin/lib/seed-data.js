const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('Seeding database tables...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
  });

  const ports = [
    { portname: 'Singapore', locode: 'SGPIN', country: 'Singapore' },
    { portname: 'Achao Chile', locode: 'CLACH', country: 'Chile' },
    { portname: 'Nhava Sheva', locode: 'INNSV', country: 'India' },
    { portname: 'Rotterdam', locode: 'NLRTM', country: 'Netherlands' },
    { portname: 'Shanghai', locode: 'CNSHA', country: 'China' },
    { portname: 'Los Angeles', locode: 'USLAX', country: 'United States' },
    { portname: 'Mumbai', locode: 'INBOM', country: 'India' },
    { portname: 'New York', locode: 'USNYC', country: 'United States' },
    { portname: 'Felixstowe', locode: 'GBFXT', country: 'United Kingdom' },
    { portname: 'Hamburg', locode: 'DEHAM', country: 'Germany' },
    { portname: 'Jebel Ali', locode: 'AEJEA', country: 'United Arab Emirates' },
    { portname: 'Saigon', locode: 'VNSGN', country: 'Vietnam' },
    { portname: 'Oakland', locode: 'USOAK', country: 'United States' }
  ];

  for (const p of ports) {
    await conn.query(
      'INSERT INTO ports (portname, locode, country) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE portname=VALUES(portname), country=VALUES(country)',
      [p.portname, p.locode, p.country]
    );
  }
  console.log('✔ Seeded ports table');

  const rates = [
    { id: 'RTE-307', origin: 'SGPIN (Singapore)', destination: 'CLACH (Achao Chile)', container: "40' Open Top High", cost: 3500.00, transit: 30, validity: '2026-12-31' }
  ];

  for (const r of rates) {
    await conn.query(
      'INSERT INTO rates (id, origin, destination, container, cost, transit, validity) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE origin=VALUES(origin), destination=VALUES(destination), container=VALUES(container), cost=VALUES(cost), transit=VALUES(transit), validity=VALUES(validity)',
      [r.id, r.origin, r.destination, r.container, r.cost, r.transit, r.validity]
    );
  }
  console.log('✔ Seeded rates table');

  await conn.end();
}

main().catch(console.error);
