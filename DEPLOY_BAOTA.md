# 宝塔双服务器部署教程(本项目定制版)

## 📐 架构总览

```
                    ┌──────────────────────────────┐
   用户浏览器  ─────►│  A 台 前台(47.236.172.111)   │
                    │  Nginx (80/443)              │
                    │  └─ /www/wwwroot/trade/dist/ │
                    │     (Vite 静态构建产物)       │
                    └─────────────┬────────────────┘
                                  │  /api/* 请求转发
                                  ▼
                    ┌──────────────────────────────┐
                    │  B 台 后台 (47.236.95.137)   │
                    │  PM2 (3001) + MySQL (3306)   │
                    │  ├─ admin/server.ts          │
                    │  └─ 数据库 zero              │
                    │     用户 zero / 密码 zh123456 │
                    └─────────────┬────────────────┘
                                  │ 每天 mysqldump via SSH
                                  ▼
                    ┌──────────────────────────────┐
                    │  C 台 异地备份 (C.C.C.C)     │
                    │  只装 SSH + crontab + 磁盘   │
                    │  /backup/zero/{daily,weekly, │
                    │   monthly}                   │
                    └──────────────────────────────┘
```

| 服务器 | 角色 | 公网 IP | 必备组件 | 关键端口 |
|---|---|---|---|---|
| **A 台 前台** | 静态站点 | `47.236.172.111` | Nginx / Node.js(build 用) | 80, 443 |
| **B 台 后台+DB** | API + 数据库 | `47.236.95.137` | Nginx / Node.js / PM2 / MySQL | 3001(PM2),3306(MySQL 仅本地),80(宝塔面板) |
| **C 台 异地备份** | 数据库快照 | `C.C.C.C`(自填,**异地机房**) | SSH server + crontab | 22(SSH) |

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

### 0.2 A 台(前台,47.236.172.111)— 要上传哪些

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
ssh root@47.236.172.111
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

### 0.3 B 台(后台,47.236.95.137)— 要上传哪些

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

| 文件/目录 | A 台(前台 47.236.172.111) | B 台(后台 47.236.95.137) |
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

## 🗄️ 第 2 步:B 台 (47.236.95.137) — 安装 MySQL + 创建数据库

> 🎯 **这一节只做两件事:**
> ① 装 MySQL + PM2 + Nginx
> ② 在宝塔里建一个空数据库 `zero`
>
> ❌ 这一节**不做**建表 — 建表要等到 §3 把代码传上来后,才能跑 `scripts/init-db.sh`。

### 2.1 在宝塔里装软件

宝塔左侧菜单 → **软件商店**,挨个安装:

| 软件 | 版本建议 | 安装完不用动什么 |
|---|---|---|
| **Nginx** | 1.22+ | 默认配置即可 |
| **MySQL** | 5.7 或 8.0 | 装好会自动启动 |
| **PM2 管理器** | 5.x | 自带 Node.js,装好会在左侧出现「PM2 管理器」菜单 |

安装过程中如果问要不要开机启动,**全勾**。装完后等 30 秒,在宝塔首页「软件列表」里能看到三个都在「运行中」。

### 2.2 建一个空数据库 `zero`

宝塔左侧菜单 → **数据库** → 顶部 **添加数据库** 按钮,在弹出框这样填:

| 表单项 | 你要填的值 |
|---|---|
| **数据库名** | `zero` |
| **用户名** | `zero` |
| **密码** | `zh123456` |
| **访问权限** | **本地服务器** ⚠️ |
| **编码** | `utf8mb4`(默认就是,不用改) |

> ⚠️ **访问权限必须选「本地服务器」**,**不要**选「所有人」!只允许 B 台本机连 MySQL,A 台不直连(它走 Nginx 反代调后端 API)。

点 **提交**。

回到数据库列表,应该看到多了一行 `zero`,状态是「未导入数据」(因为表还没建)。

### 2.3 确认 MySQL 能登录 + 拿到 root 密码

接下来 §3 跑 `init-db.sh` 的时候要用 **MySQL root 密码**(临时连 root 来建表,应用运行时才用 `zero` 这个普通账号)。

宝塔左侧菜单 → **数据库** → 顶部 **root 密码** 按钮(或「设置」 → MySQL 密码)→ **记录下来**(如果忘了可以在这里重置)。

**验证 root 能连**(宝塔终端):
```bash
mysql -uroot -p
# 输入刚才记下来的 root 密码
# 看到 mysql> 提示符即成功
# 输入 exit 退出
```

再验证 `zero` 普通账号能连:
```bash
mysql -h127.0.0.1 -uzero -p'zh123456' zero -e "SHOW TABLES;"
# 应输出:
#   ERROR 1146 (42S02): Table 'zero.xxx' doesn't exist
# (空表 — 这是正常的,因为我们还没建表!有这行报错说明数据库账号能连)
```

### 2.4 §2 完成 — 接下来去 §3

✅ 到这里 §2 全部做完了:
- MySQL / Nginx / PM2 都装好并运行
- `zero` 库建好了(空库,没表)
- MySQL root 密码你记下来了

❌ 数据库现在还是**空的**(没有任何表) — 这是正常的,因为我们还没上传代码,**没法**跑导表脚本。

📍 **下一步 → §3**:把后端代码上传到 B 台,上传完成后 §3 里就有一步专门跑 `init-db.sh` 把表建出来。

---

## ⚙️ 第 3 步:B 台 (47.236.95.137) — 部署后端代码

