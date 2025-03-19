-- 修復issues表結構，添加缺少的欄位

-- 首先添加缺少的必要欄位
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `priority` VARCHAR(10) DEFAULT '中' COMMENT '優先級：高、中、低';
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `estimated_hours` DECIMAL(5,1) DEFAULT NULL COMMENT '預估處理時數';
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `assigned_to` VARCHAR(100) DEFAULT NULL COMMENT '負責處理人員';
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `year` INT GENERATED ALWAYS AS (YEAR(created_at)) STORED COMMENT '年份，用於統計';
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `month` INT GENERATED ALWAYS AS (MONTH(created_at)) STORED COMMENT '月份，用於統計';

-- 添加索引以加速查詢
ALTER TABLE `issues` ADD INDEX IF NOT EXISTS `idx_issues_year` (`year`);
ALTER TABLE `issues` ADD INDEX IF NOT EXISTS `idx_issues_month` (`month`);
ALTER TABLE `issues` ADD INDEX IF NOT EXISTS `idx_issues_source` (`source`);
ALTER TABLE `issues` ADD INDEX IF NOT EXISTS `idx_issues_issue_type` (`issue_type`);
ALTER TABLE `issues` ADD INDEX IF NOT EXISTS `idx_issues_status` (`status`);
ALTER TABLE `issues` ADD INDEX IF NOT EXISTS `idx_issues_priority` (`priority`);
ALTER TABLE `issues` ADD INDEX IF NOT EXISTS `idx_issues_assigned_to` (`assigned_to`);

-- 檢查添加結果
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  COLUMN_DEFAULT, 
  IS_NULLABLE, 
  COLUMN_COMMENT
FROM 
  information_schema.COLUMNS 
WHERE 
  TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'issues'; 