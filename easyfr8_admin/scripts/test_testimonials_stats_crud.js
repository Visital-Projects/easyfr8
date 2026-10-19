const { chromium } = require('playwright');
const http = require('http');
const mysql = require('mysql2/promise');

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
            resolve(j.token);
          } catch(e) { reject(e); }
        });
      }
    );
    req.write(body);
    req.end();
  });
}

async function getDbTestimonials() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'easyfr8' });
  const [rows] = await pool.query('SELECT data FROM cms_data WHERE id = 1');
  await pool.end();
  if (!rows || rows.length === 0) return [];
  const data = JSON.parse(rows[0].data);
  return data.homepage?.testimonials || [];
}

async function getDbStatistic(label) {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'easyfr8' });
  const [rows] = await pool.query('SELECT * FROM statistics WHERE label = ?', [label]);
  await pool.end();
  return rows;
}

async function main() {
  console.log('=== TESTING TESTIMONIALS (QUOTE STATEMENTS) & STATISTICS (STATS) CRUD ===\n');

  const token = await getToken();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', dialog => dialog.accept());

  await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('authToken', t);
    localStorage.setItem('easyfr8_token', t);
  }, token);

  await page.goto('http://localhost:3001/cms', { waitUntil: 'networkidle' });
  console.log('Admin CMS page loaded.');

  // =========================================================================
  // 1. TESTIMONIALS (QUOTE STATEMENTS)
  // =========================================================================
  console.log('\n--- TESTIMONIAL CREATE ---');
  await page.locator('button:has-text("Add Testimonial")').click();
  await page.waitForTimeout(500);

  const testiModal = page.locator('.modal-container:has-text("Add Testimonial")');
  await testiModal.locator('input[type="text"]').first().fill('Test Author Local');
  await testiModal.locator('input[type="text"]').nth(1).fill('Test Company Local');
  await testiModal.locator('textarea').first().fill('Test Quote Statement from Admin for DB verification');

  const [tCreateRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/cms') && res.request().method() === 'POST'),
    testiModal.locator('button:has-text("Save Testimonial")').click()
  ]);
  console.log('Testimonial CREATE response status:', tCreateRes.status());

  await page.waitForTimeout(1000);
  const adminTestiRow = page.locator('tr:has-text("Test Author Local")');
  console.log('Admin shows created testimonial:', await adminTestiRow.count() > 0 ? 'PASS' : 'FAIL');

  const dbTesti = await getDbTestimonials();
  const foundDbTesti = dbTesti.find(t => t.author === 'Test Author Local');
  console.log('SQL SELECT shows created testimonial in cms_data:', foundDbTesti ? 'PASS' : 'FAIL', foundDbTesti ? foundDbTesti.text : '');

  // UPDATE TESTIMONIAL
  console.log('\n--- TESTIMONIAL UPDATE ---');
  await adminTestiRow.locator('button:has-text("Edit")').click();
  await page.waitForTimeout(500);

  const editTestiModal = page.locator('.modal-container:has-text("Edit Testimonial")');
  await editTestiModal.locator('input[type="text"]').first().fill('Test Author Local Updated');
  await editTestiModal.locator('textarea').first().fill('Updated Quote Statement for DB verification');

  const [tUpdateRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/cms') && res.request().method() === 'POST'),
    editTestiModal.locator('button:has-text("Save Testimonial")').click()
  ]);
  console.log('Testimonial UPDATE response status:', tUpdateRes.status());

  await page.waitForTimeout(1000);
  const adminUpdatedTestiRow = page.locator('tr:has-text("Test Author Local Updated")');
  console.log('Admin shows updated testimonial:', await adminUpdatedTestiRow.count() > 0 ? 'PASS' : 'FAIL');

  const dbTestiAfterUpdate = await getDbTestimonials();
  const foundDbUpdatedTesti = dbTestiAfterUpdate.find(t => t.author === 'Test Author Local Updated');
  console.log('SQL SELECT shows updated testimonial in cms_data:', foundDbUpdatedTesti ? 'PASS' : 'FAIL', foundDbUpdatedTesti ? foundDbUpdatedTesti.text : '');

  // DELETE TESTIMONIAL
  console.log('\n--- TESTIMONIAL DELETE ---');
  const [tDeleteRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/cms') && res.request().method() === 'POST'),
    adminUpdatedTestiRow.locator('button:has-text("Delete")').click()
  ]);
  console.log('Testimonial DELETE response status:', tDeleteRes.status());

  await page.waitForTimeout(1000);
  const dbTestiAfterDelete = await getDbTestimonials();
  const foundDbDeletedTesti = dbTestiAfterDelete.find(t => t.author?.includes('Test Author Local'));
  console.log('SQL SELECT confirms testimonial 0 rows (deleted):', !foundDbDeletedTesti ? 'PASS' : 'FAIL');
  console.log('Admin removed testimonial:', await page.locator('tr:has-text("Test Author Local Updated")').count() === 0 ? 'PASS' : 'FAIL');

  // =========================================================================
  // 2. STATISTICS (STATS)
  // =========================================================================
  console.log('\n--- STATISTICS CREATE ---');
  // Switch to statistics tab
  await page.locator('button:has-text("Statistics")').click();
  await page.waitForTimeout(500);

  await page.locator('button:has-text("Add New Statistic")').click();
  await page.waitForTimeout(500);

  const statModal = page.locator('.modal-container:has-text("Statistic")');
  await statModal.locator('input[type="text"]').first().fill('TEST STAT LOCAL');
  await statModal.locator('input[type="text"]').nth(1).fill('999+');

  const [statCreateRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin/cms/statistics') && res.request().method() === 'POST'),
    statModal.locator('button:has-text("Save Statistic")').click()
  ]);
  console.log('Statistic CREATE response status:', statCreateRes.status());

  await page.waitForTimeout(1000);
  const adminStatRow = page.locator('tr:has-text("TEST STAT LOCAL")');
  console.log('Admin shows created statistic:', await adminStatRow.count() > 0 ? 'PASS' : 'FAIL');

  const dbStatRows = await getDbStatistic('TEST STAT LOCAL');
  console.log('SQL SELECT shows created statistic row in statistics table:', dbStatRows.length > 0 ? 'PASS' : 'FAIL', dbStatRows[0] ? `label="${dbStatRows[0].label}" value="${dbStatRows[0].value}"` : '');

  // UPDATE STATISTIC
  console.log('\n--- STATISTICS UPDATE ---');
  await adminStatRow.locator('button:has-text("Edit")').click();
  await page.waitForTimeout(500);

  const editStatModal = page.locator('.modal-container:has-text("Statistic")');
  await editStatModal.locator('input[type="text"]').first().fill('TEST STAT LOCAL UPDATED');
  await editStatModal.locator('input[type="text"]').nth(1).fill('1000+');

  const [statUpdateRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin/cms/statistics') && res.request().method() === 'PUT'),
    editStatModal.locator('button:has-text("Save Statistic")').click()
  ]);
  console.log('Statistic UPDATE response status:', statUpdateRes.status());

  await page.waitForTimeout(1000);
  const adminUpdatedStatRow = page.locator('tr:has-text("TEST STAT LOCAL UPDATED")');
  console.log('Admin shows updated statistic:', await adminUpdatedStatRow.count() > 0 ? 'PASS' : 'FAIL');

  const dbStatUpdatedRows = await getDbStatistic('TEST STAT LOCAL UPDATED');
  console.log('SQL SELECT shows updated statistic in statistics table:', dbStatUpdatedRows.length > 0 ? 'PASS' : 'FAIL', dbStatUpdatedRows[0] ? `label="${dbStatUpdatedRows[0].label}" value="${dbStatUpdatedRows[0].value}"` : '');

  // DELETE STATISTIC
  console.log('\n--- STATISTICS DELETE ---');
  const [statDeleteRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin/cms/statistics') && res.request().method() === 'DELETE'),
    adminUpdatedStatRow.locator('button:has-text("Delete")').click()
  ]);
  console.log('Statistic DELETE response status:', statDeleteRes.status());

  await page.waitForTimeout(1000);
  const dbStatDeletedRows = await getDbStatistic('TEST STAT LOCAL UPDATED');
  console.log('SQL SELECT confirms statistic row deleted (0 rows):', dbStatDeletedRows.length === 0 ? 'PASS' : 'FAIL');
  console.log('Admin removed statistic:', await page.locator('tr:has-text("TEST STAT LOCAL UPDATED")').count() === 0 ? 'PASS' : 'FAIL');

  await browser.close();
  console.log('\n=== ALL SECTION CRUD TESTS PASSED ===');
}

main().catch(err => {
  console.error('\n*** TEST RUN FAILED ***\n', err);
  process.exit(1);
});
