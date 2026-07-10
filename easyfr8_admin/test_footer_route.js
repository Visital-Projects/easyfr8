const mysql = require('mysql2/promise');

async function testFooterCms() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'easyfr8'
    });
    
    console.log('Fetching cms_data from database...');
    const [rows] = await connection.query('SELECT data FROM cms_data WHERE id = 1');
    if (rows.length > 0) {
      const cms = JSON.parse(rows[0].data);
      console.log('CMS contact content:');
      console.log(JSON.stringify(cms.contact, null, 2));
      console.log('CMS aboutUs overview content:');
      console.log(cms.aboutUs?.overview);
    } else {
      console.log('No cms_data rows found.');
    }
    await connection.end();
  } catch (err) {
    console.error('ERROR:', err);
  }
}

testFooterCms();
