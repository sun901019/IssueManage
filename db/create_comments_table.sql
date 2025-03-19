CREATE TABLE IF NOT EXISTS `comments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `issue_id` INT(11) NOT NULL,
  `content` TEXT NOT NULL,
  `author` VARCHAR(100) DEFAULT 'Anonymous',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `attachments` JSON DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `issue_id` (`issue_id`),
  CONSTRAINT `comments_issue_fk` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 