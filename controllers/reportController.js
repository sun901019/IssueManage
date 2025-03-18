// backend/controllers/reportController.js

const db = require("../db");
const ExcelJS = require("exceljs");
const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const path = require('path');

// 1. 取得月報數據
exports.getMonthlyReport = (req, res) => {
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
exports.exportReport = async (req, res) => {
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

/**
 * 生成Excel報表
 */
exports.generateExcelReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // 驗證參數
    if (!month || !year) {
      return res.status(400).json({ error: '請提供月份和年份' });
    }
    
    // 查詢數據
    let sql = `
      SELECT * 
      FROM issues 
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      ORDER BY created_at DESC
    `;
    
    const [issues] = await db.query(sql, [month, year]);
    
    // 創建工作簿和工作表
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`問題報表 ${year}-${month}`);
    
    // 設置列標題
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '標題', key: 'title', width: 30 },
      { header: '描述', key: 'description', width: 40 },
      { header: '來源', key: 'source', width: 15 },
      { header: '問題類型', key: 'issue_type', width: 15 },
      { header: '狀態', key: 'status', width: 15 },
      { header: '創建日期', key: 'created_at', width: 20 },
      { header: '更新日期', key: 'updated_at', width: 20 }
    ];
    
    // 添加標題樣式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // 添加數據
    issues.forEach(issue => {
      worksheet.addRow({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        source: issue.source,
        issue_type: issue.issue_type,
        status: issue.status,
        created_at: issue.created_at ? new Date(issue.created_at).toLocaleString() : '',
        updated_at: issue.updated_at ? new Date(issue.updated_at).toLocaleString() : ''
      });
    });
    
    // 生成摘要統計
    const summarySheet = workbook.addWorksheet('數據摘要');
    
    // 統計問題狀態
    const statusCounts = {};
    const typeCounts = {};
    const sourceCounts = {};
    
    issues.forEach(issue => {
      // 狀態統計
      statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
      
      // 類型統計
      typeCounts[issue.issue_type] = (typeCounts[issue.issue_type] || 0) + 1;
      
      // 來源統計
      sourceCounts[issue.source] = (sourceCounts[issue.source] || 0) + 1;
    });
    
    // 添加統計到摘要工作表
    summarySheet.columns = [
      { header: '類別', key: 'category', width: 15 },
      { header: '值', key: 'value', width: 15 },
      { header: '數量', key: 'count', width: 10 }
    ];
    
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // 添加狀態統計
    let rowIndex = 2;
    summarySheet.addRow({ category: '問題總數', value: '', count: issues.length });
    rowIndex++;
    
    summarySheet.addRow({ category: '問題狀態', value: '', count: '' });
    rowIndex++;
    Object.entries(statusCounts).forEach(([status, count]) => {
      summarySheet.addRow({ category: '', value: status, count });
      rowIndex++;
    });
    
    summarySheet.addRow({ category: '問題類型', value: '', count: '' });
    rowIndex++;
    Object.entries(typeCounts).forEach(([type, count]) => {
      summarySheet.addRow({ category: '', value: type || '未分類', count });
      rowIndex++;
    });
    
    summarySheet.addRow({ category: '來源', value: '', count: '' });
    rowIndex++;
    Object.entries(sourceCounts).forEach(([source, count]) => {
      summarySheet.addRow({ category: '', value: source, count });
      rowIndex++;
    });
    
    // 設置回應頭
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="issue-report-${year}-${month}.xlsx"`);
    
    // 寫入響應
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 生成PDF報表
 */
exports.generatePdfReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // 驗證參數
    if (!month || !year) {
      return res.status(400).json({ error: '請提供月份和年份' });
    }
    
    // 查詢數據
    let sql = `
      SELECT * 
      FROM issues 
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      ORDER BY created_at DESC
    `;
    
    const [issues] = await db.query(sql, [month, year]);
    
    // 生成PDF檔案名稱
    const fileName = `issue-report-${year}-${month}.pdf`;
    const filePath = path.join(__dirname, '../temp', fileName);
    
    // 確保temp目錄存在
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
    }
    
    // 創建PDF文檔
    const doc = new PDFDocument({ margin: 30, size: 'A4', bufferPages: true });
    
    // 寫入到檔案
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    
    // 添加標題
    doc.fontSize(20).text(`問題報表 ${year}年${month}月`, { align: 'center' });
    doc.moveDown();
    
    // 添加報表生成時間
    doc.fontSize(10).text(`報表生成時間: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();
    
    // 添加摘要統計
    doc.fontSize(16).text('摘要統計', { underline: true });
    doc.moveDown();
    
    // 統計問題狀態
    const statusCounts = {};
    const typeCounts = {};
    const sourceCounts = {};
    
    issues.forEach(issue => {
      // 狀態統計
      statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
      
      // 類型統計
      typeCounts[issue.issue_type] = (typeCounts[issue.issue_type] || 0) + 1;
      
      // 來源統計
      sourceCounts[issue.source] = (sourceCounts[issue.source] || 0) + 1;
    });
    
    // 添加問題總數
    doc.fontSize(12).text(`問題總數: ${issues.length}`);
    doc.moveDown();
    
    // 狀態統計表格
    const statusTable = {
      title: "問題狀態統計",
      headers: ["狀態", "數量", "百分比"],
      rows: Object.entries(statusCounts).map(([status, count]) => [
        status,
        count.toString(),
        `${((count / issues.length) * 100).toFixed(1)}%`
      ])
    };
    
    await doc.table(statusTable, { 
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: () => doc.font('Helvetica').fontSize(10)
    });
    doc.moveDown();
    
    // 類型統計表格
    const typeTable = {
      title: "問題類型統計",
      headers: ["類型", "數量", "百分比"],
      rows: Object.entries(typeCounts).map(([type, count]) => [
        type || '未分類',
        count.toString(),
        `${((count / issues.length) * 100).toFixed(1)}%`
      ])
    };
    
    await doc.table(typeTable, { 
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: () => doc.font('Helvetica').fontSize(10)
    });
    doc.moveDown();
    
    // 來源統計表格
    const sourceTable = {
      title: "問題來源統計",
      headers: ["來源", "數量", "百分比"],
      rows: Object.entries(sourceCounts).map(([source, count]) => [
        source,
        count.toString(),
        `${((count / issues.length) * 100).toFixed(1)}%`
      ])
    };
    
    await doc.table(sourceTable, { 
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: () => doc.font('Helvetica').fontSize(10)
    });
    doc.moveDown(2);
    
    // 問題詳細列表
    doc.addPage();
    doc.fontSize(16).text('問題詳細清單', { underline: true });
    doc.moveDown();
    
    // 問題表格數據
    const issuesTableData = issues.map(issue => [
      issue.id.toString(),
      issue.title,
      issue.status,
      issue.issue_type || '未分類',
      issue.source,
      new Date(issue.created_at).toLocaleDateString()
    ]);
    
    // 如果有數據，創建表格
    if (issuesTableData.length > 0) {
      const issuesTable = {
        title: "問題列表",
        headers: ["ID", "標題", "狀態", "類型", "來源", "創建日期"],
        rows: issuesTableData
      };
      
      await doc.table(issuesTable, { 
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
        prepareRow: () => doc.font('Helvetica').fontSize(10)
      });
    } else {
      doc.text('此時間段內沒有問題記錄');
    }
    
    // 添加頁碼
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(10).text(
        `第 ${i + 1} 頁 / 共 ${range.count} 頁`,
        doc.page.margins.left,
        doc.page.height - doc.page.margins.bottom - 20,
        { align: 'center' }
      );
    }
    
    // 完成PDF生成
    doc.end();
    
    // 等待文件寫入完成
    writeStream.on('finish', () => {
      // 設置回應頭
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // 發送檔案
      fs.createReadStream(filePath).pipe(res);
      
      // 設置定時器刪除臨時檔案
      setTimeout(() => {
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      }, 5000); // 5秒後刪除
    });
    
    writeStream.on('error', (err) => {
      console.error('Error writing PDF:', err);
      res.status(500).json({ error: '生成 PDF 報表時發生錯誤' });
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: error.message });
  }
};
