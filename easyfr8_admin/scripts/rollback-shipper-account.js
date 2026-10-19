const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function rollbackAccount() {
  console.log('=== EasyFr8 Shipper Account Recovery Rollback ===\n');

  const backupFile = path.join(__dirname, 'backups', 'user318_password_backup.json');
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found at: ${backupFile}`);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  console.log('Found backup data:', {
    timestamp: backupData.timestamp,
    user_id: backupData.user_id,
    email: backupData.email
  });

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'easyfr8'
  });

  try {
    const [result] = await db.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ? AND email = ?',
      [backupData.previous_password_hash, backupData.user_id, backupData.email]
    );

    console.log(`Reverted password hash for ${backupData.email}. Affected rows: ${result.affectedRows}`);
    console.log('✓ Account credentials successfully restored to pre-recovery state.');
  } finally {
    await db.end();
  }
}

rollbackAccount().catch(err => {
  console.error('\n❌ ROLLBACK FAILED:', err);
  process.exit(1);
});
