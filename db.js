const dotenv = require("dotenv");
dotenv.config();
const mysql = require("mysql2/promise");  // ✅ 確保使用 promise 版本

// 建立 MySQL 連線池
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,  // ✅ 設定最大連線數
    queueLimit: 0,
});

// 測試 MySQL 連線
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ MySQL 連線成功！");
        connection.release();  // 釋放連線
    } catch (error) {
        console.error("❌ MySQL 連線失敗:", error);
    }
})();

module.exports = pool;  // ✅ 確保導出的是連線池
