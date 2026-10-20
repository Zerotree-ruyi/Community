-- ============================================
-- 2026_member_login_ip_chain.sql
--
-- 1) members 加 first_login_ip 列(首次注册的 IP,和 first_login_time 配对)
-- 2) last_login_ip 从 VARCHAR(45) 加宽到 VARCHAR(255)
--    —— 原来 45 字符只放得下单个 IP,但双栈客户端的 IP 链是
--       "2409:40e0:1021:e559:8000::, 104.22.14.8"(最长能到 55+ 字符),
--       45 会被截断
--
-- 幂等:列已存在就跳过,加宽用 MODIFY 重复执行无副作用。
-- 顺序无关:本文件自己保证 first_login_time 存在(不依赖别的迁移先跑)。
--
-- 用法:
--   mysql -uroot -p zero < migrations/2026_member_login_ip_chain.sql
-- ============================================

-- 1) 确保 first_login_time 存在(不依赖 2026_member_first_login.sql 先跑)
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'members'
     AND COLUMN_NAME  = 'first_login_time'
);

SET @sql := IF(@col = 0,
  'ALTER TABLE `members` ADD COLUMN `first_login_time` DATETIME DEFAULT NULL COMMENT ''首次注册时间'' AFTER `register_time`',
  'DO 0');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 加 first_login_ip
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'members'
     AND COLUMN_NAME  = 'first_login_ip'
);

SET @sql := IF(@col = 0,
  'ALTER TABLE `members` ADD COLUMN `first_login_ip` VARCHAR(255) DEFAULT NULL COMMENT ''首次注册地址'' AFTER `first_login_time`',
  'DO 0');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) last_login_ip 加宽到 255
ALTER TABLE `members`
  MODIFY COLUMN `last_login_ip` VARCHAR(255) DEFAULT NULL COMMENT '最后登录地址';

-- 4) 历史会员:有首次登录时间但没记录过 IP 的,先用最后登录 IP 兜底
UPDATE `members`
   SET `first_login_ip` = `last_login_ip`
 WHERE `first_login_ip` IS NULL
   AND `last_login_ip` IS NOT NULL;

-- 5) 历史会员:连最后登录 IP 都没有的,首次 IP 留 NULL(后台显示 "—")
