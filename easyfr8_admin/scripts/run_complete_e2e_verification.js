const { chromium } = require('playwright');
const path = require('path');
const mysql = require('mysql2/promise');
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

async function main() {
  console.log('================================================================');
  console.log('EASYFR8 ADMIN — COMPLETE DATABASE PERSISTENCE & UI E2E VERIFICATION');
  console.log('================================================================\n');

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const SQL_VERIFY_QUERY = `
    SELECT
      fr.id,
      fr.freight_mode_id,
      fr.shipment_type_id,
      fr.origin_id,
      origin.port_name AS origin_port,
      origin.port_code AS origin_code,
      fr.destination_id,
      destination.port_name AS destination_port,
      destination.port_code AS destination_code,
      fr.transhipment_id,
      transhipment.port_name AS transhipment_port,
      transhipment.port_code AS transhipment_code,
      fr.container_id,
      fr.price,
      fr.currency,
      fr.transit_time,
      fr.carrier,
      fr.status,
      fr.created_at,
      fr.updated_at
    FROM freight_rates fr
    LEFT JOIN ports origin
      ON (origin.id = fr.origin_id OR origin.port_code = fr.origin_id)
    LEFT JOIN ports destination
      ON (destination.id = fr.destination_id OR destination.port_code = fr.destination_id)
    LEFT JOIN ports transhipment
      ON (transhipment.id = fr.transhipment_id OR transhipment.port_code = fr.transhipment_id)
    WHERE fr.id = ?;
  `;

  let browser;
  try {
    // SECTION 1: DATABASE SCHEMA INSPECTION
    console.log('--- SECTION 1: Database Schema Inspection ---');
    console.log(`Database Host: ${process.env.DB_HOST || '127.0.0.1'}`);
    console.log(`Database Name: ${process.env.DB_DATABASE || 'easyfr8'}`);
    console.log(`Target Table: freight_rates`);

    const [testCol] = await pool.query('SELECT transhipment_id FROM freight_rates LIMIT 1');
    console.log('✓ Confirmed: column `transhipment_id` exists in local table `freight_rates`');

    const [initialCountRows] = await pool.query('SELECT COUNT(*) as cnt FROM freight_rates');
    const initialCount = initialCountRows[0].cnt;
    console.log(`✓ Initial record count: ${initialCount} records preserved.\n`);

    // SECTION 2 & 3: RUN ACTUAL END-TO-END TEST THROUGH ADMIN UI
    console.log('--- SECTION 2 & 3: End-to-End Rate Creation Through Admin UI ---');
    const token = generateToken();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await context.newPage();

    // Auto-accept confirmation dialogs (for deletion later)
    page.on('dialog', async (dialog) => {
      console.log(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    // Authenticate and open rates page
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('authToken', t);
      localStorage.setItem('easyfr8_token', t);
      document.cookie = `easyfr8_token=${t}; path=/`;
    }, token);

    await page.goto('http://localhost:3001/rates', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Open Add Modal
    const addBtn = page.locator('button:has-text("Add Freight Rate")').first();
    await addBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // 1. Freight Mode
    const modeSelect = page.locator('select').first();
    await modeSelect.selectOption({ label: 'Ocean Freight' });
    await page.waitForTimeout(500);

    // 2. Shipment Type
    const shipmentSelect = page.locator('select').nth(1);
    await shipmentSelect.selectOption({ label: 'FCL (Full Container Load)' });
    await page.waitForTimeout(500);

    // 3. Origin Location -> Shanghai Port (CNSHA)
    const originBtn = page.locator('label:has-text("Origin Location") + div[role="button"]');
    await originBtn.click();
    await page.waitForTimeout(300);
    const originSearch = page.locator('input[placeholder*="Search by name"]').first();
    await originSearch.fill('Shanghai');
    await page.waitForTimeout(500);
    const originOption = page.locator('div:has-text("Shanghai Port (CNSHA)")').last();
    await originOption.click();
    await page.waitForTimeout(500);

    // 4. Destination Location -> Mumbai Port (INBOM)
    const destBtn = page.locator('label:has-text("Destination Location") + div[role="button"]');
    await destBtn.click();
    await page.waitForTimeout(300);
    const destSearch = page.locator('input[placeholder*="Search by name"]').first();
    await destSearch.fill('Mumbai');
    await page.waitForTimeout(500);
    const destOption = page.locator('div:has-text("Mumbai Port (INBOM)")').last();
    await destOption.click();
    await page.waitForTimeout(500);

    // 5. Transhipment Checkbox
    const transCheckbox = page.locator('input[type="checkbox"]:near(:text("Transhipment"))').first();
    console.log(`Checking Transhipment checkbox (default checked: ${await transCheckbox.isChecked()})...`);
    await transCheckbox.check();
    await page.waitForTimeout(500);

    // 6. Transhipment Port -> Rotterdam Port (NLRTM)
    const transBtn = page.locator('label:has-text("Transhipment Port") + div[role="button"]');
    await transBtn.waitFor({ state: 'visible', timeout: 5000 });
    await transBtn.click();
    await page.waitForTimeout(300);
    const transSearch = page.locator('input[placeholder*="Search by name"]').first();
    await transSearch.fill('Rotterdam');
    await page.waitForTimeout(500);
    const transOption = page.locator('div:has-text("Rotterdam Port (NLRTM)")').last();
    await transOption.click();
    await page.waitForTimeout(500);

    // 7. Container -> 20ft Standard Dry (20GP)
    const containerSelect = page.locator('select').nth(2);
    await containerSelect.selectOption('cont-20gp');
    await page.waitForTimeout(300);

    // 8. Price -> 2450
    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.fill('2450');

    // 9. Transit Time -> 28
    const transitInput = page.locator('input[type="number"]').nth(1);
    await transitInput.fill('28');

    // 10. Carrier -> 'Hapag-Lloyd Test'
    const testCarrier = `Hapag-Lloyd Test ${Date.now()}`;
    const carrierInput = page.locator('input[type="text"][placeholder*="Maersk"]').first();
    await carrierInput.fill(testCarrier);

    // Submit form
    console.log('Submitting Add Freight Rate form via Save button...');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(2500);

    // Locate the newly created rate in the table using the unique carrier name
    const searchFilter = page.locator('input[placeholder*="Search by carrier"]').first();
    await searchFilter.fill(testCarrier);
    await page.waitForTimeout(1000);

    const rowLocator = page.locator(`tr:has-text("${testCarrier}")`).first();
    await rowLocator.waitFor({ state: 'visible', timeout: 10000 });
    const rowText = await rowLocator.innerText();
    const newRateId = rowText.split('\t')[0].trim();
    console.log(`✓ Rate created successfully through UI. Captured Rate ID: ${newRateId}`);

    // DIRECT DATABASE VERIFICATION QUERY
    console.log('\n--- Executing Direct Database SELECT for newly created rate ---');
    const [rowsAfterInsert] = await pool.query(SQL_VERIFY_QUERY, [newRateId]);
    console.log('SQL Query Result:');
    console.table(rowsAfterInsert);

    const insertedRate = rowsAfterInsert[0];
    if (!insertedRate) {
      throw new Error(`Rate ${newRateId} not found in database!`);
    }

    if (insertedRate.origin_id !== 'loc-cnsha') {
      throw new Error(`Expected origin_id 'loc-cnsha', got '${insertedRate.origin_id}'`);
    }
    if (insertedRate.destination_id !== 'loc-inbom') {
      throw new Error(`Expected destination_id 'loc-inbom', got '${insertedRate.destination_id}'`);
    }
    if (insertedRate.transhipment_id !== 'loc-nlrtm') {
      throw new Error(`Expected transhipment_id 'loc-nlrtm', got '${insertedRate.transhipment_id}'`);
    }
    if (Number(insertedRate.price) !== 2450) {
      throw new Error(`Expected price 2450, got ${insertedRate.price}`);
    }
    if (Number(insertedRate.transit_time) !== 28) {
      throw new Error(`Expected transit_time 28, got ${insertedRate.transit_time}`);
    }
    if (insertedRate.carrier !== testCarrier) {
      throw new Error(`Expected carrier '${testCarrier}', got '${insertedRate.carrier}'`);
    }

    console.log('✓ ACTUAL DATABASE ROW CONFIRMED:');
    console.log(`  - Rate ID:           ${insertedRate.id}`);
    console.log(`  - Freight Mode ID:   ${insertedRate.freight_mode_id}`);
    console.log(`  - Shipment Type ID:  ${insertedRate.shipment_type_id}`);
    console.log(`  - Origin ID:         ${insertedRate.origin_id} (${insertedRate.origin_port})`);
    console.log(`  - Destination ID:    ${insertedRate.destination_id} (${insertedRate.destination_port})`);
    console.log(`  - Transhipment ID:   ${insertedRate.transhipment_id} (${insertedRate.transhipment_port})`);
    console.log(`  - Container ID:      ${insertedRate.container_id}`);
    console.log(`  - Price:             ${insertedRate.price} ${insertedRate.currency}`);
    console.log(`  - Transit Time:      ${insertedRate.transit_time} Days`);
    console.log(`  - Carrier:           ${insertedRate.carrier}`);
    console.log(`  - Status:            ${insertedRate.status}`);
    console.log(`  - Created At:        ${insertedRate.created_at}`);

    // SECTION 4: TEST EDIT AND RETRIEVAL
    console.log('\n--- SECTION 4: Test Edit and Retrieval Flow ---');
    console.log('1. Reopening the rate in Admin Edit Modal...');
    const editBtn = rowLocator.locator('button:has-text("Edit")');
    await editBtn.click();
    await page.waitForTimeout(1500);

    // Verify fields in Edit Modal
    const editTransCheckbox = page.locator('input[type="checkbox"]:near(:text("Transhipment"))').first();
    const isTransCheckedOnOpen = await editTransCheckbox.isChecked();
    console.log(`  - Transhipment checkbox restored as checked: ${isTransCheckedOnOpen} (expected: true)`);
    if (!isTransCheckedOnOpen) throw new Error('Transhipment checkbox was NOT checked upon reopening!');

    const editTransBtn = page.locator('label:has-text("Transhipment Port") + div[role="button"]');
    const transTextOnOpen = await editTransBtn.innerText();
    console.log(`  - Transhipment Port input restored: '${transTextOnOpen.trim()}'`);
    if (!transTextOnOpen.includes('Rotterdam')) {
      throw new Error(`Expected Transhipment Port to be Rotterdam, found: '${transTextOnOpen}'`);
    }

    // 2. Change Transhipment Port to Nhava Sheva (loc-innsv / INNSV)
    console.log('2. Changing Transhipment Port to Nhava Sheva (INNSV)...');
    await editTransBtn.click();
    await page.waitForTimeout(300);
    const editSearchBox = page.locator('input[placeholder*="Search by name"]').first();
    await editSearchBox.fill('Nhava Sheva');
    await page.waitForTimeout(500);
    const newTransOption = page.locator('div:has-text("Nhava Sheva (INNSV)")').last();
    await newTransOption.click();
    await page.waitForTimeout(500);

    const editSaveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
    await editSaveBtn.click();
    await page.waitForTimeout(2000);

    // Query DB to verify change to loc-innsv
    console.log('3. Querying database row after update...');
    const [rowsAfterChange] = await pool.query(SQL_VERIFY_QUERY, [newRateId]);
    console.table(rowsAfterChange);
    if (rowsAfterChange[0]?.transhipment_id !== 'loc-innsv') {
      throw new Error(`Expected transhipment_id 'loc-innsv', got '${rowsAfterChange[0]?.transhipment_id}'`);
    }
    console.log(`✓ Confirmed in DB: transhipment_id updated to '${rowsAfterChange[0].transhipment_id}' (${rowsAfterChange[0].transhipment_port})`);

    // 3. Uncheck Transhipment and save
    console.log('4. Reopening to uncheck Transhipment...');
    await editBtn.click();
    await page.waitForTimeout(1500);

    console.log('Unchecking Transhipment checkbox...');
    await editTransCheckbox.uncheck();
    await page.waitForTimeout(500);

    const isVisibleAfterUncheck = await editTransBtn.isVisible().catch(() => false);
    console.log(`  - Transhipment Port input visible after uncheck: ${isVisibleAfterUncheck} (expected: false)`);

    await editSaveBtn.click();
    await page.waitForTimeout(2000);

    // Query DB to verify transhipment_id is NULL
    console.log('5. Querying database row after uncheck...');
    const [rowsAfterUncheck] = await pool.query(SQL_VERIFY_QUERY, [newRateId]);
    console.table(rowsAfterUncheck);
    if (rowsAfterUncheck[0]?.transhipment_id !== null) {
      throw new Error(`Expected transhipment_id NULL, got '${rowsAfterUncheck[0]?.transhipment_id}'`);
    }
    console.log(`✓ Confirmed in DB: transhipment_id successfully persisted as NULL.`);

    // 4. Reopen and verify it stays unchecked and hidden
    console.log('6. Reopening rate to verify persistence of unchecked state in UI...');
    await editBtn.click();
    await page.waitForTimeout(1500);
    const isCheckedFinally = await editTransCheckbox.isChecked();
    const isVisibleFinally = await editTransBtn.isVisible().catch(() => false);
    console.log(`  - Checkbox checked: ${isCheckedFinally} (expected: false)`);
    console.log(`  - Port input visible: ${isVisibleFinally} (expected: false)`);
    if (isCheckedFinally || isVisibleFinally) {
      throw new Error('Unchecked state was not restored correctly in Edit modal!');
    }
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // SECTION 5: PUBLIC RATE MATCHING VERIFICATION
    console.log('\n--- SECTION 5: Public Rate Matching Verification ---');
    // Test direct route lookup (no transhipment)
    const directRes = await fetch(
      `http://localhost:3001/api/freight-rates?mode_id=ocean-freight&shipment_type_id=shiptype-fcl&origin_id=CNSHA&destination_id=INBOM&container_id=cont-20gp&status=active`
    );
    const directRates = await directRes.json();
    console.log(`✓ Direct route lookup returned ${directRates.length} active rates.`);

    // Temporarily re-assign transhipment to test transhipment route matching
    await pool.query('UPDATE freight_rates SET transhipment_id = "loc-nlrtm" WHERE id = ?', [newRateId]);
    const transRes = await fetch(
      `http://localhost:3001/api/freight-rates?mode_id=ocean-freight&shipment_type_id=shiptype-fcl&origin_id=CNSHA&destination_id=INBOM&transhipment_id=NLRTM&container_id=cont-20gp&status=active`
    );
    const transRates = await transRes.json();
    console.log(`✓ Transhipment route lookup (Via NLRTM) returned ${transRates.length} matching rates.`);
    const matchedTransRate = transRates.find((r) => r.id === newRateId);
    if (!matchedTransRate) {
      throw new Error(`Public rate query failed to match rate ${newRateId} with transhipment NLRTM!`);
    }
    console.log(`✓ Matched rate details: id=${matchedTransRate.id}, via=${matchedTransRate.transhipment_code} (${matchedTransRate.transhipment_name})`);

    // SECTION 6: CLEANUP
    console.log('\n--- SECTION 6: Test Record Cleanup ---');
    await pool.query('DELETE FROM freight_rates WHERE id = ?', [newRateId]);
    const [finalCountRows] = await pool.query('SELECT COUNT(*) as cnt FROM freight_rates');
    console.log(`✓ Cleaned up test rate ${newRateId}. Current count: ${finalCountRows[0].cnt} (original was ${initialCount})`);
    if (finalCountRows[0].cnt !== initialCount) {
      throw new Error(`Record count mismatch! Expected ${initialCount}, found ${finalCountRows[0].cnt}`);
    }

    console.log('\n================================================================');
    console.log('ALL PERSISTENCE AND FLOW VERIFICATIONS COMPLETED SUCCESSFULLY');
    console.log('================================================================\n');
  } finally {
    if (browser) await browser.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
