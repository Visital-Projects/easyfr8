const http = require('http');
const crypto = require('crypto');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'easyfr8_default_secure_jwt_secret_key_2026_production';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

function sign(headerB64, payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest('base64url');
}

function createAdminToken() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: 'admin-1',
    email: 'admin@easyfr8.com',
    role: 'Administrator',
    name: 'Admin Test',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(headerB64, payloadB64, JWT_SECRET);
  return `${headerB64}.${payloadB64}.${signature}`;
}

function request(method, reqPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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

async function runTests() {
  console.log('=== TEST: Transhipment Persistence & API Verification ===\n');

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'easyfr8',
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    // 1. Check initial row count in freight_rates
    const [initialRows] = await pool.query('SELECT COUNT(*) as cnt FROM freight_rates');
    const initialCount = initialRows[0].cnt;
    console.log(`[DB] Initial freight_rates count: ${initialCount} records`);

    // Fetch master records for test route
    const [ports] = await pool.query('SELECT id, port_code, port_name FROM ports WHERE freight_type LIKE "%Ocean%" LIMIT 5');
    if (ports.length < 3) {
      throw new Error('Need at least 3 ocean ports in DB for test route');
    }
    const originPort = ports[0];
    const destPort = ports[1];
    const transhipmentPort1 = ports[2];
    const transhipmentPort2 = ports[3] || ports[2];

    console.log(`[Test Ports] Origin: ${originPort.port_code} (${originPort.id})`);
    console.log(`[Test Ports] Destination: ${destPort.port_code} (${destPort.id})`);
    console.log(`[Test Ports] Transhipment 1: ${transhipmentPort1.port_code} (${transhipmentPort1.id})`);
    console.log(`[Test Ports] Transhipment 2: ${transhipmentPort2.port_code} (${transhipmentPort2.id})`);

    const [modes] = await pool.query('SELECT id, name FROM freight_types LIMIT 1');
    const [types] = await pool.query('SELECT id, name FROM shipment_types WHERE freight_type_id = ? LIMIT 1', [modes[0].id]);
    const [containers] = await pool.query('SELECT id, name FROM containers LIMIT 1');

    const adminToken = createAdminToken();
    const authHeaders = { Authorization: `Bearer ${adminToken}` };
    const testRateId = `frate-test-${Date.now()}`;

    // STEP 1: CREATE rate WITH Transhipment
    console.log('\n--- Step 1: POST /api/freight-rates with Transhipment ---');
    const createRes = await request('POST', '/api/freight-rates', authHeaders, {
      id: testRateId,
      freight_mode_id: modes[0].id,
      shipment_type_id: types[0].id,
      origin_id: originPort.id,
      destination_id: destPort.id,
      transhipment_id: transhipmentPort1.id,
      container_id: containers[0].id,
      price: 1550,
      currency: 'USD',
      transit_time: 18,
      carrier: 'CMA CGM',
      status: 'active',
    });

    console.log(`POST response status: ${createRes.status}`);
    console.log('POST response rate:', createRes.data?.rate);
    if (createRes.status !== 201 || !createRes.data?.success) {
      throw new Error(`Failed to create freight rate: ${JSON.stringify(createRes.data)}`);
    }

    // Direct DB check
    const [dbRows1] = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [testRateId]);
    console.log(`[DB Check 1] Stored record transhipment_id: '${dbRows1[0]?.transhipment_id}'`);
    if (dbRows1[0]?.transhipment_id !== transhipmentPort1.id) {
      throw new Error(`Expected transhipment_id ${transhipmentPort1.id}, got ${dbRows1[0]?.transhipment_id}`);
    }
    console.log('✓ Step 1 Passed: Transhipment successfully persisted in database on create.');

    // STEP 2: GET rate and verify Transhipment details
    console.log('\n--- Step 2: GET /api/freight-rates/[id] ---');
    const getRes = await request('GET', `/api/freight-rates/${testRateId}`);
    console.log(`GET response status: ${getRes.status}`);
    console.log(`GET response transhipment: id=${getRes.data?.rate?.transhipment_id}, code=${getRes.data?.rate?.transhipment_code}, name=${getRes.data?.rate?.transhipment_name}`);
    if (getRes.data?.rate?.transhipment_id !== transhipmentPort1.id) {
      throw new Error('GET did not return expected transhipment_id');
    }
    if (getRes.data?.rate?.transhipment_code !== transhipmentPort1.port_code) {
      throw new Error('GET did not return expected transhipment_code join');
    }
    console.log('✓ Step 2 Passed: Transhipment port details successfully joined and retrieved.');

    // STEP 3: UPDATE (Uncheck Transhipment -> set transhipment_id to null)
    console.log('\n--- Step 3: PUT /api/freight-rates/[id] with transhipment_id: null (Uncheck) ---');
    const uncheckRes = await request('PUT', `/api/freight-rates/${testRateId}`, authHeaders, {
      transhipment_id: null,
      price: 1600,
    });
    console.log(`PUT uncheck response status: ${uncheckRes.status}`);
    if (uncheckRes.status !== 200 || !uncheckRes.data?.success) {
      throw new Error(`Failed to uncheck transhipment: ${JSON.stringify(uncheckRes.data)}`);
    }

    // Direct DB check
    const [dbRows2] = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [testRateId]);
    console.log(`[DB Check 2] Stored record transhipment_id after uncheck: ${dbRows2[0]?.transhipment_id}`);
    if (dbRows2[0]?.transhipment_id !== null) {
      throw new Error(`Expected transhipment_id null, got ${dbRows2[0]?.transhipment_id}`);
    }
    console.log('✓ Step 3 Passed: Unchecking transhipment correctly persists NULL in database.');

    // STEP 4: UPDATE (Re-check Transhipment with a different port)
    console.log('\n--- Step 4: PUT /api/freight-rates/[id] with new transhipment_id ---');
    const updateRes = await request('PUT', `/api/freight-rates/${testRateId}`, authHeaders, {
      transhipment_id: transhipmentPort2.id,
      price: 1650,
    });
    console.log(`PUT recheck response status: ${updateRes.status}`);
    if (updateRes.status !== 200 || !updateRes.data?.success) {
      throw new Error(`Failed to update transhipment: ${JSON.stringify(updateRes.data)}`);
    }

    // Direct DB check
    const [dbRows3] = await pool.query('SELECT * FROM freight_rates WHERE id = ?', [testRateId]);
    console.log(`[DB Check 3] Stored record transhipment_id after update: ${dbRows3[0]?.transhipment_id}`);
    if (dbRows3[0]?.transhipment_id !== transhipmentPort2.id) {
      throw new Error(`Expected transhipment_id ${transhipmentPort2.id}, got ${dbRows3[0]?.transhipment_id}`);
    }
    console.log('✓ Step 4 Passed: Updating transhipment to another port persists correctly.');

    // STEP 5: CLEANUP - Delete the test freight rate
    console.log('\n--- Step 5: Clean up test record ---');
    const delRes = await request('DELETE', `/api/freight-rates/${testRateId}`, authHeaders);
    console.log(`DELETE response status: ${delRes.status}`);
    const [finalRows] = await pool.query('SELECT COUNT(*) as cnt FROM freight_rates');
    console.log(`[DB] Final freight_rates count: ${finalRows[0].cnt} records (original was ${initialCount})`);
    if (finalRows[0].cnt !== initialCount) {
      throw new Error(`Record count mismatch! Expected ${initialCount}, found ${finalRows[0].cnt}`);
    }
    console.log('✓ Step 5 Passed: Test record cleaned up; database is in exact original state.');

    console.log('\n========================================');
    console.log('ALL TRANSHIPMENT PERSISTENCE TESTS PASSED');
    console.log('========================================\n');
  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
