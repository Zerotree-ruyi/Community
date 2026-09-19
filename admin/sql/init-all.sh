#!/usr/bin/env bash
# ============================================================================
# init-all.sh — 一键重建 zero 数据库(彻底清理 + 重建)
#
# 流程:
#   1. 备份现有 zero 库(可选)
#   2. DROP DATABASE zero(彻底删除,不留残留)
#   3. DROP USER zero@localhost
#   4. CREATE DATABASE zero
#   5. CREATE USER zero@localhost
#   6. 导入 init-all.sql(12 张表)
#   7. 创建默认超级管理员 admin / admin123
#   8. 重启 PM2
#
# 用法(B 台终端,先 chmod +x):
#   sudo ./init-all.sh
# ============================================================================
set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────────
DB_NAME="zero"
DB_USER="zero"
DB_PASS="zh123456"
MYSQL_ROOT_USER="root"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/init-all.sql"
PM2_NAME="exchange-admin"

# ── 颜色输出 ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()   { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

# ── 1. 备份(可选) ─────────────────────────────────────────────
echo
info "═══════════════════════════════════════════════════════"
info "  重建数据库 $DB_NAME"
info "═══════════════════════════════════════════════════════"
echo

read -p "是否先备份现有数据? [y/N] " backup_ans
if [[ "$backup_ans" =~ ^[Yy]$ ]]; then
  BACKUP_FILE="/tmp/${DB_NAME}_backup_$(date +%Y%m%d_%H%M%S).sql"
  if mysqldump -h127.0.0.1 -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    ok "已备份到 $BACKUP_FILE"
  else
    warn "备份失败(可能库不存在),继续"
  fi
fi

# ── 2. 连接 MySQL ─────────────────────────────────────────────
echo
info "测试 MySQL root 连接..."
read -rs -p "请输入 MySQL root 密码: " MYSQL_ROOT_PASS; echo
ROOT_CMD=(mysql -h127.0.0.1 -u"$MYSQL_ROOT_USER" "-p${MYSQL_ROOT_PASS}")
"${ROOT_CMD[@]}" -e "SELECT VERSION()" >/dev/null || err "MySQL 连接失败"
ok "MySQL 已连通"

# ── 3. 删除旧库 + 旧用户 ─────────────────────────────────────
echo
info "彻底删除旧库 + 旧用户..."
"${ROOT_CMD[@]}" <<SQL
DROP DATABASE IF EXISTS \`${DB_NAME}\`;
DROP USER IF EXISTS '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
ok "旧库 + 旧用户已删除"

# ── 4. 创建新库 + 新用户 ──────────────────────────────────────
echo
info "创建新库 $DB_NAME + 用户 $DB_USER..."
"${ROOT_CMD[@]}" <<SQL
CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
ok "新库 + 新用户已就绪"

# ── 5. 导入 init-all.sql ──────────────────────────────────────
echo
[[ -f "$SQL_FILE" ]] || err "找不到 $SQL_FILE"
info "导入 $(basename "$SQL_FILE")..."
mysql -h127.0.0.1 -u"$DB_USER" "-p${DB_PASS}" "$DB_NAME" < "$SQL_FILE"
ok "12 张表导入完成"

# ── 6. 创建默认超级管理员 ─────────────────────────────────────
echo
info "创建默认超级管理员 admin / admin123..."
HASH='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
mysql -h127.0.0.1 -u"$DB_USER" "-p${DB_PASS}" "$DB_NAME" <<SQL
INSERT INTO admin_users (username, password_hash, display_name, role, status, invite_code)
VALUES ('admin', '${HASH}', '超级管理员', 'super', 1, 'SUPER01');
SQL
ok "默认管理员已创建(用户名: admin / 密码: admin123)"

# ── 7. 验证 ──────────────────────────────────────────────────
echo
info "验证表都建齐..."
TABLE_COUNT=$(mysql -h127.0.0.1 -u"$DB_USER" "-p${DB_PASS}" "$DB_NAME" -N -e "SHOW TABLES;" | wc -l)
ok "共 $TABLE_COUNT 张表(应该是 12)"
echo
mysql -h127.0.0.1 -u"$DB_USER" "-p${DB_PASS}" "$DB_NAME" -e "SHOW TABLES;"

# ── 8. 重启 PM2 ──────────────────────────────────────────────
echo
info "重启 PM2 后端..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" 2>/dev/null || warn "PM2 重启失败(可能 $PM2_NAME 不存在)"
  sleep 1
  pm2 logs "$PM2_NAME" --lines 15 --nostream --raw 2>&1 | tail -10 || true
else
  warn "未找到 pm2 命令,跳过重启"
fi

echo
ok "═══════════════════════════════════════════════════════"
ok "  ✅ 数据库重建完成!"
ok "═══════════════════════════════════════════════════════"
echo
echo -e "  数据库: ${GREEN}${DB_NAME}${NC}"
echo -e "  账号:   ${GREEN}${DB_USER}${NC} / ${GREEN}${DB_PASS}${NC}"
echo -e "  管理员: ${GREEN}admin${NC} / ${GREEN}admin123${NC}"
echo
echo "请确认 .env 里 DB_USER/DB_PASS/DB_NAME 跟这里一致:"
echo "  DB_HOST=127.0.0.1"
echo "  DB_PORT=3306"
echo "  DB_USER=$DB_USER"
echo "  DB_PASS=$DB_PASS"
echo "  DB_NAME=$DB_NAME"
echo "  PORT=3001"
echo