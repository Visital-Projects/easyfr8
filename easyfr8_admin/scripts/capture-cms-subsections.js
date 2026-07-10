const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'documentation', 'screenshots');

const tabs = [
  { id: 'homepage',   file: 'cms_homepage.png' },
  { id: 'about',      file: 'cms_about.png' },
  { id: 'services',   file: 'cms_services.png' },
  { id: 'faq',        file: 'cms_faq.png' },
  { id: 'contact',    file: 'cms_contact.png' },
  { id: 'static',     file: 'cms_static.png' },
  { id: 'media',      file: 'cms_media.png' },
  { id: 'seo',        file: 'cms_seo.png' },
  { id: 'partners',   file: 'cms_partners.png' },
  { id: 'statistics', file: 'cms_statistics.png' },
  { id: 'industries', file: 'cms_industries.png' }
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
  console.log('Getting JWT token...');
  const token = await getToken();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript((t) => {
    localStorage.setItem('easyfr8_token', t);
  }, token);

  const page = await context.newPage();

  console.log('Navigating to CMS Manager...');
  await page.goto('http://localhost:3001/cms', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);

  for (const tab of tabs) {
    try {
      console.log(`Clicking CMS tab: ${tab.id}...`);
      // Find the tab link/button by clicking text or finding elements
      // Try to find selector for tab click
      let clicked = false;
      const selectors = [
        `button:has-text("${tab.id}")`,
        `a:has-text("${tab.id}")`,
        `span:has-text("${tab.id}")`,
        `div:has-text("${tab.id}")`,
        `.tab-link:has-text("${tab.id.toUpperCase()}")`,
        `.tab-link:has-text("${tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}")`
      ];

      for (const sel of selectors) {
        const el = page.locator(sel).first();
        if (await el.count() > 0 && await el.isVisible()) {
          console.log(`  Found tab selector: ${sel}`);
          await el.click();
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        // Fallback: evaluate window state or look by mapping text specifically
        console.log(`  Searching by evaluating list of tabs`);
        await page.evaluate((tabId) => {
          const links = Array.from(document.querySelectorAll('.tab-link, button, a'));
          const target = links.find(l => l.innerText.toLowerCase().includes(tabId));
          if (target) target.click();
        }, tab.id);
      }

      await page.waitForTimeout(2500); // Wait for tab animation/loading
      const dest = path.join(SCREENSHOTS_DIR, tab.file);
      await page.screenshot({ path: dest, fullPage: true });
      console.log(`  ✔ Captured and saved to ${tab.file}`);
    } catch (e) {
      console.log(`  ✗ Failed tab: ${tab.id}`, e.message);
    }
  }

  await browser.close();
  console.log('\n✔ CMS sub-sections screenshot capture complete.');
})();
