-- ============================================
-- init-all.sql — 一键建库脚本(整合所有表)
--
-- 这个文件由以下文件合并而成:
--   - schema.sql           (9 张业务表)
--   - schema-admin.sql     (1 张管理员表)
--   - migrations/2026_admin_ip_whitelist.sql  (员工 IP 白名单)
--   - migrations/2026_retired_invite.sql      (作废邀请码)
--
-- 历史 migrations 已合并到 schema.sql,这里不再重复 ALTER:
--   - 2026_member_session.sql    (session_token 已在 schema.sql)
--   - 2026_withdraw_wallet.sql   (wallet/snap_* 已在 schema.sql)
--
-- 用法(B 台终端):
--   1. 先建空库 zero
--   2. mysql -uroot -p zero < init-all.sql
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 皮总团队交易所 - MySQL 数据库表结构
-- ============================================

-- 强制连接字符集
SET NAMES utf8mb4;

-- 会员表
CREATE TABLE IF NOT EXISTS `members` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `account`         VARCHAR(64)   NOT NULL COMMENT '账号',
  `nickname`        VARCHAR(64)   DEFAULT NULL COMMENT '昵称',
  `phone`           VARCHAR(32)   DEFAULT NULL COMMENT '手机号',
  `email`           VARCHAR(128)  DEFAULT NULL COMMENT '邮箱',
  `gender`          ENUM('男','女','保密') NOT NULL DEFAULT '保密' COMMENT '性别',
  `remark`          VARCHAR(255)  DEFAULT '' COMMENT '备注',
  `password_hash`   VARCHAR(255)  NOT NULL COMMENT '登录密码 (bcrypt)',
  `fund_password`   VARCHAR(255)  DEFAULT NULL COMMENT '资金密码',
  `session_token`   VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '会话令牌(每次登录/被踢时刷新)',
  `status`          TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '1=正常 0=禁用',
  `balance`         DECIMAL(18,2) NOT NULL DEFAULT 0.00 COMMENT '可用余额',
  `frozen`          DECIMAL(18,2) NOT NULL DEFAULT 0.00 COMMENT '冻结金额',
  `credit`          VARCHAR(16)   NOT NULL DEFAULT '100|1' COMMENT '信誉|导级',
  `win_mode`        TINYINT       NOT NULL DEFAULT 2 COMMENT '1=要赢 0=要输 2=随机',
  `tag`             VARCHAR(32)   NOT NULL DEFAULT '蓝随机' COMMENT '标签',
  `direction`       ENUM('涨','跌') NOT NULL DEFAULT '涨' COMMENT '默认方向',
  `ban_order`       TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '禁单 1=是',
  `ban_withdraw`    TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '禁提 1=是',
  `agent_id`        INT UNSIGNED  NOT NULL DEFAULT 8 COMMENT '总代 ID',
  `invite_code`     VARCHAR(32)   NOT NULL COMMENT '邀请码|随机码',
  `type`            ENUM('会员','代理','管理员') NOT NULL DEFAULT '会员',
  `kyc_status`      ENUM('未提交','审核中','已通过','已拒绝') NOT NULL DEFAULT '未提交',
  `register_time`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login_time` DATETIME DEFAULT NULL,
  `last_login_ip`   VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account` (`account`),
  KEY `idx_agent` (`agent_id`),
  KEY `idx_type_status` (`type`, `status`),
  KEY `idx_register_time` (`register_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员表';

-- 数字钱包表
CREATE TABLE IF NOT EXISTS `digital_wallets` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id`    INT UNSIGNED NOT NULL,
  `type1`        ENUM('USDT','BTC','ETH') NOT NULL COMMENT '币种',
  `type2`        VARCHAR(32)  NOT NULL COMMENT '网络 (TRC20/ERC20/BTC)',
  `address`      VARCHAR(128) NOT NULL COMMENT '钱包地址',
  `notes`        VARCHAR(255) DEFAULT '' COMMENT '备注',
  `is_default`   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1=默认钱包(提现时优先)',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_type1` (`type1`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数字钱包';

-- 银行卡钱包
CREATE TABLE IF NOT EXISTS `bank_wallets` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id`  INT UNSIGNED NOT NULL,
  `bank_name`  VARCHAR(64)  NOT NULL COMMENT '银行名',
  `card_no`    VARCHAR(64)  NOT NULL COMMENT '卡号',
  `holder`     VARCHAR(64)  NOT NULL COMMENT '持卡人',
  `id_number`  VARCHAR(20)  DEFAULT NULL COMMENT '持卡人身份证号',
  `branch`     VARCHAR(64)  DEFAULT '' COMMENT '开户行 / PAN',
  `ifsc`       VARCHAR(32)  DEFAULT '' COMMENT 'IFSC',
  `contact`    VARCHAR(128) DEFAULT '' COMMENT '联系方式 / 地址',
  `notes`      VARCHAR(255) DEFAULT '' COMMENT '备注',
  `is_default` TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1=默认钱包(提现时优先)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='银行卡钱包';

-- 提现申请表
CREATE TABLE IF NOT EXISTS `withdrawals` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `agent_id`         INT UNSIGNED NOT NULL,
  `invite_code`      VARCHAR(32)  NOT NULL,
  `member_id`        INT UNSIGNED NOT NULL,
  `wallet_id`        INT UNSIGNED DEFAULT NULL COMMENT '关联 wallet 主键',
  `wallet_type`      ENUM('bank','digital') DEFAULT NULL COMMENT '钱包类型',
  `status`           ENUM('申请中','已同意','已拒绝','已退款') NOT NULL DEFAULT '申请中',
  `reject_reason`    VARCHAR(500) DEFAULT '' COMMENT '拒绝原因',
  `admin_note`       VARCHAR(500) DEFAULT '' COMMENT '管理员备注(同意时也可填)',
  `amount`           DECIMAL(18,2) NOT NULL COMMENT '申请金额',
  `fee`              DECIMAL(20,8) NOT NULL DEFAULT 0 COMMENT '手续费',
  `actual_amount`    DECIMAL(20,8) NOT NULL DEFAULT 0 COMMENT '实际到账 = amount - fee',
  `approved`         DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '实付金额(冗余,兼容老逻辑)',
  `type`             VARCHAR(32)  NOT NULL COMMENT '银行卡 / 数字币',
  `apply_time`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approve_time`     DATETIME DEFAULT NULL,
  `reviewer`         VARCHAR(64) DEFAULT '' COMMENT '审核人',
  -- 银行快照(从 bank_wallets 复制,即使原卡被改/删也不变)
  `snap_bank_name`   VARCHAR(64)  DEFAULT NULL,
  `snap_card_no`     VARCHAR(64)  DEFAULT NULL,
  `snap_holder`      VARCHAR(64)  DEFAULT NULL,
  `snap_branch`      VARCHAR(128) DEFAULT NULL,
  `snap_ifsc`        VARCHAR(32)  DEFAULT NULL,
  `snap_id_number`   VARCHAR(20)  DEFAULT NULL,
  -- 数字币快照
  `snap_coin_type`   VARCHAR(16)  DEFAULT NULL,
  `snap_network`     VARCHAR(32)  DEFAULT NULL,
  `snap_address`     VARCHAR(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_status` (`status`),
  KEY `idx_apply_time` (`apply_time`),
  KEY `idx_wallet` (`wallet_type`, `wallet_id`),
  KEY `idx_member_status_time` (`member_id`, `status`, `apply_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现申请';

-- 充值申请表
CREATE TABLE IF NOT EXISTS `recharges` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `agent_id`     INT UNSIGNED NOT NULL,
  `invite_code`  VARCHAR(32)  NOT NULL,
  `member_id`    INT UNSIGNED NOT NULL,
  `status`       ENUM('待确认','已完成','已取消') NOT NULL DEFAULT '待确认',
  `amount`       DECIMAL(18,2) NOT NULL,
  `type`         VARCHAR(32)  NOT NULL,
  `apply_time`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirm_time` DATETIME DEFAULT NULL,
  `tx_hash`      VARCHAR(128) DEFAULT '' COMMENT '区块链交易哈希',
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值记录';

-- 资金流水 (后台入款/扣款/盈利/提现等)
CREATE TABLE IF NOT EXISTS `fund_records` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `agent_id`    INT UNSIGNED NOT NULL,
  `invite_code` VARCHAR(32)  NOT NULL,
  `member_id`   INT UNSIGNED NOT NULL,
  `before`      DECIMAL(18,2) NOT NULL COMMENT '变动前余额',
  `amount`      DECIMAL(18,2) NOT NULL COMMENT '变动金额 (负=扣款)',
  `after`       DECIMAL(18,2) NOT NULL COMMENT '变动后余额',
  `type`        VARCHAR(32)  NOT NULL COMMENT '后台充值 / 后台扣款 / 会员下单 / 下推盈利 / 会员提现',
  `notes`       VARCHAR(255) DEFAULT '' COMMENT '备注',
  `time`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_type` (`type`),
  KEY `idx_time` (`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资金流水';

-- 订单表
CREATE TABLE IF NOT EXISTS `orders` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `agent_id`     INT UNSIGNED NOT NULL,
  `member_id`    INT UNSIGNED NOT NULL,
  `symbol`       VARCHAR(16)  NOT NULL COMMENT 'BTCUSDT 等',
  `direction`    ENUM('涨','跌') NOT NULL,
  `amount`        DECIMAL(18,2) NOT NULL COMMENT '下单金额',
  `open_price`    DECIMAL(18,4) NOT NULL,
  `close_price`   DECIMAL(18,4) DEFAULT NULL,
  `profit`        DECIMAL(18,2) DEFAULT NULL COMMENT '盈亏 (负=亏)',
  `status`        ENUM('持仓中','已平仓','已取消') NOT NULL DEFAULT '持仓中',
  `open_time`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `close_time`    DATETIME DEFAULT NULL,
  -- 秒合约相关字段
  `period`        VARCHAR(8)   DEFAULT '30s' COMMENT '秒数周期 30s/60s/120s/180s/240s',
  `return_rate`   DECIMAL(5,2) DEFAULT 20.00 COMMENT '收益率 %',
  `win_flag`      TINYINT      NOT NULL DEFAULT 2 COMMENT '1=赢 0=输 2=随机(下单时锁定)',
  `scale`         DECIMAL(18,4) DEFAULT 1.0000 COMMENT '杠杆倍数(预留)',
  `billing_time`  DATETIME     DEFAULT NULL COMMENT '结算时间(周期结束时刻)',
  `settle_amount` DECIMAL(18,2) DEFAULT NULL COMMENT '结算金额(本金+收益)',
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易订单';

-- 系统消息
CREATE TABLE IF NOT EXISTS `messages` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id`  INT UNSIGNED DEFAULT NULL COMMENT 'NULL=全员',
  `title`      VARCHAR(128) NOT NULL,
  `content`    TEXT,
  `sender`     VARCHAR(64)  NOT NULL DEFAULT 'system',
  `send_time`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_time`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_send_time` (`send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统消息';

-- 管理员操作日志
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`   INT UNSIGNED NOT NULL,
  `admin_name` VARCHAR(64)  NOT NULL,
  `action`     VARCHAR(64)  NOT NULL COMMENT 'LOGIN / APPROVE_WITHDRAW / EDIT_MEMBER / ...',
  `target_id`  INT UNSIGNED DEFAULT NULL COMMENT '操作对象 ID',
  `details`    VARCHAR(255) DEFAULT '',
  `ip`         VARCHAR(45) DEFAULT '',
  `time`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_time` (`admin_id`, `time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作日志';

-- ============================================
-- 管理员表 (来自 schema-admin.sql)
-- ============================================
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

-- ============================================
-- 员工 IP 白名单 (来自 migrations/2026_admin_ip_whitelist.sql)
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

-- ============================================
-- 作废邀请码 (来自 migrations/2026_retired_invite.sql)
-- ============================================
CREATE TABLE IF NOT EXISTS `retired_invite_codes` (
  `id`           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `admin_id`     INT UNSIGNED   NOT NULL                COMMENT '原所属 admin',
  `invite_code`  VARCHAR(16)    NOT NULL                COMMENT '作废的邀请码',
  `retired_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `retired_by`   VARCHAR(64)    NOT NULL DEFAULT 'admin' COMMENT '触发操作的人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invite_code` (`invite_code`),
  KEY `idx_admin_id`        (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已作废邀请码';