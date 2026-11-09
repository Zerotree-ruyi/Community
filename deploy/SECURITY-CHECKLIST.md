# 安全上线清单 — 按顺序做,每步做完验一条

> 对应三个问题:
> 1. 后台谁都能进 → 令牌 + `/manager/` 目录入口
> 2. 直接输 IP 就能访问 → 关端口 + 目录入口 + IP 白名单
> 3. 直接输命令就能改数据库 → MySQL 只绑本机 + 关端口 + 改密码

---

## 阶段 0:先跑数据库迁移(必须最先做)

新代码的后台登录会往 `admin_users` 写 `session_token` 字段。**字段不存在,登录会直接报错。**

在 B 台执行:

```bash
cd /www/wwwroot/exchange-admin/admin
# 库名按你 .env 里的 DB_NAME 来(生产是 zero,本地是 exchange_db)
mysql -u root -p zero < migrations/2026_admin_session_token.sql
```

幂等脚本,重复跑不会出错。跑完确认:

```sql
SELECT COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA='zero' AND TABLE_NAME='admin_users'
   AND COLUMN_NAME LIKE 'session%';
```

应该看到 3 行:`session_token` / `session_expires_at` / `session_ip`。

---

## 阶段 1:关端口(这是「直接输 IP 就能访问」的根)

### 1.1 宝塔 → 安全 → 放行端口

| 端口 | 用途 | 改成 |
|---|---|---|
| 3001 | 后端 | **删掉**(只留 80 / 443) |
| 3306 | MySQL | **删掉** |
| 80 | nginx | 保留 |
| 443 | HTTPS | 保留 |

### 1.2 云厂商安全组(阿里云/腾讯云都有)

在控制台另有一层,宝塔改完**云安全组也要改**:

- 安全组里删掉 `3306`
- 安全组里把 `3001` 的来源改成 `47.236.172.111/32`(A 台),或者直接删掉
  —— 删掉的话,A 台要改走 B 台的 80 端口(见阶段 3)

> ⚠️ **两道都要改。** 只改宝塔不动安全组,端口照样在公网上。
> 验证方法见「最后:怎么确认真的关上了」。

### 1.3 MySQL 只绑本机

宝塔 → 软件商店 → MySQL → 设置 → 配置文件,找到 `[mysqld]` 段:

```ini
[mysqld]
bind-address = 127.0.0.1     # ← 关键,原来是 0.0.0.0
# mysqlx-bind-address = 127.0.0.1
```

改完 → 重启 MySQL。

> 「数据库跑在公网机器上」≠「数据库端口开给公网」。
> 数据库只对本机开放,A 台的请求由 B 台的 nginx 转发进来 —— 一样能用。

### 1.4 改 MySQL 密码 + 只用专用账号

宝塔 → 数据库:

1. **改 root 密码**(`z123` 这种太弱,必须改)
2. 新建一个专用账号给应用用,只授权这一个库:
   ```sql
   CREATE USER 'exchange_user'@'127.0.0.1' IDENTIFIED BY '换成强密码';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP
     ON exchange_db.* TO 'exchange_user'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```
   > 应用账号**不需要** `FILE`、`SUPER`、`GRANT OPTION`。
   > 不给 `FILE` 就不能通过 `LOAD DATA` 往磁盘写文件、也不能读服务器上的文件。
3. B 台的 `admin/.env` 里 `DB_USER` / `DB_PASS` 改成这个账号,`DB_HOST` 保持 `127.0.0.1`

### 1.5 root 账号只准本机

```sql
-- 看 root 现在允许从哪连
SELECT user, host FROM mysql.user WHERE user='root';
-- 期望只有 localhost;有 '%' 的话收掉:
DELETE FROM mysql.user WHERE user='root' AND host='%';
FLUSH PRIVILEGES;
```

---

## 阶段 2:改后端 .env

B 台 `/www/wwwroot/exchange-admin/admin/.env`:

