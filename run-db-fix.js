// 數據庫結構修復腳本
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('開始執行數據庫修復腳本...');

// 創建數據庫連接配置
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 修復數據庫結構
async function updateDatabaseStructure() {
  console.log('開始更新數據庫結構...');
  
  // 創建數據庫連接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'issue_management',
    multipleStatements: true // 允許多條SQL語句
  });

  try {
    console.log('連接到數據庫成功');
    
    // 讀取SQL文件
    const sqlFile = fs.readFileSync('./db/update_issues_structure.sql', 'utf8');
    console.log('讀取SQL文件成功');
    
    // 執行SQL命令
    console.log('開始執行SQL命令...');
    const [results] = await connection.query(sqlFile);
    console.log('SQL命令執行成功');
    
    // 驗證表結構
    const [tableInfo] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'issues'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('issues表結構:');
    console.table(tableInfo.map(col => ({
      字段名: col.COLUMN_NAME,
      數據類型: col.DATA_TYPE,
      注釋: col.COLUMN_COMMENT
    })));

    // 檢查關鍵列
    const hasWarrantyEndDate = tableInfo.some(col => col.COLUMN_NAME === 'warranty_end_date');
    const hasPriority = tableInfo.some(col => col.COLUMN_NAME === 'priority');
    const hasEstimatedHours = tableInfo.some(col => col.COLUMN_NAME === 'estimated_hours');
    
    if (hasWarrantyEndDate && !hasPriority && !hasEstimatedHours) {
      console.log('✅ 表結構更新成功：');
      console.log('  ✓ 已添加 warranty_end_date 列');
      console.log('  ✓ 已移除 priority 列');
      console.log('  ✓ 已移除 estimated_hours 列');
    } else {
      console.log('⚠️ 表結構更新不完整：');
      console.log(`  ${hasWarrantyEndDate ? '✓' : '✗'} warranty_end_date 列`);
      console.log(`  ${!hasPriority ? '✓' : '✗'} 移除 priority 列`);
      console.log(`  ${!hasEstimatedHours ? '✓' : '✗'} 移除 estimated_hours 列`);
    }
    
    console.log('數據庫結構更新完成!');
    console.log('請重新啟動後端服務器以應用這些更改');
  } catch (error) {
    console.error('執行SQL時出錯:', error);
  } finally {
    await connection.end();
  }
}

// 執行修復
updateDatabaseStructure()
  .then(() => {
    console.log('數據庫修復腳本執行完畢');
    console.log('請重新啟動後端服務器以應用這些更改');
  })
  .catch(err => {
    console.error('腳本執行出錯:', err);
    process.exit(1);
  }); 