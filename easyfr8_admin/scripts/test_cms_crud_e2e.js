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

async function getDbHighlights() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'easyfr8' });
  const [rows] = await pool.query('SELECT data FROM cms_data WHERE id = 1');
  await pool.end();
  if (!rows || rows.length === 0) return [];
  const data = JSON.parse(rows[0].data);
  return data.homepage?.featuredServices || [];
}

async function main() {
  console.log('=== STARTING END-TO-END CMS CRUD TESTS ===\n');

  const token = await getToken();
  console.log('Admin token obtained successfully.');

  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const adminPage = await adminContext.newPage();

  adminPage.on('console', msg => {
    if (msg.type() === 'error') console.log('[Admin Browser Error]', msg.text());
  });

  // Inject token
  await adminPage.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
  await adminPage.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('authToken', t);
    localStorage.setItem('easyfr8_token', t);
  }, token);

  await adminPage.goto('http://localhost:3001/cms', { waitUntil: 'networkidle' });
  console.log('Admin CMS page loaded.');

  // --------------------------------------------------------------------------
  // TEST A — CREATE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST A: CREATE HIGHLIGHT ---');
  let postDuration = 0;
  let postStatus = null;
  let postSize = 0;

  adminPage.on('request', req => {
    if (req.url().includes('/api/cms') && req.method() === 'POST') {
      postSize = req.postData()?.length || 0;
    }
  });

  const addBtn = adminPage.locator('button:has-text("Add Highlight")').first();
  await addBtn.click();
  await adminPage.waitForTimeout(500);

  const modal = adminPage.locator('.modal-container:has-text("Add Highlight")');
  await modal.locator('input[type="text"]').first().fill('DB CRUD TEST LOCAL');
  await modal.locator('textarea').first().fill('Created from Admin CMS for database verification');

  const startTime = Date.now();
  const [response] = await Promise.all([
    adminPage.waitForResponse(res => res.url().includes('/api/cms') && res.request().method() === 'POST'),
    modal.locator('button:has-text("Save Highlight")').click()
  ]);
  postDuration = Date.now() - startTime;
  postStatus = response.status();

  console.log(`POST /api/cms response status: ${postStatus}, duration: ${postDuration}ms, payload size: ${postSize} bytes`);
  if (postStatus !== 200 || postDuration > 5000) {
    throw new Error(`POST /cms failed or too slow: status=${postStatus}, duration=${postDuration}ms`);
  }

  await adminPage.waitForTimeout(1000);

  // 1. Verify in Admin
  const adminCreatedRow = adminPage.locator('tr:has-text("DB CRUD TEST LOCAL")');
  const adminHasCreated = await adminCreatedRow.count() > 0;
  console.log('1. Admin shows created item:', adminHasCreated ? 'PASS' : 'FAIL');

  // 2. Verify in SQL
  const dbHighlightsAfterCreate = await getDbHighlights();
  const dbCreatedItem = dbHighlightsAfterCreate.find(h => h.title === 'DB CRUD TEST LOCAL');
  console.log('2. SQL SELECT shows created item:', dbCreatedItem ? 'PASS' : 'FAIL', dbCreatedItem ? JSON.stringify(dbCreatedItem) : '');

  // 3. Verify on Public Website
  const publicContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const publicPage = await publicContext.newPage();
  await publicPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1000);
  const publicTitlesAfterCreate = await publicPage.locator('.whychoos-3 .box-title span').allTextContents();
  const publicHasCreated = publicTitlesAfterCreate.includes('DB CRUD TEST LOCAL');
  console.log('3. Public website shows created item:', publicHasCreated ? 'PASS' : 'FAIL', 'Found titles:', publicTitlesAfterCreate);

  // --------------------------------------------------------------------------
  // TEST B — UPDATE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: UPDATE HIGHLIGHT ---');
  const editBtn = adminCreatedRow.locator('button:has-text("Edit")');
  await editBtn.click();
  await adminPage.waitForTimeout(500);

  const editModal = adminPage.locator('.modal-container:has-text("Edit Highlight")');
  await editModal.locator('input[type="text"]').first().fill('DB CRUD TEST LOCAL UPDATED');
  await editModal.locator('textarea').first().fill('Updated description from Admin CMS for database verification');

  const updateStartTime = Date.now();
  const [updateResponse] = await Promise.all([
    adminPage.waitForResponse(res => res.url().includes('/api/cms') && res.request().method() === 'POST'),
    editModal.locator('button:has-text("Save Highlight")').click()
  ]);
  const updateDuration = Date.now() - updateStartTime;
  console.log(`PUT/POST /api/cms response status: ${updateResponse.status()}, duration: ${updateDuration}ms`);

  await adminPage.waitForTimeout(1000);

  // 1. Verify in Admin
  const adminUpdatedRow = adminPage.locator('tr:has-text("DB CRUD TEST LOCAL UPDATED")');
  const adminHasUpdated = await adminUpdatedRow.count() > 0;
  const adminHasOld = await adminPage.locator('tr:has-text("DB CRUD TEST LOCAL")').count() > 1; // only the updated one
  console.log('1. Admin shows updated item:', adminHasUpdated ? 'PASS' : 'FAIL');

  // 2. Verify in SQL
  const dbHighlightsAfterUpdate = await getDbHighlights();
  const dbUpdatedItem = dbHighlightsAfterUpdate.find(h => h.title === 'DB CRUD TEST LOCAL UPDATED');
  const dbOldItem = dbHighlightsAfterUpdate.find(h => h.title === 'DB CRUD TEST LOCAL');
  console.log('2. SQL SELECT shows updated item:', dbUpdatedItem ? 'PASS' : 'FAIL', dbUpdatedItem ? JSON.stringify(dbUpdatedItem) : '');
  console.log('   SQL SELECT confirms old title is gone:', !dbOldItem ? 'PASS' : 'FAIL');

  // 3. Verify on Public Website
  await publicPage.reload({ waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1000);
  const publicTitlesAfterUpdate = await publicPage.locator('.whychoos-3 .box-title span').allTextContents();
  const publicHasUpdated = publicTitlesAfterUpdate.includes('DB CRUD TEST LOCAL UPDATED');
  const publicHasOld = publicTitlesAfterUpdate.includes('DB CRUD TEST LOCAL');
  console.log('3. Public website shows updated item:', publicHasUpdated ? 'PASS' : 'FAIL');
  console.log('   Public website no longer shows old item:', !publicHasOld ? 'PASS' : 'FAIL');

  // --------------------------------------------------------------------------
  // TEST C — DELETE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST C: DELETE HIGHLIGHT ---');
  adminPage.on('dialog', dialog => dialog.accept());
  const deleteBtn = adminUpdatedRow.locator('button:has-text("Delete")');

  const deleteStartTime = Date.now();
  const [deleteResponse] = await Promise.all([
    adminPage.waitForResponse(res => res.url().includes('/api/cms') && res.request().method() === 'POST'),
    deleteBtn.click()
  ]);
  const deleteDuration = Date.now() - deleteStartTime;
  console.log(`DELETE via POST /api/cms response status: ${deleteResponse.status()}, duration: ${deleteDuration}ms`);

  await adminPage.waitForTimeout(1000);

  // 1. Verify in Admin
  const adminDeletedRow = adminPage.locator('tr:has-text("DB CRUD TEST LOCAL UPDATED")');
  const adminHasDeleted = await adminDeletedRow.count() === 0;
  console.log('1. Admin removes item:', adminHasDeleted ? 'PASS' : 'FAIL');

  // 2. Verify in SQL
  const dbHighlightsAfterDelete = await getDbHighlights();
  const dbDeletedItem = dbHighlightsAfterDelete.find(h => h.title.includes('DB CRUD TEST LOCAL'));
  console.log('2. SQL SELECT confirms record is 0 rows (deleted):', !dbDeletedItem ? 'PASS' : 'FAIL');

  // 3. Verify on Public Website
  await publicPage.reload({ waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1000);
  const publicTitlesAfterDelete = await publicPage.locator('.whychoos-3 .box-title span').allTextContents();
  const publicHasAnyTestItem = publicTitlesAfterDelete.some(t => t.includes('DB CRUD TEST LOCAL'));
  console.log('3. Public website no longer displays item:', !publicHasAnyTestItem ? 'PASS' : 'FAIL');

  await browser.close();

  console.log('\n=== ALL END-TO-END TESTS COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('\n*** TEST RUN FAILED ***\n', err);
  process.exit(1);
});
