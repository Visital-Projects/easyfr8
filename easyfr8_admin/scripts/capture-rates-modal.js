const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const DEST = path.join(__dirname, '..', 'public', 'documentation', 'screenshots', 'rates_add_modal.png');

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
          else reject(new Error(d));
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const token = await getToken();
  console.log('Token acquired');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('authToken', t);
    localStorage.setItem('easyfr8_token', t);
  }, token);

  await page.goto('http://localhost:3001/rates', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const btns = await page.locator('button').allInnerTexts();
  console.log('Buttons:', btns.join(' | '));

  const btn = page.locator('button:has-text("Add Freight Rate")').first();
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: DEST, fullPage: false });
    console.log('Saved:', DEST);
  } else {
    console.log('Add Freight Rate button not found');
    await page.screenshot({ path: DEST, fullPage: true });
  }

  await browser.close();
})();
