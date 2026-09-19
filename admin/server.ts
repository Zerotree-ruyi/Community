/**
 * 皮总团队交易所 — Express 后端
 * 直接放在 admin/ 根目录运行,无需建子目录
 *
 *   启动: npx tsx admin/server.ts
 *   默认端口: 3001
 *
 * 数据库连接配置见 .env(参考 .env.example)
 */

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Database pool ────────────────────────────────────────────────────────────
const db = mysql.createPool({
  host:     process.env.DB_HOST     ?? "127.0.0.1",
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER     ?? "root",
  password: process.env.DB_PASS     ?? "",
  database: process.env.DB_NAME     ?? "exchange_db",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// 请求日志(静默高频 settle-due 兜底,避免 2 秒一条刷屏)
app.use((req, _res, next) => {
  if (req.path !== "/api/orders/settle-due") {
    console.log(`[${new Date().toISOString()}] ${req.path}`);
  }
  next();
});

// ─── 币安 REST 代理(解决前端 CORS) ──────────────────────────────────────────
// 前端浏览器不能直连 https://api.binance.com,改用同源 /api/binance/*
// 由本后端代为转发,缓存 5 秒减轻上游负担
import https from "node:https";

const BINANCE_API = "api.binance.com";

function proxyBinanceGet(upstreamPath: string, req: any, res: any) {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const fullPath = `${upstreamPath}${qs ? "?" + qs : ""}`;

  const upstream = https.request(
    {
      hostname: BINANCE_API,
      path: fullPath,
      method: "GET",
      headers: { "User-Agent": "exchange-proxy/1.0" },
    },
    (upRes) => {
      res.status(upRes.statusCode || 502);
      const ct = upRes.headers["content-type"];
      if (ct) res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=5");
      upRes.pipe(res);
    }
  );
  upstream.on("error", (e) => {
    console.error("[binance proxy] error:", e.message);
    res.status(502).json({ error: "binance_upstream_error", detail: e.message });
  });
  upstream.end();
}

app.get("/api/binance/klines",       (req, res) => proxyBinanceGet("/api/v3/klines", req, res));
app.get("/api/binance/ticker/24hr",  (req, res) => proxyBinanceGet("/api/v3/ticker/24hr", req, res));
app.get("/api/binance/ticker/price", (req, res) => proxyBinanceGet("/api/v3/ticker/price", req, res));
app.get("/api/binance/exchangeInfo", (req, res) => proxyBinanceGet("/api/v3/exchangeInfo", req, res));

// ─── IP helper ───────────────────────────────────────────────────────────────
// 取客户端真实 IP(优先 x-forwarded-for,然后 req.ip,最后 socket)
function getClientIp(req: any): string {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0]).trim();
  const ip = req.ip || req.socket?.remoteAddress || "";
  // Express 默认会把 IPv6 写成 "::ffff:127.0.0.1" 这种形式,剥掉前缀
  return ip.replace(/^::ffff:/i, "");
}

// 简单 IP 地理归属识别(本地 / 内网 / 公网) — 没有真 GeoIP,做粗略判断
function ipRegion(ip: string): string {
  if (!ip) return "未知";
  if (ip === "127.0.0.1" || ip === "::1") return "本机";
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(ip)) return "内网";
  if (/^(0\.0\.0\.0|255\.255\.255\.255)$/.test(ip)) return "未知";
  return "公网";
}

// ─── 员工 IP 白名单 ────────────────────────────────────────────────────────
// 加载某员工的白名单(空数组 = 不限制)。super 直接返回空数组,不受限。
async function loadIpWhitelist(adminId: number, role: string): Promise<string[]> {
  if (role === "super") return [];
  const [rows] = await db.query(
    `SELECT ip FROM admin_ip_whitelist WHERE admin_id = ?`,
    [adminId]
  );
  return (rows as any[]).map(r => String(r.ip));
}

// 校验 IP 是否在白名单(空数组 = 不限制)
function isIpAllowed(clientIp: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return true;
  return whitelist.includes(clientIp);
}

// 健康检查
app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");
    res.json({ ok: true, db: rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Auth (注册 / 登录) ──────────────────────────────────────────────────────
const SAFE_USER_COLS = `id, account, status, balance, frozen, credit, win_mode, tag,
  ban_order, ban_withdraw, agent_id, invite_code, type, kyc_status, register_time, session_token`;

const RE_ACCOUNT    = /^[A-Za-z0-9_一-龥]{4,20}$/;
const RE_PASSWORD   = /^.{6,32}$/;
const RE_FUND_PWD   = /^\d{6}$/;
const RE_INVITE     = /^.{1,32}$/;

// ─── Admin Scope (数据归属) ──────────────────────────────────────────────────
//   - super:看全部客户
//   - admin / operator:只看 agent_id = 自己 的客户
//
// 实现方式:前端从 localStorage 取当前 admin.id,所有 /api/members/* 请求
//          都带上 header X-Admin-Id。后端不依赖 cookie/session(本期),
//          仅做行级过滤。安全性边界与改动前一致(都信任前端),只是增加业务规则。
async function getCurrentAdmin(req: any): Promise<{ id: number; role: string } | null> {
  const raw = req.headers?.["x-admin-id"];
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [rows] = await db.query(
    `SELECT id, role, status FROM admin_users WHERE id = ? LIMIT 1`,
    [id]
  );
  const u = (rows as any[])[0];
  if (!u || u.status !== 1) return null;
  return { id: u.id, role: u.role };
}

// 0 行代表越权 — 把所有「非 super」拉黑,强制前端至少要知道当前 admin
function deny(res: any, code = "forbidden", message = "权限不足") {
  return res.status(403).json({ error: code, message });
}

// 列出可见客户时附加的过滤条件(返回空串 = 不限制;否则返回 WHERE 子句片段)
//   注意:必须配合 `${scope}` 内联,不能走 `?` 参数(子句包含列名 + 操作符)
async function memberScopeWhere(req: any): Promise<string> {
  const me = await getCurrentAdmin(req);
  if (!me) return " AND 1=0";   // 拿不到当前 admin → 一行都不返回
  if (me.role === "super") return "";
  return ` AND agent_id = ${Number(me.id)}`;
}

// 单会员访问拦截 — 用于 :id 路径的所有 mutation / 详情接口
//   返回 null = 已写 res,调用方直接 return
//   返回 { agent_id } = 校验通过,可继续操作
//   若调用方没带 X-Admin-Id(前台用户自己访问自己的资源)→ 直接放行,返回 sentinel
async function requireMemberAccess(req: any, res: any, memberId: number): Promise<{ agent_id: number } | null> {
  const me = await getCurrentAdmin(req);
  if (!me) return { agent_id: -1 };   // 非 admin 上下文(前台用户),跳过归属校验
  const [rows] = await db.query(
    `SELECT agent_id FROM members WHERE id = ? LIMIT 1`,
    [memberId]
  );
  const m = (rows as any[])[0];
  if (!m) { res.status(404).json({ error: "not_found", message: "会员不存在" }); return null; }
  if (me.role !== "super" && Number(m.agent_id) !== me.id) {
    deny(res, "forbidden", "该客户不属于您的团队");
    return null;
  }
  return { agent_id: Number(m.agent_id) };
}

// 角色守卫 — 仅允许指定角色访问(常用于 super-only 接口)
//   返回 null = 已写 res,调用方直接 return
//   返回 { id, role } = 校验通过
async function requireRole(req: any, res: any, roles: string[]): Promise<{ id: number; role: string } | null> {
  const me = await getCurrentAdmin(req);
  if (!me) { deny(res, "no_admin", "未识别管理员"); return null; }
  if (!roles.includes(me.role)) {
    deny(res, "forbidden", "需要更高权限");
    return null;
  }
  return me;
}

function genInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      account, password, fundPassword, fundPasswordConfirm, inviteCode,
    } = req.body ?? {};

    // 基础校验
    if (!account || !RE_ACCOUNT.test(String(account))) {
      return res.status(400).json({ error: "invalid_account",
        message: "账号必须是 4-20 位中英数字下划线" });
    }
    if (!password || !RE_PASSWORD.test(String(password))) {
      return res.status(400).json({ error: "invalid_password",
        message: "密码长度需 6-32 位" });
    }
    if (!fundPassword || !RE_FUND_PWD.test(String(fundPassword))) {
      return res.status(400).json({ error: "invalid_fund_password",
        message: "资金密码必须是 6 位数字" });
    }
    if (fundPassword !== fundPasswordConfirm) {
      return res.status(400).json({ error: "fund_password_mismatch",
        message: "两次资金密码不一致" });
    }
    if (!inviteCode || !RE_INVITE.test(String(inviteCode))) {
      return res.status(400).json({ error: "invalid_invite_code",
        message: "邀请码 1-32 字符,且必填" });
    }

    // ★ 核心修复:反查邀请码属于哪个 admin
    //   1) 必须存在于 admin_users.invite_code 且 status=1
    //   2) 把查到的 admin.id 作为新会员的 agent_id(归属)
    //   3) 邀请码不存在 / admin 已禁用 → 拒绝注册
    //   4) 邀请码在作废表里(retired_invite_codes)→ 拒绝
    //      场景:admin 重新生成了新码,旧码失效,但别人截图留着了想混进来
    const [adminRows] = await db.query(
      `SELECT id FROM admin_users
         WHERE invite_code = ? AND status = 1 LIMIT 1`,
      [inviteCode]
    );
    const inviter = (adminRows as any[])[0];
    if (!inviter) {
      // 查一下是不是被作废的旧码
      const [retiredRows] = await db.query(
        `SELECT retired_at FROM retired_invite_codes
           WHERE invite_code = ? LIMIT 1`,
        [inviteCode]
      );
      if ((retiredRows as any[]).length > 0) {
        return res.status(400).json({ error: "retired_invite_code",
          message: "邀请码已作废,请向管理员索取最新邀请码" });
      }
      return res.status(400).json({ error: "invalid_invite_code",
        message: "邀请码无效或所属管理员已禁用" });
    }
    const agentId = Number(inviter.id);

    const passwordHash  = bcrypt.hashSync(String(password), 10);
    const fundPwdHash   = bcrypt.hashSync(String(fundPassword), 10);
    const sessionToken  = newSessionToken();

    try {
      const [result] = await db.query(
        `INSERT INTO members
           (account, password_hash, fund_password, session_token, status, type, kyc_status, agent_id, invite_code, register_time)
         VALUES (?, ?, ?, ?, 1, '会员', '未提交', ?, ?, NOW())`,
        [account, passwordHash, fundPwdHash, sessionToken, agentId, inviteCode]
      );
      const insertId = (result as any).insertId;
      const [rows] = await db.query(
        `SELECT ${SAFE_USER_COLS} FROM members WHERE id = ?`,
        [insertId]
      );
      return res.status(201).json({ user: (rows as any[])[0] });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "account_taken",
          message: "该账号已被注册" });
      }
      throw err;
    }
  } catch (err: any) {
    console.error("[register]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { account, password } = req.body ?? {};
    if (!account || !password) {
      return res.status(400).json({ error: "invalid_input",
        message: "请输入账号和密码" });
    }

    const [rows] = await db.query(
      `SELECT id, account, nickname, phone, email, gender, remark,
              status, password_hash, balance, frozen, credit,
              tag, direction, ban_order, ban_withdraw, agent_id, invite_code, type,
              kyc_status, register_time, session_token
         FROM members WHERE account = ? LIMIT 1`,
      [account]
    );
    const user = (rows as any[])[0];
    if (!user) {
      return res.status(401).json({ error: "not_found",
        message: "账号不存在" });
    }
    if (user.status === 0) {
      return res.status(403).json({ error: "account_disabled",
        message: "账号已被禁用" });
    }
    const ok = bcrypt.compareSync(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "wrong_password",
        message: "密码错误" });
    }
    // 登录成功 → 重新生成 session_token,旧 token 立即失效(强制下线场景)
    const sessionToken = newSessionToken();
    await db.query(
      `UPDATE members SET session_token = ?, last_login_time = NOW() WHERE id = ?`,
      [sessionToken, user.id]
    );
    user.session_token = sessionToken;
    // 脱敏:不返回 password_hash
    delete user.password_hash;
    return res.json({ user });
  } catch (err: any) {
    console.error("[login]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 会员自助修改登录密码
// POST /api/auth/change-password
//   body: { member_id, old_password, new_password }
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const memberId = Number(req.body?.member_id);
    const oldPwd   = String(req.body?.old_password ?? "");
    const newPwd   = String(req.body?.new_password ?? "");

    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id",
        message: "会员 ID 无效" });
    }
    if (!oldPwd) {
      return res.status(400).json({ error: "missing_old_password",
        message: "请输入旧密码" });
    }
    if (!RE_PASSWORD.test(newPwd)) {
      return res.status(400).json({ error: "invalid_password",
        message: "新密码长度需 6-32 位" });
    }
    if (oldPwd === newPwd) {
      return res.status(400).json({ error: "same_password",
        message: "新密码不能与旧密码相同" });
    }

    const [rows] = await db.query(
      `SELECT id, account, status, password_hash
         FROM members WHERE id = ? LIMIT 1`,
      [memberId]
    );
    const m = (rows as any[])[0];
    if (!m) return res.status(404).json({ error: "not_found",
      message: "会员不存在" });
    if (m.status === 0) return res.status(403).json({ error: "account_disabled",
      message: "账号已被禁用" });

    if (!bcrypt.compareSync(oldPwd, m.password_hash)) {
      return res.status(401).json({ error: "wrong_old_password",
        message: "旧密码错误" });
    }

    const newHash = bcrypt.hashSync(newPwd, 10);
    await db.query(`UPDATE members SET password_hash = ? WHERE id = ?`, [newHash, memberId]);

    return res.json({ ok: true, account: m.account });
  } catch (err: any) {
    console.error("[auth/change-password]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 会员自助修改资金密码
// POST /api/auth/change-fund-password
//   body: { member_id, old_fund_password?, new_fund_password }
//   - 如果 fund_password 已设置,需要 old_fund_password 校验
//   - 如果尚未设置(注册时漏填),允许只传 new_fund_password 直接设置
app.post("/api/auth/change-fund-password", async (req, res) => {
  try {
    const memberId = Number(req.body?.member_id);
    const oldPwd   = String(req.body?.old_fund_password ?? "");
    const newPwd   = String(req.body?.new_fund_password ?? "");

    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id",
        message: "会员 ID 无效" });
    }
    if (!RE_FUND_PWD.test(newPwd)) {
      return res.status(400).json({ error: "invalid_fund_password",
        message: "资金密码必须是 6 位数字" });
    }

    const [rows] = await db.query(
      `SELECT id, account, status, fund_password
         FROM members WHERE id = ? LIMIT 1`,
      [memberId]
    );
    const m = (rows as any[])[0];
    if (!m) return res.status(404).json({ error: "not_found",
      message: "会员不存在" });
    if (m.status === 0) return res.status(403).json({ error: "account_disabled",
      message: "账号已被禁用" });

    // 已设置资金密码:必须验证旧密码
    if (m.fund_password) {
      if (!oldPwd) {
        return res.status(400).json({ error: "missing_old_password",
          message: "请输入当前资金密码" });
      }
      if (!bcrypt.compareSync(oldPwd, m.fund_password)) {
        return res.status(401).json({ error: "wrong_old_password",
          message: "当前资金密码错误" });
      }
      if (oldPwd === newPwd) {
        return res.status(400).json({ error: "same_password",
          message: "新资金密码不能与旧密码相同" });
      }
    }

    const newHash = bcrypt.hashSync(newPwd, 10);
    await db.query(`UPDATE members SET fund_password = ? WHERE id = ?`, [newHash, memberId]);

    return res.json({ ok: true, account: m.account, wasSet: !!m.fund_password });
  } catch (err: any) {
    console.error("[auth/change-fund-password]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// ─── Admin (后台管理账号) ────────────────────────────────────────────────────
const SAFE_ADMIN_COLS = `id, username, display_name, role, status, invite_code,
  last_login_time, created_at`;

function genCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混的 0/1/I/O
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// 生成 session token(每次登录/被踢时刷新)
// Node 内置 crypto.randomUUID(),无依赖、够随机
function newSessionToken(): string {
  // randomUUID() 生成 36 字符 (含连字符),足够防撞
  return randomUUID().replace(/-/g, "");
}

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: "invalid_input",
        message: "请输入账号和密码" });
    }
    const [rows] = await db.query(
      `SELECT id, username, password_hash, display_name, role, status,
              invite_code, last_login_time, last_login_ip, created_at
         FROM admin_users WHERE username = ? LIMIT 1`,
      [username]
    );
    const admin = (rows as any[])[0];
    if (!admin) {
      return res.status(401).json({ error: "not_found", message: "账号不存在" });
    }
    if (admin.status === 0) {
      return res.status(403).json({ error: "account_disabled", message: "账号已被禁用" });
    }
    const ok = bcrypt.compareSync(String(password), admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "wrong_password", message: "密码错误" });
    }
    const ip = getClientIp(req);
    // IP 白名单校验(员工角色才生效,super 不受限)
    const whitelist = await loadIpWhitelist(admin.id, admin.role);
    if (!isIpAllowed(ip, whitelist)) {
      return res.status(403).json({
        error: "ip_not_allowed",
        message: "当前 IP 不在白名单内,无法登录",
      });
    }
    // 更新最后登录时间 + IP
    await db.query(
      "UPDATE admin_users SET last_login_time = NOW(), last_login_ip = ? WHERE id = ?",
      [ip, admin.id]
    );
    admin.last_login_time = new Date();
    admin.last_login_ip   = ip;
    delete admin.password_hash;
    return res.json({ user: admin, current_ip: ip });
  } catch (err: any) {
    console.error("[admin/login]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// ─── 本机公网 IP(后端出站视角) ──────────────────────────────────────────────
// 策略:
//   1) curl(子进程)— 主路径,自动尊重 HTTPS_PROXY/HTTP_PROXY/ALL_PROXY 环境变量
//      这点很关键:在公司网络或开了代理时,fetch 不走代理,而 curl 会
//   2) fetch(内置)— 兜底
//   3) 国内外多个 IP API 并发 race
//   4) 5 秒超时,10 分钟缓存
//   5) 全部失败时降级返回旧缓存;彻底失败返回 null
interface PublicIpEntry {
  ip: string;
  ts: number;
  source: string;
}
let publicIpCache: PublicIpEntry | null = null;
const PUBLIC_IP_TTL_MS = 10 * 60 * 1000;
const execAsync = promisify(execCb);

interface PublicIpSource {
  name: string;
  url: string;
  type: "json" | "text";
  extract: (data: any) => string | null;
}

// 8 个独立的公网 IP API — 国内外都有,覆盖各种网络环境
const PUBLIC_IP_SOURCES: PublicIpSource[] = [
  // ── 国外(国外服务器/VPN 出口时用) ────────────────────
  {
    name: "ipify",
    url: "https://api.ipify.org?format=json",
    type: "json",
    extract: (d) => isPublicIp(d?.ip) ? d.ip : null,
  },
  {
    name: "ip.sb",
    url: "https://api.ip.sb/lookup?format=json",
    type: "json",
    extract: (d) => isPublicIp(d?.ip) ? d.ip : null,
  },
  {
    name: "ifconfig.me",
    url: "https://ifconfig.me/ip",
    type: "text",
    extract: (t) => isPublicIp(t) ? String(t).trim() : null,
  },
  {
    name: "icanhazip",
    url: "https://icanhazip.com/",
    type: "text",
    extract: (t) => isPublicIp(t) ? String(t).trim() : null,
  },
  {
    name: "cloudflare-trace",
    url: "https://cloudflare.com/cdn-cgi/trace",
    type: "text",
    extract: (t) => {
      const m = String(t ?? "").match(/^ip=([^\n]+)/m);
      const v = m ? m[1].trim() : null;
      return isPublicIp(v) ? v : null;
    },
  },
  {
    name: "aws-checkip",
    url: "https://checkip.amazonaws.com/",
    type: "text",
    extract: (t) => isPublicIp(t) ? String(t).trim() : null,
  },
  // ── 国内(对国内网络友好) ──────────────────────────────
  {
    name: "pconline",
    // 太平洋电脑网,国内通用 — 实测稳定
    url: "https://whois.pconline.com.cn/ipJson.jsp?json=true",
    type: "json",
    extract: (d) => isPublicIp(d?.ip) ? d.ip : null,
  },
  {
    name: "sohu-cityjson",
    // 搜狐 IP 接口,返回的是 JS 变量: var returnCitySN = {...};
    // 先把 var 包装剥掉,再用 text 类型,parse 在 extract 里做
    url: "https://pv.sohu.com/cityjson?ie=utf-8",
    type: "text",
    extract: (t) => {
      const m = String(t ?? "").match(/\{[\s\S]*\}/);
      if (!m) return null;
      try {
        const obj = JSON.parse(m[0]);
        return isPublicIp(obj?.cip) ? obj.cip : null;
      } catch { return null; }
    },
  },
  {
    name: "baidu-qifu",
    // 百度 IP 接口,返回纯文本
    url: "https://qifu-api.baidu.com/ip/local/ipv4",
    type: "text",
    extract: (t) => isPublicIp(t) ? t : null,
  },
];

// 过滤掉内网/回环 IP(像 sohu 返 127.0.0.1 这种)— 只接受真正的公网 IPv4
function isPublicIp(v: any): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return false;
  const [a, b] = s.split(".").map(Number);
  // 排除 0.0.0.0 / 127.x / 10.x / 172.16-31.x / 192.168.x / 169.254.x
  if (a === 0 || a === 127) return false;
  if (a === 10) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 169 && b === 254) return false;
  return true;
}

