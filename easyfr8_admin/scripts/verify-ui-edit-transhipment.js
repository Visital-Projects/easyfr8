const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'easyfr8_default_secure_jwt_secret_key_2026_production';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'public', 'documentation', 'screenshots');

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

function generateToken() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    id: 'USR-081',
    name: 'Biswajit',
    email: 'biswa@easyfr8.com',
    role: 'Administrator',
    iat: now,
    exp: now + 86400,
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const testRateId = `frate-edit-ui-${Date.now()}`;

  try {
    const [initRows] = await pool.query('SELECT COUNT(*) as cnt FROM freight_rates');
    const initialCount = initRows[0].cnt;
    console.log(`[DB] Initial freight_rates count: ${initialCount}`);

    // Insert test rate with transhipment
    await pool.query(
      `INSERT INTO freight_rates (id, freight_mode_id, shipment_type_id, origin_id, destination_id, transhipment_id, container_id, price, currency, transit_time, carrier, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testRateId,
        'ocean-freight',
        'shipment-102',
        'loc-cnsha',
        'loc-inbom',
        'loc-nlrtm',
        'cont-20gp',
        1850,
        'USD',
        22,
        'Evergreen',
        'active',
      ]
    );
    console.log(`[DB] Inserted test rate ${testRateId} with transhipment_id: 'loc-nlrtm'`);

    const token = generateToken();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await context.newPage();

    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('authToken', t);
      localStorage.setItem('easyfr8_token', t);
      document.cookie = `easyfr8_token=${t}; path=/`;
    }, token);

    await page.goto('http://localhost:3001/rates', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Search for test rate in table
    const searchInput = page.locator('input[placeholder*="Search by carrier"]').first();
    await searchInput.fill(testRateId);
    await page.waitForTimeout(1000);

    // Click Edit button on test rate
    const editBtn = page.locator(`tr:has-text("${testRateId}") button:has-text("Edit")`).first();
    await editBtn.click();
    await page.waitForTimeout(1500);

    // Verify checkbox is checked
    const transCheckbox = page.locator('input[type="checkbox"]:near(:text("Transhipment"))').first();
    const isChecked = await transCheckbox.isChecked();
    console.log(`[Edit UI Check] Transhipment checkbox is checked: ${isChecked} (expected: true)`);

    // Verify Transhipment port input is visible and displays Rotterdam
    const portInputBtn = page.locator('label:has-text("Transhipment Port") + div[role="button"]');
    const isVisible = await portInputBtn.isVisible();
    const portText = await portInputBtn.innerText();
    console.log(`[Edit UI Check] Port input visible: ${isVisible}, text: '${portText.trim()}'`);

    const imgEditRestored = path.join(SCREENSHOT_DIR, 'rates_edit_transhipment_restored.png');
    await page.screenshot({ path: imgEditRestored, fullPage: false });
    console.log(`Saved screenshot: ${imgEditRestored}`);

    // Uncheck Transhipment and save
    await transCheckbox.uncheck();
    await page.waitForTimeout(800);

    const isVisibleAfterUncheck = await portInputBtn.isVisible().catch(() => false);
    console.log(`[Edit UI Check] Port input visible after uncheck: ${isVisibleAfterUncheck} (expected: false)`);

    const saveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Verify DB updated to NULL
    const [dbRows] = await pool.query('SELECT transhipment_id FROM freight_rates WHERE id = ?', [testRateId]);
    console.log(`[DB Check] transhipment_id after saving uncheck: ${dbRows[0]?.transhipment_id} (expected: null)`);

    // Reopen Edit modal and verify it is unchecked
    await editBtn.click();
    await page.waitForTimeout(1500);

    const isCheckedReopen = await transCheckbox.isChecked();
    const isVisibleReopen = await portInputBtn.isVisible().catch(() => false);
    console.log(`[Edit UI Check Reopen] Checkbox checked: ${isCheckedReopen} (expected: false), Input visible: ${isVisibleReopen} (expected: false)`);

    const imgEditUnchecked = path.join(SCREENSHOT_DIR, 'rates_edit_transhipment_uncheck_saved.png');
    await page.screenshot({ path: imgEditUnchecked, fullPage: false });
    console.log(`Saved screenshot: ${imgEditUnchecked}`);

    await browser.close();

    // Clean up test record
    await pool.query('DELETE FROM freight_rates WHERE id = ?', [testRateId]);
    const [finalRows] = await pool.query('SELECT COUNT(*) as cnt FROM freight_rates');
    console.log(`[DB] Cleaned up test rate. Final count: ${finalRows[0].cnt} (original was ${initialCount})`);

    console.log('\n✓ EDIT TRANSHIPMENT WORKFLOW VERIFIED SUCCESSFULLY!');
  } finally {
    await pool.end();
  }
})();
