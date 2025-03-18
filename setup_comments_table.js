// backend/setup_comments_table.js - 用於創建 comments 表

const db = require('./db');
const fs = require('fs');
const path = require('path');

const setupSql = fs.readFileSync(path.join(__dirname, 'db/setup.sql'), 'utf8');

async function setupCommentsTable() {
  try {
    console.log('開始創建 comments 表...');
    await db.query(setupSql);
    console.log('✅ comments 表格創建成功！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 創建 comments 表時出錯:', error);
    process.exit(1);
  }
}

setupCommentsTable(); 