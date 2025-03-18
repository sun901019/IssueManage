// backend/routes/issueRoutes.js
const express = require('express');
const { getIssues, addIssue, updateIssue, deleteIssue } = require('../controllers/issueController');
const router = express.Router();

router.get('/', getIssues);           // 取得所有 Issues
router.post('/', addIssue);           // 新增 Issue
router.put('/:id', updateIssue);      // 更新 Issue (所有欄位)

// ★ 新增這行：刪除 Issue
router.delete('/:id', deleteIssue);

module.exports = router;
