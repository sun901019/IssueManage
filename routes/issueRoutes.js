// backend/routes/issueRoutes.js
const express = require('express');
const { getIssues, addIssue, updateIssueStatus, deleteIssue } = require('../controllers/issueController');
const router = express.Router();

router.get('/', getIssues);           // 取得所有 Issues
router.post('/', addIssue);           // 新增 Issue
router.put('/:id', updateIssueStatus); // 更新 Issue 狀態

// ★ 新增這行：刪除 Issue
router.delete('/:id', deleteIssue);

module.exports = router;
