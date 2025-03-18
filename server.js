// server.js (範例)
const express = require('express');
const cors = require('cors');
const cron = require("node-cron");
const axios = require('axios');

const issueRoutes = require('./routes/issueRoutes');  
const reportRoutes = require('./routes/reportRoutes'); 
const summaryRoutes = require('./routes/summaryRoutes'); // 新增

const app = express();
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/issues', issueRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/summaries', summaryRoutes);

// 每月 1 日執行月結
cron.schedule("0 0 1 * *", async () => {
  console.log("🔄 執行月結算排程...");
  try {
    // 不帶任何參數 => 後端會自動判定「上個月」
    await axios.post("http://localhost:5000/api/summaries/process");
    console.log("✅ 月結算完成");
  } catch (error) {
    console.error("❌ 月結算發生錯誤:", error);
  }
});

// 啟動伺服器
app.listen(5000, () => {
  console.log("🚀 伺服器運行於 http://localhost:5000");
});
