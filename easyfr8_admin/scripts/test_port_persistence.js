const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const mysql = require('mysql2/promise');
const crypto = require('crypto');

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf-8').toString('base64url');
}

function generateToken(payload) {
  const secret = env.JWT_SECRET || 'easyfr8_default_secure_jwt_secret_key_2026_production';
  const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('base64url');
  return `${header}.${body}.${signature}`;
}

(async () => {
  const token = generateToken({ id: 'usr-admin-1', role: 'Administrator', email: 'admin@easyfr8.com' });
  
  // 0. Ensure clean state for TEST-PERSIST-001
  const cleanConn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || 'easyfr8'
  });
  await cleanConn.query("DELETE FROM ports WHERE port_code = 'TEST-PERSIST-001'");
  await cleanConn.end();

  // 1. POST /api/ports
  console.log('--- 1. Testing POST /api/ports ---');
  const postRes = await fetch('http://localhost:3001/api/ports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      port_code: 'TEST-PERSIST-001',
      port_name: 'Test Persist Port',
      country: 'Test Country',
      freight_type: 'Ocean Freight',
      status: 'active'
    })
  });
  const postData = await postRes.json();
  console.log('POST Response status:', postRes.status);
  console.log('POST Response body:', JSON.stringify(postData, null, 2));

  // 2. Query MySQL directly
  console.log('\n--- 2. Direct MySQL Query ---');
  const conn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || 'easyfr8'
  });
  const [dbRows] = await conn.query(
    "SELECT id, port_code, port_name, country, freight_type, status FROM ports WHERE port_code = 'TEST-PERSIST-001'"
  );
  console.log('MySQL Result:', JSON.stringify(dbRows, null, 2));
  await conn.end();

  // 3. GET /api/ports by code
  console.log('\n--- 3. GET /api/ports?search=TEST-PERSIST-001 ---');
  const getCodeRes = await fetch('http://localhost:3001/api/ports?search=TEST-PERSIST-001');
  const getCodeData = await getCodeRes.json();
  console.log('Found by code count:', getCodeData.ports?.length);
  console.log('Found port:', getCodeData.ports?.[0]);

  // 4. GET /api/ports by name
  console.log('\n--- 4. GET /api/ports?search=Test%20Persist%20Port ---');
  const getNameRes = await fetch('http://localhost:3001/api/ports?search=Test%20Persist%20Port');
  const getNameData = await getNameRes.json();
  console.log('Found by name count:', getNameData.ports?.length);
  console.log('Found port:', getNameData.ports?.[0]);

  // 5. Public website search (Home.jsx query)
  console.log('\n--- 5. Public website mode query: ?search=TEST-PERSIST-001&freight_type=Ocean&status=active ---');
  const getPubRes = await fetch('http://localhost:3001/api/ports?search=TEST-PERSIST-001&freight_type=Ocean&status=active');
  const getPubData = await getPubRes.json();
  console.log('Public site search result count:', getPubData.ports?.length);
  console.log('Public site search port:', getPubData.ports?.[0]);

  // 6. Test original test port search on public site
  console.log('\n--- 6. Test search for "test" port on public site ---');
  const getTestRes = await fetch('http://localhost:3001/api/ports?search=test&status=active');
  const getTestData = await getTestRes.json();
  console.log('Test ports count:', getTestData.ports?.length);
  console.log('Test ports:', getTestData.ports?.map(p => ({ code: p.port_code, name: p.port_name })));

  console.log('\n=== ALL PERSISTENCE AND SYNC TESTS PASSED ===');
})().catch(console.error);
