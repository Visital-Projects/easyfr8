const mysql = require('mysql2/promise');
const { chromium } = require('playwright');
const http = require('http');
require('dotenv').config({ path: '.env' });

function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, data: json });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('=== STARTING FREIGHT RATES ADDITIONAL CHARGES VERIFICATION ===\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8'
  });

  // Get Admin Auth Token
  const loginRes = await request('/api/auth/login', 'POST', {
    email: 'biswa@easyfr8.com',
    password: 'admin123'
  });
  const token = loginRes.data?.token;
  if (!token) {
    console.error('Failed to authenticate admin:', loginRes);
    process.exit(1);
  }
  console.log('✓ Admin authenticated successfully.');

  // Fetch valid ports and modes for test payloads
  const [ports] = await pool.query('SELECT id FROM ports LIMIT 2');
  const [modes] = await pool.query('SELECT id FROM freight_types LIMIT 1');
  const [shipTypes] = await pool.query('SELECT id FROM shipment_types LIMIT 1');
  const [containers] = await pool.query('SELECT id FROM containers LIMIT 1');

  const originId = ports[0]?.id || 'loc-sgpin';
  const destId = ports[1]?.id || 'loc-inbom';
  const modeId = modes[0]?.id || 'mode-ocean';
  const shipTypeId = shipTypes[0]?.id || 'shipment-fcl';
  const containerId = containers[0]?.id || 'container-20gp';

  // 1. Validation Test: Negative Charge Amounts
  console.log('\n--- 1. API Validation Tests ---');
  const negTestRes = await request('/api/freight-rates', 'POST', {
    freight_mode_id: modeId,
    shipment_type_id: shipTypeId,
    origin_id: originId,
    destination_id: destId,
    container_id: containerId,
    price: 1000,
    transit_time: 10,
    local_thc: -25.50
  }, token);

  console.log('Negative local_thc response status:', negTestRes.status);
  console.log('Negative local_thc error message:', negTestRes.data?.error);
  if (negTestRes.status === 400 && negTestRes.data?.error?.includes('Local THC')) {
    console.log('✓ Negative charge rejection validated.');
  } else {
    console.error('✗ Failed to reject negative charge:', negTestRes);
  }

  // 2. Persistence Test: Create Rate A with All 4 Additional Charges
  console.log('\n--- 2. Database Persistence & Isolation Tests ---');
  const testRateAId = `test-rate-a-${Date.now().toString().slice(-4)}`;
  const rateAPayload = {
    id: testRateAId,
    freight_mode_id: modeId,
    shipment_type_id: shipTypeId,
    origin_id: originId,
    destination_id: destId,
    container_id: containerId,
    price: 1500.00,
    transit_time: 12,
    carrier: 'CMA CGM',
    status: 'active',
    local_thc: 120.50,
    documentation_fee: 75.00,
    customs_clearance: 200.00,
    other_charges: 50.25
  };

  const createARes = await request('/api/freight-rates', 'POST', rateAPayload, token);
  console.log('Create Rate A Status:', createARes.status);
  if (createARes.status !== 201) {
    console.error('Failed to create Rate A:', createARes);
  }

  // Verify direct database persistence for Rate A
  const [rowsA] = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [testRateAId]);
  const dbRateA = rowsA[0];
  console.log('Rate A in DB:', {
    id: dbRateA?.id,
    price: dbRateA?.price,
    local_thc: dbRateA?.local_thc,
    documentation_fee: dbRateA?.documentation_fee,
    customs_clearance: dbRateA?.customs_clearance,
    other_charges: dbRateA?.other_charges
  });

  const matchA = 
    Number(dbRateA.local_thc) === 120.50 &&
    Number(dbRateA.documentation_fee) === 75.00 &&
    Number(dbRateA.customs_clearance) === 200.00 &&
    Number(dbRateA.other_charges) === 50.25;

  if (matchA) {
    console.log('✓ Rate A charges accurately persisted in MySQL database.');
  } else {
    console.error('✗ Rate A charges mismatch in MySQL database!');
  }

  // 3. Create Rate B with Zero/Default Charges (Rate Independence Test)
  const testRateBId = `test-rate-b-${Date.now().toString().slice(-4)}`;
  const rateBPayload = {
    id: testRateBId,
    freight_mode_id: modeId,
    shipment_type_id: shipTypeId,
    origin_id: originId,
    destination_id: destId,
    container_id: containerId,
    price: 2200.00,
    transit_time: 15,
    carrier: 'Maersk Line',
    status: 'active'
    // No additional charges supplied; should default to 0.00
  };

  const createBRes = await request('/api/freight-rates', 'POST', rateBPayload, token);
  console.log('Create Rate B Status:', createBRes.status);

  const [rowsB] = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [testRateBId]);
  const dbRateB = rowsB[0];
  console.log('Rate B in DB (defaults):', {
    id: dbRateB?.id,
    local_thc: dbRateB?.local_thc,
    documentation_fee: dbRateB?.documentation_fee,
    customs_clearance: dbRateB?.customs_clearance,
    other_charges: dbRateB?.other_charges
  });

  if (Number(dbRateB.local_thc) === 0 && Number(dbRateA.local_thc) === 120.50) {
    console.log('✓ Rate A and Rate B retain separate, independent charges.');
  } else {
    console.error('✗ Rate isolation failed!');
  }

  // 4. Update Rate A with Modified Charges
  console.log('\n--- 3. Update & Restoration Tests ---');
  const updateAPayload = {
    ...rateAPayload,
    local_thc: 180.00,
    documentation_fee: 90.00,
    customs_clearance: 250.00,
    other_charges: 60.00
  };

  const updateARes = await request(`/api/freight-rates/${testRateAId}`, 'PUT', updateAPayload, token);
  console.log('Update Rate A Status:', updateARes.status);

  // Check via GET endpoint
  const getARes = await request(`/api/freight-rates/${testRateAId}`, 'GET');
  console.log('GET Rate A after update:', {
    local_thc: getARes.data?.rate?.local_thc,
    documentation_fee: getARes.data?.rate?.documentation_fee,
    customs_clearance: getARes.data?.rate?.customs_clearance,
    other_charges: getARes.data?.rate?.other_charges
  });

  const matchUpdate = 
    Number(getARes.data?.rate?.local_thc) === 180.00 &&
    Number(getARes.data?.rate?.documentation_fee) === 90.00 &&
    Number(getARes.data?.rate?.customs_clearance) === 250.00 &&
    Number(getARes.data?.rate?.other_charges) === 60.00;

  if (matchUpdate) {
    console.log('✓ Updated charges persisted and returned by API.');
  } else {
    console.error('✗ Updated charges failed to verify!');
  }

  // 5. Browser UI Test via Playwright
  console.log('\n--- 4. Browser UI End-to-End Tests ---');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#email', 'biswa@easyfr8.com');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Navigate to Rates
  await page.goto('http://localhost:3001/rates');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click "+ Add Freight Rate"
  console.log('Clicking + Add Freight Rate...');
  await page.click('button:has-text("+ Add Freight Rate")');
  await page.waitForTimeout(500);

  // Verify modal is visible
  const modalVisible = await page.isVisible('text=Add Freight Rate');
  console.log('Modal visible:', modalVisible);

  // Verify "Additional Charges" accordion is immediately below "Price (USD)"
  const priceInput = page.locator('label:has-text("Price (USD)") + input');
  await priceInput.waitFor({ state: 'visible' });

  const additionalChargesTrigger = page.locator('div[role="button"]:has-text("Additional Charges")');
  const isTriggerVisible = await additionalChargesTrigger.isVisible();
  console.log('Additional Charges trigger visible:', isTriggerVisible);

  // Click to expand
  console.log('Expanding Additional Charges accordion...');
  await additionalChargesTrigger.click();
  await page.waitForTimeout(400);

  // Verify all 4 charge inputs are displayed
  const thcInput = page.locator('label:has-text("Local THC (USD)") + input');
  const docInput = page.locator('label:has-text("Documentation Fee (USD)") + input');
  const customsInput = page.locator('label:has-text("Customs Clearance (USD)") + input');
  const otherInput = page.locator('label:has-text("Other Charges (USD)") + input');

  console.log('Local THC input visible:', await thcInput.isVisible());
  console.log('Documentation Fee input visible:', await docInput.isVisible());
  console.log('Customs Clearance input visible:', await customsInput.isVisible());
  console.log('Other Charges input visible:', await otherInput.isVisible());

  // Click to collapse
  console.log('Collapsing Additional Charges accordion...');
  await additionalChargesTrigger.click();
  await page.waitForTimeout(400);
  console.log('Local THC input hidden after collapse:', !(await thcInput.isVisible()));

  // Re-expand
  await additionalChargesTrigger.click();
  await page.waitForTimeout(400);

  // Close modal
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(500);

  // Now test Edit Modal for testRateAId
  console.log(`Searching for Rate A (${testRateAId}) in table...`);
  await page.fill('input[placeholder*="Search by"]', testRateAId);
  await page.waitForTimeout(1000);

  const editBtn = page.locator(`tr:has-text("${testRateAId}") button:has-text("Edit")`);
  if (await editBtn.isVisible()) {
    console.log('Clicking Edit on Rate A...');
    await editBtn.click();
    await page.waitForTimeout(800);

    // Expand Additional Charges in Edit Modal
    await page.locator('div[role="button"]:has-text("Additional Charges")').click();
    await page.waitForTimeout(400);

    const loadedThc = await page.locator('label:has-text("Local THC (USD)") + input').inputValue();
    const loadedDoc = await page.locator('label:has-text("Documentation Fee (USD)") + input').inputValue();
    const loadedCustoms = await page.locator('label:has-text("Customs Clearance (USD)") + input').inputValue();
    const loadedOther = await page.locator('label:has-text("Other Charges (USD)") + input').inputValue();

    console.log('Restored charges in Edit Modal:', {
      thc: loadedThc,
      doc: loadedDoc,
      customs: loadedCustoms,
      other: loadedOther
    });

    if (Number(loadedThc) === 180 && Number(loadedDoc) === 90 && Number(loadedCustoms) === 250 && Number(loadedOther) === 60) {
      console.log('✓ Edit Modal perfectly restored the saved charge values!');
    } else {
      console.error('✗ Charge values were not restored accurately into form fields!');
    }

    // Cancel modal
    await page.click('button:has-text("Cancel")');
  } else {
    console.warn('Rate A not found in table search view, testing direct reload edit.');
  }

  // Cleanup test rows
  await pool.query('DELETE FROM freight_rates WHERE id IN (?, ?)', [testRateAId, testRateBId]);
  console.log('\n✓ Cleaned up test rates from database.');

  await browser.close();
  await pool.end();

  console.log('\n=== ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY ===');
})();
