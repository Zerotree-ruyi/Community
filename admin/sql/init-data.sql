-- ============================================
-- init-data.sql — 一键种子数据脚本
--
-- 用于全新部署 / 还原测试环境:
--   1. 先建库建表:  mysql -uroot zero < init-all.sql
--   2. 再插入数据:  mysql -uroot zero < init-data.sql
--
-- 或者一条命令搞定:
--   mysql -uroot zero < init-all.sql && mysql -uroot zero < init-data.sql
--
-- 默认账号(全部密码都已知):
--   - 后台超级管理员:  admin / Admin@123
--   - 后台普通员工:    testemp / Test1234  (role=admin,可加 IP 白名单限制)
--   - 前台测试会员:    z123 / z123456      (资金密码 123456)
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 超级管理员账号 (super)
-- ============================================
INSERT INTO `admin_users`
  (`id`, `username`, `password_hash`, `display_name`, `role`, `status`, `invite_code`)
VALUES
  (1, 'admin', '$2a$10$703mV.SkVu9Ls7SeUPMxcejwJ36YR4qHzq4ODEenEGmyWpyhIw1pu', '超级管理员', 'super', 1, 'SUPER01')
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `display_name`  = VALUES(`display_name`),
  `role`          = VALUES(`role`),
  `status`        = VALUES(`status`);

-- ============================================
-- 测试员工账号 (admin role)
-- ============================================
INSERT INTO `admin_users`
  (`id`, `username`, `password_hash`, `display_name`, `role`, `status`, `invite_code`)
VALUES
  (3, 'testemp', '$2a$10$13UMBBCtBkeKf2i4Hp/CZOpNySsijOLAjpw4LO7hjmzzOpx0E2Vh2', '测试员工', 'admin', 1, 'B2G94M')
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `display_name`  = VALUES(`display_name`),
  `role`          = VALUES(`role`),
  `status`        = VALUES(`status`);

-- ============================================
-- 测试会员 z123 (前台用)
-- 登录密码: z123456
-- 资金密码: 123456
-- 初始余额: 1000 USDT
-- ============================================
INSERT INTO `members`
  (`id`, `account`, `password_hash`, `fund_password`, `invite_code`,
   `status`, `balance`, `frozen`, `credit`, `win_mode`, `tag`,
   `direction`, `ban_order`, `ban_withdraw`, `agent_id`, `type`)
VALUES
  (1, 'z123',
   '$2a$10$StmEdhjMpGi60qBlFZDLN.AqqCqj70qCJV02PQFtG6nJ4Pgccm6vu',
   '$2a$10$/X4qgfddT8rvggWp1sTTcOQIf1Cka5a98dpr3fuDfH7zpWCmaVeby',
   'SUPER01', 1, 1000.00, 0.00, '100|1', 2, '蓝随机', '涨', 0, 0, 1, '会员')
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `fund_password` = VALUES(`fund_password`),
  `balance`       = VALUES(`balance`);

-- ============================================
-- 测试会员 testip01 — 用来演示后台的"登录信息"区块
-- 登录密码: Test@123456
-- 资金密码: 123456
-- 预置了首次/最后登录时间和双栈 IP 链(IPv6 + IPv4)
-- ============================================
INSERT INTO `members`
  (`account`, `password_hash`, `fund_password`, `invite_code`,
   `status`, `balance`, `frozen`, `credit`, `win_mode`, `tag`,
   `direction`, `ban_order`, `ban_withdraw`, `agent_id`, `type`,
   `register_time`, `first_login_time`, `first_login_ip`,
   `last_login_time`, `last_login_ip`)
VALUES
  ('testip01',
   '$2a$10$8CGLirIc/m4siGu4V47N9eRqlYLkueB4NJfuEqKuvteqs68s6ck62',
   '$2a$10$TPlABaZR73F2aiBudvc2YOhKJDdaapAB484THZ0BORp6xDCmnbmte',
   'SUPER01', 1, 5000.00, 0.00, '100|1', 2, '蓝随机', '涨', 0, 0, 1, '会员',
   '2026-10-20 10:42:08',
   '2026-10-20 10:42:08', '2409:40e0:1021:e559:8000::, 104.22.14.8',
   '2026-10-20 11:55:09', '2409:40e0:1021:e559:8000::, 162.159.98.90')
ON DUPLICATE KEY UPDATE
  `password_hash`    = VALUES(`password_hash`),
  `fund_password`    = VALUES(`fund_password`),
  `register_time`    = VALUES(`register_time`),
  `first_login_time` = VALUES(`first_login_time`),
  `first_login_ip`   = VALUES(`first_login_ip`),
  `last_login_time`  = VALUES(`last_login_time`),
  `last_login_ip`    = VALUES(`last_login_ip`);

-- ============================================
-- 给 z123 加一个 USDT-TRC20 测试钱包
-- ============================================
INSERT INTO `digital_wallets`
  (`id`, `member_id`, `type1`, `type2`, `address`, `notes`, `is_default`)
VALUES
  (1, 1, 'USDT', 'TRC20', 'TXyz123TestWalletAddressForZ123Member00000000', '测试钱包', 1)
ON DUPLICATE KEY UPDATE
  `address`    = VALUES(`address`),
  `is_default` = VALUES(`is_default`);
