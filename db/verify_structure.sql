-- 检查issues表是否存在
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'issues';

-- 获取issues表的列信息
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'issues'
ORDER BY ORDINAL_POSITION;

-- 检查是否有warranty_end_date列
SELECT COUNT(*) as has_warranty_end_date
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'issues'
AND COLUMN_NAME = 'warranty_end_date';

-- 检查是否还有priority和estimated_hours列
SELECT COUNT(*) as has_old_columns
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'issues'
AND COLUMN_NAME IN ('priority', 'estimated_hours'); 