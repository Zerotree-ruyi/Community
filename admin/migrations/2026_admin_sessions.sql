-- ============================================
-- 2026_admin_sessions.sql
-- 后台多设备同时登录 —— 令牌不再存在 admin_users 的单列里
--
-- 背景:
--   以前令牌存在 admin_users.session_token 这一个字段上,一个账号只能有一个令牌。
--   所以「在 A 台后台登录」会把「B 台后台」的登录顶掉,后台页面数据突然全空、
--   刷新就回到登录页 —— 后端拿不到令牌了,但列表接口只返回空数组不报错,
--   所以看不出原因。
--
-- 改法:
--   令牌挪到 admin_sessions 表,一个账号可以同时有多个令牌,
--   每台设备一个,互不影响。admin_users.session_token 继续写(兼容老程序),
--   但认人时优先查新表。
--
-- 注意:这个脚本是幂等的 —— 表已存在就跳过,可以重复执行。
-- ============================================

SET @db := DATABASE();

SET @stmt := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'admin_sessions'),
  'SELECT 1',
  'CREATE TABLE IF NOT EXISTS `admin_sessions` (
     `token`      VARCHAR(64)  NOT NULL COMMENT ''登录令牌'',
     `admin_id`   INT          NOT NULL COMMENT ''管理员 id'',
     `expires_at` DATETIME     DEFAULT NULL COMMENT ''过期时间(空=不过期)'',
     `ip`         VARCHAR(45)  NOT NULL DEFAULT '''' COMMENT ''签发时客户端 IP'',
     `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (`token`),
     KEY `idx_admin_id` (`admin_id`),
     KEY `idx_expires_at` (`expires_at`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=''后台登录会话(一个账号可多端同时在线)'''
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) 老数据搬家 —— 已经登录着的后台,升级后不用重新登录
SET @stmt := (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'session_token'),
  'INSERT IGNORE INTO `admin_sessions` (`token`, `admin_id`, `expires_at`, `ip`, `created_at`)
     SELECT `session_token`, `id`, `session_expires_at`, `session_ip`, NOW()
       FROM `admin_users`
      WHERE `session_token` <> ''''
        AND EXISTS(SELECT 1 FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = ''admin_sessions'')',
  'SELECT 1'
));
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
