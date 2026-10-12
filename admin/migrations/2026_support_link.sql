-- ============================================
-- 2026_support_link.sql — 客服链接配置表
--
-- 用于: 一个后端支持多个前端,每个前端用不同的客服链接
--   - agent_id = 0  → 全局默认(任何没配的 agent 都用它)
--   - agent_id = N  → 指定总代/员工的前端用这个链接
--
-- 用法:  mysql -uroot zero < admin/migrations/2026_support_link.sql
-- ============================================

CREATE TABLE IF NOT EXISTS `support_links` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `agent_id`   INT UNSIGNED  NOT NULL DEFAULT 0    COMMENT '0=全局默认;N=指定总代',
  `label`      VARCHAR(64)   NOT NULL DEFAULT ''  COMMENT '显示名(如:Telegram @xxx_support)',
  `url`        VARCHAR(512)  NOT NULL             COMMENT '客服链接(Telegram / WhatsApp / 微信 / 网页 等)',
  `note`       VARCHAR(255)  NOT NULL DEFAULT ''  COMMENT '备注(谁配的/配给哪个前端)',
  `updated_by` VARCHAR(64)   NOT NULL DEFAULT 'admin' COMMENT '最后修改人',
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent` (`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='前端客服链接配置';

-- 默认全局链接(占位 — 后台 super 第一次进「客服链接」页面时改掉)
INSERT IGNORE INTO `support_links` (`agent_id`, `label`, `url`, `note`, `updated_by`)
VALUES (0, 'Default Support', 'https://t.me/your_support', '请在后台「客服链接」页面改为你自己的客服地址', 'system');
