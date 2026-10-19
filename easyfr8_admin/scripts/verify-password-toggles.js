const { chromium } = require('playwright');

async function runPasswordToggleTests() {
  console.log('====================================================');
  console.log('EASYFR8 SHOW/HIDE PASSWORD TOGGLE VERIFICATION');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Shipper Login Password Toggle (user/login)
    // ----------------------------------------------------
    console.log('--- Test 1: Shipper Login Page Password Toggle ---');
    await page.goto('http://localhost:3000/user/login', { waitUntil: 'networkidle' });

    // Locate login password input & its toggle button
    const loginPassInput = await page.$('.portal-form-group .portal-password-wrapper input[placeholder="••••••••"]');
    assert(loginPassInput !== null, 'Login password input is wrapped in .portal-password-wrapper');

    const defaultType = await loginPassInput.getAttribute('type');
    assert(defaultType === 'password', 'Login password input is masked by default (type="password")');

    const toggleBtn = await page.$('.portal-form-group .portal-password-wrapper .portal-password-toggle-btn');
    assert(toggleBtn !== null, 'Eye toggle button exists inside the password wrapper');

    const btnType = await toggleBtn.getAttribute('type');
    assert(btnType === 'button', 'Eye toggle button has type="button" to prevent accidental form submission');

    const defaultLabel = await toggleBtn.getAttribute('aria-label');
    assert(defaultLabel === 'Show password', 'Toggle button has accessible aria-label="Show password" when masked');

    const defaultIcon = await toggleBtn.$eval('i', el => el.className);
    assert(defaultIcon.includes('fa-eye') && !defaultIcon.includes('fa-eye-slash'), 'Toggle button displays fa-eye icon');

    // Check padding-right prevents text overlap
    const paddingRight = await loginPassInput.evaluate(el => window.getComputedStyle(el).paddingRight);
    console.log(`Input computed paddingRight: ${paddingRight}`);
    assert(parseInt(paddingRight, 10) >= 36, 'Password input has >= 36px right padding so text never overlaps eye icon');

    // Click to Reveal
    await toggleBtn.click();
    const revealedType = await loginPassInput.getAttribute('type');
    assert(revealedType === 'text', 'Clicking eye reveals password (type="text")');

    const revealedLabel = await toggleBtn.getAttribute('aria-label');
    assert(revealedLabel === 'Hide password', 'Toggle button aria-label updates to "Hide password"');

    const revealedIcon = await toggleBtn.$eval('i', el => el.className);
    assert(revealedIcon.includes('fa-eye-slash'), 'Toggle button displays fa-eye-slash icon when revealed');

    // Click to Hide again
    await toggleBtn.click();
    const hiddenAgainType = await loginPassInput.getAttribute('type');
    assert(hiddenAgainType === 'password', 'Clicking eye again hides password (type="password")');

    // ----------------------------------------------------
    // TEST 2: Register Form Password Toggles
    // ----------------------------------------------------
    console.log('\n--- Test 2: Register Tab Password Toggles Independence ---');
    await page.click('button:has-text("Register Account")');
    await page.waitForTimeout(300);

    const regPassInput = await page.$('input[placeholder="Minimum 6 characters"]');
    const regConfirmInput = await page.$('input[placeholder="Repeat your password"]');
    assert(regPassInput !== null && regConfirmInput !== null, 'Register password and confirm inputs exist');

    assert(await regPassInput.getAttribute('type') === 'password', 'Register password is masked by default');
    assert(await regConfirmInput.getAttribute('type') === 'password', 'Register confirm password is masked by default');

    // Find the toggle buttons for both register fields
    const regPassWrapper = await page.$('.portal-password-wrapper:has(input[placeholder="Minimum 6 characters"])');
    const regConfirmWrapper = await page.$('.portal-password-wrapper:has(input[placeholder="Repeat your password"])');

    const regPassToggle = await regPassWrapper.$('.portal-password-toggle-btn');
    const regConfirmToggle = await regConfirmWrapper.$('.portal-password-toggle-btn');

    // Toggle regPassword only
    await regPassToggle.click();
    assert(await regPassInput.getAttribute('type') === 'text', 'regPassword revealed');
    assert(await regConfirmInput.getAttribute('type') === 'password', 'regConfirmPassword remains strictly masked (independent)');

    // Toggle regConfirmPassword only
    await regConfirmToggle.click();
    assert(await regConfirmInput.getAttribute('type') === 'text', 'regConfirmPassword revealed independently');

    // Switch back to Login tab
    await page.click('button:has-text("Shipper Login")');
    await page.waitForTimeout(300);

    // ----------------------------------------------------
    // TEST 3: Login form submission with toggle still works
    // ----------------------------------------------------
    console.log('\n--- Test 3: Form Submission Verification ---');
    await page.fill('input[type="email"]', 'user318@easyfr8.com');
    await page.fill('.portal-password-wrapper input', 'EasyFr8#Shipper2026!');
    
    // Toggle while filled
    await page.click('.portal-password-toggle-btn');
    const filledVal = await page.$eval('.portal-password-wrapper input', el => el.value);
    assert(filledVal === 'EasyFr8#Shipper2026!', 'Password value preserved perfectly across toggle');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/user/dashboard', { timeout: 10000 });
    assert(page.url().includes('/user/dashboard'), 'Successfully authenticated and redirected to /user/dashboard');

    // ----------------------------------------------------
    // TEST 4: User Profile Security & Credentials 3 Toggles
    // ----------------------------------------------------
    console.log('\n--- Test 4: User Profile Security & Credentials Independent Toggles ---');
    await page.goto('http://localhost:3000/user/profile', { waitUntil: 'networkidle' });

    // 3 Password inputs: Current, New, Confirm
    const currentInput = await page.$('input[placeholder="••••••••"]');
    const newInput = await page.$('input[placeholder="Minimum 6 characters"]');
    const confirmInput = await page.$('input[placeholder="Repeat new password"]');

    assert(currentInput !== null, 'Current password input exists');
    assert(newInput !== null, 'New password input exists');
    assert(confirmInput !== null, 'Confirm new password input exists');

    assert(await currentInput.getAttribute('type') === 'password', 'Current password masked by default');
    assert(await newInput.getAttribute('type') === 'password', 'New password masked by default');
    assert(await confirmInput.getAttribute('type') === 'password', 'Confirm new password masked by default');

    // Toggles
    const currentWrapper = await page.$('.portal-password-wrapper:has(input[placeholder="••••••••"])');
    const newWrapper = await page.$('.portal-password-wrapper:has(input[placeholder="Minimum 6 characters"])');
    const confirmWrapper = await page.$('.portal-password-wrapper:has(input[placeholder="Repeat new password"])');

    const currentToggle = await currentWrapper.$('.portal-password-toggle-btn');
    const newToggle = await newWrapper.$('.portal-password-toggle-btn');
    const confirmToggle = await confirmWrapper.$('.portal-password-toggle-btn');

    assert(currentToggle !== null, 'Current password has toggle button');
    assert(newToggle !== null, 'New password has toggle button');
    assert(confirmToggle !== null, 'Confirm new password has toggle button');

    // Test Independence: Reveal ONLY Current Password
    console.log('Testing independent visibility state for Current Password...');
    await currentToggle.click();
    assert(await currentInput.getAttribute('type') === 'text', 'Current password is now type="text"');
    assert(await newInput.getAttribute('type') === 'password', 'New password remains type="password"');
    assert(await confirmInput.getAttribute('type') === 'password', 'Confirm password remains type="password"');

    // Test Independence: Reveal ONLY New Password
    console.log('Testing independent visibility state for New Password...');
    await newToggle.click();
    assert(await currentInput.getAttribute('type') === 'text', 'Current password stays type="text"');
    assert(await newInput.getAttribute('type') === 'text', 'New password is now type="text"');
    assert(await confirmInput.getAttribute('type') === 'password', 'Confirm password remains type="password"');

    // Test Independence: Reveal Confirm Password
    console.log('Testing independent visibility state for Confirm Password...');
    await confirmToggle.click();
    assert(await currentInput.getAttribute('type') === 'text', 'Current password stays type="text"');
    assert(await newInput.getAttribute('type') === 'text', 'New password stays type="text"');
    assert(await confirmInput.getAttribute('type') === 'text', 'Confirm password is now type="text"');

    // Hide Current Password again
    await currentToggle.click();
    assert(await currentInput.getAttribute('type') === 'password', 'Current password is masked again');
    assert(await newInput.getAttribute('type') === 'text', 'New password remains type="text"');
    assert(await confirmInput.getAttribute('type') === 'text', 'Confirm password remains type="text"');

    // Hide New & Confirm
    await newToggle.click();
    await confirmToggle.click();
    assert(await currentInput.getAttribute('type') === 'password', 'Current password masked');
    assert(await newInput.getAttribute('type') === 'password', 'New password masked');
    assert(await confirmInput.getAttribute('type') === 'password', 'Confirm password masked');

    // ----------------------------------------------------
    // TEST 5: Verify Clicking Toggle Does NOT Submit Form
    // ----------------------------------------------------
    console.log('\n--- Test 5: Verify Toggle Does NOT Trigger Form Submit ---');
    // If clicking eye submitted the form with empty inputs, it would trigger browser validation or error alerts
    let formSubmitted = false;
    await page.evaluate(() => {
      const form = document.querySelector('form:has(input[placeholder="••••••••"])');
      if (form) {
        form.addEventListener('submit', () => { window.__form_submitted = true; });
      }
    });

    await currentToggle.click();
    await newToggle.click();
    await confirmToggle.click();

    formSubmitted = await page.evaluate(() => !!window.__form_submitted);
    assert(!formSubmitted, 'Clicking eye toggles did NOT submit the password update form');

    // Check console errors
    assert(consoleErrors.length === 0, `No console errors encountered (found: ${consoleErrors.length})`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPasswordToggleTests();
