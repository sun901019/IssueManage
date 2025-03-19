// backend/routes/issueRoutes.js
const express = require('express');
const { getIssues, addIssue, updateIssueStatus, deleteIssue, updateIssue, getIssueStats } = require('../controllers/issueController');
const router = express.Router();

router.get('/', getIssues);           // 取得所有 Issues
router.get('/stats', getIssueStats);  // 取得 Issues 統計數據
router.post('/', addIssue);           // 新增 Issue
router.put('/:id/status', updateIssueStatus); // 更新 Issue 狀態
router.put('/:id', updateIssue);      // 完整更新 Issue (所有欄位)

// ★ 新增這行：刪除 Issue
router.delete('/:id', deleteIssue);

module.exports = router;
