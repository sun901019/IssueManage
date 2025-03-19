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
async function fixDatabaseStructure() {
  console.log('嘗試修復數據庫結構...');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ 成功連接到數據庫');
    
    // 執行修復SQL
    const fixSqlPath = path.join(__dirname, 'db', 'fix_issues_table.sql');
    
    if (fs.existsSync(fixSqlPath)) {
      console.log('執行issues表結構修復...');
      const fixSQL = fs.readFileSync(fixSqlPath, 'utf8');
      
      // 分割SQL語句
      const queries = fixSQL
        .split(';')
        .filter(query => query.trim() !== '')
        .map(query => query.trim() + ';');
      
      for (const query of queries) {
        if (query.trim().startsWith('--')) continue; // 跳過註釋
        if (query.trim() === ';') continue; // 跳過空語句
        
        try {
          console.log(`執行: ${query.substring(0, 80)}${query.length > 80 ? '...' : ''}`);
          await connection.query(query);
        } catch (err) {
          console.warn(`⚠️ 警告: SQL執行失敗: ${err.message}`);
          console.warn('問題SQL:', query);
          // 繼續執行下一條語句
        }
      }
      
      // 驗證欄位是否已添加
      const [columns] = await connection.query(`
        SELECT 
          COLUMN_NAME, 
          DATA_TYPE, 
          COLUMN_DEFAULT, 
          IS_NULLABLE
        FROM 
          information_schema.COLUMNS 
        WHERE 
          TABLE_SCHEMA = '${process.env.DB_NAME}' 
          AND TABLE_NAME = 'issues'
      `);
      
      console.log('\n數據庫結構驗證:');
      columns.forEach(col => {
        console.log(`- ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.COLUMN_DEFAULT ? ' [默認:' + col.COLUMN_DEFAULT + ']' : ''}`);
      });
      
      console.log('\n✅ 數據庫結構修復完成');
    } else {
      console.error('❌ 找不到修復SQL文件!');
    }
    
    await connection.end();
  } catch (err) {
    console.error('❌ 數據庫修復失敗:', err);
  }
}

// 執行修復
fixDatabaseStructure()
  .then(() => {
    console.log('數據庫修復腳本執行完畢');
    console.log('請重新啟動後端服務器以應用這些更改');
  })
  .catch(err => {
    console.error('腳本執行出錯:', err);
    process.exit(1);
  }); 