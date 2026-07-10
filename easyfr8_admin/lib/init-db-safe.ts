import 'dotenv/config';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

async function checkAndMigrate() {
  console.log('🔍 Checking database initialization status...');
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = Number(process.env.DB_PORT) || 3306;
  const dbName = process.env.DB_DATABASE || 'easyfr8';

  let connection: mysql.Connection | undefined;
  const maxRetries = 15;
  const delayMs = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      connection = await mysql.createConnection({ host, user, password, port });
      break;
    } catch (err: any) {
      if (attempt === maxRetries) {
        console.error(`❌ Cannot connect to MySQL server at ${host}:${port} after ${maxRetries} attempts. Error: ${err.message}`);
        process.exit(1);
      }
      console.log(`⏳ Waiting for MySQL to become ready (attempt ${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  if (!connection) {
    console.error('❌ Connection failed.');
    process.exit(1);
  }

  try {
    // Check if database exists
    const [dbs]: any = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);
    if (dbs.length === 0) {
      console.log(`Database '${dbName}' does not exist. Running fresh setup...`);
      execSync('npm run migrate', { stdio: 'inherit' });
      return;
    }

    await connection.query(`USE \`${dbName}\``);

    // Check if users table exists
    const [tables]: any = await connection.query(`SHOW TABLES LIKE 'users'`);
    if (tables.length === 0) {
      console.log("Table 'users' does not exist. Running fresh setup...");
      execSync('npm run migrate', { stdio: 'inherit' });
      return;
    }

    // Check if users count is zero
    const [rows]: any = await connection.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      console.log("Table 'users' is empty. Running fresh setup...");
      execSync('npm run migrate', { stdio: 'inherit' });
    } else {
      console.log('✅ Database is already populated. Skipping seeding to prevent data loss.');
    }
  } catch (error: any) {
    console.log('Error checking database status:', error.message);
    console.log('Attempting to run migration as fallback...');
    execSync('npm run migrate', { stdio: 'inherit' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndMigrate().catch(console.error);
