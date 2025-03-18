// backend/update_issues_table.js - 用於更新 issues 表

const db = require('./db');
const fs = require('fs');
const path = require('path');

const updateSql = fs.readFileSync(path.join(__dirname, 'db/update_issues_table.sql'), 'utf8');

async function updateIssuesTable() {
  try {
    console.log('開始更新 issues 表...');
    await db.query(updateSql);
    console.log('✅ issues 表格更新成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新 issues 表時出錯:', error);
    process.exit(1);
  }
}

updateIssuesTable(); 