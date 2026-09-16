-- ============================================
-- admin_users — 管理员账号表
-- ============================================
SET NAMES utf8mb4;

USE `exchange_db`;

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `username`        VARCHAR(64)   NOT NULL COMMENT '登录账号',
  `password_hash`   VARCHAR(255)  NOT NULL COMMENT '登录密码 (bcrypt)',
  `display_name`    VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '显示名',
  `role`            ENUM('super','admin','operator') NOT NULL DEFAULT 'admin',
  `status`          TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '1=正常 0=禁用',
  `invite_code`     VARCHAR(16)   NOT NULL DEFAULT '' COMMENT '推广邀请码',
  `last_login_time` DATETIME      DEFAULT NULL,
  `last_login_ip`   VARCHAR(45)   DEFAULT '',
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员账号';
