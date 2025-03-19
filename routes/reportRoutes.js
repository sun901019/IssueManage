const express = require("express");
const { getMonthlySummary } = require("../controllers/summaryController");

const router = express.Router();

// 取得當月統計數據
router.get("/monthly", getMonthlySummary);  

module.exports = router;
