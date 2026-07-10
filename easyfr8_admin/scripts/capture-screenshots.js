const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'documentation', 'screenshots');

const pages = [
  { url: 'http://localhost:3001/dashboard',       file: 'dashboard_page.png' },
  { url: 'http://localhost:3001/cms',             file: 'cms_page.png' },
  { url: 'http://localhost:3001/freight-types',   file: 'freight_types_page.png' },
  { url: 'http://localhost:3001/shipment-types',  file: 'shipment_types_page.png' },
  { url: 'http://localhost:3001/terms',           file: 'terms_page.png' },
  { url: 'http://localhost:3001/ports',           file: 'ports_page.png' },
  { url: 'http://localhost:3001/containers',      file: 'containers_page.png' },
  { url: 'http://localhost:3001/rates',           file: 'rates_page.png' },
  { url: 'http://localhost:3001/bookings',        file: 'bookings_page.png' },
  { url: 'http://localhost:3001/enquiries',       file: 'enquiries_page.png' },
  { url: 'http://localhost:3001/documents',       file: 'documents_page.png' },
  { url: 'http://localhost:3001/users',           file: 'users_page.png' },
  { url: 'http://localhost:3001/settings',        file: 'settings_page.png' },
  { url: 'http://localhost:3001/blogs',           file: 'blogs_page.png' },
];

const addModalPages = [
  { url: 'http://localhost:3001/freight-types',  file: 'freight_types_add_modal.png',  btnText: 'Add Freight Type' },
  { url: 'http://localhost:3001/shipment-types', file: 'shipment_types_add_modal.png', btnText: 'Add Shipment Type' },
  { url: 'http://localhost:3001/terms',          file: 'terms_add_modal.png',          btnText: 'Add Incoterm' },
  { url: 'http://localhost:3001/ports',          file: 'ports_add_modal.png',          btnText: 'Add Port' },
  { url: 'http://localhost:3001/containers',     file: 'containers_add_modal.png',     btnText: 'Add Container' },
  { url: 'http://localhost:3001/rates',          file: 'rates_add_modal.png',          btnText: 'Add Freight Rate' },
];

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
          const j = JSON.parse(d);
          if (j.token) resolve(j.token);
          else reject(new Error('No token: ' + d));
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('Getting JWT token via API...');
  const token = await getToken();
  console.log('✔ Token acquired:', token.slice(0, 30) + '...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // KEY: inject token into localStorage BEFORE any page script runs
  // The app uses key: 'easyfr8_token'
  await context.addInitScript((t) => {
    localStorage.setItem('easyfr8_token', t);
  }, token);

  const page = await context.newPage();

  // Helper: wait until real admin content is visible (not login page)
  const waitForAdmin = async () => {
    await page.waitForFunction(() => {
      // Real admin content has sidebar navigation
      return document.querySelector('.sidebar, nav, [class*="sidebar"], [class*="dashboard"]') !== null
        || (document.body.innerText.length > 100 && !document.body.innerText.includes('Welcome Back'));
    }, { timeout: 12000 }).catch(() => {});
  };

  // ── Full-page screenshots ──
  console.log('\n── Full page screenshots ──');
  for (const p of pages) {
    try {
      console.log('→', p.url);
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000); // wait for React to hydrate & load data
      await waitForAdmin();

      const isOnLogin = page.url().includes('login') || (await page.title()).toLowerCase().includes('login');
      if (isOnLogin) {
        console.log('  ⚠ Still on login - check token key');
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, p.file), fullPage: true });
      console.log('  ✔ Saved:', p.file);
    } catch (e) {
      console.log('  ✗ ERROR:', e.message.split('\n')[0]);
    }
  }

  // ── Add modal screenshots ──
  console.log('\n── Add modal screenshots ──');
  for (const m of addModalPages) {
    try {
      console.log('→ Modal:', m.url, '| button:', m.btnText);
      await page.goto(m.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);
      await waitForAdmin();

      const btnLocator = page.locator(`button:has-text("${m.btnText}")`).first();
      if (await btnLocator.count() > 0) {
        await btnLocator.click();
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, m.file), fullPage: false });
        console.log('  ✔ Modal saved:', m.file);
      } else {
        const btns = (await page.locator('button').allInnerTexts()).filter(t => t.trim());
        console.log('  ✗ Button not found. Available:', btns.join(' | '));
      }
    } catch (e) {
      console.log('  ✗ ERROR:', e.message.split('\n')[0]);
    }
  }

  await browser.close();
  console.log('\n✔ Done! All screenshots saved to:', SCREENSHOTS_DIR);
})();
