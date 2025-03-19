const db = require("../db");

// 1️⃣ 取得所有 Issues
exports.getIssues = async (req, res) => {
  try {
    // 處理查詢參數
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const sort = req.query.sort || null;

    let sql = "SELECT * FROM issues";
    const params = [];

    // 處理排序
    if (sort) {
      const [field, order] = sort.split(':');
      const validFields = ['id', 'title', 'status', 'created_at', 'updated_at', 'source', 'issue_type'];
      const validOrders = ['asc', 'desc'];
      
      if (validFields.includes(field) && validOrders.includes(order?.toLowerCase())) {
        sql += ` ORDER BY ${field} ${order}`;
      }
    }

    // 處理限制
    if (limit && Number.isInteger(limit) && limit > 0) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const [results] = await db.query(sql, params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2️⃣ 刪除 Issue
exports.deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM issues WHERE id = ?", [id]);  // ✅ 改為 await
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "找不到該 Issue，無法刪除" });
    }
    res.json({ message: "Issue 刪除成功" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3️⃣ 新增 Issue
exports.addIssue = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      source, 
      issue_type, 
      status, 
      created_at,
      warranty_end_date,
      assigned_to
    } = req.body;

    console.log('添加新問題:', req.body);

    // 檢查必要欄位
    if (!title) {
      return res.status(400).json({ error: '標題為必填欄位' });
    }

    const sql = `
      INSERT INTO issues (
        title, description, source, issue_type, status, created_at,
        warranty_end_date, assigned_to
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const createdValue = created_at || null;  // 如果前端沒傳 `created_at`，設為 null
    
    const [result] = await db.query(sql, [
      title, 
      description || null, 
      source, 
      issue_type || null, 
      status, 
      createdValue,
      warranty_end_date || null,
      assigned_to || null
    ]);

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      source,
      issue_type,
      status,
      created_at: createdValue,
      warranty_end_date,
      assigned_to
    });
  } catch (error) {
    console.error('新增問題失敗:', error);
    res.status(500).json({ error: error.message });
  }
};

// 4️⃣ 更新 Issue 狀態
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const [result] = await db.query("UPDATE issues SET status = ? WHERE id = ?", [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "找不到該 Issue，無法更新" });
    }
    
    res.json({ message: "Issue 更新成功" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5️⃣ 完整更新 Issue (包括所有欄位)
exports.updateIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      source, 
      issue_type, 
      status,
      warranty_end_date,
      assigned_to
    } = req.body;
    
    console.log(`更新問題 ID: ${id}`, req.body);
    
    // 檢查必要欄位
    if (!title) {
      return res.status(400).json({ error: "標題為必填欄位" });
    }
    
    // 構建更新 SQL
    const sql = `
      UPDATE issues 
      SET title = ?, 
          description = ?, 
          source = ?, 
          issue_type = ?, 
          status = ?, 
          warranty_end_date = ?,
          assigned_to = ?,
          updated_at = NOW() 
      WHERE id = ?
    `;
    
    const [result] = await db.query(sql, [
      title, 
      description || null, 
      source, 
      issue_type || null, 
      status,
      warranty_end_date || null,
      assigned_to || null,
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "找不到該 Issue，無法更新" });
    }
    
    // 獲取更新後的問題
    const [updatedIssue] = await db.query("SELECT * FROM issues WHERE id = ?", [id]);
    
    res.json(updatedIssue[0]);
  } catch (error) {
    console.error("完整更新問題失敗:", error);
    res.status(500).json({ error: error.message });
  }
};

// 6️⃣ 取得 Issues 統計數據
exports.getIssueStats = async (req, res) => {
  try {
    console.log('獲取問題統計數據');
    
    // 查詢問題總數
    const [totalResult] = await db.query("SELECT COUNT(*) as totalIssues FROM issues");
    const totalIssues = totalResult[0].totalIssues;
    
    // 查詢各種狀態的問題數量
    const [statusResults] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingIssues,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgressIssues,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closedIssues
      FROM issues
    `);
    
    // 準備響應數據
    const stats = {
      totalIssues,
      pendingIssues: statusResults[0].pendingIssues || 0,
      inProgressIssues: statusResults[0].inProgressIssues || 0,
      closedIssues: statusResults[0].closedIssues || 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('獲取問題統計數據失敗:', error);
    res.status(500).json({ error: error.message });
  }
};
