const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSourceEnum() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('Connected to database successfully.');

    // 修改source字段的枚举类型
    await connection.query(`
      ALTER TABLE issues 
      MODIFY COLUMN source ENUM('業務', 'Line chat', '現場', 'Email', '電話', '客戶主動回報') NOT NULL;
    `);

    console.log('Successfully modified source column enum values.');

    // 验证修改
    const [rows] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'source';
    `, [process.env.DB_NAME]);

    console.log('\nUpdated source column structure:');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixSourceEnum(); 