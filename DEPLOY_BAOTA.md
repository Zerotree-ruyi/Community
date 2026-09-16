# 宝塔双服务器部署教程(本项目定制版)

## 📐 架构总览

```
                    ┌──────────────────────────────┐
   用户浏览器  ─────►│  A 台 前台(13.213.80.180)   │
                    │  Nginx (80/443)              │
                    │  └─ /www/wwwroot/trade/dist/ │
                    │     (Vite 静态构建产物)       │
                    └─────────────┬────────────────┘
                                  │  /api/* 请求转发
                                  ▼
                    ┌──────────────────────────────┐
                    │  B 台 后台 (3.1.38.13)       │
                    │  PM2 (3001) + MySQL (3306)   │
                    │  ├─ admin/server.ts          │
                    │  └─ 数据库 zero              │
                    │     用户 zero / 密码 zh123456 │
                    └──────────────────────────────┘
```

| 服务器 | 角色 | 公网 IP | 必备组件 | 关键端口 |
|---|---|---|---|---|
| **A 台 前台** | 静态站点 | `13.213.80.180` | Nginx / Node.js(build 用) | 80, 443 |
| **B 台 后台+DB** | API + 数据库 | `3.1.38.13` | Nginx / Node.js / PM2 / MySQL | 3001(PM2),3306(MySQL 仅本地),80(宝塔面板) |

---

## 📦 第 0 步:上传清单(两台分别要哪些文件)

### 0.1 仓库目录速览

```
Community/                       ← 项目根
├── src/                         ← ★ 前台源码
├── public/                      ← ★ 前台静态资源
├── index.html                   ← ★ 前台入口
├── package.json                 ← ★ 前台依赖清单
├── vite.config.ts               ← ★ 前台构建配置
├── postcss.config.mjs           ← ★ 前台 Tailwind 配置
├── dist/                        ← ✗ 不上传,在 A 台本地 build 后再上传
├── node_modules/                ← ✗ 不上传,在服务器 npm install
├── .env                         ← ✗ 不上传(本地有就行)
│
└── admin/                       ← ★ 后台源码
    ├── src/                     ←    后台 React 源码
    ├── server.ts                ←    后端入口
    ├── schema.sql               ←    业务表
    ├── schema-admin.sql         ←    后台管理员表
    ├── migrations/              ←    数据库迁移
    ├── scripts/                 ←    一键建库脚本(init-db.sh / init-db.mjs)
    ├── package.json             ←    依赖清单
    ├── tsconfig.json            ←    TS 配置
    ├── vite.config.ts           ←    后台构建配置(给反代/静态托管备用)
    ├── index.html               ←    后台入口 HTML
    ├── .env.example             ←    环境变量样例(复制成 .env)
    ├── .env                     ← ✗ 不上传,在 B 台 cp 生成
    ├── node_modules/            ← ✗ 不上传,在 B 台 npm install
    └── dist/                    ← ✗ 不上传
```

### 0.2 A 台(前台,13.213.80.180)— 要上传哪些

只上传前台运行必需的子目录/文件,**其余都不传**:

```
Community/
├── src/                  ← 必需
├── public/               ← 必需(静态资源如 favicon、logo 图片)
├── index.html            ← 必需
├── package.json          ← 必需(为了 npm install + npm run build)
├── vite.config.ts        ← 必需
└── postcss.config.mjs    ← 必需(Tailwind)
```

❌ **不要上传**:`admin/`、`dist/`、`node_modules/`、`README.md`、`DEPLOY_BAOTA.md`、`guidelines/`、`图片/`、`ATTRIBUTIONS.md`、`.git/`、`.claude/`、你自己的 `.env`。

**最省事的做法 — Git 拉整仓**(推荐):
```bash
ssh root@13.213.80.180
mkdir -p /www/wwwroot/trade && cd /www/wwwroot/trade
git clone https://github.com/Zerotree-ruyi/Community.git .
```
> 多出来的 `admin/` 不影响运行 —— Nginx 只服务 `dist/` 子目录。

**手动上传**(只打包前台部分,Windows PowerShell):
```powershell
cd "C:\Users\Administrator\Desktop\交易所设计 (Community)"
Compress-Archive -Path src,public,index.html,package.json,vite.config.ts,postcss.config.mjs `
  -DestinationPath trade-frontend.zip
