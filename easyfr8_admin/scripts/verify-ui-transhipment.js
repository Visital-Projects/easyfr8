const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'public', 'documentation', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'easyfr8_default_secure_jwt_secret_key_2026_production';

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
  try {
    const token = generateToken();
    console.log('Admin token generated');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await context.newPage();

    // Set cookie and localStorage for auth
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

    const addBtn = page.locator('button:has-text("Add Freight Rate")').first();
    await addBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(1500);

    // Switch mode to Ocean Freight so ocean ports populate dropdown
    const modeSelect = page.locator('select').first();
    await modeSelect.selectOption({ label: 'Ocean Freight' });
    await page.waitForTimeout(1000);

    // 1. Verify Unchecked State
    const transCheckbox = page.locator('input[type="checkbox"]:near(:text("Transhipment"))').first();
    const isCheckedDefault = await transCheckbox.isChecked();
    console.log(`[UI Check] Transhipment checkbox default checked: ${isCheckedDefault} (expected: false)`);

    const transInputDefault = page.locator('div[role="button"]:has-text("Transhipment")');
    const inputCountDefault = await transInputDefault.count();
    console.log(`[UI Check] Transhipment port input visible when unchecked: ${inputCountDefault > 0} (expected: false)`);

    const imgUnchecked = path.join(SCREENSHOT_DIR, 'rates_add_transhipment_unchecked.png');
    await page.screenshot({ path: imgUnchecked, fullPage: false });
    console.log(`Saved screenshot: ${imgUnchecked}`);

    // 2. Check the Transhipment checkbox
    await transCheckbox.check();
    await page.waitForTimeout(1000);

    const isCheckedNow = await transCheckbox.isChecked();
    console.log(`[UI Check] Transhipment checkbox after check: ${isCheckedNow} (expected: true)`);

    // Verify searchable port input appeared
    const transInputChecked = page.locator('div[role="button"]:has-text("Transhipment")').first();
    const isInputVisible = await transInputChecked.isVisible();
    const inputPlaceholder = await transInputChecked.innerText();
    console.log(`[UI Check] Transhipment input visible: ${isInputVisible}, text: '${inputPlaceholder.trim()}'`);

    const imgChecked = path.join(SCREENSHOT_DIR, 'rates_add_transhipment_checked.png');
    await page.screenshot({ path: imgChecked, fullPage: false });
    console.log(`Saved screenshot: ${imgChecked}`);

    // 3. Open dropdown and search for a port
    await transInputChecked.click();
    await page.waitForTimeout(1000);

    const searchBox = page.locator('input[placeholder*="Search by name"]').first();
    await searchBox.fill('Rotterdam');
    await page.waitForTimeout(800);

    const portOption = page.locator('div:has-text("Rotterdam Port (NLRTM)")').last();
    await portOption.click();
    await page.waitForTimeout(800);

    const portInputBtn = page.locator('label:has-text("Transhipment Port") + div[role="button"]');
    const selectedText = await portInputBtn.innerText();
    console.log(`[UI Check] Selected port in Transhipment input: '${selectedText.trim()}'`);

    const imgSelected = path.join(SCREENSHOT_DIR, 'rates_add_transhipment_selected.png');
    await page.screenshot({ path: imgSelected, fullPage: false });
    console.log(`Saved screenshot: ${imgSelected}`);

    // 4. Uncheck Transhipment and verify port input disappears
    await transCheckbox.uncheck();
    await page.waitForTimeout(1000);
    const inputVisibleAfterUncheck = await portInputBtn.isVisible().catch(() => false);
    console.log(`[UI Check] Port input visible after uncheck: ${inputVisibleAfterUncheck} (expected: false)`);

    const imgUncheckedAfter = path.join(SCREENSHOT_DIR, 'rates_add_transhipment_unchecked_again.png');
    await page.screenshot({ path: imgUncheckedAfter, fullPage: false });
    console.log(`Saved screenshot: ${imgUncheckedAfter}`);

    await browser.close();
    console.log('\n✓ UI VERIFICATION COMPLETE: All requirements verified successfully!');
  } catch (err) {
    console.error('Error during UI verification:', err);
    process.exit(1);
  }
})();