// ── curl 子进程调用 — 自动走系统代理 ────────────────────
async function curlGet(url: string, timeoutSec = 5): Promise<string> {
  // -s: silent, --max-time: 硬超时, -A: UA, --noproxy '*' 让 curl 走代理时也尝试直连(由环境变量决定)
  const cmd = `curl -s --max-time ${timeoutSec} -A "Mozilla/5.0" --connect-timeout 3 "${url}"`;
  const { stdout, stderr } = await execAsync(cmd, { timeout: (timeoutSec + 2) * 1000 });
  if (stderr && !stdout) throw new Error(`curl stderr: ${stderr.slice(0, 200)}`);
  return String(stdout ?? "").trim();
}

// ── fetch 兜底(可能被代理绕过) ───────────────────────────
async function fetchGet(url: string, type: "json" | "text", timeoutMs = 5000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "curl/7.79.1", "Accept": "*/*" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = type === "json" ? await r.json() : await r.text();
    return String(data ?? "");
  } finally {
    clearTimeout(timer);
  }
}

// 单源拉取:优先 curl(走代理),失败再 fetch
async function probeOne(cfg: PublicIpSource): Promise<{
  name: string; url: string; ok: boolean; ip: string | null; ms: number; err: string | null; via: string | null;
}> {
  const start = Date.now();
  let data = "";
  let via: string | null = null;
  let err: string | null = null;
  try {
    data = await curlGet(cfg.url, 5);
    via = "curl";
  } catch (e1: any) {
    try {
      data = await fetchGet(cfg.url, cfg.type, 5000);
      via = "fetch";
    } catch (e2: any) {
      err = `curl:${e1?.message?.slice(0, 60) ?? "?"} | fetch:${e2?.message?.slice(0, 60) ?? "?"}`;
    }
  }
  if (err) {
    return { name: cfg.name, url: cfg.url, ok: false, ip: null, ms: Date.now() - start, err, via };
  }
  try {
    const parsed = cfg.type === "json" ? JSON.parse(data) : data;
    const ip = cfg.extract(parsed);
    if (!ip) throw new Error("empty/invalid");
    return { name: cfg.name, url: cfg.url, ok: true, ip, ms: Date.now() - start, err: null, via };
  } catch (e: any) {
    return { name: cfg.name, url: cfg.url, ok: false, ip: null, ms: Date.now() - start, err: `parse: ${e?.message ?? e}`, via };
  }
}

async function probeAllSources(): Promise<Array<{
  name: string; url: string; ok: boolean; ip: string | null; ms: number; err: string | null; via: string | null;
}>> {
  return Promise.all(PUBLIC_IP_SOURCES.map(probeOne));
}

/**
 * 拿本机公网 IP — 优先用缓存;缓存过期或失败才重新请求
 */
async function getPublicIp(): Promise<{ ip: string; source: string } | null> {
  const now = Date.now();
  if (publicIpCache && now - publicIpCache.ts < PUBLIC_IP_TTL_MS) {
    return { ip: publicIpCache.ip, source: publicIpCache.source };
  }
  const results = await probeAllSources();
  const winner = results.find(r => r.ok);
  if (winner) {
    publicIpCache = { ip: winner.ip!, ts: now, source: `${winner.name}/${winner.via}` };
    console.log(`[public-ip] cached ${winner.ip} (via ${winner.name}/${winner.via}, ${winner.ms}ms)`);
    for (const r of results.filter(x => !x.ok)) {
      console.warn(`[public-ip] ${r.name}/${r.via}: ${r.err} (${r.ms}ms)`);
    }
    return { ip: winner.ip!, source: `${winner.name}/${winner.via}` };
  }
  console.warn(`[public-ip] ALL sources failed:`);
  for (const r of results) console.warn(`  - ${r.name}: ${r.err} (${r.ms}ms)`);
  if (publicIpCache) {
    console.warn(`[public-ip] using stale cache ${publicIpCache.ip}`);
    return { ip: publicIpCache.ip, source: publicIpCache.source };
  }
  return null;
}

// 诊断端点 — 排查时直接访问 http://localhost:3001/api/admin/public-ip-diag
app.get("/api/admin/public-ip-diag", async (_req, res) => {
  const results = await probeAllSources();
  res.json({
    cache: publicIpCache,
    proxy_env: {
      HTTP_PROXY:  process.env.HTTP_PROXY  || null,
      HTTPS_PROXY: process.env.HTTPS_PROXY || null,
      ALL_PROXY:   process.env.ALL_PROXY   || null,
    },
    results,
    summary: {
      total:    results.length,
      success:  results.filter(r => r.ok).length,
      failed:   results.filter(r => !r.ok).length,
      fastest:  results.filter(r => r.ok).sort((a, b) => a.ms - b.ms)[0] ?? null,
    },
  });
});

