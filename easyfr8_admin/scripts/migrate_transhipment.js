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
    const [cols] = await pool.query('SHOW COLUMNS FROM freight_rates LIKE "transhipment_id"');
    if (cols && cols.length > 0) {
      console.log('[INFO] Column transhipment_id already exists in freight_rates.');
    } else {
      await pool.query(`
        ALTER TABLE freight_rates 
        ADD COLUMN transhipment_id VARCHAR(64) DEFAULT NULL 
        AFTER destination_id
      `);
      console.log('[SUCCESS] Successfully added transhipment_id VARCHAR(64) DEFAULT NULL to freight_rates.');
    }

    const [allCols] = await pool.query('SHOW COLUMNS FROM freight_rates');
    console.log('freight_rates columns:', allCols.map((c) => ({ Field: c.Field, Type: c.Type, Null: c.Null, Default: c.Default })));
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('[ERROR] Migration failed:', err);
  process.exit(1);
});
