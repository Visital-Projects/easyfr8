require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
  });

  try {
    console.log('[MIGRATION] Checking additional charges columns in freight_rates table...');

    const columnsToAdd = [
      { name: 'local_thc', definition: 'DECIMAL(12,2) NOT NULL DEFAULT 0.00', after: 'price' },
      { name: 'documentation_fee', definition: 'DECIMAL(12,2) NOT NULL DEFAULT 0.00', after: 'local_thc' },
      { name: 'customs_clearance', definition: 'DECIMAL(12,2) NOT NULL DEFAULT 0.00', after: 'documentation_fee' },
      { name: 'other_charges', definition: 'DECIMAL(12,2) NOT NULL DEFAULT 0.00', after: 'customs_clearance' }
    ];

    for (const col of columnsToAdd) {
      const [existing] = await pool.query(`SHOW COLUMNS FROM freight_rates LIKE ?`, [col.name]);
      if (existing && existing.length > 0) {
        console.log(`[INFO] Column '${col.name}' already exists in freight_rates.`);
      } else {
        await pool.query(`
          ALTER TABLE freight_rates 
          ADD COLUMN ${col.name} ${col.definition} 
          AFTER ${col.after}
        `);
        console.log(`[SUCCESS] Added column '${col.name}' (${col.definition}) to freight_rates.`);
      }
    }

    const [allCols] = await pool.query('SHOW COLUMNS FROM freight_rates');
    console.log('\n[SUMMARY] Updated freight_rates columns:');
    console.log(allCols.map(c => `${c.Field} (${c.Type}, Default: ${c.Default})`).join('\n'));
  } finally {
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[ERROR] Migration failed:', err);
  process.exit(1);
});
