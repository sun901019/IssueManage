// backend/controllers/summaryController.js
const db = require("../db");

/**
 * getMonthlySummary
 * -----------------
 * 即時(或指定月份)查詢 Issues 資料，直接從 MySQL 表: issues
 * 例如：GET /api/summaries/monthly?month=2025-03
 */
exports.getMonthlySummary = async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // 1) Issues 總數
    const [issueCountRows] = await db.query(
      `SELECT COUNT(*) AS issueCount
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [targetMonth]
    );
    const issueCount = issueCountRows[0]?.issueCount || 0;

    // 2) 問題類型
    const [typeRows] = await db.query(
      `SELECT issue_type, COUNT(*) AS count
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
         GROUP BY issue_type`,
      [targetMonth]
    );
    const issueTypes = {};
    typeRows.forEach(row => {
      issueTypes[row.issue_type] = row.count;
    });

    // 3) 狀態 (完成 vs 未完成)
    const [statusRows] = await db.query(
      `SELECT status, COUNT(*) AS count
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
         GROUP BY status`,
      [targetMonth]
    );
    let completed = 0;
    let uncompleted = 0;
    statusRows.forEach(row => {
      if (row.status === "已完成" || row.status === "Closed") {
        completed += row.count;
      } else {
        uncompleted += row.count;
      }
    });

    // 4) 來源
    const [sourceRows] = await db.query(
      `SELECT source, COUNT(*) AS count
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
         GROUP BY source`,
      [targetMonth]
    );
    const sourceStats = {};
    sourceRows.forEach(row => {
      sourceStats[row.source] = row.count;
    });

    // 回傳 JSON
    res.json({
      targetMonth,
      issueCount,
      issueTypes,
      completed,
      uncompleted,
      sourceStats,
    });
  } catch (error) {
    console.error("getMonthlySummary error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * processMonthlySummary
 * ---------------------
 * 每月結算: 計算指定(或上)月份 Issue 數，寫入 (或更新) monthly_summaries
 * POST /api/summaries/process { month: "2025-02" }
 * 若不帶 month, 預設為上個月
 *
 * 資料表 monthly_summaries:
 *  - total_issues, closed_issues, pending_issues, source_stats, issue_type_stats, created_at
 */
exports.processMonthlySummary = async (req, res) => {
  try {
    let { month } = req.body;
    if (!month) {
      const now = new Date();
      let y = now.getFullYear();
      let m = now.getMonth(); // 0~11
      if (m === 0) {
        month = `${y - 1}-12`;
      } else {
        month = `${y}-${String(m).padStart(2, "0")}`;
      }
    }

    const [yyyy, mm] = month.split("-");
    const yearInt = parseInt(yyyy, 10);
    const monthInt = parseInt(mm, 10);

    // 1) 從 issues 表計算 ( issueCount, completed, uncompleted, sourceStats, issueTypes )
    const [issueCountRows] = await db.query(
      `SELECT COUNT(*) AS issueCount
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [month]
    );
    const issueCount = issueCountRows[0]?.issueCount || 0;

    // 類型
    const [typeRows] = await db.query(
      `SELECT issue_type, COUNT(*) AS count
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
         GROUP BY issue_type`,
      [month]
    );
    const issueTypes = {};
    typeRows.forEach(row => {
      issueTypes[row.issue_type] = row.count;
    });

    // 完成 / 未完成
    let completed = 0;
    let uncompleted = 0;
    const [statusRows] = await db.query(
      `SELECT status, COUNT(*) AS count
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
         GROUP BY status`,
      [month]
    );
    statusRows.forEach(row => {
      if (row.status === "已完成" || row.status === "Closed") {
        completed += row.count;
      } else {
        uncompleted += row.count;
      }
    });

    // 來源
    const [sourceRows] = await db.query(
      `SELECT source, COUNT(*) AS count
         FROM issues
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
         GROUP BY source`,
      [month]
    );
    const sourceStats = {};
    sourceRows.forEach(row => {
      sourceStats[row.source] = row.count;
    });

    // 2) 寫入 monthly_summaries
    //    資料表實際欄位: total_issues, closed_issues, pending_issues, source_stats, issue_type_stats
    const insertSql = `
      INSERT INTO monthly_summaries
        (year, month, total_issues, closed_issues, pending_issues, 
         source_stats, issue_type_stats, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        total_issues    = VALUES(total_issues),
        closed_issues   = VALUES(closed_issues),
        pending_issues  = VALUES(pending_issues),
        source_stats    = VALUES(source_stats),
        issue_type_stats= VALUES(issue_type_stats),
        created_at      = NOW()
    `;
    await db.query(insertSql, [
      yearInt,
      monthInt,
      issueCount,          // => total_issues
      completed,           // => closed_issues
      uncompleted,         // => pending_issues
      JSON.stringify(sourceStats),   // => source_stats
      JSON.stringify(issueTypes),    // => issue_type_stats
    ]);

    res.json({
      message: `✅ 已成功將 ${month} 的統計資料寫入 monthly_summaries！`,
      data: {
        year: yearInt,
        month: monthInt,
        issueCount,
        completed,
        uncompleted,
        sourceStats,
        issueTypes,
      },
    });
  } catch (error) {
    console.error("processMonthlySummary error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * getStoredMonthlySummary
 * -----------------------
 * 讀取 monthly_summaries 裏某年某月的存檔
 * GET /api/summaries/stored?year=YYYY&month=M
 * 資料表實際欄位: total_issues, closed_issues, pending_issues, source_stats, issue_type_stats
 */
exports.getStoredMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: "請提供 year 與 month！" });
    }

    const selSql = `
      SELECT *
        FROM monthly_summaries
       WHERE year = ?
         AND month = ?
       LIMIT 1
    `;
    const [rows] = await db.query(selSql, [parseInt(year), parseInt(month)]);
    if (rows.length === 0) {
      return res.json({ message: "查無對應紀錄", data: null });
    }

    const row = rows[0];
    // MySQL 裡實際欄位 => 前端想用的欄位
    const sourceStats = row.source_stats ? JSON.parse(row.source_stats) : {};
    const issueTypes = row.issue_type_stats ? JSON.parse(row.issue_type_stats) : {};

    res.json({
      year: row.year,
      month: row.month,
      // total_issues => issueCount
      issueCount: row.total_issues,
      // closed_issues => completed
      completed: row.closed_issues,
      // pending_issues => uncompleted
      uncompleted: row.pending_issues,
      sourceStats,
      issueTypes,
      // created_at => updatedAt (前端顯示用)
      updatedAt: row.created_at,
    });
  } catch (error) {
    console.error("getStoredMonthlySummary error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * getAnnualSummary
 * ----------------
 * /api/summaries/annual?year=2025
 * 直接從 issues (或 monthly_reports) 算整年 Issue 總數、完成/未完成、來源、類型
 * 這裡使用 issues 表, 不影響 monthly_summaries
 */
exports.getAnnualSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year || new Date().getFullYear(), 10);

    // 1) 整年 Issue 總數
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS totalIssues
         FROM issues
        WHERE YEAR(created_at) = ?`,
      [targetYear]
    );
    const totalIssues = countRows[0]?.totalIssues || 0;

    // 2) 完成 / 未完成
    let completed = 0;
    let uncompleted = 0;
    const [statusRows] = await db.query(
      `SELECT status, COUNT(*) AS count
         FROM issues
        WHERE YEAR(created_at) = ?
         GROUP BY status`,
      [targetYear]
    );
    statusRows.forEach(row => {
      if (row.status === "已完成" || row.status === "Closed") {
        completed += row.count;
      } else {
        uncompleted += row.count;
      }
    });

    // 3) 來源分布
    const [sourceRows] = await db.query(
      `SELECT source, COUNT(*) AS count
         FROM issues
        WHERE YEAR(created_at) = ?
         GROUP BY source`,
      [targetYear]
    );
    const sourceStats = {};
    sourceRows.forEach(row => {
      sourceStats[row.source] = row.count;
    });

    // 4) 類型分布
    const [typeRows] = await db.query(
      `SELECT issue_type, COUNT(*) AS count
         FROM issues
        WHERE YEAR(created_at) = ?
         GROUP BY issue_type`,
      [targetYear]
    );
    const typeStats = {};
    typeRows.forEach(row => {
      typeStats[row.issue_type] = row.count;
    });

    return res.json({
      year: targetYear,
      totalIssues,
      completed,
      uncompleted,
      sourceStats,
      typeStats,
    });
  } catch (error) {
    console.error("getAnnualSummary error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * getAnnualTrend
 * --------------
 * /api/summaries/annualTrend?year=2025
 * 從 monthly_reports 讀已結束月份
 * 再結合當前 (monthly_summaries) 即時數據組成 1~12 月 (此處僅示範, 未必需要動)
 */
exports.getAnnualTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year || new Date().getFullYear(), 10);

    // 直接从issues表中获取年度数据
    // 1) 获取每月的问题数量和解决数量
    const [monthlyRows] = await db.query(
      `SELECT 
         MONTH(created_at) AS month,
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS resolved
       FROM issues
       WHERE YEAR(created_at) = ?
       GROUP BY MONTH(created_at)
       ORDER BY MONTH(created_at)`,
      [targetYear]
    );

    // 2) 获取年度总计数据
    const [totalRows] = await db.query(
      `SELECT 
         COUNT(*) AS totalCount,
         SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
         SUM(CASE WHEN status != 'Closed' THEN 1 ELSE 0 END) AS pendingCount
       FROM issues
       WHERE YEAR(created_at) = ?`,
      [targetYear]
    );

    const totalCount = totalRows[0]?.totalCount || 0;
    const closedCount = totalRows[0]?.closedCount || 0;
    const pendingCount = totalRows[0]?.pendingCount || 0;
    const resolutionRate = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;

    // 3) 格式化结果
    const monthlyStats = monthlyRows.map(row => ({
      month: row.month,
      total: row.total,
      resolved: row.resolved,
      pending: row.total - row.resolved
    }));

    return res.json({
      year: targetYear,
      months: monthlyStats,
      totalCount,
      closedCount,
      pendingCount,
      resolutionRate
    });
  } catch (error) {
    console.error("getAnnualTrend error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getImmediateAnnualTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year || new Date().getFullYear(), 10);

    // 1) 直接從 issues 表，抓該年每月 Issue 數量
    //    依 MONTH(created_at) 做 group by
    const [rows] = await db.query(
      `SELECT 
         MONTH(created_at) AS month,
         COUNT(*) AS issueCount,
         SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS resolved
       FROM issues
       WHERE YEAR(created_at) = ?
       GROUP BY MONTH(created_at)
       ORDER BY MONTH(created_at)`,
      [targetYear]
    );

    // 2) 獲取年度總計數據
    const [totalRows] = await db.query(
      `SELECT 
         COUNT(*) AS totalCount,
         SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
         SUM(CASE WHEN status != 'Closed' THEN 1 ELSE 0 END) AS pendingCount
       FROM issues
       WHERE YEAR(created_at) = ?`,
      [targetYear]
    );

    const totalCount = totalRows[0]?.totalCount || 0;
    const closedCount = totalRows[0]?.closedCount || 0;
    const pendingCount = totalRows[0]?.pendingCount || 0;
    const resolutionRate = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;

    // 3) 組合成月份數據
    const months = rows.map(r => ({
      month: r.month,
      issueCount: r.issueCount,
      resolved: r.resolved,
      pending: r.issueCount - r.resolved
    }));

    // 4) 回傳
    res.json({
      year: targetYear,
      months,
      totalCount,
      closedCount,
      pendingCount,
      resolutionRate
    });
  } catch (error) {
    console.error("getImmediateAnnualTrend error:", error);
    res.status(500).json({ error: error.message });
  }
};