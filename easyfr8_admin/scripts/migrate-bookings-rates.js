const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== EASYFR8 BOOKINGS RATE NORMALIZATION MIGRATION ===\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'easyfr8',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });

  try {
    // 1. Initial State Inspection
    const [initialCountRows] = await conn.query('SELECT COUNT(*) as count FROM bookings');
    const initialCount = initialCountRows[0].count;
    console.log(`Initial booking count: ${initialCount}`);

    const [descCols] = await conn.query('DESCRIBE bookings');
    const existingColNames = descCols.map(c => c.Field);
    console.log('Existing columns:', existingColNames.join(', '));

    // 2. Safe ALTER TABLE if columns are missing
    const columnsToAdd = [
      { name: 'freight_rate_id', sql: 'ADD COLUMN freight_rate_id VARCHAR(64) NULL AFTER container_id' },
      { name: 'price', sql: 'ADD COLUMN price DECIMAL(12,2) NULL AFTER freight_rate_id' },
      { name: 'currency', sql: 'ADD COLUMN currency VARCHAR(10) DEFAULT "USD" AFTER price' },
      { name: 'carrier', sql: 'ADD COLUMN carrier VARCHAR(255) NULL AFTER currency' },
      { name: 'transit_time', sql: 'ADD COLUMN transit_time INT NULL AFTER carrier' }
    ];

    for (const col of columnsToAdd) {
      if (!existingColNames.includes(col.name)) {
        console.log(`Adding missing column: ${col.name}...`);
        await conn.query(`ALTER TABLE bookings ${col.sql}`);
        console.log(`Column ${col.name} added successfully.`);
      } else {
        console.log(`Column ${col.name} already exists. Skipping ALTER.`);
      }
    }

    // 3. Inspect Existing Bookings & Backfill
    const [bookings] = await conn.query('SELECT id, booking_no, cargo_details, freight_rate_id FROM bookings');
    console.log(`\nInspecting ${bookings.length} existing booking records for backfill...`);

    let updatedCount = 0;
    for (const b of bookings) {
      const details = b.cargo_details || '';
      console.log(`\nProcessing Booking ${b.booking_no} (${b.id}):`);
      console.log(`  Raw cargo_details:\n    ${details.replace(/\n/g, '\n    ')}`);

      // Defensive Regex Matching
      // Example: [Selected Rate: frate-952 | Carrier: null | Price: $52000.00 USD | Transit: 8 Days]
      const rateMatch = details.match(/\[Selected Rate:\s*([^|\]]+)/i);
      const carrierMatch = details.match(/Carrier:\s*([^|\]]+)/i);
      const priceMatch = details.match(/Price:\s*\$?([0-9.]+)\s*([A-Za-z]+)?/i);
      const transitMatch = details.match(/Transit:\s*([0-9]+)/i);

      let parsedRateId = rateMatch ? rateMatch[1].trim() : null;
      let parsedCarrier = carrierMatch ? carrierMatch[1].trim() : null;
      if (parsedCarrier === 'null' || parsedCarrier === 'undefined') parsedCarrier = null;

      let parsedPrice = priceMatch && priceMatch[1] ? parseFloat(priceMatch[1]) : null;
      let parsedCurrency = priceMatch && priceMatch[2] ? priceMatch[2].trim().toUpperCase() : 'USD';
      let parsedTransit = transitMatch ? parseInt(transitMatch[1], 10) : null;

      // Authoritative lookup from freight_rates if rate ID exists
      if (parsedRateId) {
        const [rateRows] = await conn.query(
          'SELECT id, carrier, price, currency, transit_time FROM freight_rates WHERE id = ? LIMIT 1',
          [parsedRateId]
        );
        if (rateRows.length > 0) {
          const authRate = rateRows[0];
          console.log(`  Authoritative match found in freight_rates (${authRate.id}):`);
          console.log(`    DB Carrier: ${authRate.carrier}, DB Price: ${authRate.price}, DB Currency: ${authRate.currency}, DB Transit: ${authRate.transit_time}`);
          if (authRate.carrier) parsedCarrier = authRate.carrier;
          if (authRate.price != null && !isNaN(parseFloat(authRate.price))) parsedPrice = parseFloat(authRate.price);
          if (authRate.currency) parsedCurrency = authRate.currency;
          if (authRate.transit_time != null) parsedTransit = authRate.transit_time;
        }
      }

      console.log(`  Normalized Values to write:`);
      console.log(`    freight_rate_id: ${parsedRateId}`);
      console.log(`    carrier:         ${parsedCarrier}`);
      console.log(`    price:           ${parsedPrice}`);
      console.log(`    currency:        ${parsedCurrency}`);
      console.log(`    transit_time:    ${parsedTransit}`);

      await conn.query(
        `UPDATE bookings 
         SET freight_rate_id = ?, 
             carrier = ?, 
             price = ?, 
             currency = ?, 
             transit_time = ? 
         WHERE id = ?`,
        [parsedRateId, parsedCarrier, parsedPrice, parsedCurrency, parsedTransit, b.id]
      );
      updatedCount++;
    }

    // 4. Post-Migration Verification
    const [finalCountRows] = await conn.query('SELECT COUNT(*) as count FROM bookings');
    const finalCount = finalCountRows[0].count;
    console.log(`\n=== MIGRATION VERIFICATION ===`);
    console.log(`Booking row count before: ${initialCount}`);
    console.log(`Booking row count after:  ${finalCount}`);

    if (initialCount !== finalCount) {
      throw new Error(`CRITICAL ROW COUNT MISMATCH: before=${initialCount}, after=${finalCount}`);
    }

    const [verifiedRows] = await conn.query(
      'SELECT id, booking_no, freight_rate_id, carrier, price, currency, transit_time FROM bookings'
    );
    console.log('\nFinal Structured Bookings Data:');
    console.table(verifiedRows);

    const populatedCount = verifiedRows.filter(r => r.freight_rate_id !== null).length;
    const nullCount = verifiedRows.filter(r => r.freight_rate_id === null).length;
    console.log(`\nSummary:`);
    console.log(`- Total bookings: ${finalCount}`);
    console.log(`- Populated structured rate records: ${populatedCount}`);
    console.log(`- Preserved standalone (NULL rate) records: ${nullCount}`);
    console.log(`- Cargo details untouched: YES`);
    console.log('\n=== MIGRATION SUCCESSFUL ===\n');
  } catch (err) {
    console.error('MIGRATION FAILED:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
