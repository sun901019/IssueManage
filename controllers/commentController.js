const db = require('../db');
const fs = require('fs');
const path = require('path');

// 獲取特定問題的所有評論
exports.getCommentsByIssueId = async (req, res) => {
  try {
    const { issueId } = req.params;
    console.log('獲取問題評論，問題ID:', issueId);
    
    const [comments] = await db.query(
      'SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at DESC',
      [issueId]
    );
    
    console.log(`找到 ${comments.length} 條評論`);
    res.json(comments);
  } catch (error) {
    console.error('獲取評論失敗:', error);
    res.status(500).json({ error: error.message });
  }
};

// 添加新評論
exports.addComment = async (req, res) => {
  try {
    // 記錄完整請求內容，幫助調試
    console.log('收到評論POST請求:');
    console.log('- Body:', req.body);
    console.log('- 文件:', req.files);
    console.log('- Headers:', req.headers);
    
    // 檢查所有可能的參數格式
    let issue_id = req.body.issue_id;
    const content = req.body.content;
    const created_by = req.body.author || req.body.created_by || 'Anonymous';
    
    if (!issue_id || !content) {
      console.error('缺少必要參數:', { issue_id, content });
      return res.status(400).json({ 
        error: '缺少必要參數 issue_id 或 content',
        received: {
          issue_id,
          content_length: content ? content.length : 0,
          body: req.body
        }
      });
    }
    
    // 將 issue_id 轉換為數字
    issue_id = parseInt(issue_id, 10);
    if (isNaN(issue_id)) {
      console.error('無效的 issue_id:', req.body.issue_id);
      return res.status(400).json({ error: '無效的 issue_id' });
    }
    
    // 處理附件
    let attachments = null;
    if (req.files && req.files.length > 0) {
      attachments = JSON.stringify(req.files.map(file => ({
        filename: file.originalname,
        path: file.filename,
        size: file.size,
        mimetype: file.mimetype
      })));
    }
    
    console.log('處理評論請求:', { issue_id, content, created_by, attachments });
    
    const [result] = await db.query(
      'INSERT INTO comments (issue_id, content, created_by, created_at, attachments) VALUES (?, ?, ?, NOW(), ?)',
      [issue_id, content, created_by, attachments]
    );
    
    const [newComment] = await db.query(
      'SELECT * FROM comments WHERE id = ?',
      [result.insertId]
    );
    
    console.log('評論添加成功，ID:', result.insertId);
    res.status(201).json(newComment[0]);
  } catch (error) {
    console.error('添加評論失敗:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
};

// 更新評論
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('============= 更新評論詳細診斷 =============');
    console.log('評論ID:', id);
    console.log('請求標頭:', req.headers);
    console.log('請求主體:', req.body);
    console.log('請求方法:', req.method);
    
    // 確保正確解析了内容
    let content = null;
    
    // 嘗試從不同可能的格式獲取內容
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        content = parsed.content;
        console.log('從字符串解析JSON獲取內容:', content);
      } catch (e) {
        console.log('無法解析請求主體為JSON:', e.message);
      }
    } else if (req.body && typeof req.body === 'object') {
      content = req.body.content;
      console.log('從對象直接獲取內容:', content);
    }
    
    if (!content) {
      console.log('無法找到有效內容，請求格式可能不正確');
      return res.status(400).json({ 
        error: '缺少必要參數 content',
        body: req.body,
        bodyType: typeof req.body
      });
    }
    
    // 檢查資料庫結構並嘗試找到可能的問題
    try {
      const [columns] = await db.query('SHOW COLUMNS FROM comments');
      console.log('comments 表結構:');
      columns.forEach(col => {
        console.log(`- ${col.Field} (${col.Type}, ${col.Null === 'YES' ? '允許 NULL' : '不允許 NULL'})`);
      });
      
      // 檢查評論是否存在
      const [comment] = await db.query('SELECT * FROM comments WHERE id = ?', [id]);
      if (comment.length === 0) {
        console.log('找不到 ID 為', id, '的評論');
        return res.status(404).json({ error: '找不到該評論' });
      } else {
        console.log('找到評論:', comment[0]);
      }
    } catch (err) {
      console.error('查詢資料表結構失敗:', err);
    }
    
    // 嘗試直接執行 SQL 更新
    try {
      console.log('執行更新 SQL...');
      const updateSql = 'UPDATE comments SET content = ?, edited = 1 WHERE id = ?';
      console.log('SQL:', updateSql);
      console.log('參數:', [content, id]);
      
      const [result] = await db.query(updateSql, [content, id]);
      console.log('更新結果:', result);
      
      if (result.affectedRows === 0) {
        console.log('更新失敗：沒有記錄被修改');
        return res.status(500).json({ 
          error: '更新失敗，沒有記錄被修改',
          params: { id, content }
        });
      } else {
        // 檢索更新後的評論
        const [updatedComment] = await db.query('SELECT * FROM comments WHERE id = ?', [id]);
        
        if (updatedComment.length === 0) {
          console.log('更新後找不到評論');
          return res.status(404).json({ error: '更新後找不到評論' });
        }
        
        console.log('評論更新成功:', updatedComment[0]);
        return res.json(updatedComment[0]);
      }
    } catch (err) {
      console.error('SQL 執行錯誤:', err);
      return res.status(500).json({
        error: '執行更新失敗: ' + err.message,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState,
        errno: err.errno
      });
    }
  } catch (error) {
    console.error('更新評論總體失敗:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
};

// 刪除評論
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 獲取評論信息（包括附件）
    const [comment] = await db.query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );
    
    if (comment.length === 0) {
      return res.status(404).json({ error: '找不到該評論' });
    }
    
    // 刪除附件文件
    if (comment[0].attachments) {
      try {
        const attachments = JSON.parse(comment[0].attachments);
        attachments.forEach(attachment => {
          const filePath = path.join(__dirname, '../uploads', attachment.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('從磁盤刪除文件:', filePath);
          }
        });
      } catch (err) {
        console.error('刪除附件文件失敗:', err);
      }
    }
    
    // 刪除評論記錄
    const [result] = await db.query(
      'DELETE FROM comments WHERE id = ?',
      [id]
    );
    
    console.log('評論刪除成功，ID:', id);
    res.json({ message: '評論刪除成功' });
  } catch (error) {
    console.error('刪除評論失敗:', error);
    res.status(500).json({ error: error.message });
  }
}; 