```ini
DB_HOST=127.0.0.1
DB_USER=exchange_user
DB_PASS=换成强密码
DB_NAME=zero
PORT=3001

# ── 安全开关 ────────────────────────────────────────────────
# 前台已经跑在 HTTPS 上(A 台 coinbase-in.com 有 Let's Encrypt 证书)
COOKIE_SECURE=1
ENABLE_HSTS=1

# 跨域白名单(逗号分隔)。不填 = 只允许同源。
#
#   后台面板挂在 coinbase-in.com/manager/,它的 API 走 coinbase-in.com/manager/api/ ——
#   **同源**,后端还有「Origin 的 host == 请求的 host 就放行」的兜底判断,
#   所以这里其实可以整个留空。留着也行,当第二道保险。
#
#   ⚠️ 千万别写 "*" —— 那等于对全网开放。
ALLOWED_ORIGINS=https://coinbase-in.com

# ⚠️ 生产绝对不要开这个 —— 开了等于又回到「谁都能当超管」
ALLOW_LEGACY_ADMIN_HEADER=0
```

改完 → PM2 重启:

```bash
pm2 restart exchange-admin
pm2 logs exchange-admin --lines 30     # 看有没有报错
```

---

## 阶段 3:改 nginx

### 3.1 A 台(47.236.172.111 / coinbase-in.com)

宝塔 → 网站 → coinbase-in.com → 设置 → 配置文件,照着 `deploy/nginx-bt-a-site.conf` 改:

