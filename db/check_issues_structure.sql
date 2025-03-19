-- 檢查 issues 表的結構
DESCRIBE issues;

-- 檢查是否有缺少的列
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'missing'
    ELSE 'exists'
  END AS id_column
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues' 
  AND COLUMN_NAME = 'id';

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'missing'
    ELSE 'exists'
  END AS title_column
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues' 
  AND COLUMN_NAME = 'title';

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'missing'
    ELSE 'exists'
  END AS priority_column
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues' 
  AND COLUMN_NAME = 'priority';

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'missing'
    ELSE 'exists'
  END AS estimated_hours_column
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues' 
  AND COLUMN_NAME = 'estimated_hours';

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'missing'
    ELSE 'exists'
  END AS assigned_to_column
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues' 
  AND COLUMN_NAME = 'assigned_to';

-- 檢查缺少的索引
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'missing'
    ELSE 'exists'
  END AS status_index
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues' 
  AND INDEX_NAME = 'idx_issues_status';

-- 測試插入數據
-- INSERT INTO issues (title, description, source, issue_type, status)
-- VALUES ('Test Issue', 'This is a test issue', 'Line chat', '系統功能', 'Pending'); 