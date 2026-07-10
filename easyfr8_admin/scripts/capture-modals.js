const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'documentation', 'screenshots');

const addModalPages = [
  { url: 'http://localhost:3001/rates',           file: 'rates_add_modal.png' },
  { url: 'http://localhost:3001/ports',           file: 'ports_add_modal.png' },
  { url: 'http://localhost:3001/containers',      file: 'containers_add_modal.png' },
  { url: 'http://localhost:3001/freight-types',   file: 'freight_types_add_modal.png' },
  { url: 'http://localhost:3001/shipment-types',  file: 'shipment_types_add_modal.png' },
  { url: 'http://localhost:3001/terms',           file: 'terms_add_modal.png' },
];

// Get JWT token via raw HTTP request
function getToken() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'biswa@easyfr8.com', password: 'admin123' });
    const req = http.request(
      { hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(d);
            if (j.token) resolve(j.token);
            else reject(new Error('No token in response: ' + d));
          } catch(e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Get token first
  console.log('Getting JWT token...');
  const token = await getToken();
  console.log('✔ Token acquired:', token.slice(0, 40) + '...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Navigate to app first to set localStorage on the right domain
  await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Inject JWT into localStorage so all subsequent navigations are authenticated
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('authToken', t);
    localStorage.setItem('easyfr8_token', t);
    // Also try sessionStorage
    sessionStorage.setItem('token', t);
    sessionStorage.setItem('authToken', t);
    console.log('Token injected into storage');
  }, token);

  console.log('✔ Token injected into localStorage');

  // --- Capture Add modals ---
  for (const m of addModalPages) {
    try {
      console.log('\nCapturing:', m.url);
      await page.goto(m.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log('  Current URL:', currentUrl);

      // If still on login page, try filling the form
      if (currentUrl.includes('login')) {
        console.log('  Still on login, filling form...');
        await page.fill('input[type="email"]', 'biswa@easyfr8.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        // Re-inject token after login
        await page.evaluate((t) => {
          localStorage.setItem('token', t);
          localStorage.setItem('authToken', t);
          localStorage.setItem('easyfr8_token', t);
        }, token);

        await page.goto(m.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);
      }

      // Log all visible buttons for debugging
      const allBtns = await page.locator('button').allInnerTexts();
      console.log('  Buttons found:', allBtns.filter(t => t.trim()).map(t => `"${t.trim()}"`).join(', '));

      // Try multiple text patterns for Add button
      let clicked = false;
      for (const txt of ['Add Freight Rate', 'Add Port', 'Add Container', 'Add Freight Type', 'Add Shipment Type', 'Add Term', 'Add Incoterm', 'Add', '+ Add', 'New']) {
        const btn = page.locator(`button:has-text("${txt}")`).first();
        if (await btn.count() > 0) {
          const btnText = (await btn.innerText()).trim();
          if (btnText.toLowerCase().includes('sign') || btnText.toLowerCase().includes('login')) continue;
          console.log(`  Clicking: "${btnText}"`);
          await btn.click();
          await page.waitForTimeout(2500);
          const dest = path.join(SCREENSHOTS_DIR, m.file);
          await page.screenshot({ path: dest, fullPage: false });
          console.log('  ✔ Saved:', dest);
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        console.log('  No Add button found, saving page screenshot');
        const dest = path.join(SCREENSHOTS_DIR, m.file);
        await page.screenshot({ path: dest, fullPage: true });
      }
    } catch(e) {
      console.log('  ERROR:', e.message);
    }
  }

  await browser.close();
  console.log('\n✔ Done capturing modals.');
})();
