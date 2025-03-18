const express = require("express");
const { getMonthlySummary } = require("../controllers/summaryController");
const reportController = require("../controllers/reportController");

const router = express.Router();

// 取得當月統計數據
router.get("/monthly", getMonthlySummary);  

// 取得報表資料
router.get("/", reportController.getMonthlyReport);

// 匯出 Excel 報表
router.get("/export/excel", reportController.exportReport);

// 生成Excel報表 (指定月份)
router.get("/export/excel/monthly", reportController.generateExcelReport);

// 生成PDF報表 (指定月份)
router.get("/export/pdf/monthly", reportController.generatePdfReport);

module.exports = router;
