require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

async function addMissingColumns() {
  console.log('开始添加缺失的列...');

  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'issue_management',
    multipleStatements: true // 允许多条SQL语句
  });

  try {
    console.log('连接到数据库成功');
    
    // 读取SQL文件
    const sqlFile = fs.readFileSync('./db/add_missing_columns.sql', 'utf8');
    console.log('读取SQL文件成功');
    
    // 执行SQL命令
    console.log('开始执行SQL命令...');
    const [results] = await connection.query(sqlFile);
    console.log('SQL命令执行成功');
    
    // 检查最后一个结果集（DESCRIBE issues的结果）
    if (Array.isArray(results) && results.length > 0) {
      console.log('表结构:');
      console.table(results);

      // 检查是否包含我们添加的列
      const hasAllColumns = results.some(row => row.Field === 'priority') &&
                            results.some(row => row.Field === 'estimated_hours') &&
                            results.some(row => row.Field === 'assigned_to');
      
      if (hasAllColumns) {
        console.log('✅ 所有列已成功添加到表中');
      } else {
        console.log('⚠️ 有些列可能未被成功添加，请检查表结构');
      }
    }
    
    console.log('数据库修复完成!');
    console.log('请重新启动服务器以使更改生效。');
  } catch (error) {
    console.error('执行SQL时出错:', error);
  } finally {
    await connection.end();
  }
}

// 运行函数
addMissingColumns()
  .then(() => console.log('脚本执行完毕'))
  .catch(err => console.error('脚本执行失败:', err)); 