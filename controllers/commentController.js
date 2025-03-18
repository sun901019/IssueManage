const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置multer用於文件上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/comments');
    // 確保目錄存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xlsx|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('僅允許上傳圖片、PDF和Office文件！'));
  }
}).array('attachments', 5); // 最多5個附件

// 获取问题的所有评论
exports.getCommentsByIssueId = async (req, res) => {
  try {
    const issueId = req.params.issueId;
    
    const [comments] = await db.query(
      `SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC`,
      [issueId]
    );
    
    // 處理附件路徑
    const processedComments = comments.map(comment => {
      let attachmentsArray = [];
      // 安全解析 JSON
      if (comment.attachments) {
        try {
          attachmentsArray = JSON.parse(comment.attachments);
        } catch (err) {
          console.error(`Failed to parse attachments for comment ID ${comment.id}:`, err);
          // 使用空數組代替
          attachmentsArray = [];
        }
      }
      
      return {
        ...comment,
        attachments: attachmentsArray
      };
    });
    
    res.json(processedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
};

// 添加評論
exports.addComment = async (req, res) => {
  // 確保上傳目錄存在
  const uploadDir = path.join(__dirname, '../uploads/comments');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      const { issueId, content, createdBy } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: '評論內容不能為空' });
      }
      
      // 處理附件
      const attachments = req.files ? req.files.map(file => ({
        filename: file.originalname,
        path: file.path.replace(/\\/g, '/').split('uploads/')[1], // 存儲相對路徑
        mimetype: file.mimetype
      })) : [];
      
      const [result] = await db.query(
        `INSERT INTO comments (issue_id, content, created_by, attachments) 
         VALUES (?, ?, ?, ?)`,
        [issueId, content, createdBy || 'Anonymous', JSON.stringify(attachments)]
      );
      
      // 獲取新增評論
      const [newComment] = await db.query(
        `SELECT * FROM comments WHERE id = ?`,
        [result.insertId]
      );
      
      // 更新issue的最後更新時間
      try {
        await db.query(
          `UPDATE issues SET updated_at = NOW() WHERE id = ?`,
          [issueId]
        );
      } catch (updateError) {
        console.warn('注意: 無法更新 issue 的更新時間:', updateError.message);
        // 繼續處理，因為這不是致命錯誤
      }
      
      res.status(201).json({
        ...newComment[0],
        attachments
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

// 刪除評論
exports.deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    
    // 先獲取評論信息，以便刪除附件
    const [comment] = await db.query(
      `SELECT * FROM comments WHERE id = ?`,
      [commentId]
    );
    
    if (comment.length === 0) {
      return res.status(404).json({ error: '評論不存在' });
    }
    
    // 安全解析附件 JSON
    let attachments = [];
    try {
      if (comment[0].attachments) {
        attachments = JSON.parse(comment[0].attachments);
      }
    } catch (parseError) {
      console.error(`Failed to parse attachments for comment ID ${commentId} during deletion:`, parseError);
      // 如果解析失敗，使用空數組
      attachments = [];
    }
    
    // 刪除數據庫中的評論
    await db.query(`DELETE FROM comments WHERE id = ?`, [commentId]);
    
    // 刪除關聯的附件文件
    for (const attachment of attachments) {
      try {
        if (attachment && attachment.path) {
          const filePath = path.join(__dirname, '../uploads', attachment.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (fileError) {
        console.error(`Error deleting attachment file: ${fileError.message}`);
        // 繼續處理其他附件
      }
    }
    
    res.json({ message: '評論已成功刪除' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: error.message });
  }
};

// 編輯評論
exports.updateComment = async (req, res) => {
  // 確保上傳目錄存在
  const uploadDir = path.join(__dirname, '../uploads/comments');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      const commentId = req.params.commentId;
      const { content, removeAttachments } = req.body;
      
      // 檢查參數
      if (!commentId) {
        return res.status(400).json({ error: '評論ID不能為空' });
      }
      
      console.log(`嘗試更新評論 ID: ${commentId}, 內容長度: ${content ? content.length : 0}`);
      
      // 获取原评论
      const [existingComment] = await db.query(
        `SELECT * FROM comments WHERE id = ?`,
        [commentId]
      );
      
      if (existingComment.length === 0) {
        return res.status(404).json({ error: '評論不存在' });
      }
      
      console.log(`找到要更新的評論: ${existingComment[0].id}`);
      
      // 安全處理現有附件
      let attachments = [];
      try {
        if (existingComment[0].attachments) {
          attachments = JSON.parse(existingComment[0].attachments);
          console.log(`成功解析附件, 共 ${attachments.length} 個`);
        }
      } catch (parseError) {
        console.error(`無法解析評論 ${commentId} 的附件:`, parseError);
        // 如果解析失敗，使用空數組
        attachments = [];
      }
      
      // 處理需要刪除的附件
      if (removeAttachments) {
        console.log(`處理需要刪除的附件: ${removeAttachments}`);
        let attachmentsToRemove = [];
        try {
          attachmentsToRemove = JSON.parse(removeAttachments);
          console.log(`要刪除 ${attachmentsToRemove.length} 個附件`);
        } catch (parseError) {
          console.error('解析需要刪除的附件時出錯:', parseError);
          attachmentsToRemove = [];
        }
        
        // 從文件系統刪除
        for (const attachmentPath of attachmentsToRemove) {
          try {
            if (attachmentPath) {
              const filePath = path.join(__dirname, '../uploads', attachmentPath);
              console.log(`嘗試刪除文件: ${filePath}`);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`成功刪除文件: ${filePath}`);
              } else {
                console.log(`文件不存在: ${filePath}`);
              }
            }
          } catch (deleteError) {
            console.error(`刪除附件時出錯:`, deleteError);
            // 繼續處理其他附件
          }
        }
        
        // 從附件列表移除
        const originalLength = attachments.length;
        attachments = attachments.filter(a => !attachmentsToRemove.includes(a.path));
        console.log(`從附件列表中移除了 ${originalLength - attachments.length} 個項目`);
      }
      
      // 添加新上傳的附件
      if (req.files && req.files.length > 0) {
        console.log(`有 ${req.files.length} 個新上傳的附件`);
        const newAttachments = req.files.map(file => {
          const relativePath = file.path.replace(/\\/g, '/').split('uploads/')[1];
          console.log(`新附件: ${file.originalname}, 路徑: ${relativePath}`);
          return {
            filename: file.originalname,
            path: relativePath,
            mimetype: file.mimetype
          };
        });
        
        attachments = [...attachments, ...newAttachments];
        console.log(`附件總數現在是 ${attachments.length}`);
      }
      
      // 更新評論內容
      const newContent = content || existingComment[0].content;
      const attachmentsJson = JSON.stringify(attachments);
      
      console.log(`更新評論內容為: ${newContent.substring(0, 30)}...`);
      console.log(`更新附件為: ${attachmentsJson.substring(0, 100)}...`);
      
      // 執行更新
      const [updateResult] = await db.query(
        `UPDATE comments SET 
         content = ?, 
         attachments = ?,
         edited = TRUE,
         updated_at = NOW()
         WHERE id = ?`,
        [
          newContent,
          attachmentsJson,
          commentId
        ]
      );
      
      console.log(`更新結果: 影響的行數 = ${updateResult.affectedRows}`);
      
      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: '無法更新評論，可能不存在或已被刪除' });
      }
      
      // 获取更新后的评论
      const [updatedComment] = await db.query(
        `SELECT * FROM comments WHERE id = ?`,
        [commentId]
      );
      
      if (updatedComment.length === 0) {
        return res.status(404).json({ error: '無法獲取更新後的評論' });
      }
      
      console.log(`成功獲取更新後的評論: ID=${updatedComment[0].id}`);
      
      // 返回結果
      res.json({
        ...updatedComment[0],
        attachments
      });
      
    } catch (error) {
      console.error('更新評論時出錯:', error);
      res.status(500).json({ error: error.message || '更新評論時發生錯誤' });
    }
  });
};

// 下載附件
exports.downloadAttachment = (req, res) => {
  try {
    const { filename } = req.params;
    
    // 安全檢查
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ error: '無效的檔案名稱' });
    }
    
    // 嘗試在不同位置尋找文件
    let filePath = path.join(__dirname, '../uploads/comments', filename);
    
    // 如果文件不存在，嘗試直接在 uploads 目錄中尋找
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../uploads', filename);
    }
    
    // 如果還是不存在，檢查完整路徑
    if (!fs.existsSync(filePath) && filename.includes('/')) {
      filePath = path.join(__dirname, '../uploads', filename);
    }
    
    if (!fs.existsSync(filePath)) {
      console.error(`找不到附件: ${filename}`);
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('下載文件時出錯:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '下載文件時出錯' });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: error.message });
  }
}; 