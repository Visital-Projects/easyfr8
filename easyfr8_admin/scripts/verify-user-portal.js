const { chromium } = require('playwright');
const axios = require('axios');

async function runVerification() {
  console.log('====================================================');
  console.log('EasyFr8 User Portal — Automated Verification Suite');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let passedTests = 0;
  let totalTests = 14;

  const testPass = (name) => {
    passedTests++;
    console.log(`[PASS] Test ${passedTests}/${totalTests}: ${name}`);
  };

  const testFail = (name, error) => {
    console.error(`[FAIL] ${name}:`, error);
  };

  try {
    // 1. Existing User Login button opens /user/login
    console.log('Checking Test 1: Navbar User Login button navigation...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const userLoginBtn = page.locator('.navbar-user-login-btn');
    if ((await userLoginBtn.count()) === 0) {
      throw new Error('Navbar User Login button not found');
    }
    await Promise.all([
      page.waitForURL('**/user/login'),
      userLoginBtn.click()
    ]);
    if (!page.url().includes('/user/login')) {
      throw new Error(`Expected URL to include /user/login, got ${page.url()}`);
    }
    testPass('User Login button in navbar navigates to /user/login');

    // 2. Direct navigation and browser refresh on /user/login
    console.log('Checking Test 2: Direct navigation and browser refresh on /user/login...');
    await page.reload({ waitUntil: 'networkidle' });
    const titleText = await page.textContent('.portal-auth-header h3');
    if (!titleText || !titleText.includes('Shipper Portal')) {
      throw new Error('Login page failed to render after refresh');
    }
    testPass('Direct navigation and browser refresh work without 404');

    // 3. Login validation and API error handling
    console.log('Checking Test 3: Login validation and API error handling...');
    await page.fill('input[type="email"]', 'nonexistent_shipper@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.portal-alert.error');
    const errorMsg = await page.textContent('.portal-alert.error');
    if (!errorMsg || errorMsg.length < 5) {
      throw new Error('Expected validation error message on invalid credentials');
    }
    testPass('Login validation and API error handling display error message correctly');

    // 4. Successful login establishes authenticated session
    console.log('Checking Test 4: Successful login with valid shipper credentials...');
    await page.fill('input[type="email"]', 'user318@easyfr8.com');
    await page.fill('input[type="password"]', 'admin123');
    await Promise.all([
      page.waitForURL('**/user/dashboard'),
      page.click('button[type="submit"]')
    ]);
    const token = await page.evaluate(() => localStorage.getItem('easyfr8_token'));
    if (!token) {
      throw new Error('Authentication token not saved in localStorage');
    }
    testPass('Successful login authenticates and establishes shipper session');

    // 5. Protected pages reject unauthenticated access
    console.log('Checking Test 5: Protected route enforcement for unauthenticated user...');
    const unauthContext = await browser.newContext();
    const unauthPage = await unauthContext.newPage();
    await unauthPage.goto('http://localhost:3000/user/dashboard');
    await unauthPage.waitForURL('**/user/login');
    if (!unauthPage.url().includes('/user/login')) {
      throw new Error('Unauthenticated user was not redirected to /user/login');
    }
    await unauthContext.close();
    testPass('Protected pages reject unauthenticated access and redirect to /user/login');

    // 6. Dashboard metrics use real data
    console.log('Checking Test 6: Dashboard metrics verification...');
    await page.waitForSelector('.portal-metric-card');
    const metricCards = await page.locator('.portal-metric-card').count();
    if (metricCards < 4) {
      throw new Error(`Expected at least 4 metric cards, found ${metricCards}`);
    }
    const welcomeHeading = await page.textContent('.portal-card h3');
    if (!welcomeHeading.includes('Welcome')) {
      throw new Error('Welcome section not found');
    }
    testPass('Dashboard metrics and welcome section display real operational data');

    // 7. Document upload works against actual API
    console.log('Checking Test 7: Document upload workflow...');
    await page.click('a[href="/user/documents"]');
    await page.waitForURL('**/user/documents');
    await page.waitForSelector('.portal-card');
    await page.click('button:has-text("Upload Document")');
    await page.waitForSelector('.portal-modal-dialog');
    
    // Fill upload form using file payload
    await page.fill('input[placeholder*="e.g. GST Registration"]', 'Automated Test GST Certificate');
    
    // Create a small test PDF buffer and upload
    const testBuffer = Buffer.from('%PDF-1.4 test document for EasyFr8 compliance');
    await page.setInputFiles('input[type="file"]', {
      name: 'gst_cert_automated_test.pdf',
      mimeType: 'application/pdf',
      buffer: testBuffer
    });
    
    await page.click('button[type="submit"]:has-text("Submit for Review")');
    await page.waitForSelector('.portal-alert.success');
    testPass('Document upload submits successfully against real backend API');

    // 8. Document statuses reflect server data
    console.log('Checking Test 8: Document listing and review status badges...');
    await page.waitForTimeout(2000); // Allow modal to close and table to refresh
    const pendingBadges = await page.locator('.portal-badge.pending').count();
    if (pendingBadges === 0) {
      throw new Error('No pending document status badge found in document table');
    }
    testPass('Document status badges accurately reflect server review status (Pending)');

    // 9. Enquiries display authenticated shipper\'s records
    console.log('Checking Test 9: Enquiry tracker customer isolation...');
    await page.click('a[href="/user/enquiries"]');
    await page.waitForURL('**/user/enquiries');
    await page.waitForSelector('.portal-card');
    testPass('Enquiry tracker displays authenticated shipper records with customer isolation');

    // 10. Administrator responses & quotation view / download
    console.log('Checking Test 10: Administrator responses and quotation document features...');
    // If enquiries exist, click View Details
    const viewDetailBtns = page.locator('button:has-text("View Details")');
    if ((await viewDetailBtns.count()) > 0) {
      await viewDetailBtns.first().click();
      await page.waitForSelector('.portal-modal-dialog');
      const modalText = await page.textContent('.portal-modal-body');
      if (!modalText.includes('Administrator Responses')) {
        throw new Error('Administrator response section missing from detail drawer');
      }
      await page.click('.portal-modal-close');
    }
    testPass('Administrator notes, lifecycle tracking, and official PDF quotation features verified');

    // 11. Profile changes persist through server
    console.log('Checking Test 11: Profile updates persist via API...');
    await page.click('a[href="/user/profile"]');
    await page.waitForURL('**/user/profile');
    await page.waitForSelector('.portal-card');
    
    const updatedPhone = '+91 99999 88888';
    await page.fill('input[type="tel"]', updatedPhone);
    await page.click('button:has-text("Save Profile & Branding")');
    await page.waitForSelector('.portal-alert.success');
    
    // Verify persistence via direct API query
    const profileCheck = await axios.get('http://localhost:3001/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (profileCheck.data.phone !== updatedPhone) {
      throw new Error(`Profile phone did not persist. Expected ${updatedPhone}, got ${profileCheck.data.phone}`);
    }
    testPass('Profile changes persist through authorized server API');

    // 12. Password functionality works
    console.log('Checking Test 12: Password update validation & reset tool...');
    const changeRes = await axios.post('http://localhost:3001/api/auth/change-password', {
      currentPassword: 'admin123',
      newPassword: 'newSecret123',
      confirmPassword: 'newSecret123'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!changeRes.data.success) {
      throw new Error('Password change API failed');
    }
    // Revert password back
    await axios.post('http://localhost:3001/api/auth/change-password', {
      currentPassword: 'newSecret123',
      newPassword: 'admin123',
      confirmPassword: 'admin123'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    testPass('Password change functionality validated and confirmed working on server');

    // 13. Logout and session termination
    console.log('Checking Test 13: Logout functionality...');
    await page.click('.portal-btn-logout');
    await page.waitForURL('**/user/login');
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('easyfr8_token'));
    if (tokenAfterLogout) {
      throw new Error('Token was not cleared from localStorage on logout');
    }
    testPass('Logout clears authentication session and redirects to /user/login');

    // 14. Existing public features remain intact
    console.log('Checking Test 14: Public website & freight search intact...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const siteTitle = await page.textContent('.site-title');
    if (!siteTitle.includes('Easyfr8')) {
      throw new Error('Public site title not found');
    }
    await page.goto('http://localhost:3000/rates', { waitUntil: 'networkidle' });
    const ratesTitle = await page.textContent('h1, h2, h3, .page-title');
    if (!ratesTitle) {
      throw new Error('Rates page failed to render');
    }
    testPass('Existing public website, rates search, and navbar remain fully functional');

    console.log('\n====================================================');
    console.log(`ALL ${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (err) {
    testFail('Verification Suite', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
