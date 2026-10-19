const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function recoverAccount() {
  console.log('=== EasyFr8 Shipper Account Recovery Procedure ===\n');

  const TARGET_EMAIL = 'user318@easyfr8.com';
  const TEMP_PASSWORD = 'EasyFr8#Shipper2026!';

  // 1. Connect to MySQL / MariaDB
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'easyfr8'
  });

  try {
    // 2. Locate target user
    const [rows] = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [TARGET_EMAIL]);
    if (rows.length === 0) {
      throw new Error(`Target account ${TARGET_EMAIL} not found in users table.`);
    }

    const user = rows[0];
    console.log(`[Step 1] Found target user:`, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });

    // 3. Create Backup of current password hash for safe reversibility
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, 'user318_password_backup.json');
    const backupData = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      previous_password_hash: user.password,
      role: user.role,
      status: user.status
    };
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`[Step 2] Backup of previous credential state written to: ${backupFile}`);

    // 4. Hash new temporary password using bcrypt with 10 salt rounds (matching lib/auth.ts)
    const newHashedPassword = bcrypt.hashSync(TEMP_PASSWORD, 10);
    console.log(`[Step 3] New temporary password securely hashed using bcrypt (cost 10).`);

    // 5. Update ONLY user318@easyfr8.com
    const [updateResult] = await db.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ? AND email = ?',
      [newHashedPassword, user.id, user.email]
    );
    console.log(`[Step 4] Database updated. Affected rows: ${updateResult.affectedRows}`);

    // 6. Direct Database Verification
    const [verifyRows] = await db.query('SELECT id, name, email, role, status, password FROM users WHERE id = ?', [user.id]);
    const updatedUser = verifyRows[0];
    const passwordMatches = bcrypt.compareSync(TEMP_PASSWORD, updatedUser.password);
    console.log(`[Step 5] Direct Database Verification:`, {
      idUnchanged: updatedUser.id === user.id,
      roleUnchanged: updatedUser.role === user.role,
      statusUnchanged: updatedUser.status === user.status,
      bcryptVerification: passwordMatches
    });
    if (!passwordMatches) {
      throw new Error('Database password hash verification failed.');
    }

    // 7. API Login Verification
    console.log(`\n[Step 6] Testing Login API (POST http://localhost:3001/api/auth/login)...`);
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TARGET_EMAIL, password: TEMP_PASSWORD })
    });
    const loginData = await loginRes.json();
    console.log(`- Login API HTTP Status: ${loginRes.status}`);
    console.log(`- Login API Success: ${loginData.success}`);
    console.log(`- Returned User Info:`, loginData.user);
    if (!loginData.success || !loginData.token) {
      throw new Error(`Login API rejected new credentials: ${JSON.stringify(loginData)}`);
    }

    // 8. Bookings Access Verification
    console.log(`\n[Step 7] Testing Bookings API with User Token (GET http://localhost:3001/api/bookings)...`);
    const bookingsRes = await fetch('http://localhost:3001/api/bookings', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    const bookingsData = await bookingsRes.json();
    console.log(`- Bookings retrieved for ${TARGET_EMAIL}: ${bookingsData.length}`);
    if (!Array.isArray(bookingsData) || bookingsData.length === 0) {
      throw new Error('No bookings retrieved for authenticated user.');
    }
    console.log(`- Sample booking:`, {
      booking_no: bookingsData[0].booking_no,
      email: bookingsData[0].email,
      container: bookingsData[0].container_name
    });

    // 9. Browser UI Verification on http://localhost:3000/user/login
    console.log(`\n[Step 8] Testing Browser UI Login on http://localhost:3000/user/login...`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:3000/user/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', TARGET_EMAIL);
    await page.fill('input[type="password"]', TEMP_PASSWORD);
    await Promise.all([
      page.waitForURL('**/user/dashboard', { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    const dashboardUrl = page.url();
    console.log(`- Successfully navigated to: ${dashboardUrl}`);

    // Verify user dashboard content
    await page.waitForSelector('.user-portal-container, h3', { timeout: 10000 });
    const pageText = await page.innerText('body');
    const hasUserName = pageText.includes('User 318') || pageText.includes('318');
    console.log(`- Dashboard contains user identity: ${hasUserName}`);

    await browser.close();

    console.log('\n===========================================================');
    console.log('✓ SHIPPER ACCOUNT RECOVERY COMPLETED AND VERIFIED!');
    console.log('===========================================================');
    console.log(`Account Email:     ${TARGET_EMAIL}`);
    console.log(`Temporary Password: ${TEMP_PASSWORD}`);
    console.log('===========================================================\n');

  } finally {
    await db.end();
  }
}

recoverAccount().catch(err => {
  console.error('\n❌ RECOVERY PROCEDURE FAILED:', err);
  process.exit(1);
});
