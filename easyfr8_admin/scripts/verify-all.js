const http = require('http');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'easyfr8_default_secure_jwt_secret_key_2026_production';

// Helper to make HTTP requests
function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Generate tokens for testing using the server's exact HMAC-SHA256
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64url');
}

function sign(headerB64, payloadB64, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
}

function createToken(payload, secret = JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const hB64 = base64UrlEncode(JSON.stringify(header));
  const pB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(hB64, pB64, secret);
  return `${hB64}.${pB64}.${sig}`;
}

async function runTests() {
  console.log('====================================================');
  console.log('EASYFR8 MASTER VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  const results = [];
  function record(name, pass, details) {
    results.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
  }

  const now = Math.floor(Date.now() / 1000);

  const adminToken = createToken({
    id: 'USR-081',
    email: 'biswa@easyfr8.com',
    role: 'Administrator',
    name: 'Administrator',
    iat: now,
    exp: now + 3600
  });

  const managerToken = createToken({
    id: 'USR-082',
    email: 'anish@easyfr8.com',
    role: 'Manager',
    name: 'Ops Manager',
    iat: now,
    exp: now + 3600
  });

  const expiredToken = createToken({
    id: 'USR-081',
    email: 'biswa@easyfr8.com',
    role: 'Administrator',
    iat: now - 7200,
    exp: now - 3600
  });

  const tamperedToken = adminToken.substring(0, adminToken.lastIndexOf('.') + 1) + 'tampered_signature';

  // ── TEST 1: JWT & AUTHENTICATION BYPASS TESTING ────────────────────────────
  console.log('\n--- 1. Authentication Security Tests ---');

  // Valid Token
  const resValid = await request('GET', '/api/users', { Authorization: `Bearer ${adminToken}` });
  record('Valid JWT Token accepted', resValid.status === 200, `Status ${resValid.status}`);

  // Expired Token
  const resExp = await request('GET', '/api/users', { Authorization: `Bearer ${expiredToken}` });
  record('Expired JWT Token rejected (401)', resExp.status === 401, `Status ${resExp.status}`);

  // Malformed Token
  const resMal = await request('GET', '/api/users', { Authorization: 'Bearer this.is.malformed' });
  record('Malformed JWT Token rejected (401)', resMal.status === 401, `Status ${resMal.status}`);

  // Tampered Signature
  const resTamp = await request('GET', '/api/users', { Authorization: `Bearer ${tamperedToken}` });
  record('Tampered Token signature rejected (401)', resTamp.status === 401, `Status ${resTamp.status}`);

  // mock_ Backdoor Token
  const resMock = await request('GET', '/api/users', { Authorization: 'Bearer mock_admin_token' });
  record('mock_ token backdoor rejected (401)', resMock.status === 401, `Status ${resMock.status}`);

  // ── TEST 2: AUTHORIZATION & PERMISSION BOUNDARIES ──────────────────────────
  console.log('\n--- 2. Authorization & Role Tests ---');

  // Anonymous user mutations
  const resAnonUserMut = await request('POST', '/api/users', {}, { name: 'Hacker', email: 'h@evil.com' });
  record('Anonymous POST /api/users rejected (401)', resAnonUserMut.status === 401, `Status ${resAnonUserMut.status}`);

  const resAnonSettings = await request('PUT', '/api/settings/general', {}, { companyName: 'Hacked' });
  record('Anonymous PUT /api/settings/[section] rejected (401)', resAnonSettings.status === 401, `Status ${resAnonSettings.status}`);

  const resAnonAuditClear = await request('POST', '/api/audit-logs/clear', {});
  record('Anonymous POST /api/audit-logs/clear rejected (401)', resAnonAuditClear.status === 401, `Status ${resAnonAuditClear.status}`);

  const resAnonRateMut = await request('POST', '/api/freight-rates', {}, { carrier: 'Evil' });
  record('Anonymous POST /api/freight-rates rejected (401)', resAnonRateMut.status === 401, `Status ${resAnonRateMut.status}`);

  const resAnonBlogDel = await request('DELETE', '/api/blogs/some-blog-id', {});
  record('Anonymous DELETE /api/blogs/[id] rejected (401)', resAnonBlogDel.status === 401, `Status ${resAnonBlogDel.status}`);

  const resAnonPortMut = await request('POST', '/api/ports', {}, { port_code: 'TEST' });
  record('Anonymous POST /api/ports rejected (401)', resAnonPortMut.status === 401, `Status ${resAnonPortMut.status}`);

  // Manager Restrictions (Manager CANNOT clear audit logs or update settings)
  const resMgrAuditClear = await request('POST', '/api/audit-logs/clear', { Authorization: `Bearer ${managerToken}` });
  record('Manager restricted from audit clear (403)', resMgrAuditClear.status === 403, `Status ${resMgrAuditClear.status}`);

  const resMgrSettings = await request('PUT', '/api/settings/general', { Authorization: `Bearer ${managerToken}` }, { companyName: 'New Name' });
  record('Manager restricted from settings update (403)', resMgrSettings.status === 403, `Status ${resMgrSettings.status}`);

  // Administrator can access audit logs
  const resAdminAudit = await request('GET', '/api/audit-logs', { Authorization: `Bearer ${adminToken}` });
  record('Administrator allowed access to audit logs', resAdminAudit.status === 200, `Status ${resAdminAudit.status}`);

  // ── TEST 3: PASSWORD EXPOSURE TESTING ─────────────────────────────────────
  console.log('\n--- 3. Password Exposure Tests ---');

  const resUsers = await request('GET', '/api/users', { Authorization: `Bearer ${adminToken}` });
  const usersList = Array.isArray(resUsers.data) ? resUsers.data : [];
  const anyPasswordInList = usersList.some(u => u.password !== undefined || u.password_hash !== undefined);
  record('GET /api/users never exposes password', !anyPasswordInList && usersList.length > 0, `Users inspected: ${usersList.length}, passwords found: ${anyPasswordInList ? 'YES' : 'NONE'}`);

  if (usersList.length > 0) {
    const firstUserId = usersList[0].id;
    const resSingleUser = await request('GET', `/api/users/${firstUserId}`, { Authorization: `Bearer ${adminToken}` });
    const u = resSingleUser.data?.user || resSingleUser.data;
    const hasPwd = u?.password !== undefined || u?.password_hash !== undefined;
    record(`GET /api/users/${firstUserId} strict DTO (no password)`, !hasPwd, `User fields: ${Object.keys(u || {}).join(', ')}`);
  }

  // ── TEST 4: SETTINGS SECURITY TESTING ─────────────────────────────────────
  console.log('\n--- 4. Settings Security Tests ---');

  // Public settings
  const resPubSettings = await request('GET', '/api/settings');
  const pubData = resPubSettings.data?.settings || resPubSettings.data;
  const pubExposesSmtpPass = pubData?.smtp?.password !== undefined;
  const pubExposesSmsPass = pubData?.sms?.apiKey !== undefined;
  record('Public GET /api/settings omits secrets', !pubExposesSmtpPass && !pubExposesSmsPass, `SMTP password present: ${pubExposesSmtpPass}, SMS secret present: ${pubExposesSmsPass}`);

  // Admin settings (password masked as ******** when present)
  // First, set a test SMTP password as admin
  await request('PUT', '/api/settings/smtp', { Authorization: `Bearer ${adminToken}` }, {
    host: 'smtp.sendgrid.net',
    port: 587,
    user: 'apikey',
    password: 'super_secret_smtp_password_123',
    secure: true
  });
  const resAdminSettings = await request('GET', '/api/settings', { Authorization: `Bearer ${adminToken}` });
  const adminData = resAdminSettings.data?.settings || resAdminSettings.data;
  const adminSmtpPass = adminData?.smtp?.password;
  record('Admin GET /api/settings masks sensitive password', adminSmtpPass === '********', `Masked value: "${adminSmtpPass}"`);

  // ── TEST 5: PORTS API PAGINATION & SEARCH ─────────────────────────────────
  console.log('\n--- 5. Ports API Pagination & Search Tests ---');

  const resPortsPage1 = await request('GET', '/api/ports?page=1&limit=20');
  const p1Data = resPortsPage1.data;
  record('GET /api/ports pagination envelope', p1Data.success && p1Data.pagination?.page === 1 && p1Data.pagination?.limit === 20, `Total: ${p1Data.pagination?.total}, TotalPages: ${p1Data.pagination?.totalPages}, Count: ${p1Data.ports?.length}`);

  const resPortsMaxLimit = await request('GET', '/api/ports?limit=500');
  record('GET /api/ports enforces max limit of 100', resPortsMaxLimit.data?.pagination?.limit === 100, `Requested limit=500, received limit=${resPortsMaxLimit.data?.pagination?.limit}`);

  const resPortsSearch = await request('GET', '/api/ports?search=Shanghai&limit=20');
  const shanghaiMatches = (resPortsSearch.data?.ports || []).every(p => 
    p.port_name.toLowerCase().includes('shanghai') || 
    p.port_code.toLowerCase().includes('shanghai') ||
    p.country.toLowerCase().includes('shanghai')
  );
  record('GET /api/ports server-side search works', shanghaiMatches && resPortsSearch.data?.ports?.length > 0, `Matches found: ${resPortsSearch.data?.ports?.length}`);

  // ── TEST 6: BOOKING RATE DATA NORMALIZATION & TAMPERING PREVENTION ────────
  console.log('\n--- 6. Booking Rate Integrity Tests ---');

  // Submit a booking referencing valid rate frate-390 with valid foreign keys
  const bookingPayload = {
    user_name: 'Security Test Client',
    email: 'sec-test@easyfr8.com',
    phone: '+1 555 0100',
    freight_type_id: 'ocean-freight',
    shipment_type_id: 'shiptype-fcl',
    term_id: 'term-fob',
    loading_port_id: 'port-AEAUH-517',
    discharge_port_id: 'port-AEDAS-142',
    freight_rate_id: 'frate-390',
    // Tamper attempt: client sends price $1.00, server MUST derive $3800.00 from freight_rates DB record
    price: 1.00,
    cargo_details: 'Test Cargo Normalization Verification'
  };

  const resNewBooking = await request('POST', '/api/bookings', {}, bookingPayload);
  record('POST /api/bookings created booking', resNewBooking.status === 200 && resNewBooking.data?.success, `Booking No: ${resNewBooking.data?.booking_no}`);

  // Verify in GET /api/bookings with admin token
  const resAllBookings = await request('GET', '/api/bookings', { Authorization: `Bearer ${adminToken}` });
  const allBookingsList = Array.isArray(resAllBookings.data) ? resAllBookings.data : [];
  const createdBooking = allBookingsList.find(b => b.booking_no === resNewBooking.data?.booking_no);

  const priceDerivedAuthoritatively = createdBooking && Number(createdBooking.price) === 3800;
  record('Booking price derived authoritatively from DB (tamper-proof)', priceDerivedAuthoritatively, `Stored Price: $${createdBooking?.price}, Carrier: ${createdBooking?.carrier}, Rate ID: ${createdBooking?.freight_rate_id}, Transit: ${createdBooking?.transit_time}d`);

  // Verify cargo details was preserved
  record('Booking cargo_details preserved intact', createdBooking?.cargo_details?.includes('Test Cargo Normalization Verification'), `Cargo Details: "${createdBooking?.cargo_details}"`);

  // ── TEST 7: BLOG ROUTING & SLUG STABILITY ─────────────────────────────────
  console.log('\n--- 7. Blog Routing & Slug Stability Tests ---');

  const resBlogList = await request('GET', '/api/blogs');
  const blogsList = Array.isArray(resBlogList.data) ? resBlogList.data : (resBlogList.data?.blogs || []);
  record('GET /api/blogs public listing', resBlogList.status === 200 && blogsList.length > 0, `Published blogs count: ${blogsList.length}`);

  if (blogsList.length > 0) {
    const sampleBlog = blogsList[0];
    
    // Resolve by ID
    const resById = await request('GET', `/api/blogs/${sampleBlog.id}`);
    record(`GET /api/blogs/${sampleBlog.id} resolves by ID`, resById.status === 200 && resById.data?.success, `Title: ${resById.data?.blog?.title}`);

    // Resolve by Slug
    if (sampleBlog.slug) {
      const resBySlug = await request('GET', `/api/blogs/${sampleBlog.slug}`);
      record(`GET /api/blogs/${sampleBlog.slug} resolves by slug`, resBySlug.status === 200 && resBySlug.data?.success, `Resolved title: ${resBySlug.data?.blog?.title}`);
    }

    // Image endpoint streaming check
    const resImage = await request('GET', `/api/blogs/${sampleBlog.id}/image`);
    record(`GET /api/blogs/${sampleBlog.id}/image streams image buffer`, resImage.status === 200 && resImage.headers['content-type']?.includes('image'), `Content-Type: ${resImage.headers['content-type']}`);
  }

  // ── TEST 8: LEGACY COMPATIBILITY ENDPOINTS ────────────────────────────────
  console.log('\n--- 8. Legacy Compatibility Tests ---');

  const resLegacyRates = await request('GET', '/api/rates');
  record('Legacy GET /api/rates returns data with deprecation header', resLegacyRates.status === 200 && resLegacyRates.headers['x-api-deprecated'] !== undefined, `Header: ${resLegacyRates.headers['x-api-deprecated']}`);

  const resLegacyLocs = await request('GET', '/api/locations');
  record('Legacy GET /api/locations returns data with deprecation header', resLegacyLocs.status === 200 && resLegacyLocs.headers['x-api-deprecated'] !== undefined, `Header: ${resLegacyLocs.headers['x-api-deprecated']}`);

  const resLegacyModes = await request('GET', '/api/freight/modes');
  record('Legacy GET /api/freight/modes returns data with deprecation header', resLegacyModes.status === 200 && resLegacyModes.headers['x-api-deprecated'] !== undefined, `Header: ${resLegacyModes.headers['x-api-deprecated']}`);

  // Summary
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED:      ${results.filter(r => r.pass).length}`);
  console.log(`FAILED:      ${results.filter(r => !r.pass).length}`);
  console.log('====================================================');

  if (results.some(r => !r.pass)) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
