-- ============================================
-- 2026_member_session.sql
-- 会员 session_token — 强制下线功能依赖字段
--
-- 设计:
--   - 每次会员登录时,后端生成新 UUID 写入 session_token 并返回前端
--   - 前台把 token 存进 localStorage,每次 /api/auth/me 拿最新值
--   - 后台「下线」按钮调用 /api/admin/members/:id/force-logout
--     重新生成 UUID → 前台下次 refresh 发现不一致 → 自动登出
-- ============================================

-- 不在文件里 USE,调用方已通过 mysql -D 参数指定了目标库

ALTER TABLE `members`
  ADD COLUMN `session_token` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '会话令牌(每次登录/被踢时刷新)' AFTER `fund_password`;