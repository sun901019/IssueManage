const db = require("../db");

/**
 * 獲取問題列表，支持篩選和分頁
 */
exports.getIssues = async (req, res) => {
  try {
    // 解析請求參數
    const { 
      search, status, source, issue_type, 
      date_from, date_to, 
      sort_by = 'created_at', 
      sort_direction = 'desc',
      page = 1, 
      limit = 10 
    } = req.query;
    
    // 計算分頁偏移量
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 構建 SQL 查詢參數
    let params = [];
    
    // 構建 WHERE 子句
    let whereClause = [];
    
    // 關鍵字搜索 (標題或描述)
    if (search) {
      whereClause.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 狀態篩選
    if (status) {
      whereClause.push('status = ?');
      params.push(status);
    }
    
    // 來源篩選
    if (source) {
      whereClause.push('source = ?');
      params.push(source);
    }
    
    // 問題類型篩選
    if (issue_type) {
      whereClause.push('issue_type = ?');
      params.push(issue_type);
    }
    
    // 日期範圍篩選
    if (date_from) {
      whereClause.push('DATE(created_at) >= ?');
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause.push('DATE(created_at) <= ?');
      params.push(date_to);
    }
    
    // 組合 WHERE 子句
    const whereSQL = whereClause.length > 0 
      ? `WHERE ${whereClause.join(' AND ')}` 
      : '';
    
    // 驗證排序字段 (防止 SQL 注入)
    const validSortFields = ['id', 'title', 'status', 'source', 'issue_type', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    
    // 驗證排序方向
    const sortDir = sort_direction === 'asc' ? 'ASC' : 'DESC';
    
    // 構建SQL查詢
    const sql = `
      SELECT *
      FROM issues
      ${whereSQL}
      ORDER BY ${sortField} ${sortDir}
      LIMIT ? OFFSET ?
    `;
    
    // 添加分頁參數
    params.push(parseInt(limit), offset);
    
    // 執行查詢
    const [issues] = await db.query(sql, params);
    
    // 獲取總記錄數以計算總頁數
    const countSql = `
      SELECT COUNT(*) as total
      FROM issues
      ${whereSQL}
    `;
    
    const [countResult] = await db.query(countSql, params.slice(0, -2));
    const total = countResult[0].total;
    
    // 構建分頁信息
    const pagination = {
      total,
      current_page: parseInt(page),
      per_page: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    };
    
    // 返回結果
    res.json({
      issues,
      pagination
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
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

// 4️⃣ 更新 Issue
exports.updateIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, source, issue_type } = req.body;
    
    console.log(`嘗試更新 Issue (ID: ${id}): `, req.body);

    // 構建更新字段
    const updateFields = [];
    const params = [];

    // 檢查是否有提供各字段，有則添加到更新列表
    if (status !== undefined) {
      console.log(`更新狀態: ${status}`);
      updateFields.push('status = ?');
      params.push(status);
    }

    if (title !== undefined) {
      console.log(`更新標題: ${title}`);
      updateFields.push('title = ?');
      params.push(title);
    }

    if (description !== undefined) {
      console.log(`更新描述: 長度 ${description?.length || 0} 字符`);
      updateFields.push('description = ?');
      params.push(description);
    }

    if (source !== undefined) {
      // 檢查 source 是否為有效的枚舉值
      const validSources = ['業務', 'Line chat', '現場'];
      if (!validSources.includes(source)) {
        console.error(`嘗試更新無效的 source 值: "${source}", 有效值應為: ${validSources.join(', ')}`);
        return res.status(400).json({ 
          error: `無效的來源值。允許的值為: ${validSources.join(', ')}`,
          providedValue: source
        });
      }
      
      console.log(`更新來源: ${source}`);
      updateFields.push('source = ?');
      params.push(source);
    }

    if (issue_type !== undefined) {
      console.log(`更新問題類型: ${issue_type}`);
      updateFields.push('issue_type = ?');
      params.push(issue_type);
    }

    // 添加更新時間
    updateFields.push('updated_at = NOW()');

    // 如果沒有任何字段要更新，則返回錯誤
    if (updateFields.length === 0) {
      console.log('更新請求沒有提供任何更新字段');
      return res.status(400).json({ error: "沒有提供任何更新字段" });
    }

    // 構建 SQL 語句
    const sql = `UPDATE issues SET ${updateFields.join(', ')} WHERE id = ?`;
    params.push(id);
    
    console.log(`執行 SQL: ${sql}`);
    console.log(`參數值: ${params.join(', ')}`);

    const [result] = await db.query(sql, params);
    console.log(`更新結果: ${JSON.stringify(result)}`);

    if (result.affectedRows === 0) {
      console.log(`找不到 ID 為 ${id} 的 Issue`);
      return res.status(404).json({ error: "找不到該 Issue，無法更新" });
    }
    
    // 獲取更新後的 issue
    const [updatedIssue] = await db.query("SELECT * FROM issues WHERE id = ?", [id]);
    console.log(`更新成功，返回更新後的資料`);
    
    res.json(updatedIssue[0]);
  } catch (error) {
    console.error('更新 Issue 失敗:', error);
    res.status(500).json({ error: error.message });
  }
};
