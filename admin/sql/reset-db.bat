@echo off
REM ============================================
REM reset-db.bat — Windows 一键重置数据库
REM
REM 用途: 清空 zero 库 → 重建表 → 插入种子数据
REM 注意: 会删除所有业务数据(z123 测试会员、所有订单、钱包等)
REM ============================================

setlocal

set MYSQL_USER=root
set MYSQL_PASS=
set MYSQL_DB=zero

echo.
echo ============================================
echo  重置数据库 %MYSQL_DB%
echo ============================================
echo.
echo 警告: 这会删除 zero 库的所有表和数据!
echo.
set /p CONFIRM="确认继续? (y/N): "
if /I not "%CONFIRM%"=="y" (
  echo 已取消。
  exit /b 0
)

echo.
echo [1/3] 删除旧库...
mysql -u%MYSQL_USER% %MYSQL_DB% -e "DROP DATABASE IF EXISTS %MYSQL_DB%; CREATE DATABASE %MYSQL_DB% DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;"
if errorlevel 1 (
  echo [ERROR] DROP/CREATE DATABASE 失败
  exit /b 1
)

echo [2/3] 建表 (init-all.sql)...
mysql -u%MYSQL_USER% %MYSQL_DB% < "%~dp0init-all.sql"
if errorlevel 1 (
  echo [ERROR] init-all.sql 失败
  exit /b 1
)

echo [3/3] 种子数据 (init-data.sql)...
mysql -u%MYSQL_USER% %MYSQL_DB% < "%~dp0init-data.sql"
if errorlevel 1 (
  echo [ERROR] init-data.sql 失败
  exit /b 1
)

echo.
echo ============================================
echo  数据库重置完成!
echo.
echo  默认账号:
echo    - 后台 super:   admin / Admin@123
echo    - 后台 admin:   testemp / Test1234
echo    - 前台会员:     z123 / z123456 (资金密码 123456)
echo ============================================
endlocal
