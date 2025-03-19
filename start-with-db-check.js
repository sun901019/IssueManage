// 增强型服务器启动脚本 - 先检查数据库连接和表结构，然后启动服务器
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { exec } = require('child_process');
require('dotenv').config();

console.log('🔍 正在检查数据库连接和表结构...');

// 创建数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',  // 使用环境变量中的密码
  database: process.env.DB_NAME || 'issue_management',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
};

console.log('📊 数据库连接配置:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  // 不打印密码，保护安全
});

// 检查数据库连接和表结构
async function checkDatabase() {
  let connection;
  
  try {
    // 尝试连接数据库
    console.log('🔄 正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功!');
    
    // 检查issues表是否存在
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'issues'
    `);
    
    if (tables[0].count === 0) {
      console.error('❌ issues表不存在!');
      return false;
    }
    
    console.log('✅ issues表存在');
    
    // 检查warranty_end_date列是否存在
    const [columns] = await connection.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'issues' 
      AND column_name = 'warranty_end_date'
    `);
    
    if (columns[0].count === 0) {
      console.log('⚠️ warranty_end_date列不存在，正在添加...');
      
      // 添加warranty_end_date列
      await connection.query(`
        ALTER TABLE issues 
        ADD COLUMN warranty_end_date DATE DEFAULT NULL COMMENT '保固到期日'
      `);
      
      console.log('✅ warranty_end_date列添加成功');
    } else {
      console.log('✅ warranty_end_date列已存在');
    }
    
    // 检查其他需要删除的列
    const [oldColumns] = await connection.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'issues' 
      AND column_name IN ('priority', 'estimated_hours')
    `);
    
    for (const col of oldColumns) {
      console.log(`⚠️ 发现旧列 ${col.column_name}，正在删除...`);
      await connection.query(`ALTER TABLE issues DROP COLUMN ${col.column_name}`);
      console.log(`✅ ${col.column_name}列删除成功`);
    }
    
    console.log('🎉 数据库结构检查和更新完成!');
    return true;
    
  } catch (error) {
    console.error('❌ 数据库操作失败:', error.message);
    if (error.code) {
      console.error('错误代码:', error.code);
    }
    if (error.errno) {
      console.error('错误号:', error.errno);
    }
    if (error.sqlState) {
      console.error('SQL状态:', error.sqlState);
    }
    if (error.sqlMessage) {
      console.error('SQL消息:', error.sqlMessage);
    }
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 启动服务器
function startServer() {
  console.log('🚀 正在启动服务器...');
  
  const serverProcess = exec('node server.js', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ 服务器启动失败:', error);
      return;
    }
    if (stderr) {
      console.error('服务器错误输出:', stderr);
    }
  });
  
  serverProcess.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error('错误:', data.toString().trim());
  });
  
  serverProcess.on('close', (code) => {
    console.log(`服务器进程已退出，退出码 ${code}`);
  });
}

// 主流程
async function main() {
  const dbCheckResult = await checkDatabase();
  
  if (dbCheckResult) {
    startServer();
  } else {
    console.error('❌ 由于数据库问题，服务器未启动。请解决上述错误后重试。');
    process.exit(1);
  }
}

main(); 