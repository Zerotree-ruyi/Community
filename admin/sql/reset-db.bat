@echo off
REM ============================================
REM reset-db.bat — Windows 一键重置数据库
REM
REM 用途: 清空 zero 库 → 重建表 → 插入种子数据
REM 注意: 会删除所有业务数据(z123 测试会员、所有订单、钱包等)
REM
REM 执行顺序:
REM   [1] DROP DATABASE / CREATE DATABASE
REM   [2] init-all.sql        — 基础 schema
REM   [3] migrations\2026_*.sql — 增量迁移(按文件名字典序)
REM                             每个 migration 必须用 IF NOT EXISTS 保证幂等
REM   [4] init-data.sql       — 种子数据
REM ============================================

setlocal

set MYSQL_USER=root
set MYSQL_PASS=
set MYSQL_DB=zero

set MIGRATIONS_DIR=%~dp0..\migrations

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
echo [1/4] 删除旧库...
mysql -u%MYSQL_USER% %MYSQL_DB% -e "DROP DATABASE IF EXISTS %MYSQL_DB%; CREATE DATABASE %MYSQL_DB% DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;"
if errorlevel 1 (
  echo [ERROR] DROP/CREATE DATABASE 失败
  exit /b 1
)

echo [2/4] 建表 (init-all.sql)...
mysql -u%MYSQL_USER% %MYSQL_DB% < "%~dp0init-all.sql"
if errorlevel 1 (
  echo [ERROR] init-all.sql 失败
  exit /b 1
)

echo [3/4] 增量迁移 (migrations\2026_*.sql)...
set MIG_COUNT=0
for %%F in ("%MIGRATIONS_DIR%\2026_*.sql") do (
  set /a MIG_COUNT+=1
  echo   -^> %%~nxF
  mysql -u%MYSQL_USER% %MYSQL_DB% < "%%F"
  if errorlevel 1 (
    echo [ERROR] migration %%~nxF 失败
    exit /b 1
  )
)
if %MIG_COUNT%==0 (
  echo   ^(no migrations found in %MIGRATIONS_DIR%^)
)

echo [4/4] 种子数据 (init-data.sql)...
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
echo.
echo  默认客服链接 (agent_id=0):
echo    https://t.me/your_support
echo    -^> 在「后台 ^-^> 客服链接」里改成你自己的
echo ============================================
endlocal
