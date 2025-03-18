// backend/routes/summaryRoutes.js
const express = require("express");
const {
  getMonthlySummary,
  processMonthlySummary,
  getStoredMonthlySummary,
  getAnnualSummary,   // 整年累計
  getAnnualTrend,     // 年度 12 個月趨勢
  getImmediateAnnualTrend
} = require("../controllers/summaryController");

const router = express.Router();

// 1) 即時查詢當前/指定月 => GET /api/summaries/monthly?month=YYYY-MM
router.get("/monthly", getMonthlySummary);

// 2) 每月結算 => POST /api/summaries/process
router.post("/process", processMonthlySummary);

// 3) 取得存檔 => GET /api/summaries/stored?year=YYYY&month=M
router.get("/stored", getStoredMonthlySummary);

// 4) 整年累計 => GET /api/summaries/annual?year=2025
router.get("/annual", getAnnualSummary);

// 5) 年度趨勢 => GET /api/summaries/annualTrend?year=2025
router.get("/annualTrend", getAnnualTrend);

router.get("/immediateAnnualTrend", getImmediateAnnualTrend);
module.exports = router;