```
把 `trade-frontend.zip` 上传到 A 台 `/www/wwwroot/trade/` → 解压。

### 0.3 B 台(后台,3.1.38.13)— 要上传哪些

只上传后台必需的 `admin/` 子目录:
```
admin/
├── src/                          ← 必需(后台 React 源码)
├── server.ts                     ← 必需(后端入口)
├── schema.sql                    ← 必需(数据库表结构)
├── schema-admin.sql              ← 必需(管理员表)
├── migrations/                   ← 必需(迁移 SQL)
├── scripts/                      ← 必需(一键建库脚本)
├── package.json                  ← 必需(依赖清单)
├── tsconfig.json                 ← 必需
├── vite.config.ts                ← 必需
├── index.html                    ← 必需(后台 HTML 入口)
└── .env.example                  ← 必需(复制成 .env)
```

❌ **不要上传**:`node_modules/`、`dist/`、`图片/`、`.figma/`、`.git/`、`.claude/`、你自己的 `.env`。

**手动上传**(Windows PowerShell):
```powershell
cd "C:\Users\Administrator\Desktop\交易所设计 (Community)\admin"
Compress-Archive -Path src,server.ts,schema.sql,schema-admin.sql,migrations,scripts,package.json,tsconfig.json,vite.config.ts,index.html,.env.example `
  -DestinationPath admin-backend.zip
```
把 `admin-backend.zip` 上传到 B 台 `/www/wwwroot/exchange-admin/` → 解压后内容应在 `/www/wwwroot/exchange-admin/admin/` 下。

**速查对照表**

| 文件/目录 | A 台(前台 13.213.80.180) | B 台(后台 3.1.38.13) |
|---|:-:|:-:|
| `src/` | ✅ | ❌ |
| `public/` | ✅ | ❌ |
| `index.html`(根目录) | ✅ | ❌ |
| `package.json`(根目录) | ✅ | ❌ |
| `vite.config.ts`(根目录) | ✅ | ❌ |
| `postcss.config.mjs` | ✅ | ❌ |
| `admin/` 整目录 | ❌ | ✅(全部子项) |
| `dist/` | 自行 build 后**只传 dist 内容** | ❌ |
| `node_modules/` | ❌(服务器 npm install) | ❌(服务器 npm install) |
| `.env` | ❌(本地保留) | ❌(在 B 台从 .env.example 复制) |

---

## 🚀 第 1 步:两台服务器都装宝塔

SSH 登录到每台服务器:

```bash
# CentOS
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu / Debian
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

安装完成后,记下每台宝塔面板的入口地址、用户名、密码。

---

## 🗄️ 第 2 步:B 台 (3.1.38.13) — 安装 MySQL + Node.js

### 2.1 宝塔面板安装软件

宝塔面板 → **软件商店** 安装:

| 软件 | 版本建议 | 说明 |
|---|---|---|
| Nginx | 1.22+ | 反向代理(后台站点也用它) |
| MySQL | 5.7 或 8.0 | 数据库 |
| PM2 管理器 | 5.x | Node 进程管理(自带 Node) |

### 2.2 创建数据库

宝塔面板 → **数据库** → 添加数据库:

```
数据库名:   zero
用户名:     zero
密码:       zh123456
访问权限:   本地服务器    ← 关键!仅允许 localhost
```

> ⚠️ **不要设为"所有人"** — 仅本地访问,前端服务器通过 Nginx 反代调后端 API,不直连 MySQL。

### 2.3 一键导入表结构(推荐)

把代码上传到 B 台后(见 §3.2),直接跑脚本,**不必手动去 phpMyAdmin 贴 SQL**:

```bash
cd /www/wwwroot/exchange-admin/admin
chmod +x scripts/init-db.sh

# 传参形式 — 与宝塔里建好的数据库保持一致
./scripts/init-db.sh \
  --name zero \
  --user zero \
  --pass 'zh123456'
