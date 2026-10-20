-- ============================================
-- 2026_member_first_login.sql
--
-- 给 members 表加"首次登录时间"列。
-- 之前只有 last_login_time / last_login_ip,后台编辑弹窗没法展示
-- 首次登录时间(会员到底是哪天第一次登进来的)。
--
-- 幂等:重复执行不会报错(列已存在就跳过)。
--
-- 用法:
--   mysql -uroot -p zero < migrations/2026_member_first_login.sql
-- ============================================

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'members'
     AND COLUMN_NAME  = 'first_login_time'
);

SET @sql := IF(@col = 0,
  'ALTER TABLE `members` ADD COLUMN `first_login_time` DATETIME DEFAULT NULL COMMENT ''首次登录时间'' AFTER `register_time`',
  'DO 0');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 历史会员从没记录过首次登录 — 用注册时间兜底(注册了就是第一次进系统的入口)
UPDATE `members`
   SET `first_login_time` = `register_time`
 WHERE `first_login_time` IS NULL
   AND `last_login_time` IS NOT NULL;