> 🎯 **这一节会带你按这个顺序在宝塔上点:**
> 左侧菜单「**文件**」 → 进入 `/www/wwwroot/exchange-admin/` → 上传/拉取代码
> → §3.3 跑 `init-db.sh` 把 §2.2 建的 `zero` 空库填上表
> → §3.4 `npm install` + §3.5 写 `.env`
> → 左侧菜单「**PM2 管理器**」 → 添加项目
> → 左侧菜单「**网站**」 → 添加站点(`exchange-admin.b.local`)
> → 左侧菜单「**安全**」 → 放行端口

### 3.1 创建项目根目录(SSH)

宝塔左侧菜单 **终端**(宝塔自带 SSH 终端,免开 Puxt),逐行粘贴:

```bash
mkdir -p /www/wwwroot/exchange-admin
cd /www/wwwroot/exchange-admin
pwd
# 应输出:/www/wwwroot/exchange-admin
```

> 📁 **本节全部操作都在这个目录下**:`/www/wwwroot/exchange-admin/`
> 📂 代码最终位置:`/www/wwwroot/exchange-admin/admin/{src,server.ts,package.json,...}`
> ⚠️ **不要**把代码直接放到 `/www/wwwroot/exchange-admin/`(会少一层 `admin/`)

### 3.2 上传代码(选一种)

> 📦 上传完后,代码最终落在 `/www/wwwroot/exchange-admin/admin/`,**关键文件/目录** 你应该看到:
>
> | 路径 | 是什么 | 后面哪一步会用到 |
> |---|---|---|
> | `admin/server.ts` | 后端入口 | §3.6 启动测试 / §3.7 PM2 |
> | `admin/package.json` | Node 依赖清单 | §3.4 `npm install` |
> | `admin/.env.example` | 环境变量样例 | §3.5 复制成 `.env` |
> | `admin/schema.sql` | 业务表结构 | §3.3 由 init-db.sh 自动导入 |
> | `admin/schema-admin.sql` | 管理员表结构 | §3.3 由 init-db.sh 自动导入 |
> | `admin/migrations/*.sql` | 增量迁移脚本 | §3.3 由 init-db.sh 自动应用 |
> | **`admin/scripts/init-db.sh`** | **建库一键脚本**(本项目自带,你不用自己写) | §3.3 跑它 |
> | `admin/scripts/init-db.mjs` | 同上,Node.js 版本(可选) | — |
>
> 👆 **如果你看不到 `admin/scripts/init-db.sh` 这个文件**,说明你上传的压缩包/git clone 出问题了,先回 §0.3 检查「要上传哪些」。

#### 方式 A — Git 拉取(推荐)

在宝塔终端里继续:
```bash
cd /www/wwwroot/exchange-admin
yum install -y git   # CentOS / 或 apt install -y git (Ubuntu)
git clone https://github.com/Zerotree-ruyi/Community.git .
ls
# 应看到:admin  src  public  package.json  DEPLOY_BAOTA.md ...
cd admin
ls
# 应看到:server.ts  package.json  src  schema.sql  migrations  scripts  ...
ls scripts/
# ★ 应看到 init-db.sh 和 init-db.mjs 这两个文件 ★
pwd
# 应输出:/www/wwwroot/exchange-admin/admin   ← 这个路径,后面 PM2 要用
```

#### 方式 B — 宝塔文件管理器上传(不用 SSH 命令)

1. 宝塔左侧菜单 → **文件** → 顶部路径栏输入 `/www/wwwroot/exchange-admin` → 回车
2. 看到空目录就对了(就是你 §3.1 mkdir 出来的)
3. 点左上 **上传** 按钮 → 选 **上传文件**(不是上传目录)→ 选本地打包好的 `admin.zip`
4. 上传完,**双击** `admin.zip` 进去看里面有什么(应该是 `admin/server.ts` `admin/package.json` `admin/scripts/init-db.sh` ...)
5. 点顶部路径栏右边 **解压** 按钮(或者右键 `admin.zip` → 解压)→ 解压到 **当前目录**
6. 解压后,顶部路径栏回到 `/www/wwwroot/exchange-admin`,文件列表里应该多出一个 `admin/` 文件夹
7. **点进 `admin/`** → 再点进 `scripts/`,**确认看到 `init-db.sh` 文件**(没看到这个脚本就到不了 §3.3)

最终路径必须是 `/www/wwwroot/exchange-admin/admin/scripts/init-db.sh` — **多一层 admin/ 是因为仓库根目录就叫 Community,解压后自然带了 admin/ 这一层**(或者 git clone 之后你 `cd admin` 也是这个效果)。

**❌ 错误示范**(会导致后面 PM2 找不到 server.ts / init-db.sh):
```
/www/wwwroot/exchange-admin/server.ts                          ← 少了一层 admin/
/www/wwwroot/exchange-admin/admin.zip                         ← 解压完忘了点进去
/www/wwwroot/exchange-admin/admin/  (没有 scripts 目录)        ← 你传错包了,只传了部分文件
```

### 3.3 导入数据库表结构(填上 §2.2 建的空库)

> 🎯 **这一步把 §2.2 建的 `zero` 空库填上表**。跑 §3.2 上传进来的 **`admin/scripts/init-db.sh`** 这个脚本就行(脚本是项目自带的,你不用自己写代码)。

脚本完整路径:
```
/www/wwwroot/exchange-admin/admin/scripts/init-db.sh
```

跑法:宝塔终端
```bash
cd /www/wwwroot/exchange-admin/admin
ls scripts/init-db.sh
# ★ 必须先看到这一行,输出 init-db.sh 才能继续 ★(没看到就回 §3.2 重传)
chmod +x scripts/init-db.sh

# 用法:跟 §2.2 宝塔里建库的 4 个值保持完全一致
./scripts/init-db.sh \
  --name zero \
  --user zero \
  --pass 'zh123456'
```