```

脚本会自动:
1. 验证 MySQL 连接(需要 root 密码,首次会提示输入)
2. 在 `zero` 库里导入 `schema.sql` + `schema-admin.sql`
3. 按文件名顺序应用 `migrations/` 下全部迁移
4. 询问是否创建默认超级管理员 `admin / admin123`(回车跳过 / `y` 创建)

> 📌 **重点**:脚本用的是 MySQL **root** 权限来执行建表(临时连 root),应用运行时仍用 `zero` 普通账号连(更安全)。所以你要先拿到 root 密码 — 在宝塔数据库页面的「root 密码」处查看/重置。

**纯命令行,无交互(适合 CI / 自动化)**:
```bash
MYSQL_ROOT_PASS='你的root密码' \
DB_NAME=zero DB_USER=zero DB_PASS='zh123456' \
  ./scripts/init-db.sh --skip-seed
```

### 2.4 没用脚本?手动导入备选

宝塔面板 → 数据库 → `zero` 右侧 **管理** → phpMyAdmin,依次执行:

1. `admin/schema.sql` → 粘贴执行
2. `admin/schema-admin.sql` → 粘贴执行
3. `admin/migrations/` 下所有 `.sql` 文件 → 按文件名顺序执行

---

## ⚙️ 第 3 步:B 台 (3.1.38.13) — 部署后端代码

### 3.1 SSH 登录 B 台,创建项目目录

```bash
mkdir -p /www/wwwroot/exchange-admin
cd /www/wwwroot/exchange-admin
```

### 3.2 上传代码

**方式 A — Git 拉取(推荐)**
```bash
yum install -y git   # 或 apt install git
git clone https://github.com/Zerotree-ruyi/Community.git .
cd admin
```

**方式 B — 本地压缩上传**(见 §0.3)

### 3.3 安装依赖

```bash
cd /www/wwwroot/exchange-admin/admin
npm install --production
```

### 3.4 配置 `.env`

```bash
cp .env.example .env
vi .env
```

写入(**完整覆盖**文件内容):

```env
# ─── 数据库连接(对应宝塔里建的 zero 库)───
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=zero
DB_PASS=zh123456
DB_NAME=zero

# ─── 后端服务端口 ───
PORT=3001
```

> 🔒 `chmod 600 .env` 设仅 root 可读写。

### 3.5 启动测试

```bash
cd /www/wwwroot/exchange-admin/admin
npx tsx server.ts
```

看到类似下面的输出即成功:
```
✅ Express API ready at http://localhost:3001
   Try: curl http://localhost:3001/api/health
```
Ctrl+C 终止,接下来用 PM2 守护。

### 3.6 PM2 守护进程

宝塔面板 → **PM2 管理器** → **添加项目**:

| 项 | 值 |
|---|---|
| 启动文件 | `server.ts` |
| 启动方式 | **自定义启动命令** |
| 运行目录 | `/www/wwwroot/exchange-admin/admin` |
| 项目名称 | `exchange-admin` |

**自定义启动命令** 填:

```bash
npx tsx server.ts
```

或更稳(写环境):
```bash
NODE_ENV=production npx tsx server.ts
```

点 **提交**。PM2 会自动启动,在 PM2 管理器列表里看到 `exchange-admin` 状态为 `online` 即成功。

### 3.7 B 台 Nginx 反向代理(/api/* → :3001)

宝塔 → **网站** → 添加站点(只是为了拿到一个 Nginx 配置入口):

- 域名:随便填,例如 `admin.local`
- 根目录:`/www/wwwroot/exchange-admin/admin`(不会被实际访问,只是配置锚点)
- PHP:**纯静态**

添加完成后,进 **设置** → **反向代理**:

```
代理名称: api
目标 URL:  http://127.0.0.1:3001
发送域名:  $host
```

提交。然后到 **配置文件**,在 `location /` 之前插入(或者直接把现有 `location /` 段替换):

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_read_timeout 60s;
}
```

> 这样 B 台对外暴露 `http://3.1.38.13/api/*` 等同于 `http://127.0.0.1:3001/api/*`。

### 3.8 B 台防火墙

宝塔 → **安全** → 放行端口:

| 端口 | 用途 | 给谁开 |
|---|---|---|
| 80 / 443 | Nginx | 公网 |
| 3001 | 备用直连(可不开放) | 视情况 |
| 3306 | MySQL | **不要开公网** |

如果 A 台要反代到 B 台,确保 B 台 80(或 3001)对 A 台可达:
```bash
# 在 A 台执行
curl http://3.1.38.13/api/health
# 应返回 {"ok":true,...}
```

---

