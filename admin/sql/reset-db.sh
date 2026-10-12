#!/bin/bash
# ============================================
# reset-db.sh — POSIX 一键重置数据库 (macOS/Linux/Git Bash)
#
# 用途: 清空 zero 库 → 重建表 → 创建 zero 用户 → 插入种子数据
# 注意: 会删除所有业务数据(z123 测试会员、所有订单、钱包等)
#
# 执行顺序:
#   [1] DROP DATABASE / CREATE DATABASE
#   [2] init-all.sql        — 基础 schema
#   [3] migrations/*.sql    — 增量迁移(2026_xxx.sql 按文件名字典序)
#                            每个 migration 必须用 IF NOT EXISTS 保证幂等
#   [4] init-data.sql       — 种子数据(admin / testemp / 默认链接 等)
#   [5] CREATE USER zero@localhost — 应用账号(密码 zh123456)
#
# 用法:
#   ./reset-db.sh                       # 交互输入 root 密码
#   MYSQL_ROOT_PASS=xxx ./reset-db.sh   # 免交互
#   DB_NAME=mydb MYSQL_USER=zero ./reset-db.sh  # 自定义库名 / 用户
# ============================================

set -e

# ── 配置(可环境变量覆盖) ──
MYSQL_USER="${MYSQL_USER:-root}"            # 连接 MySQL 用哪个账号(必须有 DBA 权限)
DB_NAME="${DB_NAME:-zero}"                 # 业务数据库名
APP_USER="${APP_USER:-zero}"               # 应用连接账号
APP_PASS="${APP_PASS:-zh123456}"           # 应用账号密码
HOST_PATTERN="${HOST_PATTERN:-localhost}"  # 应用账号允许从哪连(localhost / %)

# ── 收集 root 密码 ──
if [ -z "${MYSQL_ROOT_PASS:-}" ]; then
  echo
  echo "════════════════════════════════════════"
  echo "  请输入 MySQL root 密码 (用户: $MYSQL_USER)"
  echo "════════════════════════════════════════"
  read -rs -p "MySQL root 密码: " MYSQL_ROOT_PASS
  echo
fi
if [ -z "$MYSQL_ROOT_PASS" ]; then
  MYSQL_CMD="mysql -u${MYSQL_USER}"
else
  MYSQL_CMD="mysql -u${MYSQL_USER} -p${MYSQL_ROOT_PASS}"
fi

# mysql 探活(失败立即退出,避免后面静默错误)
echo "[0/5] 测试 MySQL 连接 ($MYSQL_USER@localhost)..."
if ! $MYSQL_CMD -e "SELECT VERSION()" >/dev/null 2>&1; then
  echo "  ❌ MySQL 连接失败,请检查密码和账号"
  exit 1
fi
echo "  ✅ MySQL 已连接"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="${SCRIPT_DIR}/../migrations"

# ── 二次确认(避免误操作) ──
echo
echo "════════════════════════════════════════"
echo "  即将重置数据库: $DB_NAME"
echo "════════════════════════════════════════"
echo
echo "  会执行以下操作:"
echo "    [1] DROP DATABASE $DB_NAME + CREATE DATABASE"
echo "    [2] 导入 init-all.sql (建 12 张表)"
echo "    [3] 导入 migrations/*.sql (增量迁移)"
echo "    [4] 导入 init-data.sql (种子数据)"
echo "    [5] 创建应用账号 ${APP_USER}@${HOST_PATTERN}"
echo
echo "  ⚠️  这会删除所有业务数据!"
echo
read -p "确认继续? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "已取消。"
  exit 0
fi

# ── [1] 删旧库 + 建新库 ──
echo
echo "[1/5] 删除旧库 + 建新库..."
$MYSQL_CMD -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "  ✅ 库 ${DB_NAME} 已重建"

# ── [2] 建表 ──
echo "[2/5] 建表 (init-all.sql)..."
$MYSQL_CMD "${DB_NAME}" < "${SCRIPT_DIR}/init-all.sql"
echo "  ✅ 表结构导入完成"

# ── [3] 增量迁移 ──
echo "[3/5] 增量迁移 (migrations/2026_*.sql)..."
shopt -s nullglob
MIG_FILES=( "${MIGRATIONS_DIR}"/2026_*.sql )
if [ ${#MIG_FILES[@]} -eq 0 ]; then
  echo "  (no migrations found in ${MIGRATIONS_DIR})"
else
  for mig in "${MIG_FILES[@]}"; do
    fname="$(basename "$mig")"
    echo "  -> $fname"
    $MYSQL_CMD "${DB_NAME}" < "$mig"
  done
  echo "  ✅ ${#MIG_FILES[@]} 个 migration 已应用"
fi
shopt -u nullglob

# ── [4] 种子数据 ──
echo "[4/5] 种子数据 (init-data.sql)..."
$MYSQL_CMD "${DB_NAME}" < "${SCRIPT_DIR}/init-data.sql"
echo "  ✅ 默认账号已创建"

# ── [5] 应用账号 ──
echo "[5/5] 创建应用账号 ${APP_USER}@${HOST_PATTERN}..."
$MYSQL_CMD <<SQL
-- 先删旧账号(避免 ERROR 1396)
DROP USER IF EXISTS '${APP_USER}'@'localhost';
DROP USER IF EXISTS '${APP_USER}'@'127.0.0.1';
DROP USER IF EXISTS '${APP_USER}'@'%';

-- 创建新账号(用 IDENTIFIED BY 密码)
CREATE USER '${APP_USER}'@'localhost' IDENTIFIED BY '${APP_PASS}';

-- 授权
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${APP_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "  ✅ 应用账号 ${APP_USER}@localhost 已创建(密码: ${APP_PASS})"

# ── 验证 ──
echo
echo "════════════════════════════════════════"
echo "  数据库重置完成!"
echo "════════════════════════════════════════"
echo
echo "  验证:"
TABLE_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")
echo "    - ${DB_NAME} 库共 ${TABLE_COUNT} 张表"
USER_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM ${DB_NAME}.admin_users;")
echo "    - admin_users 表 ${USER_COUNT} 条记录"
echo
echo "  默认账号:"
echo "    - 后台 super:   admin / Admin@123"
echo "    - 后台 admin:   testemp / Test1234"
echo "    - 前台会员:     z123 / z123456 (资金密码 123456)"
echo
echo "  ⚠️  请确认 B 台 .env 配置:"
echo "    DB_HOST=127.0.0.1"
echo "    DB_PORT=3306"
echo "    DB_USER=${APP_USER}"
echo "    DB_PASS=${APP_PASS}"
echo "    DB_NAME=${DB_NAME}"
echo "    PORT=3001"
echo
echo "  重启 PM2:  pm2 restart exchange-admin"
echo "════════════════════════════════════════"