1. `/api/` 的 `proxy_pass` 从 `http://47.236.95.137:3001` 改成 `http://47.236.95.137:80`
2. 新增 `/manager/`、`/manager/assets/`、`/manager/api/` 三段
3. 三段里的 `allow 1.2.3.4;` **换成你自己电脑的公网 IP**(查 https://ip.sb)

### 3.2 B 台(47.236.95.137)

宝塔 → 网站 → B 台站点 → 配置文件,照着 `deploy/nginx-bt-b-site.conf`:

- `location /api/` 里 `allow 47.236.172.111;` ← **这是 A 台的 IP**

> 顺序很重要:**先配好 B 台,再改 A 台。** 反过来改的话中间会有一段前台 502。

### 3.3 验证 nginx 语法

宝塔保存时会自动 `nginx -t`。也可以手动:

```bash
nginx -t && nginx -s reload
```

---

## 阶段 4:把后台页面传上去

后台前端要构建成挂在 `/manager/` 目录下的样子:

```bash
cd admin
VITE_BASE_PATH=/manager/ VITE_API_PREFIX=/manager/api npm run build
```

产物在 `admin/dist/`,传到 A 台:

```
A 台 /www/wwwroot/trade/manager/
├── index.html
├── assets/
└── robots.txt
```

> 注意是传到 **A 台** `/www/wwwroot/trade/manager/`,
> 不是 B 台 —— 后台要跟会员前台同源(同一个域名、同一个 HTTPS 证书),
> 这样 cookie 才不会因为跨域被浏览器丢掉。

---

## 阶段 5:验收

### 5.1 后台目录入口

| 地址 | 期望 |
|---|---|
| `https://coinbase-in.com/manager/` (你的 IP) | 后台登录页 ✅ |
| `https://coinbase-in.com/manager/login` (你的 IP) | 后台登录页 ✅ |
| `https://coinbase-in.com/manager/` (别人的 IP) | **403** ✅ |
| `http://47.236.172.111:3001/` | **连不上** ✅ |
| `http://47.236.95.137:3001/api/members/1` | **连不上** ✅ |
| `http://47.236.95.137/api/members/1` | **403** ✅(B 台只放行 A 台) |

### 5.2 免密读写全被挡

登录令牌拿到之前,这些都应该是 403:

```bash
# 会员数据
curl -s -o /dev/null -w "%{http_code}\n" "https://coinbase-in.com/api/members/1"
curl -s -o /dev/null -w "%{http_code}\n" "https://coinbase-in.com/api/auth/me?member_id=1"
curl -s -o /dev/null -w "%{http_code}\n" "https://coinbase-in.com/api/funds/mine?member_id=1"
# 银行卡列表(含身份证号)—— 之前这里是 200,现在必须 403
curl -s -o /dev/null -w "%{http_code}\n" "https://coinbase-in.com/api/wallets/bank"
# 冒充超管
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Admin-Id: 1" "https://coinbase-in.com/api/admin/employees"
# 伪造后台令牌
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer deadbeef" "https://coinbase-in.com/api/admin/employees"
# 实时推送 —— 以前改个 URL 里的 id 就能订阅别人的余额/信用分
curl -s -o /dev/null -w "%{http_code}\n" "https://coinbase-in.com/api/members/1/stream"
curl -s -o /dev/null -w "%{http_code}\n" "https://coinbase-in.com/api/members/1/stream?token=deadbeef"
# 期望:上面全部 403 / 401
```

> 💡 一次性全扫一遍(只发 GET/OPTIONS,不写任何数据,可以直接对着生产跑):
> ```bash
> cd admin
> SCAN_B_API=https://coinbase-in.com node scripts/scan-prod-readonly-audit.mjs
> # 期望最后一行:✅ 免密一个都读不到 —— 符合预期
> ```

### 5.3 正常业务不受影响

用真实账号走一遍:注册 → 登录 → 看余额 → 看流水 → 提现 → 下单 → 收站内信。
**这些必须全部正常** —— 鉴权只加在「读别人数据」上,自己的数据照常。

### 5.4 怎么确认端口真的关上了

```bash
# 从你自己电脑上跑 —— 连不上才是对的
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://47.236.95.137:3001/api/health
# 期望:000(超时/拒绝连接),不是 200
```

3306 同理:

```bash
nc -z -w 5 47.236.95.137 3306 && echo "还开着!" || echo "已关闭 ✅"
```

> ⚠️ 有个坑:某些沙箱/代理环境会**假阳性**(任何端口都报连上了)。
> 所以以「MySQL 握手是否成功」为准:
> ```bash
> mysql -h 47.236.95.137 -u root -p --connect-timeout=5 -e "SELECT 1"
> ```
> 报 `Can't connect` / `Connection refused` 才是真的关了。

---

## 这次代码改了什么(方便你对照)

| 原来 | 现在 |
|---|---|
| 后台靠 `X-Admin-Id: 1` 这个头鉴权(前端随便加) | 登录时后端签发随机令牌,之后用 `Authorization: Bearer <token>`;老头默认不认(`ALLOW_LEGACY_ADMIN_HEADER=0`) |
| 会员接口只认 URL 里的 `?member_id=1` | 认会员自己的 `session_token`(HttpOnly cookie / `X-Member-Token` 头 / `?token=`) |
| 会员接口没人管 → 改个 id 就能看/改别人数据 | 分两种守卫:**管理员或本人**(读自己的数据)和**仅管理员**(改信用分/加钱/冻结/重置密码)—— 分开是为了防会员给自己提权 |
| 后台登录不限速 | 同一 IP 连错 8 次锁 15 分钟 |
| CORS 是 `cors()` 默认配置 → 任意 Origin | 手写白名单 + `Access-Control-Allow-Credentials: true` |
| 没有安全响应头 | `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy`(HSTS 可选) |
| SSE 推送把 `session_token` 一起推出去 | 推送里不再带令牌;要通知下线改推 `session-revoked` 事件 |
| SSE 订阅不校验令牌(老账号谁来都能订阅) | 必须带对令牌,否则 401 |

---

## 回滚

出问题了要退回旧版:

```bash
cd /www/wwwroot/exchange-admin/admin
git checkout <上一个稳定的 commit>
pm2 restart exchange-admin
```

**迁移不用回滚** —— 多出来的三个列对旧代码无影响(旧代码不读它们)。

唯一要注意:旧代码用的还是 `X-Admin-Id` 头。
所以如果回滚了后端,前端也要一起回滚,或者临时设:

```ini
ALLOW_LEGACY_ADMIN_HEADER=1
```

(⚠️ 这等于把「免密当超管」那个洞重新打开,只能临时用,别忘了改回去。)
