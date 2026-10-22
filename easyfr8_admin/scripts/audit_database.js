const mysql = require('mysql2/promise');

async function auditDatabase() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easyfr8',
  });

  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('=== EASYFR8 DATABASE AUDIT ===');
    console.log(`Total Tables Found: ${tables.length}\n`);

    const tableList = [];
    console.log('ALL TABLES:');
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const [[countResult]] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      console.log(`- ${tableName} (${countResult.cnt} rows)`);
      const [columns] = await pool.query(`DESCRIBE \`${tableName}\``);
      tableList.push({
        name: tableName,
        rowCount: countResult.cnt,
        columns: columns.map(c => `${c.Field} (${c.Type}${c.Key ? ', ' + c.Key : ''}${c.Null === 'NO' ? ', NOT NULL' : ''})`)
      });
    }

    for (const t of tableList) {
      console.log(`------------------------------------------------------------`);
      console.log(`TABLE: ${t.name} (Rows: ${t.rowCount})`);
      console.log(`COLUMNS:`);
      t.columns.forEach(col => console.log(`  - ${col}`));
    }

    const [docs] = await pool.query('SELECT id, user, name, type, date, status, remarks, file_type, LENGTH(file_url) as file_len FROM kyc_documents');
    const fs = require('fs');
    fs.writeFileSync('scripts/db_audit_report.json', JSON.stringify({
      tableCount: tables.length,
      tables: tableList,
      sampleDocs: docs
    }, null, 2));
    console.log('Successfully saved db_audit_report.json with', tableList.length, 'tables.');

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await pool.end();
  }
}

auditDatabase();