## 🌐 第 4 步:A 台 (13.213.80.180) — 部署前台

### 4.1 宝塔安装软件

宝塔 → **软件商店** 安装:

| 软件 | 版本 | 说明 |
|---|---|---|
| Nginx | 1.22+ | 静态站点 + 反代 |
| Node.js | 20+ | 用于本地 build(Vite 需要) |

### 4.2 本地 build 前台(在你自己的电脑上)

```bash
cd "C:\Users\Administrator\Desktop\交易所设计 (Community)"
npm install
npm run build
```

`dist/` 目录就是产物。

### 4.3 上传 dist 到 A 台

宝塔 → **文件** → `/www/wwwroot/trade` → 上传 `dist/` 整个文件夹内容。
最终 A 台路径应是:`/www/wwwroot/trade/dist/{index.html,assets/,...}`

### 4.4 添加站点

宝塔 → **网站** → 添加站点:

| 项 | 值 |
|---|---|
| 域名 | `13.213.80.180`(或你的域名如 `trade.example.com`) |
| 根目录 | `/www/wwwroot/trade` |
| PHP | **纯静态** |

### 4.5 A 台 Nginx 配置 — **关键:把 /api 反代到 B 台**

宝塔 → 网站 → `13.213.80.180` → **设置** → **配置文件**,把整段 `server { ... }` 替换为:

```nginx
server {
    listen 80;
    server_name 13.213.80.180;     # 换成你的域名,如 trade.example.com

    root /www/wwwroot/trade/dist;
    index index.html;

    # SPA 路由 fallback — 所有前端路由都交回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri =404;
    }

    # ⭐ 反向代理后端到 B 台 (3.1.38.13)
    #   - 走 B 台 80 → Nginx 再转发到 3001(等同 §3.7)
    #   - 也可直连 B 台 3001,去掉 Nginx 那层
    location /api/ {
        proxy_pass http://3.1.38.13:80/api/;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # 前端日志
    access_log /www/wwwlogs/trade.access.log;
    error_log  /www/wwwlogs/trade.error.log;
}
```

> 💡 如果你不想在 B 台 Nginx 配置,直接让 A 台穿透到 3001:
> ```nginx
> proxy_pass http://3.1.38.13:3001/api/;
> ```
> 此时 B 台需开放 3001 端口。

### 4.6 A 台防火墙

宝塔 → **安全** → 放行 `80`、`443`。

---

## 🔐 第 5 步:申请 SSL(两台都做,推荐)

宝塔 → 网站 → **SSL** → **Let's Encrypt** → 申请 → **强制 HTTPS**。
> 若没有域名只有 IP(`13.213.80.180`),SSL 用自签名或换 Let's Encrypt DNS 验证。

---

## ✅ 第 6 步:验证部署

### 6.1 B 台本地测后端
```bash
curl http://127.0.0.1:3001/api/health
# 应返回 {"ok":true,"db":[{...}]}
```

### 6.2 B 台 Nginx 测反代
```bash
curl http://3.1.38.13/api/health
# 应返回 {"ok":true,...}
```

### 6.3 A 台测前端 + 反代
```bash
# 前端页面(应返回 HTML)
curl -I http://13.213.80.180

# 前端→后端反代(说明 A→B 通了)
curl http://13.213.80.180/api/health
# 应该看到 {"ok":true,...}
```

### 6.4 浏览器访问
- 前台:http://13.213.80.180(或 `https://trade.example.com`)
- 后台:`http://3.1.38.13` 的反代路径(若做了 §3.7),或者直接 `http://3.1.38.13:3001`(仅内网)

---

## 🔄 第 7 步:日常运维

### 7.1 后端更新代码(B 台)
```bash
cd /www/wwwroot/exchange-admin/admin
git pull   # 或重新上传
npm install --production
# PM2 重启
pm2 restart exchange-admin
# 或宝塔 PM2 管理器 → 重启
```

### 7.2 前端重新构建(A 台)
本地:
```bash
cd "C:\Users\Administrator\Desktop\交易所设计 (Community)"
npm run build
```
把 `dist/` 上传到 A 台 `/www/wwwroot/trade/dist/`(覆盖)。
**不用重启 Nginx**,Nginx 会自动读取新文件。

