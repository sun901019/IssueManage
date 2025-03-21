-- 添加新欄位到 issues 表
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `priority` VARCHAR(10) DEFAULT '中' COMMENT '優先級：高、中、低';
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `estimated_hours` DECIMAL(5,1) DEFAULT NULL COMMENT '預估處理時數';
ALTER TABLE `issues` ADD COLUMN IF NOT EXISTS `assigned_to` VARCHAR(100) DEFAULT NULL COMMENT '負責處理人員';

-- 添加年度欄位，用於統計和報表
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

-- 如果需要修改現有欄位的結構，可以使用如下命令
-- ALTER TABLE `issues` MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'Pending' COMMENT '問題狀態'; 