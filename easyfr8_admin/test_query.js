const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'easyfr8'
    });
    
    // Test the JOIN query from app/api/freight-rates/route.ts
    const sql = `
      SELECT 
        fr.*,
        fm.name AS mode_name,
        st.name AS shipment_name,
        loc_o.port_code AS origin_code,
        loc_o.port_name AS origin_name,
        loc_o.country AS origin_country,
        loc_d.port_code AS destination_code,
        loc_d.port_name AS destination_name,
        loc_d.country AS destination_country,
        c.name AS container_name
      FROM freight_rates fr
      JOIN freight_types fm ON fr.freight_mode_id = fm.id
      JOIN shipment_types st ON fr.shipment_type_id = st.id
      JOIN ports loc_o ON fr.origin_id = loc_o.id
      JOIN ports loc_d ON fr.destination_id = loc_d.id
      LEFT JOIN containers c ON fr.container_id = c.id
      WHERE 1=1
    `;
    
    console.log('Running JOIN query on database...');
    const [rows] = await connection.query(sql);
    console.log('Query succeeded! Rows count:', rows.length);
    await connection.end();
  } catch (err) {
    console.error('DATABASE QUERY ERROR:', err);
  }
}

testConnection();
