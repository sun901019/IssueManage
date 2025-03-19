-- 检查warranty_end_date列是否存在，如果不存在则添加
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues' 
  AND COLUMN_NAME = 'warranty_end_date'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE issues ADD COLUMN warranty_end_date DATE DEFAULT NULL COMMENT "保固到期日"', 
  'SELECT "warranty_end_date列已存在" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 确认列信息
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'issues'
ORDER BY ORDINAL_POSITION; 