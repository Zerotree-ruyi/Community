#!/bin/bash
# ============================================
# reset-db.sh — POSIX 一键重置数据库 (macOS/Linux/Git Bash)
#
# 用途: 清空 zero 库 → 重建表 → 插入种子数据
# 注意: 会删除所有业务数据(z123 测试会员、所有订单、钱包等)
# ============================================

set -e

MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASS="${MYSQL_PASS:-}"
MYSQL_DB="${MYSQL_DB:-zero}"

# mysql 命令支持密码方式
if [ -z "$MYSQL_PASS" ]; then
  MYSQL_CMD="mysql -u${MYSQL_USER}"
else
  MYSQL_CMD="mysql -u${MYSQL_USER} -p${MYSQL_PASS}"
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo
echo "============================================"
echo "  重置数据库 $MYSQL_DB"
echo "============================================"
echo
echo "警告: 这会删除 zero 库的所有表和数据!"
echo
read -p "确认继续? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "已取消。"
  exit 0
fi

echo
echo "[1/3] 删除旧库..."
$MYSQL_CMD -e "DROP DATABASE IF EXISTS ${MYSQL_DB}; CREATE DATABASE ${MYSQL_DB} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;"

echo "[2/3] 建表 (init-all.sql)..."
$MYSQL_CMD ${MYSQL_DB} < "${SCRIPT_DIR}/init-all.sql"

echo "[3/3] 种子数据 (init-data.sql)..."
$MYSQL_CMD ${MYSQL_DB} < "${SCRIPT_DIR}/init-data.sql"

echo
echo "============================================"
echo "  数据库重置完成!"
echo
echo "  默认账号:"
echo "    - 后台 super:   admin / Admin@123"
echo "    - 后台 admin:   testemp / Test1234"
echo "    - 前台会员:     z123 / z123456 (资金密码 123456)"
echo "============================================"
