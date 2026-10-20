#!/bin/bash
# ============================================
# B 台收尾脚本(47.236.95.137)
# 在 /www/wwwroot/exchange-admin/admin 下执行
#   bash /tmp/deploy-b.sh
# ============================================
set -e

cd /www/wwwroot/exchange-admin/admin

echo "════════ [1/5] 检查代码是否已上传 ════════"
ls -la server.ts dist/index.html migrations/2026_frozen_admin_only.sql 2>&1 || true

echo ""
echo "════════ [2/5] frozen 迁移 —— 先预览 ════════"
mysql -uroot -p zero <<'SQL'
SELECT m.id, m.account, m.frozen AS 当前frozen,
       COALESCE(w.amt,0) + COALESCE(o.amt,0) AS 将被扣掉,
       GREATEST(0, CAST(m.frozen AS DECIMAL(20,8)) - COALESCE(w.amt,0) - COALESCE(o.amt,0)) AS 扣完剩
  FROM members m
  LEFT JOIN (SELECT member_id, SUM(amount) amt FROM withdrawals WHERE status='申请中' GROUP BY member_id) w
         ON w.member_id = m.id
  LEFT JOIN (SELECT member_id, SUM(amount) amt FROM orders      WHERE status='持仓中' GROUP BY member_id) o
         ON o.member_id = m.id
 WHERE COALESCE(w.amt,0) + COALESCE(o.amt,0) > 0
 ORDER BY m.id;
SQL

echo ""
echo "════════ [3/5] frozen 迁移 —— 执行(只跑一次!) ════════"
mysql -uroot -p zero < migrations/2026_frozen_admin_only.sql
echo "✅ frozen 迁移完成"

echo ""
echo "════════ [4/5] 编译后台前端 ════════"
npm run build

echo ""
echo "════════ [5/5] 重启 PM2 + 健康检查 ════════"
pm2 restart exchange-admin
sleep 3
pm2 status exchange-admin
echo ""
echo "--- 健康检查 ---"
curl -s http://127.0.0.1:3001/api/health
echo ""

echo ""
echo "════════ 验证会员列表接口(看登录信息字段) ════════"
curl -s "http://127.0.0.1:3001/api/members?limit=2" -H "X-Admin-Id: 1" | head -c 900
echo ""
