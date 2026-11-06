-- ============================================
-- 迁移脚本:fund_records.notes 扩容
-- 日期:2026-11-04
-- 原因:后台拒绝提现时,自定义拒绝理由会拼进资金流水备注
--      ("Withdrawal#12 rejected refund reason:<理由>")。
--      老列是 VARCHAR(255),理由一长就报
--      Data too long for column 'notes' at row 1 —— 整个退款事务失败。
-- 说明:改成 TEXT 后能存下完整理由。
--      老数据全部保留(只改列类型,不改内容)。
--      TEXT 在 MySQL 5.7 不能带字面量 DEFAULT,这里用 NULL(可空,写入时都显式给值)。
-- 幂等:重复执行不会报错(MySQL 对同类型 MODIFY 是幂等的)。
-- ============================================

-- 1. 资金流水备注列扩容
ALTER TABLE `fund_records`
  MODIFY COLUMN `notes` TEXT NULL COMMENT '备注';

-- 说明:withdrawals.reject_reason / admin_note 保持 VARCHAR(500) 不变 ——
--      服务端和后台输入框也都按 500 截断,不用动。
--      老库没跑这个迁移时,拒绝流程依然能跑通(备注会自动截短),
--      跑了迁移则完整理由会原样存进资金流水备注。

-- 验证:
--   SHOW COLUMNS FROM `fund_records` LIKE 'notes';
