const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixIssueTypes() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('Connected to database successfully.');

    // 修改issue_type字段为枚举类型
    await connection.query(`
      ALTER TABLE issues 
      MODIFY COLUMN issue_type ENUM('系統', '系統功能', '網路', '設備') DEFAULT NULL;
    `);

    console.log('Successfully modified issue_type column.');

    // 验证修改
    const [rows] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'issue_type';
    `, [process.env.DB_NAME]);

    console.log('\nUpdated issue_type column structure:');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixIssueTypes(); 