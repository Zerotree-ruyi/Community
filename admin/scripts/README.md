# admin/scripts — 本地测试脚本

后台（admin）的开发用脚本。**这些脚本只跑在本地，不要在生产机上执行。**

## 环境准备

```bash
# 1. 本机 MySQL 起好,按 admin/.env 里的 DB_* 建好库和用户
#    .env 不存在就 cp .env.example .env 再改

# 2. 灌表结构 + 迁移
node scripts/init-db.mjs
#    或者手动:
#    mysql -uroot -p < schema.sql
#    mysql -uroot -p exchange_db < migrations/2026_fund_records_notes_text.sql

# 3. 后端起好(3001)
npm run server

# 4. 后台 vite dev 起好(5174)
npm run dev:vite

# 5. 前台 vite dev 起好(5173) —— 只有 test-frontend-browser / test-change-password-submit 需要
cd .. && npm run dev
```

## 安全闸

会写库的脚本（`seed-local-test.mjs` / `seed-messages.mjs` / `test-stats-boundary.mjs`）
必须显式开闸才会执行：

```bash
ALLOW_LOCAL_SEED=1 node scripts/seed-local-test.mjs
```

两道检查都要过：`ALLOW_LOCAL_SEED=1`，且 `DB_HOST` 必须是 `127.0.0.1` / `localhost` / `::1`。
生产机（B 台）的 `.env` 指向的也是本机 MySQL，光看地址拦不住，所以必须显式开闸。

## 脚本一览

### 基础设施

| 文件 | 说明 |
|---|---|
| `lib-env.mjs` | 公共工具：读 `.env`、安全闸、`safePwd()`（与前台 `src/app/utils/safePwd.ts` 完全一致）、各地址/账号的环境变量覆盖 |
| `cdp.mjs` | 极简 Chrome DevTools Protocol 驱动，不用装 Playwright。`launchChrome()` 起无头 Chrome，`Cdp.attach()` 接管页面，`eval()` 求值，`shot()` 截图 |

CDP 相关环境变量：`CDP_PORT`（默认 9333）、`CHROME_PATH`、`SHOT_DIR`。

Chrome 的 profile 和截图默认落在 `admin/.cdp-cache/`（已在 `.gitignore` 里排除）。
**不要放 `/tmp`** —— macOS 会周期性清空 `/tmp`，profile 和截图会被抹掉。

### 播种数据

| 文件 | 说明 |
|---|---|
| `seed-local-test.mjs` | 造一个超管（admin/admin123）、一个会员（testuser01/Test123456，资金密码 123456）、一张银行卡钱包、一笔"后台充值"6000（余额 7000）、一笔"申请中"的提现 100、2 条未读站内信 |
| `seed-messages.mjs` | 造 12 条测试站内信（各种已读/未读、广播），用来测后台消息搜索和弹窗 |

### 浏览器实测（截图落在 `admin/.cdp-cache/shots/`）

| 文件 | 覆盖 |
|---|---|
| `test-frontend-browser.mjs` | 前台：profile 里 Site Messages 的位置、改密码页的旧密码输入框和占位符 |
| `test-change-password-submit.mjs` | 前台：实际提交改密码表单 —— 旧密码填错要被后端拒、填对要成功 |
| `test-admin-home-stats.mjs` | 后台：首页"今日入款"卡片 = 当天手动上分合计 |
| `test-admin-message-modal.mjs` | 后台：站内信"查看"是弹窗，不是表格底部展开 |
| `test-admin-reject-browser.mjs` | 后台：拒绝提现时自定义理由写超长 —— 字数计数器、maxLength、提交不报错 |
| `test-members-pending-column.mjs` | 后台：会员列表"余额 \| 冻结 \| 提现中"三列，提现中是绿色的 |
| `test-sidebar-collapsed.mjs` | 后台：侧栏顶到蓝色顶栏、收起/展开两种状态 |
| `test-credit-live-update.mjs` | 后台：会员列表改信用分 → 列表**立刻**变（乐观更新） |
| `test-front-credit-live-update.mjs` | 前台：后台改信用分 → **会员自己的页面立刻变**（SSE 实时推送，约 0.3 秒） |

### 数据库直查

| 文件 | 覆盖 |
|---|---|
| `test-stats-boundary.mjs` | 今日入款的时区边界：库里存 MySQL 服务器本地时间，"今天"按 IST(UTC+5:30) 切，插两条卡在午夜前后的记录验证新旧口径 |

## 地址和账号覆盖

`lib-env.mjs` 里都能用环境变量改：

```bash
ADMIN_BASE=http://localhost:5174        # 后台 dev
FRONT_BASE=http://localhost:5173        # 前台 dev
ADMIN_USER=admin  ADMIN_PWD=admin123
MEMBER_ACCOUNT=testuser01  MEMBER_PWD=Test123456  MEMBER_FUND_PWD=123456
```

## 不想动已经在跑的 dev server？

后端 `server.ts` 改了以后要重启才会生效。如果后台那个 `tsx server.ts` 是别人
（或上一个会话）起的、你不想动它，可以另起一套：

```bash
# 另起一个后端(3002)
cd admin && PORT=3002 npx tsx server.ts

# 前台 vite 指到 3002(前台 vite.config.ts 的代理目标可用 VITE_API_TARGET 改)
cd .. && VITE_API_TARGET=http://localhost:3002 npx vite --port 5176 --strictPort

# 后台 vite 指到 3002
cd admin && VITE_API_TARGET=http://localhost:3002 npx vite --port 5175 --strictPort

# 测试时指过去
FRONT_BASE=http://localhost:5176 ADMIN_BASE=http://localhost:5175 node scripts/test-front-credit-live-update.mjs
```

## 已有的老脚本

`init-db.mjs` / `init-db.sh` / `test-e2e.cjs` / `test-ip-whitelist.cjs` 是之前就有的，
用途见各自文件头注释。`test-e2e.cjs` 和 `test-ip-whitelist.cjs` 走 HTTP 接口，
`test-e2e.cjs` 默认连 `http://localhost:5175`。