跑起来后脚本会做这些事(逐条打印进度):
1. **问你 MySQL root 密码**(就是 §2.3 让你记下来的那个)— 输入,回车
2. 在 `zero` 库里导入业务表(`schema.sql`)
3. 导入管理员表(`schema-admin.sql`)
4. 按文件名顺序应用所有迁移 SQL(`migrations/` 下)
5. **问你是否创建默认超级管理员 `admin / admin123`**(输入 `y` 回车即可,后面立刻能登进后台)

最后会输出 `✅ 数据库初始化完成`。如果中间报错(比如密码不对),回到 §2.3 重置 root 密码,再跑一次。

**验证表都建出来了**:
```bash
mysql -h127.0.0.1 -uzero -p'zh123456' zero -e "SHOW TABLES;"
# 应输出十几张表:members  orders  withdrawals  recharges  fund_records  ...
```

### 3.4 安装依赖

宝塔终端:
```bash
cd /www/wwwroot/exchange-admin/admin
npm install --production
# 等 1-3 分钟,看到 "added xxx packages" 即完成
ls node_modules | head -5
# 应看到:bcryptjs  cors  express  mysql2  ... 一堆文件夹
```

### 3.5 配置 `.env`

宝塔终端:
```bash
cd /www/wwwroot/exchange-admin/admin
cp .env.example .env
vi .env
```

在 vi 里按 `i` 进入编辑模式,**完整替换**成下面内容:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=zero
DB_PASS=zh123456
DB_NAME=zero
PORT=3001
```

按 `Esc` → 输入 `:wq` → 回车 保存退出。
然后:
```bash
cat .env
# 确认输出上面那 6 行,没多没少
chmod 600 .env
```

> ⚠️ 这里填的 `DB_USER=zero` `DB_PASS=zh123456` 必须跟 §2.2 宝塔建库时设的**完全一致**(否则 §3.7 PM2 一启动就 `access denied`)。

### 3.6 启动测试(确认能跑)

宝塔终端:
```bash
cd /www/wwwroot/exchange-admin/admin
npx tsx server.ts
```

看到:
```
✅ Express API ready at http://localhost:3001
   Try: curl http://localhost:3001/api/health
