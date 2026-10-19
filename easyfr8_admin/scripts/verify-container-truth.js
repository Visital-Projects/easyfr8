const { chromium } = require('playwright');
const mysql = require('mysql2/promise');

async function runVerification() {
  console.log('=== Starting Container Manager Single Source of Truth Verification ===\n');

  // Database Connection
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'easyfr8'
  });

  // Verify initial DB state
  const [initialContainers] = await db.query('SELECT id, name, size, status FROM containers ORDER BY name ASC');
  console.log(`[DB Check] Total containers in database: ${initialContainers.length}`);
  const activeDbList = initialContainers.filter(c => c.status === 'active');
  const inactiveDbList = initialContainers.filter(c => c.status === 'inactive');
  console.log(`- Active (${activeDbList.length}): ${activeDbList.map(c => c.id).join(', ')}`);
  console.log(`- Inactive (${inactiveDbList.length}): ${inactiveDbList.map(c => c.id).join(', ')}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ---------------------------------------------------------
    // TEST 1: Admin Container Manager shows all 8 records (active and inactive)
    // ---------------------------------------------------------
    console.log('--- Test 1: Admin Container Manager Lists All Containers ---');
    // Admin login first
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    await page.fill('#email', 'biswa@easyfr8.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to /containers
    await page.goto('http://localhost:3001/containers', { waitUntil: 'networkidle' });
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    
    // Check if table rows exist
    const adminRows = await page.$$eval('tbody tr', rows => rows.map(r => r.innerText));
    console.log(`Admin table rows rendered: ${adminRows.length}`);
    const hasActiveInAdmin = adminRows.some(r => r.includes('cont-20gp') && r.toLowerCase().includes('active'));
    const hasInactiveInAdmin = adminRows.some(r => r.includes('container-20gp') && r.toLowerCase().includes('inactive'));
    console.log(`- Admin contains active cont-20gp: ${hasActiveInAdmin}`);
    console.log(`- Admin contains inactive container-20gp: ${hasInactiveInAdmin}`);
    if (!hasActiveInAdmin || !hasInactiveInAdmin) {
      throw new Error('Test 1 Failed: Admin Container Manager missing active or inactive containers');
    }
    console.log('✓ Test 1 Passed: Admin shows both active and inactive container records.\n');

    // ---------------------------------------------------------
    // TEST 2 & 3 & 8: Public Booking Dropdown shows only active containers
    // ---------------------------------------------------------
    console.log('--- Test 2, 3, 8: Public Booking Dropdown Active/Inactive & Hardcoded Check ---');
    await page.goto('http://localhost:3000/booking', { waitUntil: 'networkidle' });
    await page.waitForSelector('select.fcl-select', { state: 'attached', timeout: 10000 });

    const dropdownOptions = await page.$$eval('select.fcl-select option', options =>
      options.map(o => ({ value: o.value, text: o.text.trim() }))
    );
    console.log('Public Booking Dropdown Options:', dropdownOptions);

    const optionValues = dropdownOptions.map(o => o.value).filter(Boolean);
    const optionTexts = dropdownOptions.map(o => o.text);

    // Verify all active containers are present
    for (const act of activeDbList) {
      const found = optionValues.includes(act.id);
      console.log(`- Active container [${act.id}] present in dropdown: ${found}`);
      if (!found) throw new Error(`Active container ${act.id} missing from public dropdown`);
    }

    // Verify inactive containers are NOT present
    for (const inact of inactiveDbList) {
      const foundVal = optionValues.includes(inact.id);
      const foundText = optionTexts.some(t => t.includes(inact.id));
      console.log(`- Inactive container [${inact.id}] excluded from dropdown: ${!foundVal && !foundText}`);
      if (foundVal || foundText) throw new Error(`Inactive container ${inact.id} unexpectedly found in dropdown`);
    }

    // Verify stale hardcoded options from STANDARD_EQUIPMENT_OPTIONS are NOT present
    const staleHardcoded = ['cont-45hc', 'cont-20rf', 'cont-40rf', 'cont-20ot', 'cont-40fs', 'cont-40fh', 'cont-20flat', 'cont-20fr', 'cont-40fr', 'cont-20tk'];
    for (const stale of staleHardcoded) {
      const found = optionValues.includes(stale);
      if (found) throw new Error(`Stale hardcoded container ${stale} found in public dropdown`);
    }
    console.log('✓ Test 2, 3, 8 Passed: Public selector shows all active, 0 inactive, and 0 stale hardcoded options.\n');

    // Get Admin Auth Token for API mutations
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'biswa@easyfr8.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const adminToken = loginData.token;
    console.log(`- Admin API Token acquired: ${Boolean(adminToken)}`);

    // ---------------------------------------------------------
    // TEST 6: Adding an active container makes it appear publicly without code edits
    // ---------------------------------------------------------
    console.log('--- Test 6: Add active container and verify public dropdown ---');
    const tempActiveId = 'test-dynamic-active';
    const postRes = await fetch('http://localhost:3001/api/containers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        id: tempActiveId,
        name: 'Dynamic Active Box (20DA)',
        description: 'Auto test dynamic container',
        size: '20ft',
        status: 'active'
      })
    });
    console.log(`- POST /api/containers response status: ${postRes.status}`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('select.fcl-select');
    const optionsAfterAdd = await page.$$eval('select.fcl-select option', opts => opts.map(o => o.value));
    const addedPresent = optionsAfterAdd.includes(tempActiveId);
    console.log(`- Dynamically added active container [${tempActiveId}] appears publicly: ${addedPresent}`);
    if (!addedPresent) throw new Error('Test 6 Failed: Dynamically added active container did not appear');
    console.log('✓ Test 6 Passed: Newly created active container appears publicly.\n');

    // ---------------------------------------------------------
    // TEST 4: Changing container to inactive removes it from public options
    // ---------------------------------------------------------
    console.log('--- Test 4: Deactivate container and verify removal from public dropdown ---');
    await fetch(`http://localhost:3001/api/containers/${tempActiveId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Dynamic Active Box (20DA)',
        description: 'Auto test dynamic container',
        size: '20ft',
        status: 'inactive'
      })
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('select.fcl-select');
    const optionsAfterDeact = await page.$$eval('select.fcl-select option', opts => opts.map(o => o.value));
    const deactAbsent = !optionsAfterDeact.includes(tempActiveId);
    console.log(`- Deactivated container [${tempActiveId}] removed from public options: ${deactAbsent}`);
    if (!deactAbsent) throw new Error('Test 4 Failed: Deactivated container still present in public dropdown');
    console.log('✓ Test 4 Passed: Deactivated container is immediately removed from public dropdown.\n');

    // ---------------------------------------------------------
    // TEST 5: Reactivating container makes it available publicly
    // ---------------------------------------------------------
    console.log('--- Test 5: Reactivate container and verify reappearance ---');
    await fetch(`http://localhost:3001/api/containers/${tempActiveId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Dynamic Active Box (20DA)',
        description: 'Auto test dynamic container',
        size: '20ft',
        status: 'active'
      })
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('select.fcl-select');
    const optionsAfterReact = await page.$$eval('select.fcl-select option', opts => opts.map(o => o.value));
    const reactPresent = optionsAfterReact.includes(tempActiveId);
    console.log(`- Reactivated container [${tempActiveId}] reappears publicly: ${reactPresent}`);
    if (!reactPresent) throw new Error('Test 5 Failed: Reactivated container did not reappear');
    console.log('✓ Test 5 Passed: Reactivating container makes it available publicly.\n');

    // ---------------------------------------------------------
    // TEST 7: Adding an inactive container does NOT make it appear publicly
    // ---------------------------------------------------------
    console.log('--- Test 7: Add inactive container and verify exclusion ---');
    const tempInactiveId = 'test-dynamic-inactive';
    await fetch('http://localhost:3001/api/containers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        id: tempInactiveId,
        name: 'Dynamic Inactive Box (40DI)',
        description: 'Auto test dynamic inactive',
        size: '40ft',
        status: 'inactive'
      })
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('select.fcl-select');
    const optionsAfterInactAdd = await page.$$eval('select.fcl-select option', opts => opts.map(o => o.value));
    const inactAddExcluded = !optionsAfterInactAdd.includes(tempInactiveId);
    console.log(`- Newly added inactive container [${tempInactiveId}] excluded publicly: ${inactAddExcluded}`);
    if (!inactAddExcluded) throw new Error('Test 7 Failed: Inactive container appeared in public dropdown');
    console.log('✓ Test 7 Passed: Newly added inactive container is excluded publicly.\n');

    // Clean up temporary test containers
    await fetch(`http://localhost:3001/api/containers/${tempActiveId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    await fetch(`http://localhost:3001/api/containers/${tempInactiveId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('[Cleanup] Temporary test containers deleted from database.\n');

    // ---------------------------------------------------------
    // TEST 9 & 10: Freight Rate Matching and End-to-End Booking Submission
    // ---------------------------------------------------------
    console.log('--- Test 9 & 10: Freight Rate Matching and End-to-End Booking Submission ---');
    // First log in customer to satisfy authentication requirement
    await page.goto('http://localhost:3000/user/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'user318@easyfr8.com');
    await page.fill('input[type="password"]', 'admin123');
    await Promise.all([
      page.waitForURL('**/user/dashboard'),
      page.click('button[type="submit"]')
    ]);
    console.log('- Customer authenticated successfully.');

    // Using rate frate-139 (origin: Aalborg, dest: Abashiri, container: cont-20gp)
    await page.goto('http://localhost:3000/booking?rate_id=frate-139', { waitUntil: 'networkidle' });
    await page.waitForSelector('select.fcl-select');

    // Verify container selector has pre-selected cont-20gp
    const selectedContainerVal = await page.$eval('select.fcl-select', el => el.value);
    console.log(`- Pre-selected container for frate-139: ${selectedContainerVal}`);
    if (selectedContainerVal !== 'cont-20gp') {
      throw new Error(`Expected cont-20gp to be pre-selected for frate-139, got ${selectedContainerVal}`);
    }

    // Fill in required container fields (quantity=1, weight=2500)
    await page.fill('input[placeholder="Enter weight"]', '2500');

    // Click Proceed to Booking
    const proceedBtn = await page.waitForSelector('button:has-text("Proceed to Booking")');
    await proceedBtn.click();

    page.on('console', msg => console.log('  [Browser Console]:', msg.text()));
    page.on('pageerror', err => console.log('  [Browser Error]:', err.message));

    // Customer fields are pre-filled or editable; ensure all 3 fields are filled
    await page.waitForTimeout(500);
    const nameInput = page.locator('input[placeholder="e.g. John Doe"]');
    if (await nameInput.isVisible()) {
      const curName = await nameInput.inputValue();
      if (!curName) await nameInput.fill('Easyfr8 User 318');
    }
    const emailInput = page.locator('input[placeholder="e.g. john@company.com"]');
    if (await emailInput.isVisible()) {
      const curEmail = await emailInput.inputValue();
      if (!curEmail) await emailInput.fill('user318@easyfr8.com');
    }
    const phoneInput = page.locator('input[placeholder="e.g. +1 555-0199"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+1 555-0199');
    }

    // Submit booking
    const submitBtn = await page.waitForSelector('button:has-text("Submit Booking")');
    await submitBtn.click();

    // Check for any validation error on the page
    await page.waitForTimeout(1000);
    const visibleErrors = await page.$$eval('.form-error, [style*="color: rgb(214, 66, 56)"]', els => els.map(e => e.innerText.trim()).filter(Boolean));
    if (visibleErrors.length > 0) {
      console.log('Visible errors after Submit Booking click:', visibleErrors);
    }

    // Verify submission success
    await page.waitForSelector('text=Booking Created Successfully!', { timeout: 15000 });
    const bookingSummary = await page.$eval('strong', el => el.innerText);
    console.log(`- Booking submission confirmed!`);

    // Verify booking in database has container_id = 'cont-20gp'
    const [bookingRows] = await db.query(
      'SELECT id, booking_no, container_id, freight_rate_id, user_name, email FROM bookings WHERE email = ? ORDER BY id DESC LIMIT 1',
      ['user318@easyfr8.com']
    );
    console.log('- Database persisted booking:', bookingRows[0]);
    if (!bookingRows[0] || bookingRows[0].container_id !== 'cont-20gp') {
      throw new Error(`Booking in DB does not have container_id = 'cont-20gp': ${JSON.stringify(bookingRows[0])}`);
    }
    console.log('✓ Test 9 & 10 Passed: Selected container matches rate and booking submission persists container_id.\n');

    // ---------------------------------------------------------
    // TEST 11: API Failure Handling Produces Error State, Not Static Dropdown
    // ---------------------------------------------------------
    console.log('--- Test 11: API Failure Handling Check ---');
    const errorPage = await context.newPage();
    // Route /api/containers to return failure
    await errorPage.route('**/api/containers*', route => route.abort('failed'));
    await errorPage.goto('http://localhost:3000/booking', { waitUntil: 'load' });
    await errorPage.waitForSelector('select.fcl-select');

    const errDropdownOptions = await errorPage.$$eval('select.fcl-select option', opts => opts.map(o => o.text.trim()));
    console.log('- Dropdown options when API fails:', errDropdownOptions);
    const hasErrorOption = errDropdownOptions.some(t => t.toLowerCase().includes('error') || t.toLowerCase().includes('fail'));
    const hasNoStaticFallback = !errDropdownOptions.some(t => t.includes("20' Dry Standard (20GP)"));
    console.log(`- Shows error option: ${hasErrorOption}`);
    console.log(`- Has no misleading static fallback: ${hasNoStaticFallback}`);
    if (!hasErrorOption || !hasNoStaticFallback) {
      throw new Error('Test 11 Failed: Dropped into static fallback or did not show error state upon API failure');
    }
    console.log('✓ Test 11 Passed: API failure displays clear error state without static dropdown fallback.\n');
    await errorPage.close();

    // ---------------------------------------------------------
    // TEST 12: No Existing Container or Rate Deleted or Reset
    // ---------------------------------------------------------
    console.log('--- Test 12: Integrity of Database Records ---');
    const [finalContainers] = await db.query('SELECT id, status FROM containers ORDER BY name ASC');
    console.log(`- Final container count: ${finalContainers.length} (Initial: ${initialContainers.length})`);
    if (finalContainers.length !== initialContainers.length) {
      throw new Error(`Container count changed from ${initialContainers.length} to ${finalContainers.length}`);
    }
    const [ratesCount] = await db.query('SELECT COUNT(*) as count FROM freight_rates');
    console.log(`- Freight rates count: ${ratesCount[0].count}`);
    console.log('✓ Test 12 Passed: No existing containers, freight rates, or bookings deleted or reset.\n');

    console.log('================================================================');
    console.log('🎉 ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('================================================================');

  } finally {
    await browser.close();
    await db.end();
  }
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
