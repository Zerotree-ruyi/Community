-- ============================================
-- 2026_admin_session_token.sql
-- 后台登录令牌 —— 取代「谁都能填」的 X-Admin-Id 头
--
-- 背景:
--   以前后台接口只认 header `X-Admin-Id`,而这个头是前端随便填的。
--   公网上任何人加一句 `X-Admin-Id: 1` 就是超级管理员 —— 免密可读可写。
--
-- 改法:
--   登录时后端签发一个随机令牌存进 session_token,
--   之后每个请求带 `Authorization: Bearer <令牌>`,后端按令牌认人。
--   session_expires_at: 令牌过期时间(默认 12 小时,过期要重新登录)
--   session_ip:        签发时的客户端 IP(审计用)
--
-- 注意:这个脚本是幂等的 —— 列已存在就跳过,可以重复执行。
-- ============================================

SET @db := DATABASE();

-- 1) session_token
SET @stmt := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'session_token'),
  'SELECT 1',
  'ALTER TABLE `admin_users` ADD COLUMN `session_token` VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''登录令牌(空=未登录)'''
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) session_expires_at
SET @stmt := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'session_expires_at'),
  'SELECT 1',
  'ALTER TABLE `admin_users` ADD COLUMN `session_expires_at` DATETIME DEFAULT NULL COMMENT ''令牌过期时间'''
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 3) session_ip
SET @stmt := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'session_ip'),
  'SELECT 1',
  'ALTER TABLE `admin_users` ADD COLUMN `session_ip` VARCHAR(45) NOT NULL DEFAULT '''' COMMENT ''签发时客户端 IP'''
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
