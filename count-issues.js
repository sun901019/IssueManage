const mysql = require('mysql2/promise');

async function countIssues() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'a7638521',
      database: 'issue_management'
    });
    
    // 查询总问题数
    const [total] = await conn.execute('SELECT COUNT(*) as count FROM issues');
    console.log('总问题数:', total[0].count);
    
    // 按状态分组查询
    const [byStatus] = await conn.execute('SELECT status, COUNT(*) as count FROM issues GROUP BY status');
    console.log('\n按状态统计:');
    byStatus.forEach(row => {
      console.log(`- ${row.status}: ${row.count}`);
    });
    
    // 按类型分组查询
    const [byType] = await conn.execute('SELECT issue_type, COUNT(*) as count FROM issues GROUP BY issue_type');
    console.log('\n按类型统计:');
    byType.forEach(row => {
      console.log(`- ${row.issue_type}: ${row.count}`);
    });
    
    await conn.end();
  } catch (err) {
    console.error('查询出错:', err);
  }
}

countIssues(); 