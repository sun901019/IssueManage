const mongoose = require('mongoose');

// 如果使用 MongoDB
const CommentSchema = new mongoose.Schema({
  issueId: { 
    type: Number, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  createdBy: { 
    type: String, 
    default: 'Anonymous' 
  },
  attachments: [{ 
    filename: String, 
    path: String,
    mimetype: String
  }],
  edited: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Comment', CommentSchema);

// 如果使用 MySQL，可以在 db.js 中創建這個表
/*
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  content TEXT NOT NULL,
  created_by VARCHAR(100) DEFAULT 'Anonymous',
  attachments JSON,
  edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);
*/ 