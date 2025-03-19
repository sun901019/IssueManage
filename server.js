// server.js (範例)
const express = require('express');
const cors = require('cors');
const cron = require("node-cron");
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const issueRoutes = require('./routes/issueRoutes');  
const reportRoutes = require('./routes/reportRoutes'); 
const summaryRoutes = require('./routes/summaryRoutes'); // 新增
const commentRoutes = require('./routes/commentRoutes'); // 添加評論路由

// 確保上傳目錄存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置文件上傳
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const app = express();
app.use(cors());

// 日誌中間件：記錄請求細節
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method !== 'GET') {
    console.log('請求體:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// 解析 JSON 請求體，設置更大的限制，避免大型請求體解析錯誤
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 靜態文件服務
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/issues', issueRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/comments', commentRoutes); // 添加評論路由

// 增強的錯誤處理中間件
app.use((err, req, res, next) => {
  // 詳細記錄錯誤
  console.error('❌ 應用錯誤:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  // 數據庫錯誤的詳細處理
  let errorMessage = err.message;
  let statusCode = 500;
  
  if (err.code) {
    console.error('錯誤代碼:', err.code);
    
    // 增加特定數據庫錯誤處理
    switch (err.code) {
      case 'ER_NO_SUCH_TABLE':
        errorMessage = '數據表不存在，可能需要初始化數據庫';
        break;
      case 'ER_BAD_FIELD_ERROR':
        errorMessage = '數據表字段錯誤，可能表結構需要更新';
        break;
      case 'ER_ACCESS_DENIED_ERROR':
        errorMessage = '數據庫訪問被拒絕，請檢查連接配置';
        break;
      case 'ECONNREFUSED':
        errorMessage = '無法連接到數據庫服務器';
        break;
    }
  }
  
  // 發送錯誤響應
  res.status(statusCode).json({
    error: errorMessage,
    details: process.env.NODE_ENV === 'production' ? '詳情已記錄' : err.stack,
    time: new Date().toISOString()
  });
});

// 404 處理
app.use((req, res) => {
  console.log(`⚠️ 未找到路由: ${req.method} ${req.url}`);
  res.status(404).json({ error: '未找到請求的資源' });
});

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
  console.log("�� 詳細的錯誤日誌已啟用");
});
