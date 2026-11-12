-- ─────────────────────────────────────────────────────────────────────────────
-- 2026_member_sessions —— 前台会员「多设备同时登录」
--
-- 背景:
--   以前会员令牌也存在 members.session_token 这一格(单值)。
--   同一个账号在第二台设备登录 → 令牌被覆盖 → 第一台设备的令牌当场作废。
--   客户表现:手机登着号,电脑又登了一次,回到手机上下单 →
--             403「只能查看自己的数据」,单子下不出去。
--             (后台 admin_users.session_token 是同一个毛病,已用 admin_sessions 修好)
--
-- 现在:令牌挪到 member_sessions,一台设备一行,互不顶掉。
--   members.session_token 继续照写(老逻辑 / 后台展示兜底)。
--
-- 幂等:可以重复跑。
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_sessions (
  token      VARCHAR(64) NOT NULL PRIMARY KEY,
  member_id  INT          NOT NULL,
  expires_at DATETIME     NULL,
  ip         VARCHAR(45)  NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_member_sessions_member (member_id),
  KEY idx_member_sessions_expire (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 把现在正在用的令牌搬过来(会员下次登录会再签一枚新的)
INSERT IGNORE INTO member_sessions (token, member_id, expires_at, ip, created_at)
SELECT session_token, id, DATE_ADD(NOW(), INTERVAL 30 DAY), NULL, NOW()
  FROM members
 WHERE session_token IS NOT NULL
   AND session_token <> '';
