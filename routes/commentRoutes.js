const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { 
  getCommentsByIssueId, 
  addComment, 
  updateComment, 
  deleteComment 
} = require('../controllers/commentController');

// 確保上傳目錄存在
const uploadsDir = path.join(__dirname, '../uploads');
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
    cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 獲取特定問題的所有評論
router.get('/issue/:issueId', getCommentsByIssueId);

// 添加新評論（包含文件上傳）
router.post('/', upload.array('attachments', 5), addComment);

// 更新評論（包含文件上傳）
router.put('/:id', upload.array('attachments', 5), updateComment);

// 刪除評論
router.delete('/:id', deleteComment);

module.exports = router; 