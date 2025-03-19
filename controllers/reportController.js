// backend/controllers/reportController.js

const db = require("../db");
const ExcelJS = require("exceljs");

// 1. 取得月報數據
const getMonthlyReport = (req, res) => {
    // 第 1 段：每月 Issue 數量
    db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM issues
       GROUP BY month
       ORDER BY month`,
      (err, monthlyIssues) => {
        if (err) return res.status(500).json({ error: err });
  
        // 第 2 段：問題類型統計
        db.query(
          `SELECT issue_type, COUNT(*) AS count 
           FROM issues 
           GROUP BY issue_type`,
          (err, issueTypeStats) => {
            if (err) return res.status(500).json({ error: err });
  
            // ★ 第 2.1 段：來源統計
            db.query(
              `SELECT source, COUNT(*) AS count
               FROM issues
               GROUP BY source`,
              (err, sourceStats) => {
                if (err) return res.status(500).json({ error: err });
  
                // 第 3 段：完成 vs 未完成
                db.query(
                  `SELECT
                    SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status != 'Closed' THEN 1 ELSE 0 END) AS pending
                   FROM issues`,
                  (err, completionStats) => {
                    if (err) return res.status(500).json({ error: err });
                    
                    // 將 sourceStats 轉成 { "Line chat": 3, "現場": 5, ... } 這種結構
                    const sourceData = Object.fromEntries(
                      sourceStats.map(s => [s.source, s.count])
                    );
  
                    res.json({
                      monthlyIssues, // [ { month: '2025-02', count: X }, ... ]
                      issueTypeStats: Object.fromEntries(
                        issueTypeStats.map((i) => [i.issue_type, i.count])
                      ),
                      completionStats: completionStats[0],
                      
                      // ★ 把來源統計也回傳
                      sourceStats: sourceData,
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  };

// 2. 匯出 Excel 報表
const exportReport = async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("報表");

  // 設定標題行（欄位名稱 & 寬度）
  worksheet.columns = [
    { header: "月份", key: "month", width: 15 },
    { header: "Issue 數量", key: "count", width: 15 },
  ];

  try {
    // 使用 Promise 形式查詢資料庫
    const [monthlyIssues] = await db.promise().query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count 
       FROM issues 
       GROUP BY month 
       ORDER BY month`
    );

    // 將資料逐列填入 worksheet
    monthlyIssues.forEach((row) => worksheet.addRow(row));

    // 設定回應 Headers，讓瀏覽器下載檔案
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Issue_Report.xlsx"
    );

    // 產生並傳送 Excel
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("報表匯出錯誤", error);
    res.status(500).json({ error: "報表匯出失敗" });
  }
};

module.exports = { getMonthlyReport, exportReport };