### 7.3 数据库备份
宝塔 → 数据库 → `zero` → **备份** → 设置每天 03:00 自动备份到 `/www/backup/database/`。

### 7.4 看日志
```bash
# B 台后端 PM2 日志
pm2 logs exchange-admin

# A 台 Nginx 访问日志
tail -f /www/wwwlogs/trade.access.log

# B 台 Nginx 访问日志
tail -f /www/wwwlogs/admin.access.log
```

---

## 🛠️ 第 8 步:常见坑

| 现象 | 排查 |
|---|---|
| 前端调 `/api/*` 报 CORS | B 台 `server.ts` 已开 `app.use(cors())` ✓。如果用 Nginx 反代,不会触发 CORS(同源)。若 A 台没反代直接调 `3.1.38.13:3001`,改用 §4.5 的 Nginx 反代。 |
| 后端连不上 DB | 检查 B 台 `.env` 的 `DB_USER=zero` / `DB_PASS=zh123456` / `DB_NAME=zero`;`mysql -uzero -p'zh123456' zero` 在 B 台本地试连;看 PM2 日志是否有 `access denied`。 |
| B 台 `public_ip` 一直显示内网 | B 台 `curl https://api.ipify.org` 试一下。若被墙,代码会自动切到 `pconline` / `icanhazip`(见 `admin/server.ts` 的 `PUBLIC_IP_SOURCES`)。 |
| 前台白屏 | 浏览器控制台看 404。多半是 Nginx `try_files` 没配 — 检查 `location /` 块。 |
| 前端调 API 返回 502 | A 台 Nginx 连不上 B 台。`curl http://3.1.38.13/api/health` 从 A 台试一下;检查 B 台安全组/防火墙 80(或 3001)是否放行。 |
| 前台访问慢/超时 | `proxy_read_timeout` 默认 60s 够用;若用了 Vite HMR 模式,把 A 台 `try_files` 留好。 |

---

## 📋 服务器清单备忘(本项目定制)

| 服务器 | 公网 IP | 数据库 | 账号 | 密码 | 关键端口 |
|---|---|---|---|---|---|
| **A 台 前台** | `13.213.80.180` | — | — | — | 80 / 443 |
| **B 台 后台** | `3.1.38.13` | `zero` | `zero` | `zh123456` | 80 / 443 / 3001 |
| MySQL | 仅 B 台本地 | `zero` | `zero` | `zh123456` | 3306(**不开公网**) |

---

## 🗂️ 关键文件路径速查

```
A 台 (13.213.80.180):
  /www/wwwroot/trade/dist/                  # 前端构建产物
  /www/wwwlogs/trade.access.log             # Nginx 访问日志

B 台 (3.1.38.13):
  /www/wwwroot/exchange-admin/admin/        # 后端源码
  /www/wwwroot/exchange-admin/admin/.env    # 数据库密码(chmod 600!)
  /www/wwwlogs/admin.access.log             # Nginx 访问日志
  /www/backup/database/                     # 数据库自动备份
```

---

## 🎯 部署 Checklist(完成后逐条打勾)

- [ ] B 台 MySQL 已建库 `zero`,账号 `zero`/`zh123456`,权限=本地服务器
- [ ] B 台执行 `./scripts/init-db.sh --name zero --user zero --pass zh123456`,表已建
- [ ] B 台 `.env` 已写入 5 个 DB_* + PORT=3001
- [ ] B 台 `pm2 logs exchange-admin` 显示 `Express API ready`
- [ ] B 台 `curl http://127.0.0.1:3001/api/health` 返回 200
- [ ] B 台 Nginx `location /api/` 已加,`curl http://3.1.38.13/api/health` 返回 200
- [ ] A 台 `dist/` 已上传到 `/www/wwwroot/trade/dist/`
- [ ] A 台 Nginx 配置已加 `location /api/ { proxy_pass http://3.1.38.13:80/api/; }`
- [ ] A 台 `curl http://13.213.80.180/api/health` 返回 200(说明前后台贯通)
- [ ] 浏览器访问 `http://13.213.80.180` 看到登录页

---

部署完成后,前台用户在 `http://13.213.80.180` 看到的就是线上版本,所有 `/api/*` 请求经 A 台 Nginx 透明转发到 B 台后端,后端从 B 台 MySQL 的 `zero` 库读写数据。