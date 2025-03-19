// 更簡潔的啟動腳本
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('正在啟動後端服務器...');

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

// 確保數據庫結構更新
async function ensureDatabaseStructure() {
  console.log('檢查並更新數據庫結構...');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 1. 檢查issues表是否存在，如果不存在則創建
    const [tables] = await connection.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'issues'
    `);
    
    if (tables.length === 0) {
      console.log('創建issues表...');
      await connection.query(`
        CREATE TABLE issues (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          source VARCHAR(100),
          issue_type VARCHAR(100),
          status VARCHAR(20) DEFAULT 'Pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('issues表創建成功');
    }
    
    // 2. 嘗試執行update_issues_table.sql中的更新
    if (fs.existsSync(path.join(__dirname, 'db', 'update_issues_table.sql'))) {
      console.log('執行issues表結構更新...');
      const updateIssuesSQL = fs.readFileSync(
        path.join(__dirname, 'db', 'update_issues_table.sql'), 
        'utf8'
      );
      
      // 分割SQL語句
      const queries = updateIssuesSQL
        .split(';')
        .filter(query => query.trim() !== '')
        .map(query => query.trim() + ';');
      
      for (const query of queries) {
        try {
          await connection.query(query);
        } catch (err) {
          console.warn(`警告: 執行SQL失敗: ${err.message}`);
          console.warn('SQL語句:', query);
          // 繼續執行下一條語句
        }
      }
      console.log('issues表結構更新完成');
    }
    
    // 3. 嘗試創建comments表
    if (fs.existsSync(path.join(__dirname, 'db', 'create_comments_table.sql'))) {
      console.log('檢查comments表...');
      const [commentTables] = await connection.query(`
        SELECT TABLE_NAME FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
        AND TABLE_NAME = 'comments'
      `);
      
      if (commentTables.length === 0) {
        console.log('創建comments表...');
        const createCommentsSQL = fs.readFileSync(
          path.join(__dirname, 'db', 'create_comments_table.sql'), 
          'utf8'
        );
        
        await connection.query(createCommentsSQL);
        console.log('comments表創建成功');
      }
    }
    
    console.log('數據庫結構更新完成');
  } catch (err) {
    console.error('數據庫結構更新失敗:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

// 運行主要啟動流程
async function startServer() {
  try {
    // 先更新數據庫結構
    await ensureDatabaseStructure();
    
    // 安裝必要依賴
    console.log('檢查並安裝依賴...');
    await new Promise((resolve, reject) => {
      exec('npm install multer cors express mysql2 dotenv --save', (error, stdout, stderr) => {
        if (error) {
          console.error(`安裝依賴錯誤: ${error}`);
          reject(error);
          return;
        }
        console.log('依賴已安裝');
        resolve();
      });
    });
    
    // 啟動服務器
    console.log('啟動服務器...');
    const server = require('./server');
    
    console.log('後端服務器已啟動!');
    console.log('監聽端口: 5000');
    console.log('API 路徑: http://localhost:5000/api');
    console.log('問題 API: http://localhost:5000/api/issues');
    console.log('評論 API: http://localhost:5000/api/comments');
    console.log('統計 API: http://localhost:5000/api/summaries');
    console.log('按 Ctrl+C 停止服務器');
  } catch (err) {
    console.error('啟動服務器失敗:', err);
    process.exit(1);
  }
}

// 執行啟動流程
startServer(); 