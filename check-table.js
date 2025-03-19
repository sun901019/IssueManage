const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('Connected to database successfully.');

    const [rows] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'issues'
      ORDER BY ORDINAL_POSITION;
    `, [process.env.DB_NAME]);

    console.log('\nTable structure for issues:');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTableStructure(); 