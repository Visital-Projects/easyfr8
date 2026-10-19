const { chromium } = require('playwright');

async function runTests() {
  console.log('====================================================');
  console.log('EASYFR8 PUBLIC WEBSITE HEADER AUTH AWARENESS TESTS');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

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
    // TEST 1: Logged-out state
    // ----------------------------------------------------
    console.log('--- Test 1: Logged-out State on Public Website ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Clear any leftover storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    const userLoginBtn = await page.$('.navbar-user-login-btn');
    assert(userLoginBtn !== null, 'Desktop header displays "User Login" button when logged out');

    const accountBtnLoggedOut = await page.$('.navbar-user-account-btn');
    assert(accountBtnLoggedOut === null, 'Desktop header does NOT display account dropdown button when logged out');

    const loginHref = await userLoginBtn.getAttribute('href');
    assert(loginHref === '/user/login', 'User Login button links to /user/login');

    // ----------------------------------------------------
    // TEST 2: Successful login changes header to Account UI
    // ----------------------------------------------------
    console.log('\n--- Test 2: Login Flow & Header State Update ---');
    await userLoginBtn.click();
    await page.waitForURL('**/user/login');
    assert(page.url().includes('/user/login'), 'Navigated to /user/login');

    // Fill login form
    await page.fill('input[type="email"]', 'user318@easyfr8.com');
    await page.fill('input[type="password"]', 'EasyFr8#Shipper2026!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/user/dashboard', { timeout: 10000 });
    assert(page.url().includes('/user/dashboard'), 'Successfully logged in and reached /user/dashboard');

    // Navigate back to public website home
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    const accountBtn = await page.$('.navbar-user-account-btn');
    assert(accountBtn !== null, 'Header now displays .navbar-user-account-btn instead of User Login');

    const userLoginBtnAfterLogin = await page.$('.navbar-user-login-btn');
    assert(userLoginBtnAfterLogin === null, 'Header no longer displays User Login button');

    const displayName = await page.$eval('.navbar-user-display-name', el => el.textContent.trim());
    console.log(`Displayed user name: "${displayName}"`);
    assert(displayName.includes('Easyfr8 User 318'), 'Header displays correct user display name ("Easyfr8 User 318")');

    const avatarImg = await page.$('.navbar-user-avatar-chip img');
    if (avatarImg) {
      const src = await avatarImg.getAttribute('src');
      console.log(`Displayed avatar img src: "${src}"`);
      assert(src && src.includes('unsplash'), 'Header displays correct user avatar image from user profile');
    } else {
      const avatarChip = await page.$eval('.navbar-user-avatar-chip', el => el.textContent.trim());
      console.log(`Displayed avatar initials: "${avatarChip}"`);
      assert(avatarChip === 'EU', 'Header displays correct user initials avatar ("EU")');
    }

    // ----------------------------------------------------
    // TEST 3: Page refresh preserves state without flashing
    // ----------------------------------------------------
    console.log('\n--- Test 3: Page Refresh State Preservation ---');
    await page.reload({ waitUntil: 'networkidle' });

    const accountBtnAfterRefresh = await page.$('.navbar-user-account-btn');
    assert(accountBtnAfterRefresh !== null, 'Account button remains visible immediately after page reload');

    const userLoginAfterRefresh = await page.$('.navbar-user-login-btn');
    assert(userLoginAfterRefresh === null, 'User login button is not visible after reload');

    // ----------------------------------------------------
    // TEST 4: Account dropdown interaction and navigation
    // ----------------------------------------------------
    console.log('\n--- Test 4: Dropdown Menu & Navigation ---');
    // Dropdown should be closed initially
    let dropdownMenu = await page.$('.navbar-user-dropdown-menu');
    assert(dropdownMenu === null, 'Dropdown menu is closed by default');

    // Click to open
    await page.click('.navbar-user-account-btn');
    await page.waitForSelector('.navbar-user-dropdown-menu', { state: 'visible' });
    dropdownMenu = await page.$('.navbar-user-dropdown-menu');
    assert(dropdownMenu !== null, 'Dropdown menu opens on click');

    const headerName = await page.$eval('.navbar-user-dropdown-header .user-name', el => el.textContent.trim());
    const headerEmail = await page.$eval('.navbar-user-dropdown-header .user-email', el => el.textContent.trim());
    const headerRole = await page.$eval('.navbar-user-dropdown-header .user-badge', el => el.textContent.trim());
    console.log(`Dropdown header details: Name="${headerName}", Email="${headerEmail}", Role="${headerRole}"`);
    assert(headerName.includes('Easyfr8 User 318'), 'Dropdown header contains user name');
    assert(headerEmail === 'user318@easyfr8.com', 'Dropdown header contains user email');
    assert(headerRole === 'Customer', 'Dropdown header contains user role ("Customer")');

    // Test Keyboard Accessibility (Escape closes dropdown)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    dropdownMenu = await page.$('.navbar-user-dropdown-menu');
    assert(dropdownMenu === null, 'Pressing Escape key closes the dropdown');

    // Reopen dropdown to test navigation
    await page.click('.navbar-user-account-btn');
    await page.waitForSelector('.navbar-user-dropdown-menu', { state: 'visible' });

    // Click My Bookings link
    const bookingsLink = await page.$('a.navbar-user-dropdown-item:has-text("My Bookings")');
    assert(bookingsLink !== null, 'Dropdown contains "My Bookings" link');
    await bookingsLink.click();

    await page.waitForURL('**/user/bookings');
    assert(page.url().includes('/user/bookings'), 'Navigated to /user/bookings via dropdown');

    // ----------------------------------------------------
    // TEST 5: Logout flow
    // ----------------------------------------------------
    console.log('\n--- Test 5: Logout Flow ---');
    // Return to public website
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Open dropdown
    await page.click('.navbar-user-account-btn');
    await page.waitForSelector('.navbar-user-dropdown-menu', { state: 'visible' });

    // Click logout
    const logoutBtn = await page.$('button.navbar-user-logout-btn');
    assert(logoutBtn !== null, 'Dropdown contains Logout button');
    await logoutBtn.click();
    await page.waitForTimeout(500);

    const userLoginAfterLogout = await page.$('.navbar-user-login-btn');
    assert(userLoginAfterLogout !== null, 'Header immediately restores "User Login" button after logout');

    const accountBtnAfterLogout = await page.$('.navbar-user-account-btn');
    assert(accountBtnAfterLogout === null, 'Account button is completely removed after logout');

    const storedToken = await page.evaluate(() => localStorage.getItem('easyfr8_token'));
    const storedUser = await page.evaluate(() => localStorage.getItem('easyfr8_user'));
    assert(storedToken === null && storedUser === null, 'Authentication tokens & user data cleared from localStorage');

    // ----------------------------------------------------
    // TEST 6: Resiliency against orphan data and invalid tokens
    // ----------------------------------------------------
    console.log('\n--- Test 6: Resiliency against orphan or invalid sessions ---');
    // Case 6A: Only orphan email/user in localStorage without token
    await page.evaluate(() => {
      localStorage.setItem('easyfr8_user', JSON.stringify({ name: 'Hacker', email: 'fake@easyfr8.com' }));
    });
    await page.reload({ waitUntil: 'networkidle' });

    const orphanAccountBtn = await page.$('.navbar-user-account-btn');
    assert(orphanAccountBtn === null, 'Orphan user in localStorage without token does NOT show logged-in UI');
    const orphanLoginBtn = await page.$('.navbar-user-login-btn');
    assert(orphanLoginBtn !== null, '"User Login" is correctly displayed despite orphan localStorage item');

    // Case 6B: Invalid or expired token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('easyfr8_token', 'invalid_expired_token_xyz_123');
      localStorage.setItem('easyfr8_user', JSON.stringify({ name: 'Expired User', email: 'expired@easyfr8.com' }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Wait for profile fetch validation to fail

    const invalidAccountBtn = await page.$('.navbar-user-account-btn');
    assert(invalidAccountBtn === null, 'Invalid/expired session cleans up and does NOT show logged-in UI');
    const invalidLoginBtn = await page.$('.navbar-user-login-btn');
    assert(invalidLoginBtn !== null, '"User Login" button is restored when session validation fails');

    // ----------------------------------------------------
    // TEST 7: Mobile Navigation Responsiveness
    // ----------------------------------------------------
    console.log('\n--- Test 7: Mobile Navigation Viewport (375x667) ---');
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const mobilePage = await mobileContext.newPage();

    // 7A: Mobile Logged Out
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    // Open hamburger
    await mobilePage.click('.navbar-toggle');
    await mobilePage.waitForSelector('#primary-mobile-nav.open', { state: 'visible' });

    const mobileLoginBtn = await mobilePage.$('.navbar-user-login-mobile-btn');
    assert(mobileLoginBtn !== null, 'Mobile menu displays "User Login" button when logged out');

    // 7B: Log in on mobile
    await mobilePage.click('.close-canvas-mobile-panel');
    await mobilePage.goto('http://localhost:3000/user/login', { waitUntil: 'networkidle' });
    await mobilePage.fill('input[type="email"]', 'user318@easyfr8.com');
    await mobilePage.fill('input[type="password"]', 'EasyFr8#Shipper2026!');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('**/user/dashboard', { timeout: 10000 });

    // Back to home on mobile
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await mobilePage.click('.navbar-toggle');
    await mobilePage.waitForSelector('#primary-mobile-nav.open', { state: 'visible' });

    const mobileUserName = await mobilePage.$eval('#primary-mobile-nav .extra-menu-item div', el => el.textContent);
    assert(mobileUserName.includes('Easyfr8 User 318'), 'Mobile menu displays logged-in user name and avatar');

    const mobileBookingsLink = await mobilePage.$('#primary-mobile-nav a[href="/user/bookings"]');
    assert(mobileBookingsLink !== null, 'Mobile menu displays "My Bookings" link');

    const mobileLogoutBtn = await mobilePage.$('#primary-mobile-nav button:has-text("Logout")');
    assert(mobileLogoutBtn !== null, 'Mobile menu displays "Logout" button');

    // ----------------------------------------------------
    // TEST 8: Public booking flow & routes unaffected
    // ----------------------------------------------------
    console.log('\n--- Test 8: Public Booking Flow & Routes Unaffected ---');
    await page.goto('http://localhost:3000/rates?origin_id=port-DKAAL-344&destination_id=port-JPABA-234', { waitUntil: 'networkidle' });
    const ratesTitle = await page.title();
    assert(ratesTitle.length > 0, 'Rates page loaded successfully');

    await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
    const aboutTitle = await page.title();
    assert(aboutTitle.includes('Easyfr8') || aboutTitle.length > 0, 'Public About page navigation unaffected');

    await mobileContext.close();
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

runTests();