```
按 `Ctrl+C` 停掉。接下来用 PM2 守护。

### 3.7 PM2 添加项目(让后端 7×24 跑)

宝塔左侧菜单 → **PM2 管理器** → 顶部 **添加项目** 按钮,在弹出框里这样填:

| 表单项 | 你要填的值 | 说明 |
|---|---|---|
| **项目名称** | `exchange-admin` | 自己认得出就行 |
| **运行目录** | `/www/wwwroot/exchange-admin/admin` | ⚠️ 这个路径里有 `/admin` 这一层 |
| **启动文件** | `server.ts` | 因为我们用 tsx 跑 TypeScript |
| **启动方式** | 选 **自定义启动命令** | 不要选「node」,那样找不到 tsx |
| **项目端口** | `3001` | 与 .env 里的 PORT 一致 |

**自定义启动命令** 那栏填:
```bash
npx tsx server.ts
```

点 **提交**。等 5 秒,回到 PM2 管理器列表,看到 `exchange-admin` 这一行右侧状态变 **绿点 + online** 即成功。

> ⚠️ 如果状态是 **errored** 或 **stopped**,点这一行右侧 **日志** 按钮看报错。常见错误:
> - `Cannot find module '../.env'` → 你 .env 文件没建,回 §3.5
> - `access denied for user 'zero'` → 你 .env 里 DB_PASS 跟 §2.2 宝塔建库时设的不一样,改一致
> - `ECONNREFUSED 127.0.0.1:3306` → MySQL 没启,宝塔 → 软件商店 → MySQL → 启动

### 3.8 添加站点(让 `/api/*` 能被外网访问)

> 🎯 这一步在宝塔左侧 **网站** 菜单,加一个站点,只为拿到一个 Nginx server 块,后端文件本身不靠它服务。

宝塔左侧菜单 → **网站** → 右上角 **添加站点** 按钮:

| 表单项 | 你要填的值 |
|---|---|
| **域名** | `exchange-admin.b.local` (本项目后台站点名,反正用户不会直接访问这个域名;后续要 https 就改真实域名) |
| **根目录** | **改成** `/www/wwwroot/exchange-admin/admin` ⚠️ 不是默认的 `/www/wwwroot/exchange-admin-b.local` |
| **FTP** | **不创建** |
| **数据库** | **不创建** |
| **PHP 版本** | **纯静态** ⚠️ 不要选 PHP-7.x / PHP-8.x |
| **备注** | 随便写,比如 `后台 API 反代` |

> 📁 **根目录要点**:
> - 宝塔默认会按域名生成根目录 `/www/wwwroot/exchange-admin.b.local/`
> - **必须改成** `/www/wwwroot/exchange-admin/admin`(就是放后端代码的地方)
> - 这个目录**不会被 Nginx 实际访问**(我们只走 `/api/`),但宝塔需要它存在一个真实路径

点 **提交**。

### 3.9 配置反向代理(`/api/*` → PM2 跑的 3001)

宝塔左侧菜单 → **网站** → 找到 `exchange-admin.b.local` 这一行 → 右侧 **设置** 按钮。

弹出站点设置面板,左侧子菜单选 **反向代理** → 顶部 **添加反向代理** 按钮:

| 表单项 | 你要填的值 |
|---|---|
| **代理名称** | `api` |
| **目标 URL** | `http://127.0.0.1:3001` |
| **发送域名** | `$host` |

点 **提交**。

提交后宝塔会自动生成 `proxy_pass` 配置,**不需要再手编 Nginx**。宝塔自动 `nginx -t` 检查配置,无误后 reload。

> 🎯 这一步的效果:**外部访问 `http://47.236.95.137/api/health` 会被 Nginx 转到 `http://127.0.0.1:3001/api/health`** — 也就是 PM2 跑的那个后端。

### 3.11 B 台防火墙

宝塔左侧菜单 → **安全** → 放行端口(顶部有「放行端口」按钮):

| 端口 | 用途 | 给谁开 |
|---|---|---|
| `80` | Nginx (A 台反代用) | 公网 |
| `443` | Nginx HTTPS(可选) | 公网 |
| `3001` | 备用直连(可不开放) | **❌ 建议不开** — A 台反代走 B 台 80,直连 3001 绕开 Nginx,没必要暴露 |
| `3306` | MySQL | **❌ 不要开公网** |

### 3.12 B 台部署完成 — 自检

宝塔终端:
```bash
# 本地测后端(应该 200)
curl http://127.0.0.1:3001/api/health

# 走 Nginx 测(应该 200)
curl http://127.0.0.1/api/health
# 或者从外网测(在 A 台执行):
# curl http://47.236.95.137/api/health
```

两个都返回 `{"ok":true,...}` 即 B 台部署成功。

---

## 🌐 第 4 步:A 台 (47.236.172.111) — 部署前台

> 🎯 **这一节会带你按这个顺序在宝塔上点:**
> 本地电脑执行 `npm run build` 生成 `dist/`
> → 宝塔左侧菜单「**文件**」 → 进 `/www/wwwroot/trade/` → 上传 `dist/` 内容
> → 左侧菜单「**网站**」 → 添加站点(`47.236.172.111` 或你的域名)
> → 配 Nginx 反代 `/api/` → `47.236.95.137`

### 4.1 宝塔安装软件

宝塔左侧菜单 → **软件商店**,安装:

| 软件 | 版本 | 说明 |
|---|---|---|
| Nginx | 1.22+ | 静态站点 + 反代 |
| Node.js | 20+ | 用于本地 build(Vite 需要) |

### 4.2 本地 build 前台(在你自己的电脑上,**不是服务器**)

打开 Windows PowerShell(Win+R → 输入 `powershell` → 回车):
```powershell
cd "C:\Users\Administrator\Desktop\交易所设计 (Community)"
npm install
npm run build
```

等 1-2 分钟,看到类似 `built in 5.32s` 即完成。项目根目录会多出一个 `dist/` 文件夹。

打开看看:
```powershell
dir dist
# 应看到: index.html  assets/  favicon.ico  ... 等
```

> 📁 **`dist/` 里就是产物**,后面对 A 台就是只传这个文件夹。
> ❌ 不要传整个 `Community/` 仓库给 A 台(A 台不需要后端代码)。

### 4.3 上传 dist/ 到 A 台

宝塔左侧菜单 → **文件** → 顶部路径栏输入 `/www/wwwroot/trade` → 回车。

**如果目录不存在**(宝塔通常会自动建,不会的话就手动建):
- 点顶部 **新建文件夹** → 名字填 `trade` → 确定

接下来上传,有 2 种姿势:

#### 姿势 A(推荐)— 压缩上传

在本地 PowerShell 里把 dist 整个打成 zip(里面**不要**再套一层 dist 文件夹):
```powershell
cd "C:\Users\Administrator\Desktop\交易所设计 (Community)\dist"
Compress-Archive -Path * -DestinationPath "..\trade-frontend.zip" -Force
# 这一步会把 dist 里的 index.html / assets/... 压成 zip,zip 里直接是这些文件,不再有 dist/ 这一层
```

回到宝塔 **文件** 页面(`/www/wwwroot/trade/`):
1. 点左上 **上传** → 上传文件 → 选 `trade-frontend.zip`
2. 上传完,右键 `trade-frontend.zip` → **解压** → 选「解压到当前目录」
3. 回到 `/www/wwwroot/trade/`,文件列表应能看到 `index.html`、`assets/` 等文件(没有 `dist/` 这一层)

#### 姿势 B — 拖拽上传(文件少的项目)

宝塔文件管理器支持拖拽上传:
1. 打开本地 `dist/` 文件夹,**全选里面所有内容**(Ctrl+A),**不要**选外面的 dist 文件夹本身
2. 拖到宝塔 `/www/wwwroot/trade/` 页面里

最终 A 台路径必须是这个布局:
```
/www/wwwroot/trade/
├── index.html
├── assets/
│   ├── index-xxxxxx.js
│   ├── index-xxxxxx.css
│   └── ...
├── favicon.ico
└── ...其他构建产物
```

❌ **错误示范**(会导致访问白屏):
```
/www/wwwroot/trade/dist/index.html            ← 多套了一层 dist
/www/wwwroot/trade/Community/index.html       ← 把整个仓库传上来了
/www/wwwroot/trade/                           ← 空的,只解压忘了
```

### 4.4 添加站点

宝塔左侧菜单 → **网站** → 右上角 **添加站点**:

| 表单项 | 你要填的值 |
|---|---|
| **域名** | `47.236.172.111` (或你的真实域名如 `trade.example.com`) |
| **根目录** | 宝塔默认会填 `/www/wwwroot/47.236.172.111`,**改成** `/www/wwwroot/trade` ⚠️ |
| **FTP** | **不创建** |
| **数据库** | **不创建** |
| **PHP 版本** | **纯静态** ⚠️ |
| **备注** | `前台站点` |

> 📁 **根目录这一栏要改成 `/www/wwwroot/trade`**(就是 §4.3 上传 dist/ 的地方),不要用默认的 `/www/wwwroot/47.236.172.111/`,那个目录是空的。

点 **提交**。

### 4.5 配置反向代理(让前端能调后端)

宝塔左侧菜单 → **网站** → 找到 `47.236.172.111` 这一行 → 右侧 **设置** → 左侧子菜单 **反向代理** → 顶部 **添加反向代理** 按钮:

| 表单项 | 你要填的值 |
|---|---|
| **代理名称** | `api` |
| **目标 URL** | `http://47.236.95.137:80` |
| **发送域名** | `$host` |

> 💡 **目标 URL 用 B 台的 80 端口(走 B 台 Nginx 反代),不是直连 B 台 3001**。这样:
> - 浏览器 / 前端只看到 A 台(同源 → 无 CORS)
> - A 台 Nginx 把 `/api/*` 转到 B 台 80
> - B 台 Nginx 再把 `/api/*` 转到 3001(PM2 后端)
> - **A 台不需要开 3001 端口**(也强烈建议不开 — A 台不该跑后端)

点 **提交**。

> 🎯 这一步的效果:浏览器访问 `http://47.236.172.111/api/health` → A 台 Nginx 转到 `http://47.236.95.137/api/health` → B 台 Nginx 转到 `http://127.0.0.1:3001/api/health`(PM2)。

### 4.6 A 台防火墙

宝塔 → **安全** → 放行 `80`、`443`。

---

## 🔐 第 5 步:申请 SSL(两台都做,推荐)

宝塔 → 网站 → **SSL** → **Let's Encrypt** → 申请 → **强制 HTTPS**。
> 若没有域名只有 IP(`47.236.172.111`),SSL 用自签名或换 Let's Encrypt DNS 验证。

---

## ✅ 第 6 步:验证部署

### 6.1 B 台本地测后端
```bash
curl http://127.0.0.1:3001/api/health
# 应返回 {"ok":true,"db":[{...}]}
```

### 6.2 B 台 Nginx 测反代
```bash
curl http://47.236.95.137/api/health
# 应返回 {"ok":true,...}
```

### 6.3 A 台测前端 + 反代
```bash
# 前端页面(应返回 HTML)
curl -I http://47.236.172.111

# 前端→后端反代(说明 A→B 通了)
curl http://47.236.172.111/api/health
# 应该看到 {"ok":true,...}
```

### 6.4 浏览器访问
- 前台:http://47.236.172.111(或 `https://trade.example.com`)
- 后台:`http://47.236.95.137` 的反代路径(若做了 §3.7),或者直接 `http://47.236.95.137:3001`(仅内网)

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
| 前端调 `/api/*` 报 CORS | B 台 `server.ts` 已开 `app.use(cors())` ✓。如果用 Nginx 反代,不会触发 CORS(同源)。若 A 台没反代直接调 `47.236.95.137:3001`,改用 §4.5 的 Nginx 反代。 |
| 后端连不上 DB | 检查 B 台 `.env` 的 `DB_USER=zero` / `DB_PASS=zh123456` / `DB_NAME=zero`;`mysql -uzero -p'zh123456' zero` 在 B 台本地试连;看 PM2 日志是否有 `access denied`。 |
| B 台 `public_ip` 一直显示内网 | B 台 `curl https://api.ipify.org` 试一下。若被墙,代码会自动切到 `pconline` / `icanhazip`(见 `admin/server.ts` 的 `PUBLIC_IP_SOURCES`)。 |
| 前台白屏 | 浏览器控制台看 404。多半是 Nginx `try_files` 没配 — 检查 `location /` 块。 |
| 前端调 API 返回 502 | A 台 Nginx 连不上 B 台。`curl http://47.236.95.137/api/health` 从 A 台试一下;检查 B 台安全组/防火墙 80(或 3001)是否放行。 |
| 前台访问慢/超时 | `proxy_read_timeout` 默认 60s 够用;若用了 Vite HMR 模式,把 A 台 `try_files` 留好。 |

---

## 🛟 第 9 步:C 台 — 数据库异地备份(A、B 全挂也保数据)

> **目标**:即使 A 台(47.236.172.111)和 B 台(47.236.95.137)同时宕机/被销毁/数据被勒索加密,你的数据库完整快照仍在第三台机器上,几分钟就能拉起来。

### 9.1 架构示意

```
                    ┌────────────────────────┐
   用户浏览器 ───►   │ A 台 前台 47.236.172.111│
                    └───────────┬────────────┘
                                │ /api/*
                                ▼
                    ┌────────────────────────┐
                    │ B 台 后台 47.236.95.137│
                    │  ├─ PM2 (3001)         │
                    │  └─ MySQL zero/zero    │◄────── mysqldump
                    └────────────────────────┘  SSH 22        ▲
                                                              │ 每天定时拉
                                                              │
                                            ┌─────────────────┴──────────┐
                                            │ C 台 异地备份 C.C.C.C       │
                                            │  ├─ 仅装:SSH server + 磁盘  │
                                            │  └─ /backup/zero/           │
                                            │     ├─ daily/  保留 30 天   │
                                            │     ├─ weekly/ 保留 12 个月 │
                                            │     └─ monthly/保留 永久     │
                                            └────────────────────────────┘
```

### 9.2 C 台选型建议

| 项 | 推荐 | 说明 |
|---|---|---|
| 地域 | **跟 A、B 不同机房/不同服务商**(同城异机房或异城) | 真·异地容灾;同机房断电/火灾一样挂 |
| 配置 | 1 核 1G / 40G 系统盘 + 大容量数据盘(>=100G) | 数据库 dump 很小,但建议留余量 |
| 系统 | CentOS 7+ / Ubuntu 20+ | 跟 A、B 一致最好,宝塔通用 |
| 装机组件 | **只装 SSH 服务 + crontab + 宝塔面板**(可选) | 不需要装 MySQL、不需要装 PM2、不需要装 Nginx |
| 公网 IP | `C.C.C.C`(你自填,文档里都替换成这个) | 需要能被 B 台 SSH 进去 |

> 📌 C 台**不需要任何业务组件**,纯当"数据保险柜"。这意味着 C 台几乎 0 攻击面,被入侵概率极低。

### 9.3 C 台要做的事(只做一次)

#### 9.3.1 装宝塔(可选,纯为运维方便)

```bash
ssh root@C.C.C.C
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
# 或 CentOS:yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec
```

> 宝塔面板用来**看磁盘、看 crontab、看备份目录**很方便;不装也完全 OK。

#### 9.3.2 建备份目录结构

```bash
ssh root@C.C.C.C
mkdir -p /backup/zero/{daily,weekly,monthly}
chmod 700 /backup/zero
```

#### 9.3.3 在 C 台生成 SSH 密钥对(用于免密登录 B 台)

```bash
ssh root@C.C.C.C
ssh-keygen -t ed25519 -N '' -f /root/.ssh/zero_backup -C "zero-db-backup"
# 整个过程按 3 次回车,不设密码
```

把公钥拷到 B 台:
```bash
# 在 C 台执行,把公钥写进 B 台 root 的 authorized_keys
ssh-copy-id -i /root/.ssh/zero_backup.pub root@47.236.95.137
# 首次会问 B 台 root 密码,输入即可
```

验证免密通:
```bash
ssh -i /root/.ssh/zero_backup root@47.236.95.137 'echo ok && date && hostname'
# 应直接打印 ok + 时间,不问密码
```

#### 9.3.4 在 B 台创建**只读**的 MySQL 备份账号

> 备份不需要 INSERT/UPDATE/DELETE 权限,只给 SELECT + LOCK TABLES + RELOAD + REPLICATION CLIENT,这样即使 SSH 泄露也只能读不能写。

SSH 进 B 台:
```bash
ssh root@47.236.95.137
mysql -uroot -p   # 输入宝塔 root 密码
```

在 MySQL shell 里执行:
```sql
CREATE USER 'zero_backup'@'127.0.0.1' IDENTIFIED BY 'BkP@ss_2026!Strong';
GRANT SELECT, LOCK TABLES, RELOAD, REPLICATION CLIENT, EVENT, TRIGGER ON *.* TO 'zero_backup'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

> 密码用你自己的强密码替换 `BkP@ss_2026!Strong`。

测试:
```bash
mysql -h127.0.0.1 -uzero_backup -p'BkP@ss_2026!Strong' zero -e "SHOW TABLES;"
# 应列出 members / orders / withdrawals / ... 等表
```

#### 9.3.5 在 C 台创建备份脚本

在 C 台写 `/usr/local/bin/backup-zero-db.sh`:

```bash
ssh root@C.C.C.C
cat > /usr/local/bin/backup-zero-db.sh <<'SCRIPT_EOF'
#!/usr/bin/env bash
# ============================================================================
# 异地备份脚本 — C 台从 B 台拉 MySQL dump
# 用法: /usr/local/bin/backup-zero-db.sh [daily|weekly|monthly]
# =========================================================================: /root/.ssh/zero_backup
#   B 台 SSH 主机与 SSH 用户
B_HOST="47.236.95.137"
B_SSH_USER="root"
B_SSH_KEY="/root/.ssh/zero_backup"
B_DB_USER="zero_backup"
B_DB_PASS="BkP@ss_2026!Strong"   # 改成 B 台 §9.3.4 里设的密码
B_DB_NAME="zero"
#   本地备份目录
LOCAL_BASE="/backup/zero"
# ----------------------------------------------------------------------------

set -euo pipefail

MODE="${1:-daily}"
case "$MODE" in
  daily|weekly|monthly) ;;
  *) echo "用法: $0 [daily|weekly|monthly]"; exit 1 ;;
esac

DEST="$LOCAL_BASE/$MODE"
mkdir -p "$DEST"

TS=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)   # 1=周一 ... 7=周日
DAY_OF_MONTH=$(date +%d)

FILE="$DEST/${B_DB_NAME}_${MODE}_${TS}.sql.gz"
TMP_FILE="/tmp/${B_DB_NAME}_${TS}.sql.gz"

echo "[$(date '+%F %T')] [$MODE] 开始从 $B_HOST 拉取 $B_DB_NAME → $FILE"

# ── 核心一步:在 B 台跑 dump,管道直传,不落中间盘 ──
ssh -i "$B_SSH_KEY" \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=15 \
    "$B_SSH_USER@$B_HOST" \
    "mysqldump -h127.0.0.1 -u'$B_DB_USER' -p'$B_DB_PASS' \
        --single-transaction --quick --routines --triggers \
        --events --hex-blob \
        --default-character-set=utf8mb4 \
        '$B_DB_NAME'" \
  | gzip -9 > "$TMP_FILE"

if [[ ! -s "$TMP_FILE" ]]; then
  echo "[$(date '+%F %T')] [$MODE] ❌ 备份文件为空,SSH 失败或 mysqldump 报错" >&2
  rm -f "$TMP_FILE"
  exit 2
fi

mv "$TMP_FILE" "$FILE"
SIZE=$(du -h "$FILE" | awk '{print $1}')
echo "[$(date '+%F %T')] [$MODE] ✅ 备份完成: $FILE ($SIZE)"

# ── 保留策略 ──
case "$MODE" in
  daily)
    # 保留 30 天
    find "$DEST" -maxdepth 1 -name "${B_DB_NAME}_daily_*.sql.gz" -mtime +30 -delete
    ;;
  weekly)
    # 保留 365 天(12 个月多一点)
    find "$DEST" -maxdepth 1 -name "${B_DB_NAME}_weekly_*.sql.gz" -mtime +365 -delete
    ;;
  monthly)
    # 永久保留,只在每月 1 号跑
    if [[ "$DAY_OF_MONTH" != "01" ]]; then
      rm -f "$FILE"
      echo "[$(date '+%F %T')] [monthly] 不是月初,删除本次备份"
    fi
    ;;
esac

echo "[$(date '+%F %T')] [$MODE] 当前目录剩余:"
ls -lh "$DEST" | tail -5
SCRIPT_EOF

chmod +x /usr/local/bin/backup-zero-db.sh
```

**验证脚本能跑**(手动触发一次 daily):
```bash
/usr/local/bin/backup-zero-db.sh daily
# 应输出:
#   [2026-09-16 03:00:01] [daily] 开始从 47.236.95.137 拉取 zero → ...
#   [2026-09-16 03:00:08] [daily] ✅ 备份完成: /backup/zero/daily/zero_daily_20260916_030001.sql.gz (2.3M)
```

检查文件:
```bash
ls -lh /backup/zero/daily/
# 应该看到 zero_daily_xxx.sql.gz

# 顺便看一眼 dump 是否完整(不是 0 字节、不是报错)
zcat /backup/zero/daily/zero_daily_*.sql.gz | head -20
# 应看到 -- MySQL dump ... CREATE TABLE members ...
```

#### 9.3.6 在 C 台配 crontab

```bash
ssh root@C.C.C.C
crontab -e
```

加 3 行(每天/每周一/每月 1 号 各自拉一份):
```cron
# 每天 03:00 — 增量级 dump,保留 30 天
0 3 * * *   /usr/local/bin/backup-zero-db.sh daily   >> /var/log/zero-backup.log 2>&1

# 每周一 03:30 — 周级 dump,保留 365 天
30 3 * * 1  /usr/local/bin/backup-zero-db.sh weekly  >> /var/log/zero-backup.log 2>&1

# 每月 1 号 04:00 — 月级 dump,永久保留
0 4 1 * *   /usr/local/bin/backup-zero-db.sh monthly >> /var/log/zero-backup.log 2>&1
```

查看定时是否生效:
```bash
crontab -l | grep backup
tail -20 /var/log/zero-backup.log
```

### 9.4 数据丢失后的恢复流程(灾难演练)

#### 9.4.1 场景:B 台整机挂了 / 数据被勒索 / 误删库

**第 1 步**:在新的 B 台(可以是任何一台新机器)装 MySQL + 建库:
```bash
ssh root@新-B台-IP
yum install -y mysql-server  # 或 apt install mariadb-server
systemctl start mysql
mysql -uroot -p
```

```sql
CREATE DATABASE `zero` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zero'@'localhost' IDENTIFIED BY 'zh123456';
GRANT ALL PRIVILEGES ON `zero`.* TO 'zero'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**第 2 步**:从 C 台拉最新备份回 B 台:
```bash
ssh root@C.C.C.C
# 看最近一份 daily
ls -lt /backup/zero/daily/ | head -3

# 拷贝到本地 /tmp
scp /backup/zero/daily/zero_daily_20260916_030001.sql.gz root@新-B台-IP:/tmp/
```

**第 3 步**:在新 B 台恢复:
```bash
ssh root@新-B台-IP
cd /tmp
gunzip -c zero_daily_20260916_030001.sql.gz | mysql -uroot -p zero
# 输入 root 密码,导入

# 验证数据
mysql -uroot -p zero -e "SELECT COUNT(*) FROM members; SELECT COUNT(*) FROM orders;"
```

**第 4 步**:把恢复后的 B 台跟 A 台重新接上(走 §3 重新部署后端 + §4.5 A 台 Nginx 反代)。

> 💡 **数据丢失量估算**:
> - 每天 03:00 备份 → 最坏丢失**当天凌晨 3 点之后**的数据
> - 如果配了 Binlog(下条 §9.5 推荐),可缩到**秒级**

#### 9.4.2 场景:C 台也挂了 / C 台数据被破坏

- 周级 + 月级备份在 C 台自己也是冗余的(daily/weekly/monthly 分目录互不影响)
- 如果 C 台是云服务商,买它的「自动快照」再覆盖一层(每台云厂商都有)
- 最坏情况下:用 B 台宝塔自带的「数据库备份」也能恢复(见 §7.3)

### 9.5 加分项:B 台开 Binlog,缩到秒级丢失

宝塔 → MySQL 设置 → 配置文件,加:
```ini
[mysqld]
server-id        = 1
log_bin          = /www/server/data/mysql-bin
binlog_format    = ROW
binlog_expire_logs_seconds = 604800   # 保留 7 天
```

重启 MySQL(宝塔面板里点重启)。

之后 B 台崩溃,可用 C 台的 `mysqldump` 拿到**最近的快照**,再用 B 台的 binlog 补到**崩溃前 1 秒**:
```bash
# 在新 B 台导入 dump
mysql -uroot -p zero < zero_daily_xxx.sql
# 再补 binlog
mysqlbinlog --stop-datetime='2026-09-16 14:23:45' /www/server/data/mysql-bin.* | mysql -uroot -p zero
```

> 这层**强烈推荐加上**,配置 1 行,保命。

### 9.6 异地备份 Checklist(打勾确认)

- [ ] C 台是**异地**机房(跟 A、B 不同服务商 / 不同城市)
- [ ] C 台系统装好,SSH 服务已开
- [ ] `/backup/zero/{daily,weekly,monthly}` 三个目录建好,`chmod 700`
- [ ] C 台 SSH 公钥已加到 B 台 `~/.ssh/authorized_keys`
- [ ] B 台有 `zero_backup@127.0.0.1` 这个 MySQL 只读账号
- [ ] `/usr/local/bin/backup-zero-db.sh` 脚本已上传到 C 台,`chmod +x`
- [ ] 手动跑一次 `backup-zero-db.sh daily`,看到 ✅
- [ ] crontab 已加 3 行(daily/weekly/monthly)
- [ ] `/var/log/zero-backup.log` 有最近的成功记录
- [ ] **演练过一次恢复**:拿 C 台 dump → 新机器 → 导入 → 验证表行数
- [ ] (推荐)B 台 MySQL 已开 binlog

---

## 📋 服务器清单备忘(本项目定制)

| 服务器 | 公网 IP | 数据库 | 账号 | 密码 | 关键端口 |
|---|---|---|---|---|---|
| **A 台 前台** | `47.236.172.111` | — | — | — | 80 / 443 |
| **B 台 后台** | `47.236.95.137` | `zero` | `zero` | `zh123456` | 80 / 443 / 3001 |
| MySQL | 仅 B 台本地 | `zero` | `zero` | `zh123456` | 3306(**不开公网**) |
| **C 台 异地备份** | `C.C.C.C`(自填) | — | — | — | 22(SSH) |

---

## 🗂️ 关键文件路径速查

```
A 台 (47.236.172.111):
  /www/wwwroot/trade/dist/                  # 前端构建产物
  /www/wwwlogs/trade.access.log             # Nginx 访问日志

B 台 (47.236.95.137):
  /www/wwwroot/exchange-admin/admin/        # 后端源码
  /www/wwwroot/exchange-admin/admin/.env    # 数据库密码(chmod 600!)
  /www/wwwlogs/admin.access.log             # Nginx 访问日志
  /www/backup/database/                     # 数据库自动备份(宝塔自带)
  /www/server/data/mysql-bin.*              # Binlog(开 §9.5 后才有)

C 台 (C.C.C.C,异地备份):
  /backup/zero/daily/                       # 日级 dump,保留 30 天
  /backup/zero/weekly/                      # 周级 dump,保留 365 天
  /backup/zero/monthly/                     # 月级 dump,永久保留
  /usr/local/bin/backup-zero-db.sh          # 备份脚本
  /var/log/zero-backup.log                  # crontab 运行日志
  /root/.ssh/zero_backup                    # SSH 私钥(chmod 600!)
```

---

## 🎯 部署 Checklist(完成后逐条打勾)

### 主部署
- [ ] B 台 MySQL 已建库 `zero`,账号 `zero`/`zh123456`,权限=本地服务器
- [ ] B 台执行 `./scripts/init-db.sh --name zero --user zero --pass zh123456`,表已建
- [ ] B 台 `.env` 已写入 5 个 DB_* + PORT=3001
- [ ] B 台 `pm2 logs exchange-admin` 显示 `Express API ready`
- [ ] B 台 `curl http://127.0.0.1:3001/api/health` 返回 200
- [ ] B 台 Nginx `location /api/` 已加,`curl http://47.236.95.137/api/health` 返回 200
- [ ] A 台 `dist/` 已上传到 `/www/wwwroot/trade/dist/`
- [ ] A 台 Nginx 配置已加 `location /api/ { proxy_pass http://47.236.95.137:80/api/; }`
- [ ] A 台 `curl http://47.236.172.111/api/health` 返回 200(说明前后台贯通)
- [ ] 浏览器访问 `http://47.236.172.111` 看到登录页

### 异地备份(§9)
- [ ] C 台是**异地**机房,系统装好
- [ ] C 台 `/backup/zero/{daily,weekly,monthly}` 三目录已建
- [ ] C 台 SSH 公钥已加到 B 台 `~/.ssh/authorized_keys`
- [ ] B 台有 `zero_backup@127.0.0.1` 这个 MySQL 只读账号
- [ ] C 台 `/usr/local/bin/backup-zero-db.sh` 已配置并 `chmod +x`
- [ ] C 台手动跑一次 `backup-zero-db.sh daily` 看到 ✅
- [ ] C 台 crontab 已加 3 行(daily/weekly/monthly)
- [ ] C 台 `/var/log/zero-backup.log` 有最近的成功记录
- [ ] **做过一次恢复演练**:拿 C 台 dump → 新机器 → 导入 → 验证
- [ ] (推荐)B 台 MySQL 已开 binlog

---

部署完成后,前台用户在 `http://47.236.172.111` 看到的就是线上版本,所有 `/api/*` 请求经 A 台 Nginx 透明转发到 B 台后端,后端从 B 台 MySQL 的 `zero` 库读写数据。