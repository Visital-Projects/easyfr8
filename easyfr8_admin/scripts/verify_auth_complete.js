const { chromium } = require('playwright');
const http = require('http');

async function directApiRequest(path, method, body, token) {
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
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('--- STARTING COMPREHENSIVE AUTH VERIFICATION ---');

  // Test 1: Direct API - Invalid credentials
  console.log('\n[TEST 1] POST /api/auth/login with invalid credentials');
  const invRes = await directApiRequest('/api/auth/login', 'POST', {
    email: 'biswa@easyfr8.com',
    password: 'wrongpassword'
  });
  console.log('Status:', invRes.status);
  console.log('Response:', invRes.data);
  if (invRes.status === 401) {
    console.log('=> TEST 1 PASSED: Returns 401 Unauthorized (not 404)');
  } else {
    console.error('=> TEST 1 FAILED: Expected 401, got', invRes.status);
  }

  // Test 2: Direct API - Valid credentials
  console.log('\n[TEST 2] POST /api/auth/login with valid credentials');
  const validRes = await directApiRequest('/api/auth/login', 'POST', {
    email: 'biswa@easyfr8.com',
    password: 'admin123'
  });
  console.log('Status:', validRes.status);
  console.log('Success:', validRes.data?.success);
  console.log('User Role:', validRes.data?.user?.role);
  console.log('Token exists:', !!validRes.data?.token);
  const token = validRes.data?.token;
  if (validRes.status === 200 && token) {
    console.log('=> TEST 2 PASSED: Returns 200 with JWT token');
  } else {
    console.error('=> TEST 2 FAILED');
  }

  // Test 3: Direct API - Session verification (Profile) with valid token
  console.log('\n[TEST 3] GET /api/auth/profile with Bearer token');
  const profRes = await directApiRequest('/api/auth/profile', 'GET', null, token);
  console.log('Status:', profRes.status);
  console.log('Profile data:', profRes.data);
  if (profRes.status === 200 && profRes.data?.email === 'biswa@easyfr8.com') {
    console.log('=> TEST 3 PASSED: Profile verification succeeded');
  } else {
    console.error('=> TEST 3 FAILED');
  }

  // Test 4: Direct API - Session verification without token
  console.log('\n[TEST 4] GET /api/auth/profile without token');
  const unauthProfRes = await directApiRequest('/api/auth/profile', 'GET');
  console.log('Status:', unauthProfRes.status);
  console.log('Response:', unauthProfRes.data);
  if (unauthProfRes.status === 401) {
    console.log('=> TEST 4 PASSED: Returns 401 Unauthorized (not 404)');
  } else {
    console.error('=> TEST 4 FAILED');
  }

  // Test 5: Direct API - Logout
  console.log('\n[TEST 5] POST /api/auth/logout');
  const logoutRes = await directApiRequest('/api/auth/logout', 'POST');
  console.log('Status:', logoutRes.status);
  console.log('Response:', logoutRes.data);
  if (logoutRes.status === 200) {
    console.log('=> TEST 5 PASSED: Logout succeeded');
  } else {
    console.error('=> TEST 5 FAILED');
  }

  // Test 6: Browser UI End-to-End Flow
  console.log('\n[TEST 6] Browser UI End-to-End Test via Playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const apiResponses = [];
  page.on('response', res => {
    if (res.url().includes('/api/auth/')) {
      apiResponses.push({ url: res.url(), status: res.status() });
      console.log(`[BROWSER NETWORK] ${res.request().method()} ${res.url()} -> ${res.status()}`);
    }
  });

  // A. Test Invalid login in UI
  console.log('A. Submitting invalid credentials in UI...');
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#email', 'biswa@easyfr8.com');
  await page.fill('#password', 'wrongpassword');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Check error toast / alert
  const toastText = await page.evaluate(() => {
    const toast = document.querySelector('.toast, [class*="toast"], .alert');
    return toast ? toast.textContent : '';
  });
  console.log('UI feedback for invalid login:', toastText || '(no toast text found)');

  // B. Test Valid login in UI
  console.log('B. Submitting valid credentials in UI...');
  await page.fill('#email', 'biswa@easyfr8.com');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to /dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Redirected to:', page.url());

  const storedToken = await page.evaluate(() => localStorage.getItem('easyfr8_token'));
  console.log('Stored token present:', !!storedToken);

  // C. Test Page reload with active session
  console.log('C. Reloading /dashboard to test profile verification...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  console.log('URL after reload:', page.url());

  // D. Test UI Logout
  console.log('D. Performing logout in UI...');
  await page.evaluate(() => {
    // Open user dropdown if needed
    const avatar = document.querySelector('.user-profile-trigger, .user-avatar, [class*="profile"]');
    if (avatar && avatar.click) avatar.click();
    const logoutBtn = document.querySelector('.logout-btn-trigger, button.logout-btn');
    if (logoutBtn && logoutBtn.click) logoutBtn.click();
  });
  await page.waitForTimeout(2000);

  // Direct logout via client context if dropdown wasn't open
  const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('easyfr8_token'));
  console.log('Token after logout:', tokenAfterLogout ? 'STILL_EXISTS' : 'CLEARED');

  await browser.close();
  console.log('\n--- ALL VERIFICATIONS COMPLETE ---');
})();
