require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
  });

  try {
    const [rows] = await pool.query('SELECT * FROM freight_rates LIMIT 1');
    if (rows && rows.length > 0) {
      console.log('Sample row from freight_rates:');
      console.log(rows[0]);
      console.log('Columns in freight_rates:', Object.keys(rows[0]));
      console.log('Does transhipment_id exist in columns?', 'transhipment_id' in rows[0]);
    } else {
      console.log('No rows in freight_rates.');
    }

    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM freight_rates');
    console.log(`Total freight_rates in local DB: ${countRows[0].count}`);
  } finally {
    await pool.end();
  }
}

test().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
