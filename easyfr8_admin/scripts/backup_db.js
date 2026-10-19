require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function backup() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
  });

  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map((t) => Object.values(t)[0]);
    let sqlDump = `-- EasyFr8 Local Database Backup before Transhipment Column Addition\n-- Timestamp: ${new Date().toISOString()}\n-- Database: ${process.env.DB_DATABASE || 'easyfr8'}\n\n`;

    for (const tbl of tableNames) {
      const [createRes] = await pool.query(`SHOW CREATE TABLE \`${tbl}\``);
      sqlDump += `DROP TABLE IF EXISTS \`${tbl}\`;\n`;
      sqlDump += createRes[0]['Create Table'] + ';\n\n';

      const [rows] = await pool.query(`SELECT * FROM \`${tbl}\``);
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const cols = Object.keys(row).map((c) => `\`${c}\``).join(', ');
          const vals = Object.values(row).map((v) => {
            if (v === null) return 'NULL';
            if (v instanceof Date) return pool.escape(v.toISOString().slice(0, 19).replace('T', ' '));
            return pool.escape(v);
          }).join(', ');
          sqlDump += `INSERT INTO \`${tbl}\` (${cols}) VALUES (${vals});\n`;
        }
        sqlDump += '\n';
      }
    }

    const backupPath = path.join(__dirname, '..', 'lib', 'backup_easyfr8_before_transhipment.sql');
    fs.writeFileSync(backupPath, sqlDump, 'utf8');
    const stats = fs.statSync(backupPath);
    console.log(`[SUCCESS] Local database backup created at ${backupPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } finally {
    await pool.end();
  }
}

backup().catch((err) => {
  console.error('[ERROR] Backup failed:', err);
  process.exit(1);
});
