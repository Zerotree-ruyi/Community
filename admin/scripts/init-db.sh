#!/usr/bin/env bash
# ============================================================================
# 一键建库脚本 — Linux 部署用
# 用法:
#   chmod +x scripts/init-db.sh
#   ./scripts/init-db.sh                     # 用脚本里默认的 root 连
#   ./scripts/init-db.sh -u root -p          # 交互式输入密码
#   DB_USER=exchange_user DB_PASS=xxx ./scripts/init-db.sh
#
# 功能:
#   1. 创建 exchange_db 数据库
#   2. 创建专用账号 exchange_user(仅本地访问)
#   3. 导入 schema.sql / schema-admin.sql
#   4. 自动应用 migrations/ 下所有 .sql(按文件名排序)
#   5. 可选 — 创建一个默认超级管理员 admin / admin123
# ============================================================================

set -e

# ── 默认配置 ──────────────────────────────────────────────────────
DB_NAME="${DB_NAME:-exchange_db}"
DB_USER="${DB_USER:-exchange_user}"
DB_PASS="${DB_PASS:-Ex@2026!DbPass}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
MYSQL_ROOT_USER="${MYSQL_ROOT_USER:-root}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 颜色输出 ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERR]${NC} $*"; exit 1; }

# ── 解析命令行参数 ────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        -u) MYSQL_ROOT_USER="$2"; shift 2 ;;
        -p) read -rs MYSQL_ROOT_PASS < /dev/tty; echo; shift ;;
        --host) DB_HOST="$2"; shift 2 ;;
        --port) DB_PORT="$2"; shift 2 ;;
        --name) DB_NAME="$2"; shift 2 ;;
        --user) DB_USER="$2"; shift 2 ;;
        --pass) DB_PASS="$2"; shift 2 ;;
        --skip-seed) SKIP_SEED=1; shift ;;
        -h|--help)
            grep '^#' "$0" | head -30
            exit 0
            ;;
        *) err "未知参数: $1 (用 --help 看帮助)" ;;
    esac
done

# ── 检查 mysql 客户端 ────────────────────────────────────────────
command -v mysql >/dev/null 2>&1 || err "未找到 mysql 命令,请先在 B 台安装 MySQL"

# ── 连接测试 ────────────────────────────────────────────────────
info "测试 MySQL 连接 mysql://${MYSQL_ROOT_USER}@${DB_HOST}:${DB_PORT} ..."
if [[ -z "${MYSQL_ROOT_PASS:-}" ]]; then
    # 先试无密码直通(部分宝塔默认会保留无密码 root)
    if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$MYSQL_ROOT_USER" -e "SELECT 1" >/dev/null 2>&1; then
        # 直通失败 → 提示输入密码
        if [[ -r /dev/tty ]]; then
            read -rs -p "请输入 root 密码: " MYSQL_ROOT_PASS < /dev/tty; echo
        else
            read -rs -p "请输入 root 密码: " MYSQL_ROOT_PASS; echo
        fi
    fi
fi
# 读完(无论之前有没有)再统一构建 ROOT_CMD,确保密码一定带上
if [[ -n "${MYSQL_ROOT_PASS:-}" ]]; then
    ROOT_CMD=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$MYSQL_ROOT_USER" "-p${MYSQL_ROOT_PASS}")
else
    ROOT_CMD=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$MYSQL_ROOT_USER")
fi
"${ROOT_CMD[@]}" -e "SELECT VERSION()" >/dev/null || err "MySQL 连接失败"

ok "MySQL 已连通"

# ── 1. 创建数据库 + 用户 ────────────────────────────────────────
info "创建数据库 ${DB_NAME} ..."
"${ROOT_CMD[@]}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

info "创建专用账号 ${DB_USER}@localhost ..."
"${ROOT_CMD[@]}" <<SQL
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

ok "数据库 + 账号就绪"

# ── 2. 用专用账号导入 schema ────────────────────────────────────
APP_CMD=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p${DB_PASS}" "$DB_NAME")

run_sql_file() {
    local f="$1"
    [[ -f "$f" ]] || err "找不到 SQL 文件: $f"
    info "导入 $(basename "$f") ..."
    "${APP_CMD[@]}" < "$f" >/dev/null 2>&1 \
        || err "导入失败: $f(查看 mysql 输出)"
    ok "  → $(basename "$f")"
}

# 主表 + 管理员表
run_sql_file "$PROJECT_ROOT/schema.sql"
run_sql_file "$PROJECT_ROOT/schema-admin.sql"

# 所有迁移(按文件名升序)
if [[ -d "$PROJECT_ROOT/migrations" ]]; then
    mig_count=0
    while IFS= read -r f; do
        run_sql_file "$f"
        mig_count=$((mig_count + 1))
    done < <(find "$PROJECT_ROOT/migrations" -maxdepth 1 -type f -name "*.sql" | sort)
    [[ $mig_count -eq 0 ]] && info "(无迁移文件,跳过)"
fi

# ── 3. 创建默认超级管理员(可选) ────────────────────────────────
if [[ "${SKIP_SEED:-0}" != "1" ]]; then
    info "检查默认管理员账号 ..."
    exists=$("${APP_CMD[@]}" -N -e "SELECT COUNT(*) FROM admin_users WHERE username='admin'" 2>/dev/null || echo 0)
    if [[ "$exists" == "0" ]]; then
        # bcrypt hash for 'admin123' (cost=10) — 用户首次登录后应改密码
        # 也可留空密码哈希占位,后续用 bcryptjs 生成
        HASH='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
        warn "将创建默认管理员: admin / admin123(首次登录后请立即修改密码)"
        read -p "是否创建? [y/N] " ans
        if [[ "$ans" =~ ^[Yy]$ ]]; then
            "${APP_CMD[@]}" <<SQL
INSERT INTO admin_users (username, password_hash, display_name, role, status, invite_code)
VALUES ('admin', '${HASH}', '超级管理员', 'super', 1, 'SUPER01');
SQL
            ok "已创建 admin 账号(密码 admin123)"
        fi
    else
        ok "admin 账号已存在,跳过 seed"
    fi
fi

echo
ok "✅ 数据库初始化完成"
echo -e "   数据库: ${GREEN}${DB_NAME}${NC}"
echo -e "   账号:   ${GREEN}${DB_USER}@localhost${NC}"
echo -e "   密码:   ${GREEN}${DB_PASS}${NC}"
echo
echo "请把这些写到 admin/.env:"
cat <<EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}
PORT=3001
EOF