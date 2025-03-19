-- 1. 检查并添加warranty_end_date列
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'warranty_end_date') = 0, 
               'ALTER TABLE issues ADD COLUMN warranty_end_date DATE DEFAULT NULL COMMENT "保固到期日"', 
               'SELECT "warranty_end_date column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 确保我们拥有所需的所有列
ALTER TABLE issues
MODIFY COLUMN title VARCHAR(255) NOT NULL COMMENT '問題標題',
MODIFY COLUMN description TEXT DEFAULT NULL COMMENT '問題描述',
MODIFY COLUMN source VARCHAR(50) DEFAULT NULL COMMENT '來源',
MODIFY COLUMN issue_type VARCHAR(50) DEFAULT NULL COMMENT '問題類型',
MODIFY COLUMN status VARCHAR(20) DEFAULT 'Pending' COMMENT '狀態',
MODIFY COLUMN assigned_to VARCHAR(50) DEFAULT NULL COMMENT '負責人',
MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
MODIFY COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間';

-- 添加年份和月份派生列（如果不存在）
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'year') = 0, 
               'ALTER TABLE issues ADD COLUMN year INT AS (YEAR(created_at)) STORED COMMENT "年份，用于报表"', 
               'SELECT "year column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'month') = 0, 
               'ALTER TABLE issues ADD COLUMN month INT AS (MONTH(created_at)) STORED COMMENT "月份，用于报表"', 
               'SELECT "month column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 移除priority列（如果存在）
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'priority') > 0, 
               'ALTER TABLE issues DROP COLUMN priority', 
               'SELECT "priority column does not exist" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 移除estimated_hours列（如果存在）
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'estimated_hours') > 0, 
               'ALTER TABLE issues DROP COLUMN estimated_hours', 
               'SELECT "estimated_hours column does not exist" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 检查表结构
DESCRIBE issues; 