// 登录页上下文:当前 IP + 本机公网 IP + 当前账号上次登录 IP(可选,前端预填)
// 支持 ?refresh=1 — 跳过缓存强制重拉(用户换梯子后用)
app.get("/api/admin/login-context", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const username = String(req.query.username ?? "").trim().slice(0, 64);
    const forceRefresh = String(req.query.refresh ?? "") === "1";
    if (forceRefresh) {
      console.log("[public-ip] force refresh requested — clearing cache");
      publicIpCache = null;
    }
    const publicIp = await getPublicIp();
    let last: { last_login_time: string | null; last_login_ip: string | null } | null = null;
    if (username) {
      const [rows] = await db.query(
        `SELECT last_login_time, last_login_ip
           FROM admin_users WHERE username = ? LIMIT 1`,
        [username]
      );
      const u = (rows as any[])[0];
      if (u) last = { last_login_time: u.last_login_time, last_login_ip: u.last_login_ip };
    }
    res.json({
      current_ip:    ip,
      current_region: ipRegion(ip),
      public_ip:     publicIp?.ip  ?? null,
      public_ip_src: publicIp?.source ?? null,
      refreshed:     forceRefresh,
      last_login:    last,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/me", async (_req, res) => {
  try {
    // 本期不实现 token 校验,前端只调一次拿当前 user(从 localStorage)
    // 保留接口为以后扩展
    res.json({ user: null });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

app.post("/api/admin/change-password", async (req, res) => {
  try {
    const { id, oldPassword, newPassword } = req.body ?? {};
    if (!id || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "invalid_input",
        message: "缺少必填字段" });
    }
    if (String(newPassword).length < 6 || String(newPassword).length > 32) {
      return res.status(400).json({ error: "invalid_password",
        message: "新密码需 6-32 位" });
    }
    const [rows] = await db.query(
      "SELECT id, password_hash FROM admin_users WHERE id = ? LIMIT 1",
      [id]
    );
    const admin = (rows as any[])[0];
    if (!admin) {
      return res.status(404).json({ error: "not_found", message: "账号不存在" });
    }
    const ok = bcrypt.compareSync(String(oldPassword), admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "wrong_password", message: "旧密码错误" });
    }
    const newHash = bcrypt.hashSync(String(newPassword), 10);
    await db.query(
      "UPDATE admin_users SET password_hash = ? WHERE id = ?",
      [newHash, id]
    );
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/change-password]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// ─── Employee Management (员工管理 — super 角色专属) ──────────────────────
// 列表 GET /api/admin/employees?q=...
// 详情 GET /api/admin/employees/:id
// 创建 POST /api/admin/employees  { username, display_name, password, role }
// 编辑 PATCH /api/admin/employees/:id  { display_name?, role? }
// 删 DELETE /api/admin/employees/:id   (super 不可删)
// 启用 / 禁用 POST /api/admin/employees/:id/(enable|disable)
// 重置邀请码 POST /api/admin/employees/:id/reset-code

// 列表
app.get("/api/admin/employees", async (req, res) => {
  try {
    // 仅 super 可看员工列表
    if (!(await requireRole(req, res, ["super"]))) return;
    const q = String(req.query.q ?? "").trim();
    const where = q
      ? `WHERE username LIKE ? OR display_name LIKE ? OR invite_code LIKE ?`
      : "";
    const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
    const [rows] = await db.query(
      `SELECT a.id, a.username, a.display_name, a.role, a.status, a.invite_code,
              a.last_login_time, a.created_at,
              (SELECT COUNT(*) FROM members m WHERE m.agent_id = a.id) AS customer_count
         FROM admin_users a
         ${where}
         ORDER BY a.id ASC`,
      params
    );
    res.json({ items: rows });
  } catch (err: any) {
    console.error("[employees GET]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 详情
app.get("/api/admin/employees/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: "invalid_id" });
    if (!(await requireRole(req, res, ["super"]))) return;
    const [rows] = await db.query(
      `SELECT id, username, display_name, role, status, invite_code,
              last_login_time, last_login_ip, created_at
         FROM admin_users WHERE id = ?`,
      [id]
    );
    if ((rows as any[]).length === 0)
      return res.status(404).json({ error: "not_found" });
    const emp = (rows as any[])[0];
    const [ipRows] = await db.query(
      `SELECT id, ip, note, created_by, created_at
         FROM admin_ip_whitelist WHERE admin_id = ? ORDER BY id DESC`,
      [id]
    );
    res.json({ employee: { ...emp, ip_rules: ipRows } });
  } catch (err: any) {
    console.error("[employees/:id GET]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 创建
app.post("/api/admin/employees", async (req, res) => {
  try {
    if (!(await requireRole(req, res, ["super"]))) return;
    const { username, display_name, password, role } = req.body ?? {};
    if (!username || !/^[A-Za-z0-9_]{4,32}$/.test(String(username)))
      return res.status(400).json({ error: "invalid_username",
        message: "账号需 4-32 位字母数字下划线" });
    if (!password || String(password).length < 6 || String(password).length > 32)
      return res.status(400).json({ error: "invalid_password",
        message: "密码需 6-32 位" });
    const r = String(role || "admin");
    if (!["admin", "operator"].includes(r))
      return res.status(400).json({ error: "invalid_role",
        message: "角色仅支持 admin / operator" });

    const passwordHash = bcrypt.hashSync(String(password), 10);
    // 自动生成唯一邀请码
    let inviteCode = genCode(6);
    // 撞码重试
    for (let i = 0; i < 5; i++) {
      const [chk] = await db.query(
        `SELECT 1 FROM admin_users WHERE invite_code = ?
         UNION SELECT 1 FROM retired_invite_codes WHERE invite_code = ? LIMIT 1`,
        [inviteCode, inviteCode]
      );
      if ((chk as any[]).length === 0) break;
      inviteCode = genCode(6);
    }

    try {
      const [ins] = await db.query(
        `INSERT INTO admin_users
           (username, password_hash, display_name, role, status, invite_code, created_at)
         VALUES (?, ?, ?, ?, 1, ?, NOW())`,
        [username, passwordHash, display_name || username, r, inviteCode]
      );
      res.status(201).json({
        employee: { id: (ins as any).insertId, username, display_name: display_name || username,
          role: r, status: 1, invite_code: inviteCode }
      });
    } catch (e: any) {
      if (e.code === "ER_DUP_ENTRY")
        return res.status(409).json({ error: "username_taken",
          message: "该账号已存在" });
      throw e;
    }
  } catch (err: any) {
    console.error("[employees POST]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 编辑
app.patch("/api/admin/employees/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: "invalid_id" });
    if (!(await requireRole(req, res, ["super"]))) return;
    const { display_name, role } = req.body ?? {};
    const fields: any = {};
    if (display_name !== undefined) fields.display_name = String(display_name).slice(0, 64);
    if (role !== undefined) {
      if (!["admin", "operator", "super"].includes(String(role)))
        return res.status(400).json({ error: "invalid_role" });
      fields.role = String(role);
    }
    if (Object.keys(fields).length === 0)
      return res.json({ ok: true, updated: 0 });

    // super 不能被降级
    const [old] = await db.query(
      `SELECT role FROM admin_users WHERE id = ?`, [id]
    );
    if (!(old as any[])[0])
      return res.status(404).json({ error: "not_found" });
    if ((old as any[])[0].role === "super" && fields.role && fields.role !== "super")
      return res.status(403).json({ error: "cannot_demote_super",
        message: "超级管理员角色不可降级" });

    const setSql = Object.keys(fields).map(k => `\`${k}\` = ?`).join(", ");
    await db.query(`UPDATE admin_users SET ${setSql} WHERE id = ?`,
      [...Object.values(fields), id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[employees PATCH]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 启用 / 禁用
const toggleEmployeeStatus = (enable: boolean) =>
  async (req: any, res: any) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0)
        return res.status(400).json({ error: "invalid_id" });
      if (!(await requireRole(req, res, ["super"]))) return;
      const [chk] = await db.query(
        `SELECT id, role FROM admin_users WHERE id = ?`, [id]
      );
      if (!(chk as any[])[0])
        return res.status(404).json({ error: "not_found" });
      if ((chk as any[])[0].role === "super" && !enable)
        return res.status(403).json({ error: "cannot_disable_super",
          message: "超级管理员不可禁用" });
      await db.query(`UPDATE admin_users SET status = ? WHERE id = ?`,
        [enable ? 1 : 0, id]);
      res.json({ ok: true, status: enable ? 1 : 0 });
    } catch (err: any) {
      console.error("[employees toggle]", err);
      res.status(500).json({ error: "server_error", message: err.message });
    }
  };
app.post("/api/admin/employees/:id/enable",  toggleEmployeeStatus(true));
app.post("/api/admin/employees/:id/disable", toggleEmployeeStatus(false));

// 重置邀请码 — 复用已有 /api/admin/regenerate-invite 的逻辑(它在前面已经实现)

// 删除
app.delete("/api/admin/employees/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: "invalid_id" });
    if (!(await requireRole(req, res, ["super"]))) return;
    const reassignTo = req.body?.reassignTo ?? req.query.reassignTo;

    const [chk] = await db.query(
      `SELECT id, role, username, invite_code FROM admin_users WHERE id = ?`, [id]
    );
    const emp = (chk as any[])[0];
    if (!emp) return res.status(404).json({ error: "not_found" });
    if (emp.role === "super")
      return res.status(403).json({ error: "cannot_delete_super",
        message: "超级管理员不可删除" });

    // 决定客户转移到哪里
    let newAgentId: number | null = null;
    if (reassignTo === "admin" || reassignTo === "super") {
      const [s] = await db.query(
        `SELECT id FROM admin_users WHERE role='super' ORDER BY id ASC LIMIT 1`);
      newAgentId = (s as any[])[0]?.id ?? null;
    } else if (reassignTo && Number.isFinite(Number(reassignTo))) {
      newAgentId = Number(reassignTo);
    } else {
      return res.status(400).json({ error: "missing_reassign",
        message: "请指定 reassignTo: 'admin' 或其他员工 id" });
    }

    // 转移客户 + 作废邀请码
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE members SET agent_id = ? WHERE agent_id = ?`,
        [newAgentId, id]
      );
      await conn.query(
        `INSERT IGNORE INTO retired_invite_codes (admin_id, invite_code, retired_by)
         VALUES (?, ?, 'delete-employee')`,
        [id, emp.invite_code]
      );
      await conn.query(`DELETE FROM admin_users WHERE id = ?`, [id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.json({ ok: true, reassignedTo: newAgentId });
  } catch (err: any) {
    console.error("[employees DELETE]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// ─── 员工 IP 白名单 CRUD(super 专属) ─────────────────────────────────────

// 列出某员工的白名单
app.get("/api/admin/employees/:id/ip-rules", async (req, res) => {
  try {
    if (!(await requireRole(req, res, ["super"]))) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: "invalid_id" });
    const [rows] = await db.query(
      `SELECT id, ip, note, created_by, created_at
         FROM admin_ip_whitelist WHERE admin_id = ? ORDER BY id DESC`,
      [id]
    );
    res.json({ data: rows });
  } catch (err: any) {
    console.error("[employees/:id/ip-rules GET]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 添加一条
app.post("/api/admin/employees/:id/ip-rules", async (req, res) => {
  try {
    const guard = await requireRole(req, res, ["super"]);
    if (!guard) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: "invalid_id" });
    const { ip, note } = req.body ?? {};
    const ipStr = String(ip ?? "").trim();
    if (!ipStr) {
      return res.status(400).json({ error: "invalid_input", message: "请输入 IP" });
    }
    if (ipStr.length > 45) {
      return res.status(400).json({ error: "invalid_input", message: "IP 过长" });
    }
    try {
      const [r] = await db.query(
        `INSERT INTO admin_ip_whitelist (admin_id, ip, note, created_by) VALUES (?,?,?,?)`,
        [id, ipStr, String(note ?? "").slice(0, 128), guard.id]
      );
      res.json({ ok: true, id: (r as any).insertId });
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "duplicate_ip", message: "该 IP 已在白名单内" });
      }
      throw e;
    }
  } catch (err: any) {
    console.error("[employees/:id/ip-rules POST]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 删除一条
app.delete("/api/admin/employees/:id/ip-rules/:ruleId", async (req, res) => {
  try {
    if (!(await requireRole(req, res, ["super"]))) return;
    const id = Number(req.params.id);
    const ruleId = Number(req.params.ruleId);
    if (!Number.isFinite(id) || !Number.isFinite(ruleId))
      return res.status(400).json({ error: "invalid_id" });
    await db.query(
      `DELETE FROM admin_ip_whitelist WHERE id = ? AND admin_id = ?`,
      [ruleId, id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[employees/:id/ip-rules DELETE]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 整组覆盖(给 EditEmployeeModal 一次性保存)
app.put("/api/admin/employees/:id/ip-rules", async (req, res) => {
  try {
    const guard = await requireRole(req, res, ["super"]);
    if (!guard) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
      return res.status(400).json({ error: "invalid_id" });
    const ips: Array<{ ip: string; note?: string }> = Array.isArray(req.body?.ips) ? req.body.ips : [];
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM admin_ip_whitelist WHERE admin_id = ?`, [id]);
      for (const r of ips) {
        const ipStr = String(r?.ip ?? "").trim();
        if (!ipStr) continue;
        await conn.query(
          `INSERT INTO admin_ip_whitelist (admin_id, ip, note, created_by) VALUES (?,?,?,?)`,
          [id, ipStr, String(r?.note ?? "").slice(0, 128), guard.id]
        );
      }
      await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error("[employees/:id/ip-rules PUT]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

app.post("/api/admin/regenerate-invite", async (req, res) => {
  try {
    // super 才能给员工重置邀请码(员工自己也可改自己的 — 简化起见只允许 super 调)
    if (!(await requireRole(req, res, ["super"]))) return;
    const { id } = req.body ?? {};
    if (!id) {
      return res.status(400).json({ error: "invalid_input", message: "缺少 id" });
    }
    const newCode = genCode(6);

    // ★ 把旧邀请码记入作废表(防止历史码被复用注册)
    const [oldRows] = await db.query(
      "SELECT invite_code FROM admin_users WHERE id = ?", [id]
    );
    const oldCode = (oldRows as any[])[0]?.invite_code;
    if (oldCode && oldCode !== newCode) {
      await db.query(
        `INSERT IGNORE INTO retired_invite_codes (admin_id, invite_code, retired_by)
         VALUES (?, ?, 'admin')`,
        [id, oldCode]
      );
    }

    await db.query("UPDATE admin_users SET invite_code = ? WHERE id = ?", [newCode, id]);
    return res.json({ ok: true, invite_code: newCode });
  } catch (err: any) {
    console.error("[admin/regenerate-invite]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// ─── Members ──────────────────────────────────────────────────────────────────
app.get("/api/members", async (req, res) => {
  try {
    const limit    = Math.min(Number(req.query.limit  ?? 50), 200);
    const offset   = Number(req.query.offset ?? 0);
    const status   = req.query.status  !== undefined && req.query.status  !== "" ? `AND status = ${mysql.escape(req.query.status)}` : "";
    const type     = req.query.type    !== undefined && req.query.type    !== "" ? `AND type = ${mysql.escape(req.query.type)}` : "";
    const kyc      = req.query.kyc     !== undefined && req.query.kyc     !== "" ? `AND kyc_status = ${mysql.escape(req.query.kyc)}` : "";
    const keyword  = String(req.query.keyword ?? "").trim();
    const kw       = keyword ? `AND (account LIKE ${mysql.escape(`%${keyword}%`)} OR invite_code LIKE ${mysql.escape(`%${keyword}%`)} OR id = ${Number(keyword) || 0})` : "";
    // 数据归属过滤 — super 看全部,普通员工只看自己的客户
    const scope = await memberScopeWhere(req);

    const [rows] = await db.query(
      `SELECT id, account, status, balance, frozen, credit, win_mode, tag, direction,
              ban_order, ban_withdraw, agent_id, invite_code, type,
              kyc_status, register_time, last_login_time, last_login_ip
         FROM members
        WHERE 1=1 ${status} ${type} ${kyc} ${kw} ${scope}
        ORDER BY register_time DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM members WHERE 1=1 ${status} ${type} ${kyc} ${kw} ${scope}`
    );
    const [[{ normal }]]   = await db.query(
      `SELECT COUNT(*) AS normal FROM members WHERE status = 1 ${scope}`
    );
    const [[{ disabled }]] = await db.query(
      `SELECT COUNT(*) AS disabled FROM members WHERE status = 0 ${scope}`
    );
    res.json({ data: rows, total, normal, disabled });
  } catch (err: any) {
    console.error("[members]", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/members/:id", async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    if (!Number.isFinite(memberId) || memberId <= 0)
      return res.status(400).json({ error: "invalid_member_id" });
    // 数据归属校验:非 super 不能查看别人的客户
    const access = await requireMemberAccess(req, res, memberId);
    if (!access) return;

    const [rows] = await db.query(
      `SELECT id, account, nickname, phone, email, gender, remark,
              status, balance, frozen, credit, win_mode, tag, direction,
              ban_order, ban_withdraw, agent_id, invite_code, type,
              kyc_status, register_time, last_login_time, last_login_ip,
              fund_password IS NOT NULL AS has_fund_password
         FROM members WHERE id = ?`,
      [memberId]
    );
    if ((rows as any[]).length === 0) return res.status(404).json({ error: "not_found" });
    res.json((rows as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 编辑会员 — 仅允许修改白名单字段,防止注入 / 误改密码
app.put("/api/members/:id", async (req, res) => {
  const memberId = Number(req.params.id);
  if (!Number.isFinite(memberId) || memberId <= 0) {
    return res.status(400).json({ error: "invalid_member_id", message: "缺少 member_id" });
  }
  // 数据归属校验
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;
  const reviewer = String(req.body?.reviewer ?? "admin").slice(0, 64);

  // 白名单字段 — 不允许改 account / password / balance
  const fields: Record<string, any> = {
    nickname:    String(req.body?.nickname ?? "").slice(0, 64).trim(),
    phone:       String(req.body?.phone ?? "").slice(0, 32).trim(),
    email:       String(req.body?.email ?? "").slice(0, 128).trim(),
    gender:      ["男", "女"].includes(req.body?.gender) ? req.body.gender : null,
    remark:      String(req.body?.remark ?? "").slice(0, 255).trim(),
    credit:      String(req.body?.credit ?? "100|1").slice(0, 16).trim(),
    win_mode:    [1, 0, 2].includes(Number(req.body?.win_mode)) ? Number(req.body.win_mode) : 2,
    tag:         String(req.body?.tag ?? "蓝随机").slice(0, 32).trim(),
    status:      req.body?.status === "启用" || req.body?.status === 1 || req.body?.status === "1" ? 1 : 0,
    direction:   req.body?.direction === "up" || req.body?.direction === "涨" ? "涨" : "跌",
    ban_order:   req.body?.ban_order   === "ban"   || req.body?.ban_order   === 1 || req.body?.ban_order   === "1" ? 1 : 0,
    ban_withdraw: req.body?.ban_withdraw === "ban" || req.body?.ban_withdraw === 1 || req.body?.ban_withdraw === "1" ? 1 : 0,
  };

  try {
    const setSql = Object.keys(fields).map(k => `\`${k}\` = ?`).join(", ");
    const values = Object.values(fields);
    const [result] = await db.query(
      `UPDATE members SET ${setSql} WHERE id = ?`,
      [...values, memberId]
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "not_found", message: "会员不存在" });
    }
    // 写管理员操作日志
    const adminId = await lookupAdminId(reviewer);
    await db.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "update_member", memberId, JSON.stringify(fields).slice(0, 240)]
    );
    // 返回更新后的完整记录
    const [rows] = await db.query(
      `SELECT id, account, nickname, phone, email, gender, remark,
              status, balance, frozen, credit, win_mode, tag, direction,
              ban_order, ban_withdraw, agent_id, invite_code, type,
              kyc_status, register_time, last_login_time, last_login_ip
         FROM members WHERE id = ?`,
      [memberId]
    );
    res.json({ ok: true, member: (rows as any[])[0] });
  } catch (err: any) {
    console.error("[members PUT]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 查询当前登录会员(前台 /api/auth/me)— 用 member_id 查询,返回最新数据
app.get("/api/auth/me", async (req, res) => {
  try {
    const memberId = Number(req.query.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id", message: "缺少 member_id" });
    }
    const [rows] = await db.query(
      `SELECT id, account, nickname, phone, email, gender, remark,
              status, balance, frozen, credit, win_mode, tag, direction,
              ban_order, ban_withdraw, agent_id, invite_code, type,
              kyc_status, register_time, session_token
         FROM members WHERE id = ? LIMIT 1`,
      [memberId]
    );
    const user = (rows as any[])[0];
    if (!user) return res.status(404).json({ error: "not_found", message: "用户不存在" });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 启用/禁用 切换
app.post("/api/members/:id/toggle-status", async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    if (!Number.isFinite(memberId) || memberId <= 0)
      return res.status(400).json({ error: "invalid_member_id" });
    const access = await requireMemberAccess(req, res, memberId);
    if (!access) return;
    await db.query("UPDATE members SET status = 1 - status WHERE id = ?", [memberId]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stats (首页 KPI 用) ─────────────────────────────────────────────────────
// 归属过滤:非 super 员工只统计自己名下客户的数据
app.get("/api/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const me = await getCurrentAdmin(req);
    if (!me) return deny(res, "no_admin", "未识别管理员");
    const isSuper = me.role === "super";
    // 非 super 用参数化 WHERE 过滤自身团队
    const memberFilter = isSuper ? "" : " AND agent_id = ?";
    const memberParams = isSuper ? [] : [me.id];
    const wdJoin   = isSuper ? "" : " JOIN members m ON m.id = w.member_id";
    const wdFilter = isSuper ? "" : " AND m.agent_id = ?";
    const wdParams = isSuper ? [] : [me.id];
    const rcJoin   = isSuper ? "" : " JOIN members m ON m.id = r.member_id";
    const rcFilter = isSuper ? "" : " AND m.agent_id = ?";
    const rcParams = isSuper ? [] : [me.id];

    const [[{ members }]] = await db.query(
      `SELECT COUNT(*) AS members FROM members WHERE 1=1 ${memberFilter}`,
      memberParams
    );
    const [[{ todayMembers }]] = await db.query(
      `SELECT COUNT(*) AS todayMembers FROM members
        WHERE DATE(register_time) = ? ${memberFilter}`,
      [today, ...memberParams]
    );
    const [[{ pendingWithdrawals }]] = await db.query(
      `SELECT COUNT(*) AS pendingWithdrawals
         FROM withdrawals w ${wdJoin}
        WHERE w.status = '申请中' ${wdFilter}`,
      wdParams
    );
    const [[{ todayWithdraw }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS todayWithdraw
         FROM withdrawals w ${wdJoin}
        WHERE DATE(w.apply_time) = ? ${wdFilter}`,
      [today, ...wdParams]
    );
    const [[{ todayRecharge }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS todayRecharge
         FROM recharges r ${rcJoin}
        WHERE DATE(r.apply_time) = ? ${rcFilter}`,
      [today, ...rcParams]
    );
    res.json({
      members,
      todayMembers,
      pendingWithdrawals,
      todayWithdraw,
      todayRecharge,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Withdrawals ──────────────────────────────────────────────────────────────
// 列出所有提现(后台用)— 支持分页、状态/类型/会员过滤,JOIN 出会员账号
app.get("/api/withdrawals", async (req, res) => {
  try {
    const limit  = Math.min(Number(req.query.limit ?? 50), 500);
    const offset = Math.max(Number(req.query.offset ?? 0),  0);
    const status   = req.query.status ? `AND w.status = ${mysql.escape(req.query.status)}` : "";
    const type     = req.query.type   ? `AND w.type   = ${mysql.escape(req.query.type)}`   : "";
    const memberId = req.query.member_id ? `AND w.member_id = ${mysql.escape(req.query.member_id)}` : "";
    const memberAcct = req.query.member_account
      ? `AND w.member_id IN (SELECT id FROM members WHERE account = ${mysql.escape(req.query.member_account)})`
      : "";
    // 数据归属过滤 — 非 super 只看自己客户的提现
    const scope = await memberScopeWhere(req);
    // scope 返回 " AND agent_id = N",但当前 SQL 没 JOIN members 时不能用
    // 这里已 JOIN m,所以把 "agent_id = N" 改成 "m.agent_id = N"
    const adminScope = scope ? scope.replace("agent_id", "m.agent_id") : "";

    const [rows] = await db.query(
      `SELECT w.*, m.account AS member_account
         FROM withdrawals w
         LEFT JOIN members m ON m.id = w.member_id
        WHERE 1=1 ${status} ${type} ${memberId} ${memberAcct} ${adminScope}
        ORDER BY w.apply_time DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM withdrawals w
        LEFT JOIN members m ON m.id = w.member_id
       WHERE 1=1 ${status} ${type} ${memberId} ${memberAcct} ${adminScope}`
    ) as any;
    res.json({ data: rows, total, limit, offset });
  } catch (err: any) {
    console.error("[withdrawals GET]", err);
    res.status(500).json({ error: err.message });
  }
});

// 用户查自己的提现记录(前台)
app.get("/api/withdrawals/mine", async (req, res) => {
  try {
    const memberId = Number(req.query.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id" });
    }
    const status = req.query.status ? `AND status = ${mysql.escape(String(req.query.status))}` : "";
    const [rows] = await db.query(
      `SELECT * FROM withdrawals
        WHERE member_id = ? ${status}
        ORDER BY apply_time DESC
        LIMIT ?`,
      [memberId, Math.min(Number(req.query.limit ?? 100), 500)]
    );
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 提现申请(用户提交)— 事务 + 冻结金额 + 写快照
app.post("/api/withdrawals", async (req, res) => {
  const memberId   = Number(req.body?.member_id);
  const walletType = req.body?.wallet_type === "bank" ? "bank"
                   : req.body?.wallet_type === "digital" ? "digital" : null;
  const walletId   = Number(req.body?.wallet_id);
  const amount     = Number(req.body?.amount);
  const fundPwd    = String(req.body?.fund_password ?? "");

  // 平台当前不收手续费 — 强制 fee = 0,实际到账 = 申请金额
  const fee = 0;

  if (!Number.isFinite(memberId) || memberId <= 0)
    return res.status(400).json({ error: "invalid_member_id", message: "缺少 member_id" });
  if (!walletType || !Number.isFinite(walletId) || walletId <= 0)
    return res.status(400).json({ error: "invalid_wallet",  message: "请选择提现钱包" });
  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: "invalid_amount",  message: "金额必须为正" });
  if (!/^\d{6}$/.test(fundPwd))
    return res.status(400).json({ error: "invalid_fund_password",
      message: "资金密码为 6 位数字" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 锁 member 行 + 校验
    const [mRows] = await conn.query(
      `SELECT id, account, status, balance, frozen, fund_password,
              ban_withdraw, agent_id, invite_code
         FROM members WHERE id = ? FOR UPDATE`,
      [memberId]
    );
    const m = (mRows as any[])[0];
    if (!m) { await conn.rollback(); return res.status(404).json({ error: "not_found" }); }
    if (m.status === 0)  { await conn.rollback(); return res.status(403).json({ error: "account_disabled", message: "账号已被禁用" }); }
    if (m.ban_withdraw === 1) { await conn.rollback(); return res.status(403).json({ error: "ban_withdraw", message: "您已被禁提" }); }
    if (!m.fund_password) { await conn.rollback(); return res.status(400).json({ error: "no_fund_password", message: "请先设置资金密码" }); }
    if (!bcrypt.compareSync(fundPwd, m.fund_password)) {
      await conn.rollback(); return res.status(401).json({ error: "wrong_fund_password", message: "资金密码错误" });
    }
    const balance = Number(m.balance);
    if (balance < amount) {
      await conn.rollback();
      return res.status(400).json({ error: "insufficient_balance",
        message: `余额不足,当前 ${balance.toFixed(2)}` });
    }

    // 2) 加载 wallet 取快照
    let snap: any = {};
    if (walletType === "bank") {
      const [wRows] = await conn.query(
        `SELECT * FROM bank_wallets WHERE id = ? AND member_id = ? FOR UPDATE`,
        [walletId, memberId]
      );
      const w = (wRows as any[])[0];
      if (!w) { await conn.rollback(); return res.status(404).json({ error: "wallet_not_found", message: "银行卡不存在" }); }
      snap = {
        snap_bank_name: w.bank_name, snap_card_no: w.card_no, snap_holder: w.holder,
        snap_branch: w.branch, snap_ifsc: w.ifsc, snap_id_number: w.id_number,
      };
    } else {
      const [wRows] = await conn.query(
        `SELECT * FROM digital_wallets WHERE id = ? AND member_id = ? FOR UPDATE`,
        [walletId, memberId]
      );
      const w = (wRows as any[])[0];
      if (!w) { await conn.rollback(); return res.status(404).json({ error: "wallet_not_found", message: "数字币钱包不存在" }); }
      snap = {
        snap_coin_type: w.type1, snap_network: w.type2, snap_address: w.address,
      };
    }

    // 3) 冻结金额
    const newBalance = balance - amount;
    const newFrozen  = Number(m.frozen) + amount;
    await conn.query(
      `UPDATE members SET balance = ?, frozen = ? WHERE id = ?`,
      [newBalance, newFrozen, memberId]
    );

    // 4) 写提现单(含快照)
    const actualAmount = +(amount - fee).toFixed(8);
    const [insRes] = await conn.query(
      `INSERT INTO withdrawals
         (agent_id, invite_code, member_id, wallet_id, wallet_type,
          amount, fee, actual_amount, status, type, apply_time,
          snap_bank_name, snap_card_no, snap_holder, snap_branch, snap_ifsc, snap_id_number,
          snap_coin_type, snap_network, snap_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '申请中', ?, NOW(),
               ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.agent_id, m.invite_code, memberId, walletId, walletType,
        amount, fee, actualAmount,
        walletType === "bank" ? "银行卡" : "数字币",
        snap.snap_bank_name ?? null, snap.snap_card_no ?? null, snap.snap_holder ?? null,
        snap.snap_branch ?? null, snap.snap_ifsc ?? null, snap.snap_id_number ?? null,
        snap.snap_coin_type ?? null, snap.snap_network ?? null, snap.snap_address ?? null,
      ]
    );
    await conn.commit();

    res.json({
      ok: true,
      withdrawal: {
        id: (insRes as any).insertId,
        amount, fee, actual_amount: actualAmount,
        wallet_type: walletType,
        status: "申请中",
      },
      balance: newBalance,
      frozen:  newFrozen,
    });
  } catch (err: any) {
    await conn.rollback();
    console.error("[withdrawals POST]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  } finally {
    conn.release();
  }
});

// 同意提现 — 解冻 + 写 fund_records + 改状态(事务)
app.post("/api/withdrawals/:id/approve", async (req, res) => {
  const wid = Number(req.params.id);
  if (!Number.isFinite(wid) || wid <= 0) return res.status(400).json({ error: "invalid_id" });

  // 数据归属校验:先查 withdrawal 属于哪个 member,再校验权限
  const [wPre] = await db.query(
    `SELECT w.member_id FROM withdrawals w WHERE w.id = ? LIMIT 1`,
    [wid]
  );
  if (!(wPre as any[])[0]) return res.status(404).json({ error: "not_found", message: "提现单不存在" });
  const access = await requireMemberAccess(req, res, Number((wPre as any[])[0].member_id));
  if (!access) return;

  const reviewer  = String(req.body?.reviewer ?? "admin").slice(0, 64);
  const adminNote = String(req.body?.admin_note ?? "").slice(0, 500);
  const overrideAct = req.body?.actual_amount !== undefined && req.body.actual_amount !== null
    ? Number(req.body.actual_amount) : null;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [wRows] = await conn.query(
      `SELECT * FROM withdrawals WHERE id = ? AND status = '申请中' FOR UPDATE`,
      [wid]
    );
    const w = (wRows as any[])[0];
    if (!w) { await conn.rollback(); return res.status(404).json({ error: "not_found_or_settled", message: "申请不存在或已处理" }); }

    const [mRows] = await conn.query(
      `SELECT id, account, balance, frozen, agent_id, invite_code FROM members WHERE id = ? FOR UPDATE`,
      [w.member_id]
    );
    const m = (mRows as any[])[0];
    if (!m) { await conn.rollback(); return res.status(404).json({ error: "member_not_found" }); }

    const amount = Number(w.amount);
    const fee    = Number(w.fee ?? 0);
    const actAmt = overrideAct !== null && Number.isFinite(overrideAct) && overrideAct >= 0
      ? overrideAct
      : Number(w.actual_amount ?? (amount - fee));

    // 解冻(申请时已扣过 balance,这里只清 frozen)
    const newFrozen  = Math.max(0, Number(m.frozen) - amount);
    const newBalance = Number(m.balance);
    await conn.query(
      `UPDATE members SET frozen = ? WHERE id = ?`,
      [newFrozen, m.id]
    );

    // 写资金流水(type='会员提现',amount = -amount 表示出款)
    await conn.query(
      `INSERT INTO fund_records (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        m.agent_id, m.invite_code, m.id,
        newBalance, -amount, newBalance,
        "会员提现",
        `提现单#${w.id} ${w.type} 申请${amount} 手续费${fee} 实付${actAmt}`,
      ]
    );

    await conn.query(
      `UPDATE withdrawals
          SET status='已同意', approve_time=NOW(), reviewer=?, admin_note=?, approved=?, actual_amount=?
        WHERE id = ?`,
      [reviewer, adminNote, actAmt, actAmt, wid]
    );

    const adminId = await lookupAdminId(reviewer);
    await conn.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "approve_withdraw", wid,
       JSON.stringify({ amount, fee, actAmt, admin_note: adminNote }).slice(0, 240)]
    );

    await conn.commit();
    res.json({ ok: true, withdrawal_id: wid, actual_amount: actAmt, frozen: newFrozen });
  } catch (err: any) {
    await conn.rollback();
    console.error("[withdrawals/:id/approve]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  } finally {
    conn.release();
  }
});

// 拒绝提现 — 解冻 + 退余额 + 写退款流水 + 写拒绝原因(事务)
app.post("/api/withdrawals/:id/reject", async (req, res) => {
  const wid = Number(req.params.id);
  if (!Number.isFinite(wid) || wid <= 0) return res.status(400).json({ error: "invalid_id" });
  // 数据归属校验
  const [wPre] = await db.query(
    `SELECT w.member_id FROM withdrawals w WHERE w.id = ? LIMIT 1`,
    [wid]
  );
  if (!(wPre as any[])[0]) return res.status(404).json({ error: "not_found", message: "提现单不存在" });
  const access = await requireMemberAccess(req, res, Number((wPre as any[])[0].member_id));
  if (!access) return;

  const reviewer     = String(req.body?.reviewer ?? "admin").slice(0, 64);
  const rejectReason = String(req.body?.reject_reason ?? "").slice(0, 500);
  const adminNote    = String(req.body?.admin_note ?? "").slice(0, 500);
  if (!rejectReason.trim()) {
    return res.status(400).json({ error: "missing_reject_reason", message: "请填写拒绝原因" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [wRows] = await conn.query(
      `SELECT * FROM withdrawals WHERE id = ? AND status = '申请中' FOR UPDATE`,
      [wid]
    );
    const w = (wRows as any[])[0];
    if (!w) { await conn.rollback(); return res.status(404).json({ error: "not_found_or_settled", message: "申请不存在或已处理" }); }

    const [mRows] = await conn.query(
      `SELECT id, account, balance, frozen, agent_id, invite_code FROM members WHERE id = ? FOR UPDATE`,
      [w.member_id]
    );
    const m = (mRows as any[])[0];
    if (!m) { await conn.rollback(); return res.status(404).json({ error: "member_not_found" }); }

    const amount = Number(w.amount);
    const newFrozen  = Math.max(0, Number(m.frozen) - amount);
    const newBalance = Number(m.balance) + amount;   // 退余额
    await conn.query(
      `UPDATE members SET balance = ?, frozen = ? WHERE id = ?`,
      [newBalance, newFrozen, m.id]
    );

    await conn.query(
      `INSERT INTO fund_records (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        m.agent_id, m.invite_code, m.id,
        Number(m.balance), amount, newBalance,
        "会员提现",
        `提现单#${w.id} 拒绝退款 原因:${rejectReason}`,
      ]
    );

    await conn.query(
      `UPDATE withdrawals
          SET status='已拒绝', approve_time=NOW(), reviewer=?, reject_reason=?, admin_note=?
        WHERE id = ?`,
      [reviewer, rejectReason, adminNote, wid]
    );

    const adminId = await lookupAdminId(reviewer);
    await conn.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "reject_withdraw", wid,
        JSON.stringify({ reason: rejectReason, admin_note: adminNote }).slice(0, 240)]
    );

    await conn.commit();
    res.json({ ok: true, withdrawal_id: wid, balance: newBalance, frozen: newFrozen });
  } catch (err: any) {
    await conn.rollback();
    console.error("[withdrawals/:id/reject]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  } finally {
    conn.release();
  }
});

// ─── Wallets ──────────────────────────────────────────────────────────────────
// 列出数字币钱包(后台)— 支持按 member 过滤
app.get("/api/wallets/digital", async (req, res) => {
  try {
    const memberId = req.query.member_id ? Number(req.query.member_id) : null;
    const memberAcct = req.query.member_account ? String(req.query.member_account).trim() : "";
    const where: string[] = [];
    const params: any[] = [];
    if (memberId) { where.push("d.member_id = ?"); params.push(memberId); }
    if (memberAcct) {
      where.push("d.member_id IN (SELECT id FROM members WHERE account LIKE ?)");
      params.push(`%${memberAcct}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const [rows] = await db.query(
      `SELECT d.*, m.account AS member_account
         FROM digital_wallets d
         LEFT JOIN members m ON m.id = d.member_id
         ${whereSql}
         ORDER BY d.is_default DESC, d.id DESC
         LIMIT ?`,
      [...params, limit]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM digital_wallets d ${whereSql}`,
      params
    ) as any;
    res.json({ data: rows, total, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 列出银行卡钱包(后台)— 支持按 member 过滤
app.get("/api/wallets/bank", async (req, res) => {
  try {
    const memberId = req.query.member_id ? Number(req.query.member_id) : null;
    const memberAcct = req.query.member_account ? String(req.query.member_account).trim() : "";
    const where: string[] = [];
    const params: any[] = [];
    if (memberId) { where.push("b.member_id = ?"); params.push(memberId); }
    if (memberAcct) {
      where.push("b.member_id IN (SELECT id FROM members WHERE account LIKE ?)");
      params.push(`%${memberAcct}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const [rows] = await db.query(
      `SELECT b.*, m.account AS member_account
         FROM bank_wallets b
         LEFT JOIN members m ON m.id = b.member_id
         ${whereSql}
         ORDER BY b.is_default DESC, b.id DESC
         LIMIT ?`,
      [...params, limit]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM bank_wallets b ${whereSql}`,
      params
    ) as any;
    res.json({ data: rows, total, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Per-member wallet CRUD (用户端) ─────────────────────────────────────────
// 列出某用户的所有银行卡
app.get("/api/members/:id/wallets/bank", async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
    const access = await requireMemberAccess(req, res, memberId);
    if (!access) return;
    const [rows] = await db.query(
      `SELECT * FROM bank_wallets WHERE member_id = ?
        ORDER BY is_default DESC, id DESC`,
      [memberId]
    );
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 新增银行卡
app.post("/api/members/:id/wallets/bank", async (req, res) => {
  const memberId = Number(req.params.id);
  if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const bank_name = String(req.body?.bank_name ?? "").slice(0, 64).trim();
  const card_no   = String(req.body?.card_no   ?? "").slice(0, 64).trim();
  const holder    = String(req.body?.holder    ?? "").slice(0, 64).trim();
  const id_number = String(req.body?.id_number ?? "").slice(0, 20).trim();
  const branch    = String(req.body?.branch    ?? "").slice(0, 128).trim();
  const ifsc      = String(req.body?.ifsc      ?? "").slice(0, 32).trim();
  const contact   = String(req.body?.contact   ?? "").slice(0, 128).trim();
  const notes     = String(req.body?.notes     ?? "").slice(0, 255).trim();
  const isDefault = req.body?.is_default ? 1 : 0;

  if (!bank_name || !card_no || !holder)
    return res.status(400).json({ error: "missing_required", message: "银行名/卡号/持卡人必填" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await conn.query(`UPDATE bank_wallets SET is_default = 0 WHERE member_id = ?`, [memberId]);
    }
    const [r] = await conn.query(
      `INSERT INTO bank_wallets
         (member_id, bank_name, card_no, holder, id_number, branch, ifsc, contact, notes, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [memberId, bank_name, card_no, holder, id_number || null,
       branch, ifsc, contact, notes, isDefault]
    );
    await conn.commit();
    res.status(201).json({ ok: true, id: (r as any).insertId });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// 修改银行卡
app.put("/api/members/:id/wallets/bank/:wid", async (req, res) => {
  const memberId = Number(req.params.id);
  const wid      = Number(req.params.wid);
  if (!Number.isFinite(memberId) || memberId <= 0 || !Number.isFinite(wid))
    return res.status(400).json({ error: "invalid_id" });
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const bank_name = String(req.body?.bank_name ?? "").slice(0, 64).trim();
  const card_no   = String(req.body?.card_no   ?? "").slice(0, 64).trim();
  const holder    = String(req.body?.holder    ?? "").slice(0, 64).trim();
  const id_number = String(req.body?.id_number ?? "").slice(0, 20).trim();
  const branch    = String(req.body?.branch    ?? "").slice(0, 128).trim();
  const ifsc      = String(req.body?.ifsc      ?? "").slice(0, 32).trim();
  const contact   = String(req.body?.contact   ?? "").slice(0, 128).trim();
  const notes     = String(req.body?.notes     ?? "").slice(0, 255).trim();
  const isDefault = req.body?.is_default ? 1 : 0;

  if (!bank_name || !card_no || !holder)
    return res.status(400).json({ error: "missing_required", message: "银行名/卡号/持卡人必填" });
  if (id_number && !/^\d{17}[\dXx]$/.test(id_number))
    return res.status(400).json({ error: "invalid_id_number" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await conn.query(`UPDATE bank_wallets SET is_default = 0 WHERE member_id = ?`, [memberId]);
    }
    const [r] = await conn.query(
      `UPDATE bank_wallets
          SET bank_name=?, card_no=?, holder=?, id_number=?,
              branch=?, ifsc=?, contact=?, notes=?, is_default=?
        WHERE id = ? AND member_id = ?`,
      [bank_name, card_no, holder, id_number || null,
       branch, ifsc, contact, notes, isDefault, wid, memberId]
    );
    if ((r as any).affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "not_found" });
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// 删除银行卡(防止误删被在途提现引用的卡)
app.delete("/api/members/:id/wallets/bank/:wid", async (req, res) => {
  const memberId = Number(req.params.id);
  const wid      = Number(req.params.wid);
  if (!Number.isFinite(memberId) || memberId <= 0 || !Number.isFinite(wid))
    return res.status(400).json({ error: "invalid_id" });
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const [refRows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM withdrawals
      WHERE wallet_type='bank' AND wallet_id = ? AND status IN ('申请中','已同意')`,
    [wid]
  );
  if (Number((refRows as any[])[0].cnt) > 0) {
    return res.status(409).json({ error: "wallet_in_use",
      message: "该卡被在途提现引用,无法删除" });
  }
  await db.query(`DELETE FROM bank_wallets WHERE id = ? AND member_id = ?`,
    [wid, memberId]);
  res.json({ ok: true });
});

// ── 数字币钱包 CRUD(同款) ──
app.get("/api/members/:id/wallets/digital", async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
    const access = await requireMemberAccess(req, res, memberId);
    if (!access) return;
    const [rows] = await db.query(
      `SELECT * FROM digital_wallets WHERE member_id = ?
        ORDER BY is_default DESC, id DESC`,
      [memberId]
    );
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/members/:id/wallets/digital", async (req, res) => {
  const memberId = Number(req.params.id);
  if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const type1     = ["USDT","BTC","ETH"].includes(req.body?.type1) ? req.body.type1 : null;
  const type2     = String(req.body?.type2 ?? "").slice(0, 32).trim();
  const address   = String(req.body?.address ?? "").slice(0, 128).trim();
  const notes     = String(req.body?.notes  ?? "").slice(0, 255).trim();
  const isDefault = req.body?.is_default ? 1 : 0;

  if (!type1 || !type2 || !address)
    return res.status(400).json({ error: "missing_required", message: "币种/网络/地址必填" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await conn.query(`UPDATE digital_wallets SET is_default = 0 WHERE member_id = ?`, [memberId]);
    }
    const [r] = await conn.query(
      `INSERT INTO digital_wallets (member_id, type1, type2, address, notes, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [memberId, type1, type2, address, notes, isDefault]
    );
    await conn.commit();
    res.status(201).json({ ok: true, id: (r as any).insertId });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

app.put("/api/members/:id/wallets/digital/:wid", async (req, res) => {
  const memberId = Number(req.params.id);
  const wid      = Number(req.params.wid);
  if (!Number.isFinite(memberId) || memberId <= 0 || !Number.isFinite(wid))
    return res.status(400).json({ error: "invalid_id" });
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const type1     = ["USDT","BTC","ETH"].includes(req.body?.type1) ? req.body.type1 : null;
  const type2     = String(req.body?.type2 ?? "").slice(0, 32).trim();
  const address   = String(req.body?.address ?? "").slice(0, 128).trim();
  const notes     = String(req.body?.notes  ?? "").slice(0, 255).trim();
  const isDefault = req.body?.is_default ? 1 : 0;

  if (!type1 || !type2 || !address)
    return res.status(400).json({ error: "missing_required" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await conn.query(`UPDATE digital_wallets SET is_default = 0 WHERE member_id = ?`, [memberId]);
    }
    const [r] = await conn.query(
      `UPDATE digital_wallets
          SET type1=?, type2=?, address=?, notes=?, is_default=?
        WHERE id = ? AND member_id = ?`,
      [type1, type2, address, notes, isDefault, wid, memberId]
    );
    if ((r as any).affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "not_found" });
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

app.delete("/api/members/:id/wallets/digital/:wid", async (req, res) => {
  const memberId = Number(req.params.id);
  const wid      = Number(req.params.wid);
  if (!Number.isFinite(memberId) || memberId <= 0 || !Number.isFinite(wid))
    return res.status(400).json({ error: "invalid_id" });
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const [refRows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM withdrawals
      WHERE wallet_type='digital' AND wallet_id = ? AND status IN ('申请中','已同意')`,
    [wid]
  );
  if (Number((refRows as any[])[0].cnt) > 0) {
    return res.status(409).json({ error: "wallet_in_use",
      message: "该钱包被在途提现引用,无法删除" });
  }
  await db.query(`DELETE FROM digital_wallets WHERE id = ? AND member_id = ?`,
    [wid, memberId]);
  res.json({ ok: true });
});

// ─── Fund records ─────────────────────────────────────────────────────────────
app.get("/api/funds", async (req, res) => {
  try {
    const { agent_id, invite_code, member_id, member_account, type, start_time, end_time } = req.query as Record<string, string>;
    const where: string[] = [];
    const params: any[] = [];
    if (agent_id)       { where.push("member_id IN (SELECT id FROM members WHERE agent_id = ?)"); params.push(Number(agent_id)); }
    if (invite_code)    { where.push("invite_code = ?");  params.push(invite_code); }
    if (member_id)      { where.push("member_id = ?");    params.push(Number(member_id)); }
    if (member_account) { where.push("member_id IN (SELECT id FROM members WHERE account = ?)"); params.push(member_account); }
    if (type)           { where.push("type = ?");         params.push(type); }
    if (start_time)     { where.push("time >= ?");        params.push(start_time); }
    if (end_time)       { where.push("time <= ?");        params.push(end_time); }
    // 数据归属过滤 — 非 super 强制只看自己客户;若传了 agent_id 还要校验是不是自己的
    const me = await getCurrentAdmin(req);
    if (!me) return deny(res, "no_admin", "未识别管理员");
    if (me.role !== "super") {
      if (agent_id && Number(agent_id) !== me.id) {
        return deny(res, "forbidden", "该邀请码/团队不属于您");
      }
      // 若指定了 member_id / member_account,先查是否自己团队的人 → 否则 403
      let probeMemberId: number | null = null;
      if (member_id) probeMemberId = Number(member_id);
      else if (member_account) {
        const [u] = await db.query(
          `SELECT id FROM members WHERE account = ? LIMIT 1`, [member_account]
        );
        if ((u as any[])[0]) probeMemberId = Number((u as any[])[0].id);
      }
      if (probeMemberId !== null) {
        const access = await requireMemberAccess(req, res, probeMemberId);
        if (!access) return;
      }
      where.push("agent_id = ?");
      params.push(me.id);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit  = Math.min(Number(req.query.limit ?? 50), 500);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const [rows]  = await db.query(
      `SELECT id, agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time,
              (SELECT account FROM members WHERE id = fund_records.member_id) AS member_account
         FROM fund_records
         ${whereSql}
         ORDER BY time DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM fund_records ${whereSql}`,
      params
    ) as any;
    const [[{ sum }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS sum FROM fund_records ${whereSql}`,
      params
    ) as any;
    res.json({ data: rows, total, sum, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 我的资金记录(前台用户查自己)— 不需要 token,用 member_id 过滤
app.get("/api/funds/mine", async (req, res) => {
  try {
    const memberId = Number(req.query.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id" });
    }
    const [rows] = await db.query(
      `SELECT id, agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time
         FROM fund_records
        WHERE member_id = ?
        ORDER BY time DESC
        LIMIT ?`,
      [memberId, Math.min(Number(req.query.limit ?? 200), 500)]
    );
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 我的站内信未读数(轻量轮询接口,只返回 unread_count)
app.get("/api/messages/unread", async (req, res) => {
  try {
    const memberId = Number(req.query.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id" });
    }
    const [rows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM messages
        WHERE (member_id IS NULL OR member_id = ?) AND read_time IS NULL`,
      [memberId]
    );
    res.json({ unread_count: Number((rows as any[])[0].cnt) || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 我的站内信 — 给指定 member_id(自己)+ 全员(member_id IS NULL)的消息
app.get("/api/messages/mine", async (req, res) => {
  try {
    const memberId = Number(req.query.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id" });
    }
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const [rows] = await db.query(
      `SELECT id, member_id, title, content, sender, send_time, read_time
         FROM messages
        WHERE member_id IS NULL OR member_id = ?
        ORDER BY send_time DESC
        LIMIT ?`,
      [memberId, limit]
    );
    // 未读数(供前端小红点用)— read_time IS NULL 的全部针对该 member 的消息
    const [unreadRows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM messages
        WHERE (member_id IS NULL OR member_id = ?) AND read_time IS NULL`,
      [memberId]
    );
    const unread_count = Number((unreadRows as any[])[0].cnt) || 0;
    res.json({ data: rows, unread_count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 标记站内信已读
app.post("/api/messages/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "invalid_id" });
    const memberId = Number(req.body?.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
    // 只有发给该会员(或全员)的消息才能标记
    const [rows] = await db.query(
      `SELECT id, member_id FROM messages WHERE id = ? AND (member_id IS NULL OR member_id = ?)`,
      [id, memberId]
    );
    if (!(rows as any[]).length) return res.status(404).json({ error: "not_found" });
    await db.query(`UPDATE messages SET read_time = NOW() WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 后台发信 — member_id 不传 = 全员广播
app.post("/api/messages", async (req, res) => {
  try {
    const memberId = req.body?.member_id === undefined || req.body?.member_id === null
      ? null
      : Number(req.body.member_id);
    const title   = String(req.body?.title ?? "").slice(0, 128).trim();
    const content = String(req.body?.content ?? "").slice(0, 1024).trim();
    const sender  = String(req.body?.sender  ?? "admin").slice(0, 64);
    if (!title)                                    return res.status(400).json({ error: "missing_title",   message: "请填写标题" });
    if (!content)                                  return res.status(400).json({ error: "missing_content", message: "请填写详情" });
    if (memberId !== null && (!Number.isFinite(memberId) || memberId <= 0)) {
      return res.status(400).json({ error: "invalid_member_id" });
    }
    // 数据归属校验 — 给非自己客户发信 → 403
    if (memberId !== null) {
      const access = await requireMemberAccess(req, res, memberId);
      if (!access) return;
    }
    const [r] = await db.query(
      `INSERT INTO messages (member_id, title, content, sender) VALUES (?, ?, ?, ?)`,
      [memberId, title, content, sender]
    );
    res.json({ ok: true, id: (r as any).insertId, member_id: memberId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 后台入款(管理员加钱) — 事务 + FOR UPDATE 锁
app.post("/api/members/:id/recharge", async (req, res) => {
  const memberId = Number(req.params.id);
  const amount = Number(req.body?.amount);
  const notes  = String(req.body?.notes ?? "").slice(0, 255).trim();
  const reviewer = String(req.body?.reviewer ?? "admin").slice(0, 64);
  if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
  if (!Number.isFinite(amount) || amount <= 0)     return res.status(400).json({ error: "invalid_amount", message: "金额必须为正数" });
  if (!notes)                                       return res.status(400).json({ error: "missing_notes",  message: "请填写备注" });
  // 数据归属校验
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, account, balance, agent_id, invite_code FROM members WHERE id = ? FOR UPDATE`,
      [memberId]
    );
    const m = (rows as any[])[0];
    if (!m) { await conn.rollback(); return res.status(404).json({ error: "not_found", message: "会员不存在" }); }
    const before = Number(m.balance);
    const after  = before + amount;
    await conn.query(`UPDATE members SET balance = ? WHERE id = ?`, [after, memberId]);
    const [insertRes] = await conn.query(
      `INSERT INTO fund_records (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [m.agent_id, m.invite_code, memberId, before, amount, after, "后台充值", notes]
    );
    // 写管理员操作日志
    const adminId = await lookupAdminId(reviewer);
    await conn.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "recharge", memberId, JSON.stringify({ amount, notes }).slice(0, 240)]
    );
    await conn.commit();
    res.json({
      ok: true,
      record_id: (insertRes as any).insertId,
      account: m.account, before, after, amount, type: "后台充值", notes,
    });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: "server_error", message: err.message });
  } finally {
    conn.release();
  }
});

// 后台扣款(管理员减钱)
app.post("/api/members/:id/deduct", async (req, res) => {
  const memberId = Number(req.params.id);
  const amount = Number(req.body?.amount);
  const notes  = String(req.body?.notes ?? "").slice(0, 255).trim();
  const reviewer = String(req.body?.reviewer ?? "admin").slice(0, 64);
  if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
  if (!Number.isFinite(amount) || amount <= 0)     return res.status(400).json({ error: "invalid_amount", message: "金额必须为正数" });
  if (!notes)                                       return res.status(400).json({ error: "missing_notes",  message: "请填写备注" });
  // 数据归属校验
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, account, balance, agent_id, invite_code FROM members WHERE id = ? FOR UPDATE`,
      [memberId]
    );
    const m = (rows as any[])[0];
    if (!m) { await conn.rollback(); return res.status(404).json({ error: "not_found", message: "会员不存在" }); }
    const before = Number(m.balance);
    if (before < amount) {
      await conn.rollback();
      return res.status(400).json({ error: "insufficient_balance", message: `余额不足,当前 ${before.toFixed(2)}` });
    }
    const after = before - amount;
    await conn.query(`UPDATE members SET balance = ? WHERE id = ?`, [after, memberId]);
    const [insertRes] = await conn.query(
      `INSERT INTO fund_records (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [m.agent_id, m.invite_code, memberId, before, -amount, after, "后台扣款", notes]
    );
    const adminId = await lookupAdminId(reviewer);
    await conn.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "deduct", memberId, JSON.stringify({ amount, notes }).slice(0, 240)]
    );
    await conn.commit();
    res.json({
      ok: true,
      record_id: (insertRes as any).insertId,
      account: m.account, before, after, amount: -amount, type: "后台扣款", notes,
    });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: "server_error", message: err.message });
  } finally {
    conn.release();
  }
});

// 冻结 / 解冻 — 把 balance 全额转 frozen,或反之(冻结用于押单/止损等场景)
app.post("/api/members/:id/freeze", async (req, res) => {
  const memberId  = Number(req.params.id);
  const amount    = Number(req.body?.amount);
  const action    = String(req.body?.action ?? "freeze");  // "freeze" | "unfreeze"
  const notes     = String(req.body?.notes ?? "").slice(0, 255).trim();
  const reviewer  = String(req.body?.reviewer ?? "admin").slice(0, 64);
  if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
  if (!Number.isFinite(amount)   || amount   <= 0) return res.status(400).json({ error: "invalid_amount",  message: "金额必须为正数" });
  if (!["freeze","unfreeze"].includes(action))      return res.status(400).json({ error: "invalid_action" });
  if (!notes)                                       return res.status(400).json({ error: "missing_notes",   message: "请填写备注" });
  // 数据归属校验
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, account, balance, frozen, agent_id, invite_code FROM members WHERE id = ? FOR UPDATE`,
      [memberId]
    );
    const m = (rows as any[])[0];
    if (!m) { await conn.rollback(); return res.status(404).json({ error: "not_found", message: "会员不存在" }); }

    const balance = Number(m.balance);
    const frozen  = Number(m.frozen);
    let newBalance = balance;
    let newFrozen  = frozen;
    if (action === "freeze") {
      if (balance < amount) {
        await conn.rollback();
        return res.status(400).json({ error: "insufficient_balance", message: `可用余额不足,当前 ${balance.toFixed(2)}` });
      }
      newBalance = balance - amount;
      newFrozen  = frozen  + amount;
    } else {
      if (frozen < amount) {
        await conn.rollback();
        return res.status(400).json({ error: "insufficient_frozen", message: `冻结余额不足,当前 ${frozen.toFixed(2)}` });
      }
      newBalance = balance + amount;
      newFrozen  = frozen  - amount;
    }

    await conn.query(
      `UPDATE members SET balance = ?, frozen = ? WHERE id = ?`,
      [newBalance, newFrozen, memberId]
    );

    const fundType = action === "freeze" ? "后台冻结" : "后台解冻";
    await conn.query(
      `INSERT INTO fund_records (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [m.agent_id, m.invite_code, memberId,
       action === "freeze" ? balance : frozen,
       action === "freeze" ? -amount : amount,
       action === "freeze" ? newFrozen : newBalance,
       fundType, notes]
    );

    const adminId = await lookupAdminId(reviewer);
    await conn.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, action, memberId, JSON.stringify({ amount, notes }).slice(0, 240)]
    );

    await conn.commit();
    res.json({
      ok: true,
      account: m.account,
      action,
      amount,
      balance: newBalance,
      frozen:  newFrozen,
    });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: "server_error", message: err.message });
  } finally {
    conn.release();
  }
});

// 重置登录密码(管理员代改 — 写 admin_logs,不通知前端用户)
app.post("/api/members/:id/reset-password", async (req, res) => {
  const memberId  = Number(req.params.id);
  const newPwd    = String(req.body?.new_password ?? "");
  const reviewer  = String(req.body?.reviewer ?? "admin").slice(0, 64);
  if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
  if (newPwd.length < 6 || newPwd.length > 32)
    return res.status(400).json({ error: "invalid_password", message: "登录密码长度需 6-32 位" });
  // 数据归属校验
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;
  try {
    const [rows] = await db.query(`SELECT id, account FROM members WHERE id = ? LIMIT 1`, [memberId]);
    const m = (rows as any[])[0];
    if (!m) return res.status(404).json({ error: "not_found", message: "会员不存在" });

    const passwordHash = bcrypt.hashSync(newPwd, 10);
    await db.query(`UPDATE members SET password_hash = ? WHERE id = ?`, [passwordHash, memberId]);

    const adminId = await lookupAdminId(reviewer);
    await db.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "reset_login_password", memberId,
        JSON.stringify({ account: m.account }).slice(0, 240)]
    );

    res.json({ ok: true, account: m.account, action: "reset_login_password" });
  } catch (err: any) {
    console.error("[reset-password]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 重置资金密码(管理员代改 — 写 admin_logs)
app.post("/api/members/:id/reset-fund-password", async (req, res) => {
  const memberId  = Number(req.params.id);
  const newPwd    = String(req.body?.new_password ?? "");
  const reviewer  = String(req.body?.reviewer ?? "admin").slice(0, 64);
  if (!Number.isFinite(memberId) || memberId <= 0) return res.status(400).json({ error: "invalid_member_id" });
  if (!/^\d{6}$/.test(newPwd))
    return res.status(400).json({ error: "invalid_fund_password", message: "资金密码必须是 6 位数字" });
  // 数据归属校验
  const access = await requireMemberAccess(req, res, memberId);
  if (!access) return;
  try {
    const [rows] = await db.query(`SELECT id, account FROM members WHERE id = ? LIMIT 1`, [memberId]);
    const m = (rows as any[])[0];
    if (!m) return res.status(404).json({ error: "not_found", message: "会员不存在" });

    const fundPwdHash = bcrypt.hashSync(newPwd, 10);
    await db.query(`UPDATE members SET fund_password = ? WHERE id = ?`, [fundPwdHash, memberId]);

    const adminId = await lookupAdminId(reviewer);
    await db.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "reset_fund_password", memberId,
        JSON.stringify({ account: m.account }).slice(0, 240)]
    );

    res.json({ ok: true, account: m.account, action: "reset_fund_password" });
  } catch (err: any) {
    console.error("[reset-fund-password]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 强制下线 — 旋转 session_token,前台下次 refresh 发现不一致 → 自动登出
// POST /api/admin/members/:id/force-logout
// body: { reviewer?: string }   默认 "admin"
app.post("/api/admin/members/:id/force-logout", async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const reviewer = String(req.body?.reviewer ?? "admin").slice(0, 64);
    if (!Number.isFinite(memberId) || memberId <= 0)
      return res.status(400).json({ error: "invalid_member_id" });
    // 数据归属校验 — 普通员工只能踢自己的客户
    const access = await requireMemberAccess(req, res, memberId);
    if (!access) return;

    const [rows] = await db.query(
      `SELECT id, account, status FROM members WHERE id = ? LIMIT 1`,
      [memberId]
    );
    const m = (rows as any[])[0];
    if (!m) return res.status(404).json({ error: "not_found", message: "会员不存在" });

    const newToken = newSessionToken();
    await db.query(
      `UPDATE members SET session_token = ? WHERE id = ?`,
      [newToken, memberId]
    );

    const adminId = await lookupAdminId(reviewer);
    await db.query(
      `INSERT INTO admin_logs (admin_id, admin_name, action, target_id, details, time)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, reviewer, "force_logout", memberId,
        JSON.stringify({ account: m.account }).slice(0, 240)]
    );

    res.json({ ok: true, account: m.account, action: "force_logout" });
  } catch (err: any) {
    console.error("[force-logout]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 管理员 ID 查找(写 admin_logs 时用)
async function lookupAdminId(name: string): Promise<number> {
  try {
    const [rows] = await db.query(`SELECT id FROM admin_users WHERE username = ? LIMIT 1`, [name]);
    const r = (rows as any[])[0];
    return r ? Number(r.id) : 1;
  } catch { return 1; }
}

// ─── Report (出入账款 报表) ───────────────────────────────────────────────────
app.get("/api/report/inout", async (req, res) => {
  try {
    const { invite_code, member_account, member_id, start_time, end_time } = req.query as Record<string, string>;
    let   { agent_id } = req.query as Record<string, string>;

    // 数据归属过滤 — 非 super 强制只看自己;若他人在 URL 上塞别人的 agent_id → 改写为自己
    const me = await getCurrentAdmin(req);
    if (!me) return deny(res, "no_admin", "未识别管理员");
    if (me.role !== "super") {
      if (agent_id && Number(agent_id) !== me.id) {
        return deny(res, "forbidden", "该邀请码/团队不属于您");
      }
      // member_id / member_account 也做归属校验 → 不是自己客户的 → 403
      let probeMemberId: number | null = null;
      if (member_id) probeMemberId = Number(member_id);
      else if (member_account) {
        const [u] = await db.query(
          `SELECT id FROM members WHERE account = ? LIMIT 1`, [member_account]
        );
        if ((u as any[])[0]) probeMemberId = Number((u as any[])[0].id);
      }
      if (probeMemberId !== null) {
        const access = await requireMemberAccess(req, res, probeMemberId);
        if (!access) return;
      }
      agent_id = String(me.id);
    }

    // 共享的过滤 WHERE — 同时套在 members 和 fund_records
    const memberFilter: string[] = [];
    const memberParams: any[] = [];
    if (agent_id)       { memberFilter.push("agent_id = ?");      memberParams.push(Number(agent_id)); }
    if (invite_code)    { memberFilter.push("invite_code = ?");   memberParams.push(invite_code); }
    if (member_account) { memberFilter.push("account = ?");       memberParams.push(member_account); }
    if (member_id)      { memberFilter.push("id = ?");            memberParams.push(Number(member_id)); }
    const memberWhere = memberFilter.length ? `WHERE ${memberFilter.join(" AND ")}` : "";

    // 时间过滤 — 只套在 fund_records.time / members.register_time
    const timeSqlFrag = (col: string) => {
      const out: string[] = [];
      const params: any[] = [];
      if (start_time) { out.push(`${col} >= ?`); params.push(start_time); }
      if (end_time)   { out.push(`${col} <= ?`); params.push(end_time); }
      return { sql: out.length ? ` AND ${out.join(" AND ")}` : "", params };
    };
    const fTime = timeSqlFrag("f.time");
    const mTime = timeSqlFrag("m.register_time");

    // 注册会员统计 — 时间范围内新注册的 member 数(被 memberFilter 限定范围)
    const [regRows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM members m ${memberWhere}${mTime.sql}`,
      [...memberParams, ...mTime.params]
    );
    const memberCountRegister = Number((regRows as any[])[0].cnt) || 0;

    // 入款/出款合计 — 走 fund_records
    // 入款 = SUM(amount) WHERE type IN ('后台充值')
    // 出款 = SUM(amount) WHERE type IN ('会员提现')   (取绝对值,因为提现在 DB 里可能是负数)
    const inWhere = `WHERE f.type = '后台充值'${fTime.sql}`;
    const outWhere = `WHERE f.type = '会员提现'${fTime.sql}`;
    if (memberFilter.length) {
      // 把 member 过滤用 subquery 注入
      const memberSub = `f.member_id IN (SELECT id FROM members ${memberWhere})`;
      var totalIn  = Number((await db.query(
        `SELECT COALESCE(SUM(amount),0) AS s FROM fund_records f WHERE f.type='后台充值' AND ${memberSub}${fTime.sql}`,
        [...memberParams, ...fTime.params]
      ) as any)[0][0].s) || 0;
      var totalOut = Math.abs(Number((await db.query(
        `SELECT COALESCE(SUM(amount),0) AS s FROM fund_records f WHERE f.type='会员提现' AND ${memberSub}${fTime.sql}`,
        [...memberParams, ...fTime.params]
      ) as any)[0][0].s) || 0);
      // 入款/出款 人数
      var memberCountIn = Number((await db.query(
        `SELECT COUNT(DISTINCT f.member_id) AS cnt FROM fund_records f WHERE f.type='后台充值' AND ${memberSub}${fTime.sql}`,
        [...memberParams, ...fTime.params]
      ) as any)[0][0].cnt) || 0;
      var memberCountOut = Number((await db.query(
        `SELECT COUNT(DISTINCT f.member_id) AS cnt FROM fund_records f WHERE f.type='会员提现' AND ${memberSub}${fTime.sql}`,
        [...memberParams, ...fTime.params]
      ) as any)[0][0].cnt) || 0;
    } else {
      totalIn  = Number((await db.query(
        `SELECT COALESCE(SUM(amount),0) AS s FROM fund_records f ${inWhere}`,
        fTime.params
      ) as any)[0][0].s) || 0;
      totalOut = Math.abs(Number((await db.query(
        `SELECT COALESCE(SUM(amount),0) AS s FROM fund_records f ${outWhere}`,
        fTime.params
      ) as any)[0][0].s) || 0);
      memberCountIn = Number((await db.query(
        `SELECT COUNT(DISTINCT f.member_id) AS cnt FROM fund_records f ${inWhere}`,
        fTime.params
      ) as any)[0][0].cnt) || 0;
      memberCountOut = Number((await db.query(
        `SELECT COUNT(DISTINCT f.member_id) AS cnt FROM fund_records f ${outWhere}`,
        fTime.params
      ) as any)[0][0].cnt) || 0;
    }

    const profit = totalIn - totalOut;

    // 明细表 — 后台充值 + 会员提现 两类(出入款的核心流)
    const detailWhere: string[] = ["f.type IN ('后台充值','会员提现')"];
    // 注意:memberFilter 里的 ? 占位符对应的参数必须同时灌进 detailParams,
    // 不然 subquery 里的 ? 找不到绑定值,会触发 "syntax error near '?'"
    const detailParams: any[] = [...memberParams];
    if (memberFilter.length) detailWhere.push(`f.member_id IN (SELECT id FROM members ${memberWhere})`);
    if (start_time) { detailWhere.push("f.time >= ?"); detailParams.push(start_time); }
    if (end_time)   { detailWhere.push("f.time <= ?"); detailParams.push(end_time); }
    const limit  = Math.min(Number(req.query.limit ?? 100), 500);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const [detailRows] = await db.query(
      `SELECT f.id, f.agent_id, f.invite_code, f.member_id, f.\`before\`, f.amount, f.\`after\`,
              f.notes, f.time, f.type,
              (SELECT account FROM members WHERE id = f.member_id) AS member_account
         FROM fund_records f
        WHERE ${detailWhere.join(" AND ")}
        ORDER BY f.time DESC
        LIMIT ? OFFSET ?`,
      [...detailParams, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM fund_records f WHERE ${detailWhere.join(" AND ")}`,
      detailParams
    ) as any;

    res.json({
      summary: {
        total_in:          totalIn,
        total_out:         totalOut,
        profit,
        member_count_register: memberCountRegister,
        member_count_in:   memberCountIn,
        member_count_out:  memberCountOut,
      },
      data: detailRows,
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error("[report/inout]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Messages ─────────────────────────────────────────────────────────────────
app.get("/api/messages", async (req, res) => {
  try {
    const limit  = Math.min(Number(req.query.limit  ?? 50), 500);
    const offset = Math.max(Number(req.query.offset ?? 0),  0);
    const memberId     = req.query.member_id     ? Number(req.query.member_id)     : null;
    const memberFilter = req.query.member_filter === "all"   ? "all"   : req.query.member_filter === "specific" ? "specific" : "";
    const readFilter   = req.query.read   === "read"  ? "read"
                       : req.query.read   === "unread"? "unread": "";
    const keyword = String(req.query.keyword ?? "").trim().slice(0, 64);

    // 数据归属过滤 — 非 super 只能看发给自己客户的消息
    const me = await getCurrentAdmin(req);
    if (!me) return deny(res, "no_admin", "未识别管理员");
    if (me.role !== "super") {
      // 若显式指定 member_id,先校验归属 → 否则 403
      if (memberId !== null && Number.isFinite(memberId) && memberId > 0) {
        const access = await requireMemberAccess(req, res, memberId);
        if (!access) return;
      } else {
        // 没指定 member_id 时,scope 限制只能看到自己团队的客户消息 + 全员广播(NULL)
        // 这里用 subquery 包一下即可
      }
    }

    const where: string[] = [];
    const args:  any[]    = [];
    if (memberId !== null && Number.isFinite(memberId) && memberId > 0) {
      where.push("m.member_id = ?"); args.push(memberId);
    } else if (memberFilter === "all")      { where.push("m.member_id IS NULL"); }
    else if (memberFilter === "specific")   { where.push("m.member_id IS NOT NULL"); }
    if (readFilter === "read")   { where.push("m.read_time IS NOT NULL"); }
    else if (readFilter === "unread") { where.push("m.read_time IS NULL"); }
    if (keyword) { where.push("(m.title LIKE ? OR m.content LIKE ?)"); args.push(`%${keyword}%`, `%${keyword}%`); }

    // 非 super 加 team scope(member_id IS NULL 即全员广播仍可见)
    if (me.role !== "super") {
      where.push("(m.member_id IS NULL OR m.member_id IN (SELECT id FROM members WHERE agent_id = ?))");
      args.push(me.id);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `SELECT m.id, m.member_id, m.title, m.content, m.sender, m.send_time, m.read_time,
              mb.account AS member_account
         FROM messages m
         LEFT JOIN members mb ON mb.id = m.member_id
         ${whereSql}
         ORDER BY m.send_time DESC
         LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM messages m ${whereSql}`,
      args
    );
    res.json({
      data:   rows,
      total:  Number((countRows as any[])[0].cnt) || 0,
      limit,
      offset,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

// 周期 → 收益率(和前端保持一致)
const PERIOD_RETURN_RATES: Record<string, number> = {
  "30s":  20,
  "60s":  30,
  "120s": 40,
  "180s": 50,
  "240s": 60,
};

// 我的订单列表(前台用户) — 用 member_id 过滤,带结算金额/周期/收益率
app.get("/api/orders/mine", async (req, res) => {
  try {
    const memberId = Number(req.query.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id", message: "缺少 member_id" });
    }
    const status = req.query.status ? String(req.query.status) : "";
    const statusSql = status ? `AND status = ${mysql.escape(status)}` : "";
    const [rows] = await db.query(
      `SELECT id, agent_id, member_id, symbol, direction, amount, open_price, close_price,
              profit, status, open_time, close_time,
              period, return_rate, win_flag, scale, billing_time, settle_amount
         FROM orders
        WHERE member_id = ? ${statusSql}
        ORDER BY open_time DESC
        LIMIT ?`,
      [memberId, Math.min(Number(req.query.limit ?? 100), 500)]
    );
    res.json({ data: rows });
  } catch (err: any) {
    console.error("[orders/mine]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 订单详情
app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "invalid_id", message: "无效订单 id" });
    }
    const memberId = Number(req.query.member_id);
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "invalid_member_id", message: "缺少 member_id" });
    }
    // 数据归属校验
    const access = await requireMemberAccess(req, res, memberId);
    if (!access) return;
    const [rows] = await db.query(
      `SELECT id, agent_id, member_id, symbol, direction, amount, open_price, close_price,
              profit, status, open_time, close_time,
              period, return_rate, win_flag, scale, billing_time, settle_amount
         FROM orders
        WHERE id = ? AND member_id = ?
        LIMIT 1`,
      [id, memberId]
    );
    const order = (rows as any[])[0];
    if (!order) return res.status(404).json({ error: "not_found", message: "订单不存在" });
    res.json({ order });
  } catch (err: any) {
    console.error("[orders/:id]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  }
});

// 下单(秒合约) — 校验金额 > 0,扣余额(冻结),生成订单,等结算后入账
app.post("/api/orders", async (req, res) => {
  const memberId  = Number(req.body?.member_id);
  const symbol    = String(req.body?.symbol ?? "").trim().toUpperCase();
  const direction = req.body?.direction === "跌" || req.body?.direction === "sell" ? "跌" : "涨";
  const amount    = Number(req.body?.amount);
  const openPrice = Number(req.body?.open_price);
  const period    = String(req.body?.period ?? "30s");
  const scale     = Number(req.body?.scale ?? 1);
  const returnRateFromBody = Number(req.body?.return_rate);

  if (!Number.isFinite(memberId) || memberId <= 0) {
    return res.status(400).json({ error: "invalid_member_id", message: "缺少 member_id" });
  }
  if (!symbol || !/^[A-Z0-9]{4,16}$/.test(symbol)) {
    return res.status(400).json({ error: "invalid_symbol", message: "交易对无效" });
  }
  if (!PERIOD_RETURN_RATES[period]) {
    return res.status(400).json({ error: "invalid_period", message: "周期无效,允许: 30s/60s/120s/180s/240s" });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "invalid_amount", message: "请填写订单金额" });
  }
  if (!Number.isFinite(openPrice) || openPrice <= 0) {
    return res.status(400).json({ error: "invalid_price", message: "价格无效" });
  }

  // 用户在 TradingPage 选的收益率(优先);没传或非法 → fallback 到默认周期表
  const returnRate = (Number.isFinite(returnRateFromBody) && returnRateFromBody > 0 && returnRateFromBody <= 200)
    ? returnRateFromBody
    : PERIOD_RETURN_RATES[period];
  const seconds    = parseInt(period, 10);
  const settleAmount = +(amount * (1 + returnRate / 100)).toFixed(2);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [mRows] = await conn.query(
      `SELECT id, account, balance, frozen, agent_id, invite_code, ban_order, status, win_mode
         FROM members WHERE id = ? FOR UPDATE`,
      [memberId]
    );
    const m = (mRows as any[])[0];
    if (!m) { await conn.rollback(); return res.status(404).json({ error: "not_found", message: "用户不存在" }); }
    if (m.status === 0) { await conn.rollback(); return res.status(403).json({ error: "account_disabled", message: "账号已被禁用" }); }
    if (m.ban_order === 1) { await conn.rollback(); return res.status(403).json({ error: "ban_order", message: "您已被禁单" }); }
    const balance = Number(m.balance);
    if (balance < amount) {
      await conn.rollback();
      return res.status(400).json({ error: "insufficient_balance", message: `余额不足,当前 ${balance.toFixed(2)}` });
    }

    // 冻结下单金额
    const newBalance = balance - amount;
    const newFrozen  = Number(m.frozen) + amount;
    await conn.query(
      `UPDATE members SET balance = ?, frozen = ? WHERE id = ?`,
      [newBalance, newFrozen, memberId]
    );

    // 写资金流水(下单扣款)— type='下单',FundRecordsPage 用这个分类显示
    await conn.query(
      `INSERT INTO fund_records (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [m.agent_id, m.invite_code, memberId, balance, -amount, newBalance, "下单", `${symbol} ${direction} ${period}`]
    );

    // 下单时锁定 win_flag(后续改 win_mode 不影响在途订单)
    const winFlagRaw = Number(m.win_mode ?? 2);
    const winFlag = [0, 1, 2].includes(winFlagRaw) ? winFlagRaw : 2;

    // 写订单
    const [orderRes] = await conn.query(
      `INSERT INTO orders
         (agent_id, member_id, symbol, direction, amount, open_price, status,
          open_time, billing_time, period, return_rate, win_flag, scale, settle_amount)
       VALUES (?, ?, ?, ?, ?, ?, '持仓中', NOW(),
               DATE_ADD(NOW(), INTERVAL ? SECOND), ?, ?, ?, ?, ?)`,
      [m.agent_id, memberId, symbol, direction, amount, openPrice, seconds, period, returnRate, winFlag, scale, settleAmount]
    );
    const orderId = (orderRes as any).insertId;

    await conn.commit();
    res.json({
      ok: true,
      order_id: orderId,
      symbol, direction, amount, open_price: openPrice,
      period, return_rate: returnRate, win_flag: winFlag, scale,
      settle_amount: settleAmount,
      billing_time: new Date(Date.now() + seconds * 1000).toISOString(),
      balance: newBalance,
      frozen:  newFrozen,
    });
  } catch (err: any) {
    await conn.rollback();
    console.error("[orders POST]", err);
    res.status(500).json({ error: "server_error", message: err.message });
  } finally {
    conn.release();
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orderId  = req.query.order_id   ? Number(req.query.order_id) : null;
    const memberAcct = req.query.member_account ? String(req.query.member_account).trim() : "";
    let   agentId  = req.query.agent_id   ? Number(req.query.agent_id) : null;
    const invite   = req.query.invite_code? String(req.query.invite_code).trim() : "";
    const symbol   = req.query.symbol     ? String(req.query.symbol).trim() : "";
    const status   = req.query.status     ? String(req.query.status) : "";
    const dir      = req.query.direction  ? String(req.query.direction) : "";
    const startTime = req.query.start_time ? String(req.query.start_time) : "";
    const endTime   = req.query.end_time   ? String(req.query.end_time)   : "";

    // 数据归属过滤 — 非 super 强制只看自己;若塞别人 agent_id → 403
    const me = await getCurrentAdmin(req);
    if (!me) return deny(res, "no_admin", "未识别管理员");
    if (me.role !== "super") {
      if (agentId !== null && agentId !== me.id) {
        return deny(res, "forbidden", "该邀请码/团队不属于您");
      }
      agentId = me.id;
    }

    const where: string[] = [];
    const params: any[] = [];
    if (orderId) { where.push("o.id = ?"); params.push(orderId); }
    if (agentId !== null) { where.push("o.agent_id = ?"); params.push(agentId); }
    if (invite)  { where.push("o.invite_code = ?"); params.push(invite); }
    if (symbol)  { where.push("o.symbol = ?"); params.push(symbol); }
    if (status)  { where.push("o.status = ?"); params.push(status); }
    if (dir)     { where.push("o.direction = ?"); params.push(dir); }
    if (startTime) { where.push("o.open_time >= ?"); params.push(startTime); }
    if (endTime)   { where.push("o.open_time <= ?"); params.push(endTime); }
    if (memberAcct) {
      where.push("o.member_id IN (SELECT id FROM members WHERE account LIKE ?)");
      params.push(`%${memberAcct}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit  = Math.min(Number(req.query.limit ?? 50), 500);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    const [rows] = await db.query(
      `SELECT o.id, o.agent_id, o.member_id, m.account AS member_account,
              m.invite_code AS invite_code,
              o.symbol, o.direction, o.amount, o.open_price, o.close_price, o.profit,
              o.status, o.open_time, o.close_time,
              o.period, o.return_rate, o.win_flag, o.scale, o.billing_time, o.settle_amount
         FROM orders o
         LEFT JOIN members m ON m.id = o.member_id
         ${whereSql}
         ORDER BY o.open_time DESC, o.id DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM orders o ${whereSql}`,
      params
    ) as any;
    res.json({ data: rows, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 结算到期订单(被后端定时器和前端轮询调用)
//   - 扫描 status='持仓中' AND billing_time <= NOW() 的订单
//   - 按 win_flag 决定 outcome:1=要赢(看真实行情) 0=要输(强制输) 2=随机
//   - 在事务里:UPDATE orders (close_price, profit, settle_amount, status='已平仓', close_time=NOW())
//              UPDATE members (frozen -= amount, balance += settle_amount)
//              INSERT fund_records type='订单结算'
//   - 返回本次结算的订单 id 数组,前端轮询后用这个数组触发 invalidate
app.post("/api/orders/settle-due", async (_req, res) => {
  try {
    // 1) 查到期订单(带 member 的 invite_code 给 fund_records 用)
    const [dueRows] = await db.query(
      `SELECT o.id, o.agent_id, o.member_id, o.symbol, o.direction, o.amount, o.open_price,
              o.period, o.return_rate, o.win_flag,
              m.invite_code AS member_invite_code
         FROM orders o
         LEFT JOIN members m ON m.id = o.member_id
        WHERE o.status='持仓中' AND o.billing_time <= NOW()
        LIMIT 50`
    );
    const due = dueRows as any[];
    if (!due.length) return res.json({ ok: true, settled: [] });

    // 2) 按 symbol 批量拉一次实时价(避免每个订单都打 Binance)
    //   现在只用做参考/展示,真实结算价不再依赖行情 — 按 win_flag 决定结果
    const symbols = [...new Set(due.map((o: any) => o.symbol))];
    const priceMap: Record<string, number> = {};
    await Promise.all(symbols.map(async (sym) => {
      try {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`, {
          signal: AbortSignal.timeout(3000),
        });
        const d: any = await r.json();
        const px = parseFloat(d.price);
        if (Number.isFinite(px) && px > 0) priceMap[sym] = px;
        else throw new Error("bad price");
      } catch {
        priceMap[sym] = 0;
      }
    }));

    const settledIds: number[] = [];
    for (const o of due) {
      const openPrice   = Number(o.open_price);
      const returnRate  = Number(o.return_rate);
      const amount      = Number(o.amount);
      const winFlag     = Number(o.win_flag ?? 2);

      // 决定 outcome
      //   winFlag=1(要赢) → 必赢,close_price 按方向偏移 +0.001~+0.200 随机(买多加,买空减)
      //   winFlag=0(要输) → 必输,close_price 按方向反向偏移 -0.001~-0.200(买多减,买空加)
      //   winFlag=2(随机) → 50% 概率
      let isWin: boolean;
      if (winFlag === 1) {
        isWin = true;
      } else if (winFlag === 0) {
        isWin = false;
      } else {
        isWin = Math.random() < 0.5;
      }

      // 算 close_price:
      //   赢了:close_price 在 open_price 基础上 ±0.001~0.200 随机
      //         买多(涨)→ close > open(加);买空(跌)→ close < open(减)
      //   输了:反向 — 买多 close < open,买空 close > open
      //   精度 3 位小数
      const offset = +(0.001 + Math.random() * 0.199).toFixed(3); // 0.001 ~ 0.200
      let closePrice: number;
      if (isWin) {
        // 赢:买多加,买空减
        closePrice = o.direction === '涨'
          ? +(openPrice + offset).toFixed(3)
          : +(openPrice - offset).toFixed(3);
      } else {
        // 输:买多减,买空加
        closePrice = o.direction === '涨'
          ? +(openPrice - offset).toFixed(3)
          : +(openPrice + offset).toFixed(3);
      }

      // 算盈亏(按用户的"本金+收益"规则,输了钱不退)
      //   isWin=true:  利润 = amount * returnRate/100,settle_amount = amount + 利润
      //   isWin=false: 利润 = -amount,settle_amount = 0(全亏)
      const profit       = isWin ? +(amount * returnRate / 100).toFixed(2) : -amount;
      const settleAmount = isWin ? +(amount + amount * returnRate / 100).toFixed(2) : 0;

      // 事务结算
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [mRows] = await conn.query(
          `SELECT balance, frozen FROM members WHERE id = ? FOR UPDATE`,
          [o.member_id]
        );
        const m = (mRows as any[])[0];
        if (!m) { await conn.rollback(); continue; }
        const newFrozen  = Math.max(0, Number(m.frozen) - amount);
        const newBalance = Number(m.balance) + settleAmount;
        await conn.query(
          `UPDATE members SET balance = ?, frozen = ? WHERE id = ?`,
          [newBalance, newFrozen, o.member_id]
        );
        // 注意:只在状态还是"持仓中"时才更新,防止并发重复结算
        const [updRes] = await conn.query(
          `UPDATE orders
              SET close_price = ?, profit = ?, settle_amount = ?,
                  status = '已平仓', close_time = NOW()
            WHERE id = ? AND status = '持仓中'`,
          [closePrice, profit, settleAmount, o.id]
        );
        if ((updRes as any).affectedRows === 0) {
          await conn.rollback();
          continue;
        }
        // 资金流水:amount = 实际到账金额(本金 + 盈利),不是只写盈利
        //   赢了 → amount = settle_amount(本金+收益一起回)
        //   输了 → amount = -amount(本金扣光,负数表示用户亏了多少)
        const flowAmount = isWin ? settleAmount : -Number(o.amount);
        await conn.query(
          `INSERT INTO fund_records
             (agent_id, invite_code, member_id, \`before\`, amount, \`after\`,
              type, notes, time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [o.agent_id, o.member_invite_code ?? null, o.member_id,
           Number(m.balance), flowAmount, newBalance,
           "订单结算", `${o.symbol} ${o.direction} ${o.period} ${isWin ? '赢' : '输'} 本金${o.amount}${isWin ? ` + 盈利${profit}` : ''}`]
        );
        await conn.commit();
        settledIds.push(o.id);
        console.log(`[settle] order ${o.id} ${isWin ? 'WIN' : 'LOSE'} win_flag=${winFlag} open=${openPrice} close=${closePrice} profit=${profit} settle=${settleAmount}`);
      } catch (err: any) {
        await conn.rollback();
        console.error(`[settle ${o.id}]`, err.message);
      } finally {
        conn.release();
      }
    }
    res.json({ ok: true, settled: settledIds });
  } catch (err: any) {
    console.error("[settle-due]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`✅ Express API ready at http://localhost:${PORT}`);
  console.log(`   Try: curl http://localhost:${PORT}/api/health`);
});

// 后端兜底:每 2 秒扫一次到期订单,调用 settle-due 接口触发结算
//   前端持仓页也会每 5 秒主动调用,任何一方失灵另一方兜底
setInterval(async () => {
  try {
    const r = await fetch(`http://localhost:${PORT}/api/orders/settle-due`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    const d: any = await r.json();
    if (d?.settled?.length) {
      console.log(`[settle-tick] settled ${d.settled.length} orders`);
    }
  } catch (err: any) {
    console.error("[settle-tick]", err.message);
  }
}, 2000);