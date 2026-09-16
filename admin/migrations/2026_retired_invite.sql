-- ============================================
-- 2026_retired_invite.sql
-- 作废邀请码表 — 防止历史邀请码被复用
--
-- 触发场景:admin 调用 /api/admin/regenerate-invite 重新生成邀请码时,
--          旧码写入本表;注册时若码在 admin_users 找不到但在本表找到,
--          返回 "码已作废"。
-- ============================================

USE `exchange_db`;

CREATE TABLE IF NOT EXISTS `retired_invite_codes` (
  `id`           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `admin_id`     INT UNSIGNED   NOT NULL                COMMENT '原所属 admin',
  `invite_code`  VARCHAR(16)    NOT NULL                COMMENT '作废的邀请码',
  `retired_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `retired_by`   VARCHAR(64)    NOT NULL DEFAULT 'admin' COMMENT '触发操作的人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invite_code` (`invite_code`),          -- 同一码只能作废一次
  KEY `idx_admin_id`        (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已作废邀请码';
