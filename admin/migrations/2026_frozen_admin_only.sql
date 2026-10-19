-- ============================================
-- 2026_frozen_admin_only.sql
--
-- 背景:
--   之前 members.frozen 同时承担两个语义:
--     [1] 后台手动冻结的金额
--     [2] 在途金额(提现申请中 / 持仓中的订单)
--   现在统一为:frozen 只表示 [1],提现和交易都只扣 balance,不进 frozen。
--
-- 这个迁移把历史上被 [2] 污染的部分从 frozen 里扣掉,
-- 保留后台手动冻结的余额。逻辑:
--   frozen = max(0, frozen - 申请中的提现金额 - 持仓中的订单金额)
--
-- 幂等:重复执行会二次扣减(不理想),生产上只跑一次;
--       本地 reset-db.sh 全新建库时天然为 0,不受影响。
--
-- 用法:
--   mysql -uroot -p zero < migrations/2026_frozen_admin_only.sql
-- ============================================

DROP TEMPORARY TABLE IF EXISTS tmp_frozen_pollution;
CREATE TEMPORARY TABLE tmp_frozen_pollution (
  member_id BIGINT PRIMARY KEY,
  pollution  DECIMAL(20,8) NOT NULL DEFAULT 0
) ENGINE=MEMORY;

-- 在途金额 = 申请中的提现 + 持仓中的订单
INSERT INTO tmp_frozen_pollution (member_id, pollution)
SELECT member_id, SUM(amount) FROM (
  SELECT member_id, amount FROM withdrawals WHERE status = '申请中'
  UNION ALL
  SELECT member_id, amount FROM orders      WHERE status = '持仓中'
) t GROUP BY member_id;

-- 扣掉污染额(frozen 最低为 0)
UPDATE members m
  JOIN tmp_frozen_pollution p ON p.member_id = m.id
   SET m.frozen = GREATEST(0, CAST(m.frozen AS DECIMAL(20,8)) - p.pollution);

DROP TEMPORARY TABLE IF EXISTS tmp_frozen_pollution;
