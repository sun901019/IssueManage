// backend/routes/commentRoutes.js
const express = require('express');
const {
  getCommentsByIssueId,
  addComment,
  deleteComment,
  updateComment,
  downloadAttachment
} = require('../controllers/commentController');

const router = express.Router();

// 獲取問題的所有評論
router.get('/issue/:issueId', getCommentsByIssueId);

// 添加評論
router.post('/', addComment);

// 更新評論
router.put('/:commentId', updateComment);

// 刪除評論
router.delete('/:commentId', deleteComment);

// 下載附件
router.get('/attachment/:filename', downloadAttachment);

module.exports = router; 