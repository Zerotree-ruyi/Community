-- ============================================
-- 2026_admin_ip_whitelist.sql
-- 员工 IP 白名单 — 防止 admin/operator 账号被异地登录
--
-- 行为:
--   - super(超级管理员)始终不受限
--   - admin/operator(员工)登录时,如果白名单非空 → 客户端 IP 必须在表内
--   - 白名单空 = 该员工不限制 IP
--
-- 使用:
--   super 在员工管理 → 编辑 → IP 白名单 添加/删除允许的 IP
-- ============================================

CREATE TABLE IF NOT EXISTS `admin_ip_whitelist` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`   INT UNSIGNED NOT NULL                COMMENT '被限制的 admin id',
  `ip`         VARCHAR(45)  NOT NULL                COMMENT '允许登录的精确 IP(支持 IPv4/IPv6)',
  `note`       VARCHAR(128) NOT NULL DEFAULT ''     COMMENT '备注(哪个办公网/家庭)',
  `created_by` INT UNSIGNED NOT NULL                COMMENT '添加人 super id',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_ip` (`admin_id`, `ip`),
  KEY `idx_admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工 IP 白名单';
