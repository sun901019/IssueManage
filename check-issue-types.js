const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkIssueTypes() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('Connected to database successfully.');

    // 检查现有的issue_type值
    const [rows] = await connection.query(`
      SELECT DISTINCT issue_type, COUNT(*) as count
      FROM issues
      GROUP BY issue_type;
    `);

    console.log('\nCurrent issue_type values in use:');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkIssueTypes(); 