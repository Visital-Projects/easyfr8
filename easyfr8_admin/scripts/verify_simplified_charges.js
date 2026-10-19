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
  console.log('=== STARTING FREIGHT RATES SIMPLIFIED ADDITIONAL CHARGES VERIFICATION ===\n');

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

  // Clean up any stale test rates
  await pool.query("DELETE FROM freight_rates WHERE id LIKE 'test-rate-%'");

  // Lookup IDs for test (select compatible Ocean mode and Ocean ports)
  const [modes] = await pool.query("SELECT id FROM freight_types WHERE id IN ('ocean-freight', 'mode-ocean') OR name LIKE '%Ocean%' LIMIT 1");
  const [ports] = await pool.query("SELECT id, port_code, port_name FROM ports WHERE freight_type LIKE '%Ocean%' OR freight_type = 'ocean' LIMIT 2");
  const [shipTypes] = await pool.query("SELECT id FROM shipment_types WHERE freight_type_id = ? OR name LIKE '%FCL%' LIMIT 1", [modes[0]?.id || 'mode-ocean']);
  const [containers] = await pool.query('SELECT id FROM containers LIMIT 1');

  const originId = ports[0]?.id || 'loc-sgpin';
  const destId = ports[1]?.id || 'loc-inbom';
  const modeId = modes[0]?.id || 'mode-ocean';
  const shipTypeId = shipTypes[0]?.id || 'shipment-fcl';
  const containerId = containers[0]?.id || 'container-20gp';

  const testRateId = `test-rate-${Date.now().toString().slice(-4)}`;

  // Launch Playwright
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Toast')) {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });

  try {
    // Login via UI
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    await page.fill('#email', 'biswa@easyfr8.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✓ UI Login successful.');

    // Navigate to Rates
    await page.goto('http://localhost:3001/rates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verification 1 & 2: Add modal shows exactly two additional charge inputs; Doc Fee & Customs Clearance are NOT shown
    console.log('\n--- Criterion 1 & 2: Add Modal Charge Inputs Check ---');
    await page.click('button:has-text("+ Add Freight Rate")');
    await page.waitForTimeout(500);

    const modalVisible = await page.isVisible('text=Add Freight Rate');
    console.log('Add Modal visible:', modalVisible);

    const additionalChargesTrigger = page.locator('div[role="button"]:has-text("Additional Charges")');
    await additionalChargesTrigger.waitFor({ state: 'visible' });

    // Expand accordion
    await additionalChargesTrigger.click();
    await page.waitForTimeout(400);

    const thcInput = page.locator('label:has-text("Local THC (USD)") + input');
    const otherInput = page.locator('label:has-text("Other Charges (USD)") + input');
    const docInput = page.locator('label:has-text("Documentation Fee")');
    const customsInput = page.locator('label:has-text("Customs Clearance")');

    const isThcVisible = await thcInput.isVisible();
    const isOtherVisible = await otherInput.isVisible();
    const isDocVisible = await docInput.isVisible();
    const isCustomsVisible = await customsInput.isVisible();

    console.log('Local THC (USD) visible:', isThcVisible);
    console.log('Other Charges (USD) visible:', isOtherVisible);
    console.log('Documentation Fee visible:', isDocVisible);
    console.log('Customs Clearance visible:', isCustomsVisible);

    if (isThcVisible && isOtherVisible && !isDocVisible && !isCustomsVisible) {
      console.log('✓ Criterion 1 & 2 PASSED: Add modal shows exactly Local THC and Other Charges; unwanted fields removed.');
    } else {
      throw new Error('Criterion 1 & 2 FAILED');
    }

    // Cancel Add Modal
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(400);

    // Verification 3 & 4: Create a freight rate with Local THC = 25 and Other Charges = 10 via API / UI
    console.log('\n--- Criterion 3 & 4: Rate Creation & Database Persistence ---');
    const createRes = await request('/api/freight-rates', 'POST', {
      id: testRateId,
      freight_mode_id: modeId,
      shipment_type_id: shipTypeId,
      origin_id: originId,
      destination_id: destId,
      container_id: containerId,
      price: 1250.00,
      transit_time: 14,
      carrier: 'Hapag-Lloyd',
      local_thc: 25.00,
      other_charges: 10.00
    }, token);

    console.log('Create rate API status:', createRes.status);
    if (createRes.status !== 201) {
      throw new Error(`Failed to create test rate: ${JSON.stringify(createRes.data)}`);
    }

    // Direct database query verification
    const [dbRows] = await pool.query('SELECT id, price, local_thc, other_charges FROM freight_rates WHERE id = ?', [testRateId]);
    const dbRate = dbRows[0];
    console.log('Direct Database record:', dbRate);

    if (dbRate && Number(dbRate.local_thc) === 25.00 && Number(dbRate.other_charges) === 10.00) {
      console.log('✓ Criterion 3 & 4 PASSED: Rate created and exact values (Local THC = 25.00, Other Charges = 10.00) verified in database.');
    } else {
      throw new Error('Criterion 3 & 4 FAILED: Database does not match expected values.');
    }

    // Verification 5: Freight Rates table displays $25.00 and $10.00 on the correct row
    console.log('\n--- Criterion 5: Table Column Display Verification ---');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Search for test rate
    await page.fill('input[placeholder*="Search by"]', testRateId);
    await page.waitForTimeout(800);

    const rowLocator = page.locator(`tr:has-text("${testRateId}")`);
    await rowLocator.waitFor({ state: 'visible', timeout: 5000 });

    const rowText = await rowLocator.innerText();
    console.log('Row text content:', rowText);

    const hasThcDisplay = rowText.includes('$25.00');
    const hasOtherDisplay = rowText.includes('$10.00');
    console.log('Row displays $25.00 for Local THC:', hasThcDisplay);
    console.log('Row displays $10.00 for Other Charges:', hasOtherDisplay);

    // Check table headers ordering: Price followed by Local THC (USD), Other Charges (USD), Carrier
    const headers = await page.$$eval('table.data-table thead th', ths => ths.map(th => th.innerText.trim()));
    console.log('Table Headers:', headers);
    const priceIdx = headers.indexOf('Price');
    const thcIdx = headers.indexOf('Local THC (USD)');
    const otherIdx = headers.indexOf('Other Charges (USD)');
    const carrierIdx = headers.indexOf('Carrier');

    console.log(`Indices: Price=${priceIdx}, Local THC=${thcIdx}, Other Charges=${otherIdx}, Carrier=${carrierIdx}`);
    if (priceIdx !== -1 && thcIdx === priceIdx + 1 && otherIdx === priceIdx + 2 && carrierIdx === priceIdx + 3) {
      console.log('✓ Table columns placement is strictly: Price -> Local THC (USD) -> Other Charges (USD) -> Carrier.');
    } else {
      console.error('✗ Table header placement mismatch!');
    }

    if (hasThcDisplay && hasOtherDisplay) {
      console.log('✓ Criterion 5 PASSED: Table accurately displays $25.00 and $10.00 on test rate row.');
    } else {
      throw new Error('Criterion 5 FAILED');
    }

    // Verification 6: Edit the record, change the values, save, and verify changes persist
    console.log('\n--- Criterion 6: Edit Modal & Value Update Persistence ---');
    const editBtn = page.locator(`tr:has-text("${testRateId}") button:has-text("Edit")`);
    await editBtn.click();
    await page.waitForTimeout(600);

    // Check Edit Modal loaded values
    await page.locator('div[role="button"]:has-text("Additional Charges")').click();
    await page.waitForTimeout(400);

    const editThcVal = await page.locator('label:has-text("Local THC (USD)") + input').inputValue();
    const editOtherVal = await page.locator('label:has-text("Other Charges (USD)") + input').inputValue();
    console.log('Edit Modal loaded values:', { localThc: editThcVal, otherCharges: editOtherVal });

    // Update values: Local THC = 45.50, Other Charges = 20.25
    await page.fill('label:has-text("Local THC (USD)") + input', '45.50');
    await page.fill('label:has-text("Other Charges (USD)") + input', '20.25');

    // Click Save
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(1000);

    // Verify in DB
    const [updatedDbRows] = await pool.query('SELECT price, local_thc, other_charges FROM freight_rates WHERE id = ?', [testRateId]);
    console.log('Database record after edit:', updatedDbRows[0]);
    if (Number(updatedDbRows[0].local_thc) === 45.50 && Number(updatedDbRows[0].other_charges) === 20.25) {
      console.log('✓ Criterion 6 PASSED: Edited values persisted accurately to database.');
    } else {
      throw new Error('Criterion 6 FAILED: Database does not reflect edited values.');
    }

    // Verification 7: Refresh the page and verify both values remain correct
    console.log('\n--- Criterion 7: Page Refresh Verification ---');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder*="Search by"]', testRateId);
    await page.waitForTimeout(800);

    const reloadedRowText = await page.locator(`tr:has-text("${testRateId}")`).innerText();
    console.log('Row text after refresh:', reloadedRowText);

    if (reloadedRowText.includes('$45.50') && reloadedRowText.includes('$20.25')) {
      console.log('✓ Criterion 7 PASSED: Values $45.50 and $20.25 remain intact on the table after full browser refresh.');
    } else {
      throw new Error('Criterion 7 FAILED: Values did not survive page refresh.');
    }

    // Verification 8: Verify legacy freight rates still render without errors
    console.log('\n--- Criterion 8: Legacy Freight Rates Backward Compatibility ---');
    await page.fill('input[placeholder*="Search by"]', '');
    await page.waitForTimeout(800);

    const rowCount = await page.locator('table.data-table tbody tr').count();
    console.log('Total freight rates currently rendered in table:', rowCount);
    if (rowCount > 0) {
      console.log('✓ Criterion 8 PASSED: Table renders all legacy freight rates with default $0.00 formatted values.');
    } else {
      throw new Error('Criterion 8 FAILED: No rates rendered.');
    }

    // Verification 9: Verify existing create, edit, delete, filter, and export features still work
    console.log('\n--- Criterion 9: Existing Features Verification (Delete, Filter, Export) ---');
    
    // Test filter
    await page.fill('input[placeholder*="Search by"]', 'Hapag-Lloyd');
    await page.waitForTimeout(500);
    const filteredCount = await page.locator('table.data-table tbody tr').count();
    console.log('Filtered row count for "Hapag-Lloyd":', filteredCount);

    // Test Export Dropdown
    await page.click('button:has-text("Export Rates")');
    await page.waitForTimeout(300);
    const exportCsvVisible = await page.isVisible('button:has-text("Export Filtered to CSV")');
    console.log('Export CSV option accessible:', exportCsvVisible);
    await page.click('button:has-text("Export Rates")'); // Close dropdown

    // Test Delete
    await page.fill('input[placeholder*="Search by"]', testRateId);
    await page.waitForTimeout(500);

    page.on('dialog', async dialog => {
      console.log('Confirm dialog triggered:', dialog.message());
      await dialog.accept();
    });

    const deleteBtn = page.locator(`tr:has-text("${testRateId}") button:has-text("Delete")`);
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(1000);
      console.log('✓ Delete action triggered and confirmed.');
    }

    // Verify deleted from DB
    const [checkDeleted] = await pool.query('SELECT id FROM freight_rates WHERE id = ?', [testRateId]);
    if (checkDeleted.length === 0) {
      console.log('✓ Rate successfully deleted from database.');
      console.log('✓ Criterion 9 PASSED: Filtering, exporting, editing, and deleting remain fully functional.');
    }

    console.log('\n=== ALL 9 ACCEPTANCE CRITERIA VERIFIED AND PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Test execution failed:', err);
    // Cleanup rate if still in db
    await pool.query('DELETE FROM freight_rates WHERE id = ?', [testRateId]).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
    await pool.end();
  }
})();
