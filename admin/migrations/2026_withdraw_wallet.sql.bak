-- ============================================
-- 迁移脚本:提现/钱包管理模块
-- 日期:2026-09-14
-- 说明:钱包 + 提现模块完整字段。可在已有 exchange_db 上重跑(老行保留)
-- 兼容:所有新字段都有 DEFAULT 0 / DEFAULT NULL,ALTER 不破坏老数据
-- ============================================

-- 1. bank_wallets 加身份证号 + 默认钱包标记
ALTER TABLE `bank_wallets`
  ADD COLUMN `id_number`  VARCHAR(20) DEFAULT NULL COMMENT '持卡人身份证号' AFTER `holder`,
  ADD COLUMN `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=默认钱包(提现时优先)' AFTER `notes`;

-- 2. digital_wallets 加默认钱包标记
ALTER TABLE `digital_wallets`
  ADD COLUMN `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=默认钱包' AFTER `notes`;

-- 3. withdrawals 加钱包关联 + 拒绝原因 + 手续费 + 实际到账 + 银行/数字币快照
ALTER TABLE `withdrawals`
  ADD COLUMN `wallet_id`       INT UNSIGNED DEFAULT NULL COMMENT '关联 wallet 主键' AFTER `member_id`,
  ADD COLUMN `wallet_type`     ENUM('bank','digital') DEFAULT NULL AFTER `wallet_id`,
  ADD COLUMN `reject_reason`   VARCHAR(500) DEFAULT '' COMMENT '拒绝原因' AFTER `status`,
  ADD COLUMN `admin_note`      VARCHAR(500) DEFAULT '' COMMENT '管理员备注(同意时也可填)' AFTER `reject_reason`,
  ADD COLUMN `fee`             DECIMAL(20,8) NOT NULL DEFAULT 0 COMMENT '手续费' AFTER `amount`,
  ADD COLUMN `actual_amount`   DECIMAL(20,8) NOT NULL DEFAULT 0 COMMENT '实际到账 = amount - fee' AFTER `fee`,
  ADD COLUMN `snap_bank_name`  VARCHAR(64)  DEFAULT NULL AFTER `wallet_type`,
  ADD COLUMN `snap_card_no`    VARCHAR(64)  DEFAULT NULL,
  ADD COLUMN `snap_holder`     VARCHAR(64)  DEFAULT NULL,
  ADD COLUMN `snap_branch`     VARCHAR(128) DEFAULT NULL,
  ADD COLUMN `snap_ifsc`       VARCHAR(32)  DEFAULT NULL,
  ADD COLUMN `snap_id_number`  VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN `snap_coin_type`  VARCHAR(16)  DEFAULT NULL,
  ADD COLUMN `snap_network`    VARCHAR(32)  DEFAULT NULL,
  ADD COLUMN `snap_address`    VARCHAR(128) DEFAULT NULL;

-- 4. 加索引(查历史更快)
ALTER TABLE `withdrawals`
  ADD KEY `idx_wallet` (`wallet_type`, `wallet_id`),
  ADD KEY `idx_member_status_time` (`member_id`, `status`, `apply_time`);

-- 验证
SELECT 'migrations done' AS status;