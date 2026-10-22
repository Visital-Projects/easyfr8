const http = require('http');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Ports API (/api/ports) ---');
  const portsRes = await request('http://localhost:3001/api/ports?search=Singapore&limit=5');
  console.log('Ports Status:', portsRes.status, 'Count:', portsRes.data?.ports?.length || 0);
  if (portsRes.data?.ports?.length > 0) {
    console.log('Sample Port:', portsRes.data.ports[0].port_name, `(${portsRes.data.ports[0].port_code})`);
  }

  console.log('\n--- 2. Testing Active Containers API (/api/containers?status=active) ---');
  const contRes = await request('http://localhost:3001/api/containers?status=active');
  console.log('Containers Status:', contRes.status, 'Is Array:', Array.isArray(contRes.data), 'Length:', contRes.data?.length);

  console.log('\n--- 3. Testing Freight Rates API (/api/freight-rates) ---');
  const ratesRes = await request('http://localhost:3001/api/freight-rates');
  console.log('Rates Status:', ratesRes.status, 'Rates Count:', ratesRes.data?.rates?.length || (Array.isArray(ratesRes.data) ? ratesRes.data.length : 0));
  const ratesList = ratesRes.data?.rates || (Array.isArray(ratesRes.data) ? ratesRes.data : []);
  if (ratesList.length > 0) {
    const r = ratesList[0];
    console.log('Sample Rate:', {
      id: r.id,
      origin: r.origin_code || r.origin_name || r.origin_id,
      destination: r.destination_code || r.destination_name || r.destination_id,
      transhipment: r.transhipment_code || r.transhipment_name || 'None',
      container: r.container_name || r.container_id,
      price: r.price,
      currency: r.currency,
      local_thc: r.local_thc,
      other_charges: r.other_charges,
      transit_time: r.transit_time,
      carrier: r.carrier
    });
  }

  console.log('\n--- 4. Testing Route & Container Rate Enquiry Submission (/api/enquiries) ---');
  const enquiryPayload = {
    name: 'Automated Test Shipper',
    email: 'shipper.test@easyfr8.com',
    phone: '+1 555-0199',
    subject: 'Container Rate Enquiry — Singapore to Rotterdam (40ft High Cube)',
    origin: 'Singapore Port (SGPIN)',
    destination: 'Rotterdam Port (NLRTM)',
    transhipment: 'Colombo Port (LKCMB)',
    container_id: 'container-40hc',
    container_type: '40ft High Cube (40HC)',
    quantity: 2,
    freight_type: 'Ocean Freight',
    shipment_type: 'FCL (Full Container Load)',
    weight: '22000 KG',
    source: 'Automated Test Suite'
  };

  const enqRes = await request('http://localhost:3001/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, enquiryPayload);

  console.log('Enquiry Status:', enqRes.status, 'Success:', enqRes.data?.success, 'Enquiry ID:', enqRes.data?.enquiry?.id);

  console.log('\n--- 5. Testing Booking Submission Validation & Creation (/api/bookings) ---');
  // First test unauthenticated rejection (expected 401)
  const unauthRes = await request('http://localhost:3001/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    user_name: 'Unauth User',
    email: 'unauth@test.com'
  });
  console.log('Unauthenticated Booking Status (Expected 401):', unauthRes.status, 'Error:', unauthRes.data?.error);

  // Authenticate as a user and test valid booking creation
  const loginRes = await request('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'biswa@easyfr8.com',
    password: 'admin123'
  });

  const authToken = loginRes.data?.token;
  console.log('Login Status:', loginRes.status, 'Token obtained:', !!authToken);

  if (authToken) {
    const bookingPayload = {
      user_name: 'Biswa Admin',
      email: 'biswa@easyfr8.com',
      phone: '+91 9999999999',
      freight_type_id: 'mode-ocean',
      shipment_type_id: 'shipment-fcl',
      term_id: 'term-fob',
      loading_port_id: 'loc-sgpin',
      discharge_port_id: 'loc-clach',
      container_id: 'container-40oth',
      freight_rate_id: 'frate-sgpin-clach-40oth',
      cargo_details: 'Test Automated Booking Payload with Multi-Container Equipment Specifications',
      containers: [
        {
          id: 1,
          equipment: '40ft Open Top High (40OTH)',
          container_id: 'container-40oth',
          quantity: 1,
          weight: 18500,
          weight_unit: 'KG',
          dimensions: { length: 12000, width: 2350, height: 2690 },
          gauge_type: 'In Gauge',
          special_instructions: 'Handle with high care'
        }
      ]
    };

    const bookRes = await request('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, bookingPayload);

    console.log('Authenticated Booking Status:', bookRes.status, 'Response:', bookRes.data);

    if (bookRes.data?.success && bookRes.data?.booking_no) {
      console.log('\n--- 6. Verifying Booking Read & Data Persistence (/api/bookings) ---');
      const fetchBookingsRes = await request('http://localhost:3001/api/bookings', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      console.log('Fetch Bookings Status:', fetchBookingsRes.status, 'Total Bookings:', fetchBookingsRes.data?.length);
      const found = (fetchBookingsRes.data || []).find(b => b.booking_no === bookRes.data.booking_no);
      if (found) {
        console.log('Found Persisted Booking:', {
          id: found.id,
          booking_no: found.booking_no,
          user_name: found.user_name,
          loading_port: `${found.loading_port_name} (${found.loading_port_code})`,
          discharge_port: `${found.discharge_port_name} (${found.discharge_port_code})`,
          container_name: found.container_name,
          freight_type: found.freight_type_name,
          shipment_type: found.shipment_type_name,
          price: found.price,
          currency: found.currency,
          status: found.status
        });
      } else {
        console.error('Created booking was not found in GET /api/bookings!');
      }
    }
  }

  console.log('\n--- ALL END-TO-END FLOW TESTS COMPLETED ---');
}

run().catch(console.error);

