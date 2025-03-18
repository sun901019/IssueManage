const db = require("../db");

// 1️⃣ 取得所有 Issues
exports.getIssues = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM issues");  // ✅ 改為 await
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
    const { title, description, source, issue_type, status, created_at } = req.body;

    const sql = `
      INSERT INTO issues (title, description, source, issue_type, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const createdValue = created_at || null;  // 如果前端沒傳 `created_at`，設為 null
    const [result] = await db.query(sql, [title, description, source, issue_type, status, createdValue]);

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      source,
      issue_type,
      status,
      created_at: createdValue,
    });
  } catch (error) {
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
