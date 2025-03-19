-- 添加缺失的列到issues表
-- 首先检查列是否存在，然后添加
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'priority') = 0, 
                'ALTER TABLE issues ADD COLUMN priority VARCHAR(10) DEFAULT "中" COMMENT "问题优先级"', 
                'SELECT "priority column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'estimated_hours') = 0, 
                'ALTER TABLE issues ADD COLUMN estimated_hours DECIMAL(5,2) DEFAULT NULL COMMENT "预估处理时数"', 
                'SELECT "estimated_hours column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'assigned_to') = 0, 
                'ALTER TABLE issues ADD COLUMN assigned_to VARCHAR(50) DEFAULT NULL COMMENT "负责人"', 
                'SELECT "assigned_to column already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加GENERATED列，如果MySQL版本支持的话
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

-- 检查表结构
DESCRIBE issues; 