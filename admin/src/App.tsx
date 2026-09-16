import { useState, useEffect, useRef, useCallback, type ReactNode, type MouseEvent } from "react";
import type { CSSProperties } from "react";
import { api, type Stats, type Withdrawal, type Member, type DigitalWalletRow, type BankWalletRow } from "./api";
import { useAuth } from "./auth";
import { LoginPage } from "./LoginPage";
import { ProfilePage } from "./ProfilePage";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page =
  | "home" | "members" | "digital-wallet" | "bank-wallet"
  | "messages" | "report-inout" | "recharge-list"
  | "withdraw-list" | "fund-details" | "order-list"
  | "profile" | "employees";

type Tab = { id: Page; label: string };

// ─── Sample Data ──────────────────────────────────────────────────────────────
const memberData = [
  { id: 38575, account: "z1076052961", status: true,  balance: 44201,  frozen: 5999,  credit: "100|1", tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/11 15:41:04" },
  { id: 37768, account: "zxic123",     status: true,  balance: 1260,   frozen: 0,     credit: "100|1", tag: "蓝随机", ban: true,   agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/11 12:43:15" },
  { id: 37754, account: "Deepa54321", status: true,  balance: 0,      frozen: 135740, credit: "80|1",  tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/10 19:16:32" },
  { id: 37730, account: "minakshee669",status: true,  balance: 0,      frozen: 18477, credit: "80|1",  tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/10 13:40:50" },
  { id: 37672, account: "Mr.Ab",       status: true,  balance: 4320,   frozen: 0,     credit: "100|1", tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/10 12:06:04" },
  { id: 37612, account: "Lakhanjangam",status: true,  balance: 0,      frozen: 0,     credit: "100|1", tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/9 13:06:47"  },
  { id: 37584, account: "anup44",      status: true,  balance: 0,      frozen: 0,     credit: "100|1", tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/9 12:25:20"  },
  { id: 37562, account: "Amiyashit@40455", status: false, balance: 0,  frozen: 16994, credit: "80|1",  tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/8 14:17:38"  },
  { id: 37557, account: "APPUYOGI",   status: true,  balance: 80000,  frozen: 50184, credit: "90|1",  tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/8 13:59:18"  },
  { id: 37543, account: "GarvitSharma",status: true, balance: 2090,   frozen: 0,     credit: "100|1", tag: "蓝随机", ban: false,  agent: 8, invite: "100047|708386", type: "会员", regTime: "2026/9/8 13:23:55"  },
];

const digitalWalletData = [
  { id: 658, memberId: "38575 / z1076052961",      type1: "USDT", type2: "TRC20", notes: "" },
  { id: 657, memberId: "38551 / himanshu25",        type1: "BTC",  type2: "BTC",  notes: "BTC" },
  { id: 656, memberId: "37742 / Jithinak@1986",    type1: "BTC",  type2: "BTC",  notes: "" },
  { id: 655, memberId: "38112 / Gopichand",         type1: "BTC",  type2: "BTC",  notes: "" },
  { id: 654, memberId: "38115 / chhagansingh2000",  type1: "USDT", type2: "TRC20",notes: "ok" },
  { id: 653, memberId: "38115 / chhagansingh2000",  type1: "USDT", type2: "TRC20",notes: "ok" },
  { id: 652, memberId: "38112 / Gopichand",         type1: "BTC",  type2: "BTC",  notes: "" },
  { id: 651, memberId: "38066 / Malcom",            type1: "USDT", type2: "TRC20",notes: "" },
  { id: 650, memberId: "37853 / Leelam",            type1: "USDT", type2: "TRC20",notes: "Withdrawal" },
  { id: 649, memberId: "38036 / SyedSalman",        type1: "USDT", type2: "ERC20",notes: "3420" },
];

const bankWalletData = [
  { id: 21448, memberId: "38386 / innus9767",       bankName: "ICICI Bank",         cardNo: "091501526556",  holder: "INNUS NASIR SHAIKH",       branch: "CDTPS7418C",         ifsc: "ICIC0002392",  contact: "Mohammad wadi Branch",    notes: "Account for withdrawal" },
  { id: 21447, memberId: "37394 / teltejaswi",      bankName: "Axis",               cardNo: "921010015558351",holder: "Pedavalli Tejaswi",        branch: "FHEPP0851A",         ifsc: "UTIB0002556",  contact: "Chilakaluripet",          notes: "" },
  { id: 21446, memberId: "37888 / GovindaRajulu",   bankName: "STATE BANK OF INDIA",cardNo: "33503516496",   holder: "Govinda Rajulu C",          branch: "ALAPR5585J",         ifsc: "SBIN0007377",  contact: "PATEL NAGAR BRANCH",      notes: "withdraw" },
  { id: 21445, memberId: "38261 / Shaqt12",         bankName: "State Bank of India",cardNo: "40862340743",   holder: "Samruddhi Raghunath Sawant",branch: "9987142762-2@ybl",    ifsc: "SBIN0015740",  contact: "Bhayender(East)",         notes: "" },
  { id: 21444, memberId: "38558 / Gaurav2002",      bankName: "Bank of baroda",     cardNo: "41560100001924",holder: "Gaurav",                    branch: "0704332337",          ifsc: "BARB0PEERAG", contact: "Miawali nagar",           notes: "" },
  { id: 21443, memberId: "38407 / AjaySingh1988",   bankName: "Union Bank of India",cardNo: "369702010061683",holder: "Ajay singh",               branch: "Ajaysingh1988",       ifsc: "UBIN0556891",  contact: "Sector o aliganj Lucknow",notes: "Withdrawal" },
  { id: 21442, memberId: "38565 / Ritikaag22",      bankName: "HDFC",               cardNo: "50100134302918",holder: "Ritika Agarwal",            branch: "427451227955",        ifsc: "HDFC0009672",  contact: "PARAMOUNT EMOTIONS",      notes: "Bank details" },
  { id: 21441, memberId: "38312 / DaljitSingh",     bankName: "State Bank of India",cardNo: "32431368965",   holder: "Daljit Singh",              branch: "951007770662",        ifsc: "SBIN0007554",  contact: "Chogawan",                notes: "Withdrawal" },
  { id: 21440, memberId: "38540 / Shasidhar",       bankName: "HDFC",               cardNo: "50100644994720",holder: "SHASIDHAR VENUGOPALA",      branch: "Shasidhar",           ifsc: "HDFC0000351",  contact: "HOSUR - TAMILNADU",       notes: "Withdraw" },
  { id: 21438, memberId: "38277 / Shantam",         bankName: "HDFC Bank",          cardNo: "50100371466550",holder: "Shantam Sharma",            branch: "202102847583",        ifsc: "HDFC0000191",  contact: "Model Town, sonipat",     notes: "" },
];

const messageData: never[] = []; // 占位 — 已迁移到 MessagesPage 内部 useState

const withdrawData = [
  { id: 23881, agent: 8, invite: "100047", memberId: "38575 / z1076052961",    status: "申请中", amount: 5999,   approved: 0,    type: "数字币", applyTime: "2026-09-02 20:15:50", approveTime: "",                    reviewer: "" },
  { id: 23880, agent: 8, invite: "100047", memberId: "37046 / Sathyadpvs",     status: "已拒绝", amount: 428022, approved: 0,    type: "银行卡", applyTime: "2026-09-02 15:30:30", approveTime: "2026-09-02 15:32:17", reviewer: "work_100047" },
  { id: 23568, agent: 8, invite: "100047", memberId: "36557 / AbhayRawat",     status: "已拒绝", amount: 20000,  approved: 0,    type: "银行卡", applyTime: "2026-08-14 20:26:14", approveTime: "2026-08-14 20:27:51", reviewer: "admin" },
  { id: 23566, agent: 8, invite: "100047", memberId: "36557 / AbhayRawat",     status: "已同意", amount: 2000,   approved: 2000, type: "银行卡", applyTime: "2026-08-14 20:17:22", approveTime: "2026-08-14 20:22:23", reviewer: "admin" },
  { id: 23439, agent: 8, invite: "100047", memberId: "36679 / Sunilkumar52",   status: "已拒绝", amount: 33000,  approved: 0,    type: "银行卡", applyTime: "2026-08-11 11:56:18", approveTime: "2026-08-11 11:57:06", reviewer: "work_100047" },
  { id: 23435, agent: 8, invite: "100047", memberId: "36679 / Sunilkumar52",   status: "已同意", amount: 3000,   approved: 3000, type: "银行卡", applyTime: "2026-08-10 23:21:13", approveTime: "2026-08-10 23:24:07", reviewer: "work_100047" },
  { id: 23431, agent: 8, invite: "100047", memberId: "35746 / amitdwivedi245", status: "已拒绝", amount: 37454,  approved: 0,    type: "银行卡", applyTime: "2026-08-10 21:49:34", approveTime: "2026-08-10 23:07:29", reviewer: "work_100047" },
  { id: 23424, agent: 8, invite: "100047", memberId: "37754 / Deepa54321",     status: "已拒绝", amount: 33000,  approved: 0,    type: "银行卡", applyTime: "2026-08-10 19:31:17", approveTime: "2026-08-10 19:33:57", reviewer: "work_100047" },
  { id: 23421, agent: 8, invite: "100047", memberId: "37754 / Deepa54321",     status: "已同意", amount: 3300,   approved: 3300, type: "银行卡", applyTime: "2026-08-10 19:24:10", approveTime: "2026-08-10 19:27:02", reviewer: "work_100047" },
  { id: 23411, agent: 8, invite: "100047", memberId: "37730 / minakshee669",   status: "已拒绝", amount: 5500,   approved: 0,    type: "银行卡", applyTime: "2026-08-10 15:31:16", approveTime: "2026-08-10 15:32:45", reviewer: "work_100047" },
];

const fundData = [
  { id: 437780, agent: 8, invite: "100047", memberId: "38575 / z1076052961", before: 100200, amount: -50000,   after: 50200,    type: "后台扣款", time: "2026-09-02 20:11:25", notes: "后台扣款" },
  { id: 437777, agent: 8, invite: "100047", memberId: "38575 / z1076052961", before: 99000,  amount: 1200,     after: 100200,   type: "下推盈利", time: "2026-09-02 20:06:26", notes: "orders:B100000128140116" },
  { id: 437776, agent: 8, invite: "100047", memberId: "38575 / z1076052961", before: 100000, amount: -1000,    after: 99000,    type: "会员下单", time: "2026-09-02 20:05:36", notes: "user create new order" },
  { id: 437775, agent: 8, invite: "100047", memberId: "38575 / z1076052961", before: 0,      amount: 100000,   after: 100000,   type: "后台充值", time: "2026-09-02 20:04:16", notes: "后台入款" },
  { id: 437774, agent: 8, invite: "100047", memberId: "37046 / Sathyadpvs",  before: 40000,  amount: 68602.8,  after: 108602.8, type: "后台充值", time: "2026-09-02 15:03:07", notes: "后台入款" },
  { id: 437773, agent: 8, invite: "100047", memberId: "37046 / Sathyadpvs",  before: 0,      amount: 40000,    after: 40000,    type: "后台充值", time: "2026-09-02 14:46:19", notes: "后台入款" },
  { id: 430285, agent: 8, invite: "100047", memberId: "36557 / AbhayRawat",  before: 30000,  amount: 10000,    after: 40000,    type: "后台充值", time: "2026-08-15 17:11:48", notes: "后台入款" },
  { id: 429791, agent: 8, invite: "100047", memberId: "36557 / AbhayRawat",  before: 0,      amount: 30000,    after: 30000,    type: "后台充值", time: "2026-08-14 21:07:53", notes: "后台入款" },
  { id: 429768, agent: 8, invite: "100047", memberId: "36557 / AbhayRawat",  before: 32000,  amount: -2000,    after: 30000,    type: "会员提现", time: "2026-08-14 20:22:23", notes: "提现申请单号: 23566" },
  { id: 429753, agent: 8, invite: "100047", memberId: "36557 / AbhayRawat",  before: 0,      amount: 57751.5,  after: 57751.5,  type: "下推盈利", time: "2026-08-14 20:00:15", notes: "orders:B1000000446737895" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  return n.toLocaleString("zh-CN");
}

// ─── Mini Components ──────────────────────────────────────────────────────────
function Toggle({ value, onClick }: { value: boolean; onClick?: () => void }) {
  return (
    <button
      className={`toggle ${value ? "on" : "off"}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    />
  );
}

const BADGE_MAP: Record<string, string> = {
  orange: "badge-orange", teal: "badge-teal", green: "badge-green",
  red: "badge-red", gray: "badge-gray", black: "badge-black",
  blue: "badge-blue", purple: "badge-purple", gold: "badge-gold",
};

function Badge({ label, color = "gray" }: { label: string; color?: string }) {
  return <span className={`badge ${BADGE_MAP[color] || "badge-gray"}`}>{label}</span>;
}

const fundTypeColor: Record<string, string> = {
  "后台扣款": "orange", "下推盈利": "teal", "会员下单": "blue",
  "后台充值": "green",  "会员提现": "red",
};
const withdrawStatusColor: Record<string, string> = {
  "申请中": "orange", "已拒绝": "red", "已同意": "green", "已退款": "gray",
};

function Pagination({
  total, perPage = 10, label = "条记录",
  page, onPageChange, onPerPageChange,
}: {
  total: number; perPage?: number; label?: string;
  page?: number; onPageChange?: (p: number) => void;
  onPerPageChange?: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  // 内部 page state — 若外部没传则自管,传了就跟随
  const [internalPage, setInternalPage] = useState(1);
  const current = page ?? internalPage;
  const setPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    if (onPageChange) onPageChange(clamped); else setInternalPage(clamped);
  };
  const [jumpVal, setJumpVal] = useState(String(current));

  useEffect(() => { setJumpVal(String(current)); }, [current]);

  const goJump = () => {
    const n = parseInt(jumpVal, 10);
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) setPage(n);
    else setJumpVal(String(current));
  };

  // 页码显示策略:当前页 ± 1 + 首末页
  const pageButtons: (number | "…")[] = [];
  const add = (v: number | "…") => { if (!pageButtons.includes(v)) pageButtons.push(v); };
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) add(i);
  } else {
    add(1);
    if (current > 4) add("…");
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) add(i);
    if (current < totalPages - 3) add("…");
    add(totalPages);
  }

  const rangeStart = total === 0 ? 0 : (current - 1) * perPage + 1;
  const rangeEnd   = Math.min(current * perPage, total);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        第 {rangeStart} 到 {rangeEnd} 条，共 {total.toLocaleString()} {label}。
      </span>
      <div className="pagination-controls">
        <button className="page-btn" disabled={current <= 1} onClick={() => setPage(current - 1)}>‹ 上一页</button>
        {pageButtons.map((v, i) => v === "…"
          ? <span key={`e${i}`} style={{ color: "#aaa", fontSize: 13, padding: "0 4px" }}>…</span>
          : <button
              key={v}
              className={`page-btn ${v === current ? "active" : ""}`}
              onClick={() => setPage(v)}
            >{v}</button>
        )}
        <button className="page-btn" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>下一页 ›</button>
        <select
          className="page-size-select"
          value={perPage}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n)) {
              if (onPerPageChange) onPerPageChange(n);
              // 切每页条数后回到第一页(若外部管理)
              if (onPageChange) onPageChange(1);
              else setInternalPage(1);
            }
          }}
        >
          <option value={10}>10条/页</option>
          <option value={20}>20条/页</option>
          <option value={50}>50条/页</option>
          <option value={100}>100条/页</option>
        </select>
        <input
          className="page-jump-input"
          value={jumpVal}
          onChange={(e) => setJumpVal(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={goJump}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); goJump(); } }}
        />
        <button className="page-btn" onClick={goJump}>跳转</button>
      </div>
    </div>
  );
}

function ActBtn({ label, color = "blue", onClick }: { label: string; color?: string; onClick?: () => void }) {
  return <button className={`act-btn act-btn-${color}`} onClick={onClick}>{label}</button>;
}

function EmptyState() {
  return (
    <tr><td colSpan={20}>
      <div className="empty-state">
        <div className="empty-icon">📄</div>
        <div className="empty-text">暂无数据</div>
      </div>
    </td></tr>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function HomePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<Withdrawal[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.health();
        if (alive) setApiOk(true);
        const [s, w] = await Promise.all([api.stats(), api.withdrawals({ limit: 6 })]);
        if (alive) {
          setStats(s);
          setRecentWithdrawals(w.data);
        }
      } catch (e: any) {
        if (alive) { setApiOk(false); setError(e.message); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const kpis = [
    { label: "注册会员", value: stats ? fmtNum(stats.members) : "—", sub: "总会员数",       color: "blue",   icon: "👥", trend: stats ? `+${stats.todayMembers} 今日` : "加载中", trendKind: "up"   },
    { label: "今日入款", value: stats ? fmtNum(stats.todayRecharge) : "—", sub: "USD 等值",     color: "green",  icon: "⬇",  trend: stats?.todayRecharge ? "已入账" : "暂无",        trendKind: "info" },
    { label: "今日出款", value: stats ? fmtNum(stats.todayWithdraw) : "—", sub: "USD 等值",     color: "orange", icon: "⬆",  trend: "实时统计",                                       trendKind: "warn" },
    { label: "申请提现", value: stats ? String(stats.pendingWithdrawals) : "—", sub: "待审核",   color: "red",    icon: "💸", trend: stats?.pendingWithdrawals ? "需处理" : "已清空", trendKind: stats?.pendingWithdrawals ? "down" : "info" },
    { label: "API 状态", value: apiOk === null ? "检测中" : apiOk ? "正常" : "断开", sub: "MySQL 连接", color: "teal", icon: "🟢", trend: apiOk ? "已连通" : "未连通", trendKind: apiOk ? "info" : "down" },
  ];

  const quickActions: { group: string; items: QuickAction[] }[] = [
    {
      group: "会员管理",
      items: [
        { icon: "👥", label: "会员列表", page: "members",
          badge: stats ? fmtNum(stats.members) : undefined, badgeKind: "muted" },
        { icon: "📱", label: "数字钱包", page: "digital-wallet" },
        { icon: "🏦", label: "银行卡",   page: "bank-wallet" },
        { icon: "📲", label: "发送通知", page: "messages" },
      ],
    },
    {
      group: "资金管理",
      items: [
        { icon: "💸", label: "提现审核", page: "withdraw-list",
          badge: stats?.pendingWithdrawals ? String(stats.pendingWithdrawals) : "0",
          badgeKind: stats?.pendingWithdrawals ? "danger" : "muted" },
        { icon: "⬇",  label: "充值列表", page: "recharge-list",
          badge: stats?.todayRecharge ? fmtNum(stats.todayRecharge) : undefined,
          badgeKind: "success" },
        { icon: "📊", label: "资金明细", page: "fund-details" },
        { icon: "📈", label: "出入款报表", page: "report-inout" },
      ],
    },
    {
      group: "运营 / 系统",
      items: [
        { icon: "📋", label: "订单管理", page: "order-list",
          badge: stats?.todayWithdraw ? fmtNum(stats.todayWithdraw) : undefined,
          badgeKind: "warn" },
        { icon: "🧑‍💼", label: "员工管理", page: "employees" },
        { icon: "👤", label: "个人中心", page: "profile" },
      ],
    },
  ];

  const activities = recentWithdrawals.slice(0, 4).map(w => ({
    icon: w.status === "申请中" ? "💸" : w.status === "已同意" ? "✅" : "❌",
    color: w.status === "申请中" ? "red" : w.status === "已同意" ? "green" : "orange",
    title: `提现申请 #${w.id}`,
    meta: `会员 #${w.member_id} · ₹ ${fmtNum(w.amount)} · ${w.status}`,
    time: w.apply_time.split(" ")[1] ?? w.apply_time,
  }));

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "rgba(255,77,79,0.1)", border: "1px solid #ff4d4f", borderRadius: 8, color: "#ff4d4f", fontSize: 13 }}>
          ⚠ 后端 API 未连通: {error}。 请确认 <code>npm run server</code> 已在跑 (端口 3001)。
        </div>
      )}

      <div className="dashboard-hero">
        <div className="hero-left">
          <div className="hero-bitcoin">₿</div>
          <div>
            <div className="hero-title">欢迎回来,管理员 👋</div>
            <div className="hero-subtitle">皮总团队交易所 · 运营控制台 · {dateStr}</div>
          </div>
        </div>
        <div className="hero-status">
          <div className="status-pill">
            <span className="status-dot"></span>
            <span>{apiOk === false ? "API 断开" : "系统运行正常"}</span>
          </div>
          <div className="status-meta">
            {apiOk ? "Express :3001 在线 · MySQL 已连接" : "等待后端启动…"}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map(k => (
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-header">
              <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
              <span className={`kpi-trend ${k.trendKind}`}>{k.trend}</span>
            </div>
            <div className={`stat-value ${k.color}`}>{k.value}</div>
            <div className="stat-label" style={{ marginTop: 2 }}>{k.label}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="table-card" style={{ padding: 0 }}>
          <div className="card-header">
            <h3 className="card-title">最近提现申请 (来自 MySQL)</h3>
            <button className="card-link">查看全部 →</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>会员</th>
                  <th>金额</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>申请时间</th>
                </tr>
              </thead>
              <tbody>
                {recentWithdrawals.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "#999", padding: 24 }}>
                    {apiOk === false ? "⏳ 后端未连接,等待数据..." : "暂无提现记录"}
                  </td></tr>
                )}
                {recentWithdrawals.map(p => (
                  <tr key={p.id}>
                    <td className="num-cell" style={{ color: "#888" }}>#{p.id}</td>
                    <td className="link-cell">#{p.member_id}</td>
                    <td className="num-cell">₹ {fmtNum(p.amount)}</td>
                    <td><Badge label={p.type} color="blue" /></td>
                    <td><Badge label={p.status} color={withdrawStatusColor[p.status]} /></td>
                    <td style={{ color: "#999", fontSize: 12 }}>{p.apply_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card" style={{ padding: 0 }}>
          <div className="card-header">
            <h3 className="card-title">实时动态</h3>
            <button className="card-link">查看全部 →</button>
          </div>
          <div className="activity-list">
            {activities.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#999" }}>暂无动态</div>
            )}
            {activities.map((a, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-dot ${a.color}`}>{a.icon}</div>
                <div className="activity-body">
                  <div className="activity-title">{a.title}</div>
                  <div className="activity-meta">{a.meta}</div>
                </div>
                <div className="activity-time">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <div className="card-header">
          <h3 className="card-title">快捷操作</h3>
          <span className="card-title-sm">点击直达 · 实时数据徽标</span>
        </div>
        <div className="quick-actions-groups">
          {quickActions.map(g => (
            <div key={g.group} className="quick-actions-group">
              <div className="quick-actions-group-head">{g.group}</div>
              <div className="actions-grid">
                {g.items.map(a => (
                  <button
                    key={a.label}
                    className={`action-tile ${a.badge ? "has-badge" : ""}`}
                    onClick={() => onNavigate(a.page)}
                    title={`前往 ${a.label}`}
                  >
                    {a.badge && (
                      <span className={`action-tile-badge ${a.badgeKind ?? "muted"}`}>
                        {a.badge}
                      </span>
                    )}
                    <span className="action-icon">{a.icon}</span>
                    <span className="action-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembersPage() {
  const [checkedAll, setCheckedAll] = useState(false);
  const [list, setList] = useState<MemberEx[]>([]);
  // 输赢模式:每行独立,key = 会员 id,value = 'win' | 'lose' | 'random'
  const [winMode, setWinMode] = useState<Record<number, "win" | "lose" | "random">>({});
  // 方向:每行独立 — 'up' | 'down'
  const [directionMode, setDirectionMode] = useState<Record<number, "up" | "down">>({});
  // 禁单:每行独立 — 'allow' | 'ban'
  const [banOrderMode, setBanOrderMode] = useState<Record<number, "allow" | "ban">>({});
  // 禁提:每行独立 — 'allow' | 'ban'
  const [banWithdrawMode, setBanWithdrawMode] = useState<Record<number, "allow" | "ban">>({});
  const [total, setTotal] = useState(0);
  const [normalCount, setNormalCount] = useState(0);
  const [disabledCount, setDisabledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // 筛选条件
  const [keyword, setKeyword]   = useState("");
  const [statusF, setStatusF]   = useState<string>("");   // "" | "1" | "0"
  const [typeF, setTypeF]       = useState<string>("");   // "" | "会员" | "代理" | "管理员"
  const [kycF, setKycF]         = useState<string>("");   // "" | "未提交" | "审核中" | "已通过" | "已拒绝"

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 编辑弹窗:被编辑的会员(null = 关闭)
  const [editTarget, setEditTarget] = useState<Member | null>(null);

  // 保存成功提示(toast)
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // 把表单数据写回列表 + ToggleCell 状态(乐观更新 + 异步持久化)
  const saveMember = async (data: EditFormData) => {
    if (!editTarget) return;
    const id = editTarget.id;

    // 1) 乐观更新本地状态(立刻可见)
    setList(prev => prev.map(m => m.id === id ? {
      ...m,
      credit:       data.credit,
      tag:          data.level,
      status:       data.status === "启用" ? 1 : 0,
      direction:    (data.direction === "up" ? "涨" : "跌") as Member["direction"],
      ban_order:    data.banOrder    === "ban" ? 1 : 0,
      ban_withdraw: data.banWithdraw === "ban" ? 1 : 0,
      nickname: data.nickname,
      phone:    data.phone,
      email:    data.email,
      gender:   data.gender,
      remark:   data.remark,
    } : m));
    setWinMode(prev => ({ ...prev, [id]: data.winMode }));
    setDirectionMode(prev => ({ ...prev, [id]: data.direction }));
    setBanOrderMode(prev => ({ ...prev, [id]: data.banOrder }));
    setBanWithdrawMode(prev => ({ ...prev, [id]: data.banWithdraw }));

    // 2) 异步写后端;失败回滚 + 重拉
    try {
      // 把 winMode 字符串映射成 1=要赢 0=要输 2=随机,发到后端 whitelist
      const winModeNum = data.winMode === 'win' ? 1 : data.winMode === 'lose' ? 0 : 2;
      await api.updateMember(id, {
        nickname:    data.nickname,
        phone:       data.phone,
        email:       data.email,
        gender:      data.gender,
        remark:      data.remark,
        credit:      data.credit,
        win_mode:    winModeNum,
        tag:         data.level,
        status:      data.status,
        direction:   data.direction,
        ban_order:   data.banOrder,
        ban_withdraw: data.banWithdraw,
      });
      setToast({ text: `✔ 已保存 ${data.account} 的修改`, kind: "ok" });
    } catch (e: any) {
      await load();   // 回滚 — 重新拉
      setToast({ text: `✘ 保存失败: ${e.message || e}`, kind: "err" });
    } finally {
      setEditTarget(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true); setErrMsg(null);
    try {
      const r = await api.members({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        status: statusF,
        type: typeF,
        kyc: kycF,
        keyword: keyword.trim(),
      });
      setList(r.data as MemberEx[]);
      setTotal(r.total);
      setNormalCount(r.normal);
      setDisabledCount(r.disabled);
      // 同步 win_mode / direction / ban_order / ban_withdraw 到 ToggleCell state
      //   后端现在真实存了这些值,刷新页面后 UI 不会丢
      const winMap: Record<number, "win" | "lose" | "random"> = {};
      const dirMap: Record<number, "up" | "down"> = {};
      const banOrderMap: Record<number, "allow" | "ban"> = {};
      const banWithdrawMap: Record<number, "allow" | "ban"> = {};
      for (const m of r.data as any[]) {
        if (m.win_mode === 1) winMap[m.id] = "win";
        else if (m.win_mode === 0) winMap[m.id] = "lose";
        else winMap[m.id] = "random";
        dirMap[m.id] = m.direction === "涨" ? "up" : "down";
        banOrderMap[m.id]   = m.ban_order   ? "ban"   : "allow";
        banWithdrawMap[m.id] = m.ban_withdraw ? "ban" : "allow";
      }
      setWinMode(prev => ({ ...winMap, ...prev }));           // 用户手动改的优先
      setDirectionMode(prev => ({ ...dirMap, ...prev }));
      setBanOrderMode(prev => ({ ...banOrderMap, ...prev }));
      setBanWithdrawMode(prev => ({ ...banWithdrawMap, ...prev }));
    } catch (e: any) {
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusF, typeF, kycF, keyword]);

  useEffect(() => { load(); }, [load]);

  // 防抖搜索
  const [kwInput, setKwInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setKeyword(kwInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [kwInput]);

  const reset = () => {
    setKwInput(""); setKeyword("");
    setStatusF(""); setTypeF(""); setKycF("");
    setPage(1);
  };

  const toggleStatus = async (m: Member) => {
    try {
      await api.toggleMemberStatus(m.id);
      await load();
    } catch (e: any) {
      alert("操作失败: " + e.message);
    }
  };

  // 其他操作按钮的占位:点击后弹提示,等后续接 API
  const stubAction = (action: string, m: Member) => {
    alert(`「${action}」账号 ${m.account} (#${m.id})\n\n该操作的后端接口待接入,目前为占位按钮。`);
  };

  // 强制下线 — 调 /api/admin/members/:id/force-logout 旋转 session_token
  // 前台下次 /api/auth/me 拿到的 token 与本地不一致 → 自动登出
  const kickOffline = async (m: Member) => {
    if (!window.confirm(`确定要强制下线账号「${m.account}」(#${m.id}) 吗?\n该会员当前会话将被立即终止。`))
      return;
    try {
      const res = await fetch(`/api/admin/members/${m.id}/force-logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer: "admin" }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.ok) {
        setToast({ text: `✔ 下线成功 — ${m.account} 已被强制退出登录`, kind: "ok" });
      } else {
        setToast({ text: `✘ 下线失败: ${data.message || data.error || "未知错误"}`, kind: "err" });
      }
    } catch (e: any) {
      setToast({ text: `✘ 下线失败: ${e?.message || e}`, kind: "err" });
    }
  };

  // 入款 / 扣款弹窗状态
  const [fundTarget, setFundTarget] = useState<Member | null>(null);
  const [fundMode,   setFundMode]   = useState<"recharge" | "deduct">("recharge");

  // 重置密码弹窗状态(登密 / 资密)
  const [pwdTarget, setPwdTarget] = useState<Member | null>(null);
  const [pwdType,   setPwdType]   = useState<"login" | "fund">("login");

  // 冻结 / 解冻 弹窗状态
  const [freezeTarget, setFreezeTarget] = useState<Member | null>(null);
  const [freezeMode,   setFreezeMode]   = useState<"freeze" | "unfreeze">("freeze");

  // 发信 弹窗状态
  const [sendTarget, setSendTarget] = useState<Member | null>(null);
  const [sendMode,   setSendMode]   = useState<"single" | "broadcast">("single");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page-container">
      {/* 顶部统计 tab */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        background: "var(--surface)", padding: "12px 16px",
        borderRadius: "var(--radius)", border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}>
        <span style={{ fontSize: 14, color: "#555", fontWeight: 500 }}>会员列表</span>
        <span style={{ color: "#1890ff", fontSize: 13 }}>
          共 <strong>{fmtNum(total)}</strong> 人
        </span>
        <span style={{ color: "#aaa" }}>|</span>
        <span style={{ color: "#52c41a", fontSize: 13 }}>
          正常 {fmtNum(normalCount)}
        </span>
        <span style={{ color: "#ff4d4f", fontSize: 13 }}>
          禁用 {fmtNum(disabledCount)}
        </span>
        {loading && <span style={{ marginLeft: "auto", fontSize: 14, color: "#1890ff" }}>加载中…</span>}
      </div>

      {/* 筛选条 */}
      <div className="filter-bar">
        <span className="filter-label">搜索：</span>
        <input
          className="filter-input"
          style={{ width: 200 }}
          placeholder="账号 / 邀请码 / ID"
          value={kwInput}
          onChange={e => setKwInput(e.target.value)}
        />
        <span className="filter-label">类型：</span>
        <select className="filter-select" value={typeF} onChange={e => { setTypeF(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="会员">会员</option>
          <option value="代理">代理</option>
          <option value="管理员">管理员</option>
        </select>
        <span className="filter-label">状态：</span>
        <select className="filter-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="1">正常</option>
          <option value="0">禁用</option>
        </select>
        <span className="filter-label">KYC：</span>
        <select className="filter-select" value={kycF} onChange={e => { setKycF(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="未提交">未提交</option>
          <option value="审核中">审核中</option>
          <option value="已通过">已通过</option>
          <option value="已拒绝">已拒绝</option>
        </select>
        <button className="btn btn-warning" onClick={reset}>↺ 重置</button>
        <button className="btn btn-primary" onClick={load}>🔄 刷新</button>
        <span style={{ flex: 1 }} />
        <button className="btn btn-teal" onClick={() => { setSendTarget(null); setSendMode("broadcast"); }}>✉ 发信给所有会员</button>
      </div>

      {errMsg && (
        <div style={{
          padding: "10px 14px", background: "#fff1f0", border: "1px solid #ffa39e",
          borderRadius: 6, color: "#cf1322", fontSize: 14,
        }}>
          ⚠ 加载失败: {errMsg}。 请确认 Express (端口 3001) 已在运行。
        </div>
      )}

      {/* 表格 */}
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" checked={checkedAll} onChange={e => setCheckedAll(e.target.checked)} /></th>
                <th>ID</th>
                <th>账号</th>
                <th>状态</th>
                <th>余额 | 冻结</th>
                <th>信誉</th>
                <th>输赢</th>
                <th>方向</th>
                <th>禁单</th>
                <th>禁提</th>
                <th>总代</th>
                <th>邀请码</th>
                <th>类型</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {!loading && list.length === 0 && (
                <tr><td colSpan={12}>
                  <div className="empty-state">
                    <div className="empty-icon">📄</div>
                    <div className="empty-text">
                      {errMsg ? "加载失败" : total === 0 ? "暂无会员,等待前台注册…" : "没有符合条件的会员"}
                    </div>
                  </div>
                </td></tr>
              )}
              {list.map((m, idx) => (
                <tr key={m.id}>
                  <td><input type="checkbox" checked={checkedAll} onChange={() => {}} /></td>
                  <td className="num-cell" style={{ color: "#888" }}>{m.id}</td>
                  <td className="link-cell">{m.account}</td>
                  <td><Toggle value={m.status === 1} onClick={() => toggleStatus(m)} /></td>
                  <td className="num-cell">{fmtNum(Number(m.balance))} | {fmtNum(Number(m.frozen))}</td>
                  <td>{String(m.credit || "").split("|")[0]}</td>
                  <td>
                    <ToggleCell
                      value={winMode[m.id] ?? "win"}
                      options={WIN_MODE_OPTIONS}
                      onChange={v => setWinMode(prev => ({ ...prev, [m.id]: v }))}
                    />
                  </td>
                  <td>
                    <ToggleCell
                      value={directionMode[m.id] ?? "up"}
                      options={DIRECTION_OPTIONS}
                      onChange={v => setDirectionMode(prev => ({ ...prev, [m.id]: v }))}
                    />
                  </td>
                  <td>
                    <ToggleCell
                      value={banOrderMode[m.id] ?? "allow"}
                      options={BAN_OPTIONS}
                      onChange={v => setBanOrderMode(prev => ({ ...prev, [m.id]: v }))}
                    />
                  </td>
                  <td>
                    <ToggleCell
                      value={banWithdrawMode[m.id] ?? "allow"}
                      options={BAN_OPTIONS}
                      onChange={v => setBanWithdrawMode(prev => ({ ...prev, [m.id]: v }))}
                    />
                  </td>
                  <td style={{ color: "#888" }}>{m.agent_id}</td>
                  <td style={{ color: "#666", fontSize: 14, fontFamily: "monospace" }}>
                    {m.invite_code || "—"}
                  </td>
                  <td><Badge label={m.type} color="blue" /></td>
                  <td style={{ color: "#999", fontSize: 12 }}>{(m.register_time || "").replace("T", " ").replace(/\..*$/, "")}</td>
                  <td>
                    <div className="action-group">
                      <ActBtn label="✉发信"     color="blue"   onClick={() => { setSendTarget(m); setSendMode("single"); }} />
                      <ActBtn label="✎编辑"     color="blue"   onClick={() => setEditTarget(m)} />
                      <ActBtn label="↓下线"     color="blue"   onClick={() => kickOffline(m)} />
                      <ActBtn label="↑入款"     color="green"  onClick={() => { setFundMode("recharge"); setFundTarget(m); }} />
                      <ActBtn label="↓扣款"     color="red"    onClick={() => { setFundMode("deduct");   setFundTarget(m); }} />
                      <ActBtn label="⏸冻结"     color="blue"   onClick={() => { setFreezeMode("freeze");   setFreezeTarget(m); }} />
                      <ActBtn label="▶解冻"     color="teal"   onClick={() => { setFreezeMode("unfreeze"); setFreezeTarget(m); }} />
                      <ActBtn label="🔑登密"    color="orange" onClick={() => { setPwdType("login"); setPwdTarget(m); }} />
                      <ActBtn label="🏦资密"    color="blue"   onClick={() => { setPwdType("fund");  setPwdTarget(m); }} />
                      <ActBtn label="↔换组"     color="blue"   onClick={() => stubAction("换组", m)} />
                      {m.status === 1
                        ? <ActBtn label="禁用" color="red"  onClick={() => toggleStatus(m)} />
                        : <ActBtn label="启用" color="green" onClick={() => toggleStatus(m)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 翻页 */}
        <div className="pagination-bar">
          <span className="pagination-info">
            第 {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} 条,
            共 <strong style={{ color: "#1890ff" }}>{fmtNum(total)}</strong> 条记录
          </span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ 上一页</button>
            <span style={{ padding: "0 8px", fontSize: 14, color: "#555" }}>
              第 <strong>{page}</strong> / {totalPages} 页
            </span>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>下一页 ›</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            <select
              className="page-size-select"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={10}>10 条/页</option>
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
            <input
              className="page-jump-input"
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={e => {
                const p = Number(e.target.value);
                if (p >= 1 && p <= totalPages) setPage(p);
              }}
            />
            <button className="page-btn" onClick={() => setPage(p => p)}>跳转</button>
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      <EditMemberModal
        member={editTarget}
        winMode={editTarget ? winMode[editTarget.id] : undefined}
        direction={editTarget ? directionMode[editTarget.id] : undefined}
        banOrder={editTarget ? banOrderMode[editTarget.id] : undefined}
        banWithdraw={editTarget ? banWithdrawMode[editTarget.id] : undefined}
        onClose={() => setEditTarget(null)}
        onSave={saveMember}
      />

      {/* 入款 / 扣款 弹窗 */}
      <FundModal
        mode={fundMode}
        member={fundTarget}
        onClose={() => setFundTarget(null)}
        onDone={async (msg, kind) => {
          setToast({ text: msg, kind });
          setFundTarget(null);
          await load();
        }}
      />

      {/* 冻结 / 解冻 弹窗 */}
      <FreezeModal
        mode={freezeMode}
        member={freezeTarget}
        onClose={() => setFreezeTarget(null)}
        onDone={async (msg, kind) => {
          setToast({ text: msg, kind });
          setFreezeTarget(null);
          await load();
        }}
      />

      {/* 发信弹窗 */}
      {(sendTarget || sendMode === "broadcast") && (
        <SendMessageModal
          member={sendTarget}
          mode={sendMode}
          onClose={() => { setSendTarget(null); setSendMode("single"); }}
          onDone={(msg, kind) => {
            setToast({ text: msg, kind });
            setSendTarget(null);
            setSendMode("single");
          }}
        />
      )}

      {/* 重置密码弹窗(登密 / 资密) */}
      <ResetPwdModal
        type={pwdType}
        member={pwdTarget}
        onClose={() => setPwdTarget(null)}
        onDone={async (msg, kind) => {
          setToast({ text: msg, kind });
          setPwdTarget(null);
        }}
      />

      {/* 保存成功提示 */}
      {toast && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 2000,
          padding: "10px 20px",
          background: toast.kind === "ok" ? "#f6ffed" : "#fff1f0",
          border: `1px solid ${toast.kind === "ok" ? "#b7eb8f" : "#ffa39e"}`,
          color:      toast.kind === "ok" ? "#389e0d" : "#cf1322",
          borderRadius: 4, fontSize: 14, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          animation: "modalSlideUp .2s ease-out",
        }}>{toast.text}</div>
      )}
    </div>
  );
}

// ── 通用切换胶囊 + 三选项 ────────────────────────────────────────
type CellMode = string;

interface CellOption<T extends CellMode> {
  value: T;
  label: string;       // 胶囊里显示的文字
  color: string;       // 主色
  bg: string;
  border: string;
  chip: string;        // 胶囊右侧的可点击字
}

function ToggleCell<T extends CellMode>({ value, options, onChange }: {
  value: T;
  options: CellOption<T>[];
  onChange: (v: T) => void;
}) {
  const cfg = options.find(o => o.value === value) ?? options[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        display: "inline-flex", alignItems: "center",
        padding: "2px 10px", borderRadius: 10,
        background: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: 14, fontWeight: 600,
        whiteSpace: "nowrap",
      }}>{cfg.label}</span>
      <span style={{ display: "inline-flex", gap: 2, fontSize: 12 }}>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              title={opt.label}
              style={{
                cursor: "pointer",
                padding: "2px 5px",
                border: "none", borderRadius: 3,
                background: active ? "#e6f4ff" : "transparent",
                color: active ? "#1890ff" : "#888",
                fontWeight: active ? 700 : 400,
                fontSize: 14,
                textDecoration: active ? "underline" : "none",
              }}
            >{opt.chip}</button>
          );
        })}
      </span>
    </div>
  );
}

const WIN_MODE_OPTIONS: CellOption<"win" | "lose" | "random">[] = [
  { value: "win",    label: "要赢", chip: "赢", color: "#f5222d", bg: "#fff1f0", border: "#ffa39e" },
  { value: "lose",   label: "要输", chip: "输", color: "#52c41a", bg: "#f6ffed", border: "#b7eb8f" },
  { value: "random", label: "随机", chip: "随", color: "#d48806", bg: "#fffbe6", border: "#ffe58f" },
];

const DIRECTION_OPTIONS: CellOption<"up" | "down">[] = [
  { value: "up",   label: "看涨", chip: "涨", color: "#52c41a", bg: "#f6ffed", border: "#b7eb8f" },
  { value: "down", label: "看跌", chip: "跌", color: "#f5222d", bg: "#fff1f0", border: "#ffa39e" },
];

const BAN_OPTIONS: CellOption<"allow" | "ban">[] = [
  { value: "allow", label: "不禁", chip: "不禁", color: "#52c41a", bg: "#f6ffed", border: "#b7eb8f" },
  { value: "ban",   label: "禁止", chip: "禁止", color: "#f5222d", bg: "#fff1f0", border: "#ffa39e" },
];

// ── 编辑会员弹窗 ────────────────────────────────────────────────
// 扩展 Member,加前端可编辑的字段(后端尚未落库,只在本地 state 保留)
type MemberEx = Member & {
  nickname?: string;
  phone?:    string;
  email?:    string;
  gender?:   "男" | "女";
  remark?:   string;
};

interface EditFormData {
  account:     string;
  nickname:    string;
  phone:       string;
  email:       string;
  credit:      string;
  level:       string;
  winMode:     "win" | "lose" | "random";
  direction:   "up" | "down";
  banOrder:    "allow" | "ban";
  banWithdraw: "allow" | "ban";
  gender:      "男" | "女";
  status:      "启用" | "禁用";
  remark:      string;
}

/**
 * FundModal — 后台入款 / 扣款弹窗
 *
 * Props:
 *  - mode:   "recharge" 加钱 | "deduct" 扣钱
 *  - member: 当前操作的会员(null = 关闭)
 *  - onClose: 关闭弹窗
 *  - onDone:  (toastMsg, kind) => void   // 提交成功后回调,父组件刷新列表
 */

// ─── 发信弹窗 ──────────────────────────────────────────────────────────────
// 标题:左上角"发信" + 右上角 ➖◻✕
// 表单:标题 / 详情(均带红色必填 *)
// 底部:✔ 保存(绿)/ 关闭(红)
type SendMode = "single" | "broadcast";   // 单发 / 全员广播

function SendMessageModal({ member, mode = "single", onClose, onDone }: {
  member: Member | null;
  mode?: SendMode;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "err") => void;
}) {
  const [title,    setTitle]    = useState("");
  const [content,  setContent]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"normal" | "min" | "max">("normal");

  if (!member && mode !== "broadcast") return null;

  const TITLE_MAX = 128;
  const CONTENT_MAX = 1024;

  const titleLen    = title.length;
  const contentLen  = content.length;
  const titleOver   = titleLen    > TITLE_MAX;
  const contentOver = contentLen  > CONTENT_MAX;

  const submit = async () => {
    setErr(null);
    if (!title.trim())  { setErr("请填写标题"); return; }
    if (!content.trim()){ setErr("请填写详情"); return; }
    if (titleOver)      { setErr(`标题超过最大长度 ${TITLE_MAX}`); return; }
    if (contentOver)    { setErr(`详情超过最大长度 ${CONTENT_MAX}`); return; }
    setSubmitting(true);
    try {
      const payload: any = { title: title.trim(), content: content.trim(), sender: "admin" };
      if (mode === "single" && member) payload.member_id = member.id;
      // 广播:不传 member_id
      const r = await api.sendMessage(payload);
      onDone(
        `✔ 发信成功 ${mode === "broadcast" ? "(全员广播)" : `→ ${member?.account}`} (#${r.id})`,
        "ok",
      );
      setTitle(""); setContent("");
    } catch (e: any) {
      setErr(e.message || "发送失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 窗口尺寸 — 正常 / 最小化 / 最大化
  const wrapStyle: React.CSSProperties = view === "max" ? {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "stretch", justifyContent: "stretch",
    padding: 0,
  } : {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const cardStyle: React.CSSProperties = view === "max" ? {
    width: "100vw", height: "100vh", background: "#fff",
    display: "flex", flexDirection: "column",
    boxShadow: "0 12px 48px rgba(0,0,0,.25)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } : view === "min" ? {
    width: 320, background: "#fff", borderRadius: 8,
    boxShadow: "0 12px 48px rgba(0,0,0,.25)",
    overflow: "hidden",
    fontFamily: "system-ui, -apple-system, sans-serif",
    // min 只剩标题栏:body 不渲染,footer 不渲染
  } : {
    width: 520, background: "#fff", borderRadius: 8,
    boxShadow: "0 12px 48px rgba(0,0,0,.25)",
    overflow: "hidden",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  return (
    <div onClick={onClose} style={wrapStyle}>
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>
        {/* 标题栏 */}
        <div style={{
          height: 44, padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fafafa", borderBottom: "1px solid #f0f0f0",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
            发信 {mode === "broadcast" && <span style={{ color: "#1890ff", fontWeight: 400, marginLeft: 6 }}>(全员广播)</span>}
            {mode === "single" && member && <span style={{ color: "#888", fontWeight: 400, marginLeft: 6 }}>→ {member.account}</span>}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setView(view === "min" ? "normal" : "min")}
              title="最小化"
              style={{
                width: 28, height: 28, borderRadius: 4, border: "none",
                background: "transparent", color: "#888",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 17, fontWeight: 700,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >−</button>
            <button
              onClick={() => setView(view === "max" ? "normal" : "max")}
              title="最大化"
              style={{
                width: 28, height: 28, borderRadius: 4, border: "none",
                background: "transparent", color: "#888",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >▢</button>
            <button
              onClick={onClose}
              title="关闭"
              style={{
                width: 28, height: 28, borderRadius: 4, border: "none",
                background: "transparent", color: "#888",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff1f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >×</button>
          </div>
        </div>

        {view !== "min" && (
          <>
            {/* 主体 */}
            <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
              {/* 标题 */}
              <label style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#555", marginBottom: 6 }}>
                <span>标题 <span style={{ color: "#f5222d" }}>*</span></span>
                <span style={{ color: titleOver ? "#f5222d" : "#888", fontSize: 13 }}>
                  {titleLen}/{TITLE_MAX}
                </span>
              </label>
              <input
                type="text"
                value={title}
                placeholder="最大长度:128"
                maxLength={TITLE_MAX + 50}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                style={{
                  width: "100%", padding: "10px 12px", marginBottom: 16,
                  border: `1px solid ${titleOver ? "#f5222d" : "#d9d9d9"}`,
                  borderRadius: 4, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />

              {/* 详情 */}
              <label style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#555", marginBottom: 6 }}>
                <span>详情 <span style={{ color: "#f5222d" }}>*</span></span>
                <span style={{ color: contentOver ? "#f5222d" : "#888", fontSize: 13 }}>
                  {contentLen}/{CONTENT_MAX}
                </span>
              </label>
              <textarea
                value={content}
                placeholder="最大长度:1024"
                maxLength={CONTENT_MAX + 50}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
                rows={6}
                style={{
                  width: "100%", padding: "10px 12px", marginBottom: 4,
                  border: `1px solid ${contentOver ? "#f5222d" : "#d9d9d9"}`,
                  borderRadius: 4, fontSize: 14, outline: "none",
                  resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                  minHeight: 120,
                }}
              />

              {err && (
                <div style={{
                  marginTop: 10, padding: "8px 12px",
                  background: "#fff1f0", border: "1px solid #ffa39e",
                  borderRadius: 4, color: "#cf1322", fontSize: 14,
                }}>{err}</div>
              )}
            </div>

            {/* 底部 */}
            <div style={{
              padding: "12px 24px",
              background: "#fafafa", borderTop: "1px solid #f0f0f0",
              display: "flex", justifyContent: "space-between", gap: 10,
              flexShrink: 0,
            }}>
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  padding: "8px 22px",
                  border: "none", borderRadius: 4,
                  background: "#52c41a", color: "white",
                  fontSize: 14, fontWeight: 600,
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >{submitting ? "提交中…" : "✔ 保存"}</button>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: "8px 22px",
                  border: "none", borderRadius: 4,
                  background: "#f5222d", color: "white",
                  fontSize: 14, fontWeight: 600,
                  cursor: "pointer",
                }}
              >关闭</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FundModal({
  mode,
  member,
  onClose,
  onDone,
}: {
  mode: "recharge" | "deduct";
  member: Member | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "err") => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes,  setNotes]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!member) return null;

  const isRecharge = mode === "recharge";
  const accent = isRecharge ? "#52c41a" : "#f5222d";
  const title  = isRecharge ? "↑ 后台入款" : "↓ 后台扣款";
  const submitLabel = isRecharge ? "确认入款" : "确认扣款";

  const submit = async () => {
    setErr(null);
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) {
      setErr("金额必须为正数");
      return;
    }
    if (!notes.trim()) {
      setErr("请填写备注(资金明细需要)");
      return;
    }
    setSubmitting(true);
    try {
      const r = isRecharge
        ? await api.rechargeMember(member.id, n, notes.trim(), "admin")
        : await api.deductMember   (member.id, n, notes.trim(), "admin");
      onDone(
        `✔ ${isRecharge ? "入款" : "扣款"}成功 ${member.account} ${n.toFixed(2)} (余 ${Number(r.after).toFixed(2)})`,
        "ok",
      );
      setAmount(""); setNotes("");
    } catch (e: any) {
      setErr(e.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420, background: "#fff", borderRadius: 8,
          boxShadow: "0 12px 48px rgba(0,0,0,.25)",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* 标题栏 */}
        <div style={{
          height: 44, padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fafafa", borderBottom: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              border: "none", background: "transparent",
              fontSize: 13, cursor: "pointer", color: "#888",
            }}
          >×</button>
        </div>

        {/* 主体 */}
        <div style={{ padding: 24 }}>
          {/* 会员信息 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", marginBottom: 18,
            background: "#f5f5f5", borderRadius: 6,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #1890ff, #096dd9)",
              color: "white", fontSize: 17, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{member.account.slice(0, 1).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
                {member.account}
              </div>
              <div style={{ fontSize: 14, color: "#888" }}>
                当前余额: {Number(member.balance).toFixed(2)} USDT
              </div>
            </div>
          </div>

          {/* 金额 */}
          <label style={{ display: "block", fontSize: 14, color: "#555", marginBottom: 6 }}>
            金额(USDT) <span style={{ color: "#f5222d" }}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            placeholder="请输入金额,例如 100.00"
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 14,
              border: "1px solid #d9d9d9", borderRadius: 4,
              fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
          />

          {/* 备注 */}
          <label style={{ display: "block", fontSize: 14, color: "#555", marginBottom: 6 }}>
            备注 <span style={{ color: "#f5222d" }}>*</span>
          </label>
          <textarea
            value={notes}
            placeholder="例如:VIP奖励 / 风控扣款 / 客户投诉退款"
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={3}
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 4,
              border: "1px solid #d9d9d9", borderRadius: 4,
              fontSize: 14, outline: "none", resize: "vertical",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          />

          {/* 错误提示 */}
          {err && (
            <div style={{
              marginTop: 10, padding: "8px 12px",
              background: "#fff1f0", border: "1px solid #ffa39e",
              borderRadius: 4, color: "#cf1322", fontSize: 14,
            }}>{err}</div>
          )}
        </div>

        {/* 底部 */}
        <div style={{
          padding: "12px 24px",
          background: "#fafafa", borderTop: "1px solid #f0f0f0",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "8px 18px",
              border: "1px solid #d9d9d9", borderRadius: 4,
              background: "white", color: "#555",
              fontSize: 14, cursor: "pointer",
            }}
          >取消</button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: "8px 22px",
              border: "none", borderRadius: 4,
              background: accent, color: "white",
              fontSize: 14, fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >{submitting ? "提交中…" : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

function FreezeModal({
  mode,
  member,
  onClose,
  onDone,
}: {
  mode: "freeze" | "unfreeze";
  member: Member | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "err") => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes,  setNotes]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!member) return null;

  const isFreeze = mode === "freeze";
  const accent = isFreeze ? "#1890ff" : "#13c2c2";
  const title  = isFreeze ? "⏸ 资金冻结" : "▶ 资金解冻";
  const submitLabel = isFreeze ? "确认冻结" : "确认解冻";
  const balance = Number(member.balance);
  const frozen  = Number(member.frozen);
  const maxAvail = isFreeze ? balance : frozen;

  const submit = async () => {
    setErr(null);
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) {
      setErr("金额必须为正数");
      return;
    }
    if (n > maxAvail + 0.0001) {
      setErr(isFreeze
        ? `可用余额不足,当前 ${balance.toFixed(2)}`
        : `冻结余额不足,当前 ${frozen.toFixed(2)}`);
      return;
    }
    if (!notes.trim()) {
      setErr("请填写备注");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.freezeMember(member.id, n, notes.trim(), mode, "admin");
      onDone(
        `✔ ${isFreeze ? "冻结" : "解冻"}成功 ${member.account} ${n.toFixed(2)} ` +
        `(可用 ${Number(r.balance).toFixed(2)} | 冻结 ${Number(r.frozen).toFixed(2)})`,
        "ok",
      );
      setAmount(""); setNotes("");
    } catch (e: any) {
      setErr(e.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const setAll = () => {
    setErr(null);
    setAmount(maxAvail > 0 ? maxAvail.toFixed(2) : "");
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420, background: "#fff", borderRadius: 8,
          boxShadow: "0 12px 48px rgba(0,0,0,.25)",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* 标题栏 */}
        <div style={{
          height: 44, padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fafafa", borderBottom: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              border: "none", background: "transparent",
              fontSize: 13, cursor: "pointer", color: "#888",
            }}
          >×</button>
        </div>

        {/* 主体 */}
        <div style={{ padding: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", marginBottom: 18,
            background: "#f5f5f5", borderRadius: 6,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #1890ff, #096dd9)",
              color: "white", fontSize: 17, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{member.account.slice(0, 1).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
                {member.account}
              </div>
              <div style={{ fontSize: 14, color: "#888" }}>
                可用余额: {balance.toFixed(2)} USDT · 冻结余额: {frozen.toFixed(2)} USDT
              </div>
            </div>
          </div>

          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#555", marginBottom: 6 }}>
            <span>{isFreeze ? "冻结金额" : "解冻金额"} (USDT) <span style={{ color: "#f5222d" }}>*</span></span>
            <span style={{ color: "#888", fontSize: 13 }}>
              可{isFreeze ? "冻结" : "解冻"} {maxAvail.toFixed(2)}{" "}
              <button
                onClick={setAll}
                style={{
                  border: "none", background: "transparent",
                  color: "#1890ff", cursor: "pointer", fontSize: 14,
                  padding: 0, marginLeft: 4,
                }}
              >全部</button>
            </span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            placeholder={`请输入${isFreeze ? "冻结" : "解冻"}金额`}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 14,
              border: "1px solid #d9d9d9", borderRadius: 4,
              fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
          />

          <label style={{ display: "block", fontSize: 14, color: "#555", marginBottom: 6 }}>
            备注 <span style={{ color: "#f5222d" }}>*</span>
          </label>
          <textarea
            value={notes}
            placeholder={isFreeze ? "例如:风控冻结 / 客诉冻结 / 提现冻结" : "例如:风控解除 / 案件结束 / 资金归还"}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={3}
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 4,
              border: "1px solid #d9d9d9", borderRadius: 4,
              fontSize: 14, outline: "none", resize: "vertical",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          />

          {err && (
            <div style={{
              marginTop: 10, padding: "8px 12px",
              background: "#fff1f0", border: "1px solid #ffa39e",
              borderRadius: 4, color: "#cf1322", fontSize: 14,
            }}>{err}</div>
          )}
        </div>

        <div style={{
          padding: "12px 24px",
          background: "#fafafa", borderTop: "1px solid #f0f0f0",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "8px 18px",
              border: "1px solid #d9d9d9", borderRadius: 4,
              background: "white", color: "#555",
              fontSize: 14, cursor: "pointer",
            }}
          >取消</button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: "8px 22px",
              border: "none", borderRadius: 4,
              background: accent, color: "white",
              fontSize: 14, fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >{submitting ? "提交中…" : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── 重置密码弹窗(登密 / 资密) ─────────────────────────────────────────────
type PwdType = "login" | "fund";

function ResetPwdModal({ type, member, onClose, onDone }: {
  type: PwdType;
  member: Member | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "err") => void;
}) {
  const [pwd, setPwd]             = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]              = useState<string | null>(null);
  const [showPwd, setShowPwd]      = useState(false);

  const isLogin = type === "login";
  // 登录密码 6-32 位任意字符,资金密码 6 位数字
  const re       = isLogin ? /^.{6,32}$/ : /^\d{6}$/;
  const accent   = isLogin ? "#fa8c16" : "#1890ff";
  const title    = isLogin ? "🔑 重置登录密码" : "🏦 重置资金密码";
  const hint     = isLogin
    ? "登录密码 6-32 位任意字符(中英文数字符号均可)"
    : "资金密码必须是 6 位纯数字,用于提现/改密等敏感操作";
  const placeholder = isLogin ? "6-32 位任意字符" : "6 位数字";
  const submitLabel  = isLogin ? "✔ 确认重置登录密码" : "✔ 确认重置资金密码";
  const successVerb  = isLogin ? "重置登录密码" : "重置资金密码";

  const pwdOk      = pwd.length > 0 && re.test(pwd);
  const confirmOk  = pwd === pwdConfirm && pwd.length > 0;
  const canSubmit  = pwdOk && confirmOk && !submitting;

  // 每次打开/换会员时重置(必须在 early return 之前,保证 hooks 顺序稳定)
  useEffect(() => {
    setPwd(""); setPwdConfirm(""); setErr(null); setShowPwd(false);
  }, [member?.id, type]);

  // ✅ 所有 hooks 都调用完,才允许 early return
  if (!member) return null;

  const submit = async () => {
    setErr(null);
    if (!pwdOk)   { setErr(isLogin ? "登录密码长度需 6-32 位" : "资金密码必须是 6 位数字"); return; }
    if (!confirmOk){ setErr("两次输入不一致"); return; }
    setSubmitting(true);
    try {
      if (isLogin) await api.resetLoginPassword(member.id, pwd, "admin");
      else         await api.resetFundPassword (member.id, pwd, "admin");
      onDone(`✔ ${successVerb}成功 ${member.account}`, "ok");
      setPwd(""); setPwdConfirm("");
    } catch (e: any) {
      setErr(e.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460, background: "#fff", borderRadius: 8,
          boxShadow: "0 12px 48px rgba(0,0,0,.25)",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* 标题栏 */}
        <div style={{
          height: 44, padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fafafa", borderBottom: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              border: "none", background: "transparent",
              fontSize: 13, cursor: "pointer", color: "#888",
            }}
          >×</button>
        </div>

        {/* 主体 */}
        <div style={{ padding: 24 }}>
          {/* 会员信息 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", marginBottom: 18,
            background: "#f5f5f5", borderRadius: 6,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #1890ff, #096dd9)",
              color: "white", fontSize: 17, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{member.account.slice(0, 1).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
                {member.account}
              </div>
              <div style={{ fontSize: 14, color: "#888" }}>ID: #{member.id}</div>
            </div>
          </div>

          {/* 警示提示 */}
          <div style={{
            marginBottom: 16, padding: "8px 12px",
            background: isLogin ? "#fff7e6" : "#e6f7ff",
            border: `1px solid ${isLogin ? "#ffd591" : "#91d5ff"}`,
            borderRadius: 4, fontSize: 13,
            color: isLogin ? "#d46b08" : "#096dd9",
          }}>
            ⚠ {hint}
          </div>

          {/* 新密码 */}
          <label style={{ display: "block", fontSize: 14, color: "#555", marginBottom: 6 }}>
            新密码 <span style={{ color: "#f5222d" }}>*</span>
            {pwd.length > 0 && (
              <span style={{ float: "right", fontSize: 13, color: pwdOk ? "#52c41a" : "#f5222d" }}>
                {pwdOk ? "✓ 格式正确" : (isLogin ? "格式错误(6-32 位)" : "格式错误(6 位数字)")}
              </span>
            )}
          </label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              type={showPwd ? "text" : "password"}
              value={pwd}
              placeholder={placeholder}
              onChange={(e) => setPwd(e.target.value)}
              disabled={submitting}
              autoFocus
              style={{
                width: "100%", padding: "10px 38px 10px 12px",
                border: `1px solid ${pwd.length > 0 && !pwdOk ? "#f5222d" : "#d9d9d9"}`,
                borderRadius: 4, fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              tabIndex={-1}
              style={{
                position: "absolute", right: 8, top: "50%",
                transform: "translateY(-50%)",
                background: "transparent", border: "none",
                cursor: "pointer", padding: 4, color: "#888",
                fontSize: 12,
              }}
            >{showPwd ? "🙈" : "👁"}</button>
          </div>

          {/* 确认密码 */}
          <label style={{ display: "block", fontSize: 14, color: "#555", marginBottom: 6 }}>
            确认密码 <span style={{ color: "#f5222d" }}>*</span>
            {pwdConfirm.length > 0 && (
              <span style={{ float: "right", fontSize: 13, color: confirmOk ? "#52c41a" : "#f5222d" }}>
                {confirmOk ? "✓ 一致" : "✗ 不一致"}
              </span>
            )}
          </label>
          <input
            type={showPwd ? "text" : "password"}
            value={pwdConfirm}
            placeholder="再输入一次"
            onChange={(e) => setPwdConfirm(e.target.value)}
            disabled={submitting}
            onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) submit(); }}
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 4,
              border: `1px solid ${pwdConfirm.length > 0 && !confirmOk ? "#f5222d" : "#d9d9d9"}`,
              borderRadius: 4, fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
          />

          {err && (
            <div style={{
              marginTop: 10, padding: "8px 12px",
              background: "#fff1f0", border: "1px solid #ffa39e",
              borderRadius: 4, color: "#cf1322", fontSize: 14,
            }}>{err}</div>
          )}
        </div>

        {/* 底部 */}
        <div style={{
          padding: "12px 24px",
          background: "#fafafa", borderTop: "1px solid #f0f0f0",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "8px 18px",
              border: "1px solid #d9d9d9", borderRadius: 4,
              background: "white", color: "#555",
              fontSize: 14, cursor: "pointer",
            }}
          >取消</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              padding: "8px 22px",
              border: "none", borderRadius: 4,
              background: accent, color: "white",
              fontSize: 14, fontWeight: 600,
              cursor: canSubmit ? "pointer" : "default",
              opacity: canSubmit ? 1 : 0.6,
            }}
          >{submitting ? "提交中…" : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

function EditMemberModal({ member, onClose, onSave,
  winMode: winInit, direction: dirInit,
  banOrder: banOrderInit, banWithdraw: banWithdrawInit }: {
  member: Member | null;
  onClose: () => void;
  onSave: (data: EditFormData) => void;
  // 来自 MembersPage 的当前 ToggleCell 状态,用于回填表单
  winMode?:     "win" | "lose" | "random";
  direction?:   "up" | "down";
  banOrder?:    "allow" | "ban";
  banWithdraw?: "allow" | "ban";
}) {
  const [mode, setMode] = useState<"normal" | "min" | "max">("normal");
  const [data, setData] = useState<EditFormData>({
    account: "", nickname: "", phone: "", email: "",
    credit: "", level: "",
    winMode: "win", direction: "up", banOrder: "allow", banWithdraw: "allow",
    gender: "男", status: "启用", remark: "",
  });
  const [touched, setTouched] = useState(false);

  // 切换会员时重置表单
  useEffect(() => {
    if (!member) return;
    setData({
      account: member.account,
      nickname: (member as MemberEx).nickname || "",
      phone:    (member as MemberEx).phone    || "",
      email:    (member as MemberEx).email    || "",
      credit:   String(member.credit || ""),
      level:    String(member.tag || ""),
      winMode:     winInit     ?? "win",
      direction:   dirInit      ?? "up",
      banOrder:    banOrderInit ?? (member.ban_order   ? "ban" : "allow"),
      banWithdraw: banWithdrawInit ?? (member.ban_withdraw ? "ban" : "allow"),
      gender: (member as MemberEx).gender || "男",
      status: member.status === 1 ? "启用" : "禁用",
      remark: (member as MemberEx).remark || "",
    });
    setTouched(false);
    setMode("normal");
  }, [member?.id, winInit, dirInit, banOrderInit, banWithdrawInit]);

  // ESC 关闭(必须在 early return 之前,保证 hooks 顺序稳定)
  useEffect(() => {
    if (!member) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, member]);

  if (!member) return null;

  const setField = <K extends keyof EditFormData>(k: K, v: EditFormData[K]) =>
    setData(prev => ({ ...prev, [k]: v }));

  // 必填校验
  const required: (keyof EditFormData)[] = [
    "nickname","phone","email","credit","level",
    "winMode","direction","banOrder","banWithdraw","gender","status","remark",
  ];
  const errs: Partial<Record<keyof EditFormData, string>> = {};
  if (touched) {
    for (const k of required) {
      const v = data[k];
      if (typeof v === "string" && !v.trim()) errs[k] = "必填";
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = "邮箱格式不正确";
    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) errs.phone = "手机号格式不正确";
  }

  const handleSubmit = () => {
    setTouched(true);
    if (Object.keys(errs).length === 0) onSave(data);
  };

  // 容器尺寸
  const containerStyle: CSSProperties = mode === "max"
    ? { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", borderRadius: 0 }
    : mode === "min"
    ? { position: "fixed", right: 24, bottom: 24, width: 280, height: 44, overflow: "hidden" }
    : { position: "relative", width: 720, height: 540 };

  const initial = (member.account || "?").charAt(0).toUpperCase();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "modalFadeIn .15s ease-out",
      }}
    >
      <div
        className="edit-modal"
        onClick={e => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 6,
          boxShadow: "0 12px 48px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: mode === "normal" ? "modalSlideUp .2s ease-out" : undefined,
          ...containerStyle,
        }}
      >
        {/* 标题栏 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 44, padding: "0 12px 0 18px",
          background: "linear-gradient(180deg, #fafafa, #f0f0f0)",
          borderBottom: "1px solid var(--border)",
          cursor: "default", userSelect: "none",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>✎</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>编辑</span>
            <span style={{ fontSize: 14, color: "#999", marginLeft: 6 }}>
              #{member.id} · {member.account}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { icon: "➖", tip: "最小化", action: () => setMode(mode === "min" ? "normal" : "min") },
              { icon: "◻",  tip: "最大化", action: () => setMode(mode === "max" ? "normal" : "max") },
              { icon: "✕",  tip: "关闭",   action: onClose, danger: true },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                title={btn.tip}
                style={{
                  width: 28, height: 28, padding: 0,
                  background: "transparent",
                  border: "none", borderRadius: 4,
                  color: (btn as any).danger ? "#f5222d" : "#666",
                  fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = (btn as any).danger ? "#fff1f0" : "#e6f4ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >{btn.icon}</button>
            ))}
          </div>
        </div>

        {/* 主体 — 最小化时收起 */}
        {mode !== "min" && (
          <>
            <div style={{
              flex: 1, display: "flex", gap: 28,
              padding: "24px 28px",
              overflow: "auto",
              background: "#fff",
            }}>
              {/* 左侧大头头像 */}
              <div style={{
                width: 160, flexShrink: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 10,
                paddingTop: 4,
              }}>
                <div style={{
                  width: 100, height: 100, borderRadius: "50%",
                  background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
                  color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 38, fontWeight: 600,
                  boxShadow: "0 4px 14px rgba(24,144,255,0.35)",
                  letterSpacing: 1,
                }}>{initial}</div>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "#333",
                  maxWidth: 140, textAlign: "center",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{member.account}</div>
                <div style={{ fontSize: 14, color: "#999" }}>ID: #{member.id}</div>
                <div style={{
                  marginTop: 6, fontSize: 14, color: "#888",
                  padding: "4px 10px", borderRadius: 10,
                  background: member.status === 1 ? "#f6ffed" : "#fff1f0",
                  color:      member.status === 1 ? "#52c41a" : "#f5222d",
                  border: `1px solid ${member.status === 1 ? "#b7eb8f" : "#ffa39e"}`,
                }}>{member.status === 1 ? "● 正常" : "● 禁用"}</div>
              </div>

              {/* 右侧表单 — 两列 grid */}
              <div style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 16, rowGap: 14,
                alignContent: "start",
              }}>
                <Field label="账号" required={false}>
                  <input
                    value={data.account}
                    readOnly
                    style={{
                      width: "100%", padding: "7px 10px",
                      border: "1px solid #d9d9d9", borderRadius: 4,
                      background: "#f5f5f5", color: "#666",
                      fontSize: 14, outline: "none",
                      cursor: "not-allowed",
                    }}
                  />
                </Field>
                <Field label="昵称">
                  <input
                    value={data.nickname}
                    onChange={e => setField("nickname", e.target.value)}
                    placeholder="请输入昵称"
                    style={inputStyle(!!errs.nickname)}
                  />
                </Field>
                <Field label="手机">
                  <input
                    value={data.phone}
                    onChange={e => setField("phone", e.target.value)}
                    placeholder="11 位手机号"
                    style={inputStyle(!!errs.phone)}
                  />
                </Field>
                <Field label="邮箱">
                  <input
                    value={data.email}
                    onChange={e => setField("email", e.target.value)}
                    placeholder="example@x.com"
                    style={inputStyle(!!errs.email)}
                  />
                </Field>
                <Field label="信誉">
                  <input
                    value={data.credit}
                    onChange={e => setField("credit", e.target.value)}
                    style={inputStyle(!!errs.credit)}
                  />
                </Field>
                <Field label="等级">
                  <input
                    value={data.level}
                    onChange={e => setField("level", e.target.value)}
                    style={inputStyle(!!errs.level)}
                  />
                </Field>
                <Field label="输赢">
                  <select
                    value={data.winMode}
                    onChange={e => setField("winMode", e.target.value as any)}
                    style={inputStyle(!!errs.winMode)}
                  >
                    {WIN_MODE_OPTIONS.map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>
                    )}
                  </select>
                </Field>
                <Field label="方向">
                  <select
                    value={data.direction}
                    onChange={e => setField("direction", e.target.value as any)}
                    style={inputStyle(!!errs.direction)}
                  >
                    {DIRECTION_OPTIONS.map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>
                    )}
                  </select>
                </Field>
                <Field label="禁单">
                  <select
                    value={data.banOrder}
                    onChange={e => setField("banOrder", e.target.value as any)}
                    style={inputStyle(!!errs.banOrder)}
                  >
                    {BAN_OPTIONS.map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>
                    )}
                  </select>
                </Field>
                <Field label="禁提">
                  <select
                    value={data.banWithdraw}
                    onChange={e => setField("banWithdraw", e.target.value as any)}
                    style={inputStyle(!!errs.banWithdraw)}
                  >
                    {BAN_OPTIONS.map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>
                    )}
                  </select>
                </Field>
                <Field label="性别">
                  <select
                    value={data.gender}
                    onChange={e => setField("gender", e.target.value as any)}
                    style={inputStyle(!!errs.gender)}
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </Field>
                <Field label="状态">
                  <select
                    value={data.status}
                    onChange={e => setField("status", e.target.value as any)}
                    style={inputStyle(!!errs.status)}
                  >
                    <option value="启用">启用</option>
                    <option value="禁用">禁用</option>
                  </select>
                </Field>
                {/* 备注 — 跨两列 */}
                <div style={{ gridColumn: "1 / span 2" }}>
                  <Field label="备注">
                    <textarea
                      value={data.remark}
                      onChange={e => setField("remark", e.target.value)}
                      placeholder="备注"
                      rows={3}
                      style={{
                        ...inputStyle(!!errs.remark),
                        resize: "vertical", minHeight: 64,
                        fontFamily: "inherit",
                      }}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* 底部 */}
            <div style={{
              display: "flex", alignItems: "center",
              padding: "12px 18px",
              borderTop: "1px solid var(--border)",
              background: "#fafafa",
              flexShrink: 0,
            }}>
              <div style={{ flex: 1 }}>
                {touched && Object.keys(errs).length > 0 && (
                  <span style={{ fontSize: 14, color: "#f5222d" }}>
                    ⚠ 有 {Object.keys(errs).length} 项需要填写
                  </span>
                )}
              </div>
              <button
                onClick={handleSubmit}
                style={{
                  padding: "8px 22px",
                  background: "linear-gradient(180deg, #73d13d, #52c41a)",
                  color: "white", border: "none", borderRadius: 4,
                  fontSize: 14, fontWeight: 600,
                  cursor: "pointer", marginRight: 10,
                  display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 4px rgba(82,196,26,0.3)",
                }}
              >
                <span style={{ fontSize: 14 }}>✔</span> 保存
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 22px",
                  background: "linear-gradient(180deg, #ff7875, #f5222d)",
                  color: "white", border: "none", borderRadius: 4,
                  fontSize: 14, fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 4px rgba(245,34,45,0.3)",
                }}
              >
                <span style={{ fontSize: 14 }}>✕</span> 关闭
              </button>
            </div>
          </>
        )}

        {/* 最小化时只显示标题栏,内容区域变成空白 */}
        {mode === "min" && (
          <div style={{ flex: 1, background: "#fafafa" }} />
        )}
      </div>

      <style>{`
        @keyframes modalFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalSlideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}

function Field({ label, required = true, children }: {
  label: string; required?: boolean; children: ReactNode;
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 14, color: "#555", marginBottom: 5,
        fontWeight: 500,
      }}>
        {label}
        {required && <span style={{ color: "#f5222d", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function inputStyle(err: boolean): CSSProperties {
  return {
    width: "100%", padding: "7px 10px",
    border: `1px solid ${err ? "#ff7875" : "#d9d9d9"}`,
    borderRadius: 4, fontSize: 14, color: "#333",
    outline: "none", boxSizing: "border-box",
    background: "white",
  };
}

function DigitalWalletPage() {
  const [rows, setRows] = useState<DigitalWalletRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [member, setMember] = useState("");
  const [type1, setType1] = useState("");
  const [editing, setEditing] = useState<DigitalWalletRow | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 500 };
      if (member.trim()) params.member_account = member.trim();
      const res = await api.listDigitalWallets(params);
      const filtered = type1 ? res.data.filter((d) => d.type1 === type1) : res.data;
      setRows(filtered);
      setTotal(filtered.length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [member, type1]);

  useEffect(() => { reload(); }, [reload]);

  const start = (page - 1) * perPage;
  const paged = rows.slice(start, start + perPage);

  const reset = () => { setMember(""); setType1(""); setPage(1); };

  return (
    <div className="page-container">
      <div className="filter-bar">
        <span className="filter-label">会员账号：</span>
        <input className="filter-input" style={{ width: 140 }} placeholder="会员账号"
          value={member} onChange={(e) => setMember(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <span className="filter-label">币种：</span>
        <select className="filter-select" value={type1} onChange={(e) => { setType1(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="USDT">USDT</option>
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
        </select>
        <button className="btn btn-primary" onClick={() => setPage(1)}>🔍 搜索</button>
        <button className="btn btn-warning" onClick={reset}>↺ 重置</button>
      </div>
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>会员</th>
                <th>币种</th>
                <th>网络</th>
                <th>钱包地址</th>
                <th>默认</th>
                <th>备注</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#888" }}>加载中...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#888" }}>暂无记录</td></tr>
              ) : paged.map((d) => (
                <tr key={d.id}>
                  <td style={{ color: "#888" }}>{d.id}</td>
                  <td className="link-cell">
                    <div>{d.member_account || `#${d.member_id}`}</div>
                  </td>
                  <td><Badge label={d.type1} color={d.type1 === "USDT" ? "teal" : "orange"} /></td>
                  <td><Badge label={d.type2} color="gray" /></td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
                    {d.address}
                  </td>
                  <td>{d.is_default === 1 ? <Badge label="默认" color="gold" /> : <span style={{ color: "#999" }}>-</span>}</td>
                  <td style={{ color: "#999", fontSize: 12 }}>{d.notes}</td>
                  <td style={{ color: "#888", fontSize: 11 }}>{d.created_at}</td>
                  <td><ActBtn label="✎ 编辑" color="teal" onClick={() => setEditing(d)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} perPage={perPage} page={page}
          onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
      </div>

      {editing && (
        <DigitalWalletEditModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function DigitalWalletEditModal({ row, onClose, onSaved }: { row: DigitalWalletRow; onClose: () => void; onSaved: () => void; }) {
  const [type2, setType2] = useState(row.type2);
  const [address, setAddress] = useState(row.address);
  const [notes, setNotes] = useState(row.notes);
  const [isDefault, setIsDefault] = useState(row.is_default === 1);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await fetch(`/api/members/${row.member_id}/wallets/digital/${row.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type1: row.type1, type2, address, notes, is_default: isDefault ? 1 : 0 }),
      }).then(async (r) => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `HTTP ${r.status}`); }
      });
      alert("已保存");
      onSaved();
    } catch (e: any) { alert("保存失败: " + (e?.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={modalBackdropStyle} onClick={() => !busy && onClose()}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px" }}>编辑数字币钱包 #{row.id}</h3>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
          会员: <strong>{row.member_account || `#${row.member_id}`}</strong> · 币种 {row.type1}
        </div>
        <WalletField label="网络" value={type2} onChange={setType2} placeholder="TRC20 / ERC20 / BTC" />
        <WalletField label="钱包地址 *" value={address} onChange={setAddress} />
        <WalletField label="备注" value={notes} onChange={setNotes} textarea />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          设为默认钱包
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={onClose} disabled={busy}>取消</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

function BankWalletPage() {
  const [rows, setRows] = useState<BankWalletRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [member, setMember] = useState("");
  const [bankName, setBankName] = useState("");
  const [editing, setEditing] = useState<BankWalletRow | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 500 };
      if (member.trim()) params.member_account = member.trim();
      const res = await api.listBankWallets(params);
      const filtered = bankName.trim()
        ? res.data.filter((b) => b.bank_name.toLowerCase().includes(bankName.trim().toLowerCase()))
        : res.data;
      setRows(filtered);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [member, bankName]);

  useEffect(() => { reload(); }, [reload]);

  const start = (page - 1) * perPage;
  const paged = rows.slice(start, start + perPage);
  const reset = () => { setMember(""); setBankName(""); setPage(1); };

  return (
    <div className="page-container">
      <div className="filter-bar">
        <span className="filter-label">会员账号：</span>
        <input className="filter-input" style={{ width: 140 }} placeholder="会员账号"
          value={member} onChange={(e) => setMember(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <span className="filter-label">银行名称：</span>
        <input className="filter-input" style={{ width: 140 }} placeholder="模糊匹配"
          value={bankName} onChange={(e) => setBankName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <button className="btn btn-primary" onClick={() => setPage(1)}>🔍 搜索</button>
        <button className="btn btn-warning" onClick={reset}>↺ 重置</button>
      </div>
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>会员</th>
                <th>银行名称</th>
                <th>银行卡号</th>
                <th>持卡人</th>
                <th>身份证</th>
                <th>开户支行</th>
                <th>IFSC</th>
                <th>联系方式</th>
                <th>默认</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ textAlign: "center", padding: 40, color: "#888" }}>加载中...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: "center", padding: 40, color: "#888" }}>暂无记录</td></tr>
              ) : paged.map((b) => (
                <tr key={b.id}>
                  <td style={{ color: "#888" }}>{b.id}</td>
                  <td className="link-cell">{b.member_account || `#${b.member_id}`}</td>
                  <td>{b.bank_name}</td>
                  <td className="num-cell" style={{ color: "#555" }}>{b.card_no}</td>
                  <td>{b.holder}</td>
                  <td style={{ color: "#888", fontFamily: "monospace", fontSize: 11 }}>{b.id_number || "-"}</td>
                  <td style={{ color: "#888" }}>{b.branch}</td>
                  <td><Badge label={b.ifsc} color="blue" /></td>
                  <td style={{ color: "#1890ff", fontSize: 12 }}>{b.contact}</td>
                  <td>{b.is_default === 1 ? <Badge label="默认" color="gold" /> : <span style={{ color: "#999" }}>-</span>}</td>
                  <td style={{ color: "#999", fontSize: 12 }}>{b.notes}</td>
                  <td><ActBtn label="✎ 编辑" color="teal" onClick={() => setEditing(b)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={rows.length} perPage={perPage} page={page}
          onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
      </div>

      {editing && (
        <BankWalletEditModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function BankWalletEditModal({ row, onClose, onSaved }: { row: BankWalletRow; onClose: () => void; onSaved: () => void; }) {
  const [bankName, setBankName] = useState(row.bank_name);
  const [cardNo, setCardNo] = useState(row.card_no);
  const [holder, setHolder] = useState(row.holder);
  const [idNumber, setIdNumber] = useState(row.id_number || "");
  const [branch, setBranch] = useState(row.branch);
  const [ifsc, setIfsc] = useState(row.ifsc);
  const [contact, setContact] = useState(row.contact);
  const [notes, setNotes] = useState(row.notes);
  const [isDefault, setIsDefault] = useState(row.is_default === 1);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/members/${row.member_id}/wallets/bank/${row.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankName, card_no: cardNo, holder, id_number: idNumber || null,
          branch, ifsc, contact, notes, is_default: isDefault ? 1 : 0,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `HTTP ${r.status}`); }
      alert("已保存");
      onSaved();
    } catch (e: any) { alert("保存失败: " + (e?.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={modalBackdropStyle} onClick={() => !busy && onClose()}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px" }}>编辑银行卡 #{row.id}</h3>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
          会员: <strong>{row.member_account || `#${row.member_id}`}</strong>
        </div>
        <WalletField label="银行名称 *" value={bankName} onChange={setBankName} />
        <WalletField label="卡号 *"     value={cardNo}   onChange={setCardNo} />
        <WalletField label="持卡人 *"   value={holder}   onChange={setHolder} />
        <WalletField label="身份证号"   value={idNumber} onChange={setIdNumber} />
        <WalletField label="开户支行"   value={branch}   onChange={setBranch} />
        <WalletField label="IFSC"      value={ifsc}     onChange={setIfsc} />
        <WalletField label="联系方式"   value={contact}  onChange={setContact} />
        <WalletField label="备注"       value={notes}    onChange={setNotes} textarea />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          设为默认钱包
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={onClose} disabled={busy}>取消</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

function MessagesPage() {
  const [rows,    setRows]    = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const PER_PAGE = 10;
  const [filter, setFilter] = useState({
    member_id: "",
    member_filter: "",
    read: "",
    keyword: "",
  });
  const [applied, setApplied] = useState(filter);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const load = async (f: typeof applied, p: number) => {
    setLoading(true);
    try {
      const params: any = { limit: PER_PAGE, offset: (p - 1) * PER_PAGE };
      if (f.member_id.trim())  params.member_id     = Number(f.member_id);
      if (f.member_filter)     params.member_filter = f.member_filter;
      if (f.read)              params.read          = f.read;
      if (f.keyword.trim())    params.keyword       = f.keyword.trim();
      const data = await api.listMessages(params);
      setRows(data.data);
      setTotal(data.total);
    } catch (e: any) {
      setToast({ msg: "加载失败: " + (e?.message || String(e)), kind: "err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(applied, page); }, [applied, page]);

  // 自动消失 toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const onSearch = () => { setPage(1); setApplied({ ...filter }); };
  const onReset  = () => {
    const empty = { member_id: "", member_filter: "", read: "", keyword: "" };
    setFilter(empty);
    setPage(1);
    setApplied(empty);
  };

  return (
    <div className="page-container">
      <div className="filter-bar">
        <span className="filter-label">会员ID：</span>
        <input
          className="filter-input" style={{ width: 90 }}
          placeholder="会员编号"
          value={filter.member_id}
          onChange={e => setFilter(f => ({ ...f, member_id: e.target.value }))}
        />
        <span className="filter-label">发送对象：</span>
        <select
          className="filter-select"
          value={filter.member_filter}
          onChange={e => setFilter(f => ({ ...f, member_filter: e.target.value }))}
        >
          <option value="">全部</option>
          <option value="all">全员广播</option>
          <option value="specific">指定会员</option>
        </select>
        <span className="filter-label">阅读状态：</span>
        <select
          className="filter-select"
          value={filter.read}
          onChange={e => setFilter(f => ({ ...f, read: e.target.value }))}
        >
          <option value="">全部</option>
          <option value="read">已读</option>
          <option value="unread">未读</option>
        </select>
        <span className="filter-label">关键词：</span>
        <input
          className="filter-input" style={{ width: 140 }}
          placeholder="标题 / 内容"
          value={filter.keyword}
          onChange={e => setFilter(f => ({ ...f, keyword: e.target.value }))}
        />
        <button className="btn btn-primary" onClick={onSearch}>🔍 搜索</button>
        <button className="btn btn-warning" onClick={onReset}>↺ 重置</button>
        <button
          className="btn btn-success"
          onClick={() => setSendOpen(true)}
          style={{ marginLeft: "auto" }}
        >✉ 发信</button>
      </div>
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>ID</th>
                <th>接收人</th>
                <th>标题</th>
                <th>发送时间</th>
                <th>发送人</th>
                <th>阅读状态</th>
                <th>阅读时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#888" }}>加载中…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#888" }}>暂无消息</td></tr>
              ) : (
                <>
                  {rows.map(m => {
                    const isOpen = expandedId === m.id;
                    const isBroadcast = m.member_id === null;
                    return (
                      <tr key={m.id} style={{ background: isOpen ? "#f0f5ff" : undefined }}>
                        <td></td>
                        <td style={{ color: "#888" }}>{m.id}</td>
                        <td>
                          {isBroadcast
                            ? <Badge label="全员广播" color="purple" />
                            : <span className="link-cell">{m.member_id} / {m.member_account || "—"}</span>}
                        </td>
                        <td style={{ fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.title || "(无标题)"}
                        </td>
                        <td style={{ color: "#888", fontSize: 12 }}>{(m.send_time || "").replace("T", " ").slice(0, 19)}</td>
                        <td><Badge label={m.sender || "system"} color="blue" /></td>
                        <td>
                          {m.read_time
                            ? <Badge label="已读" color="teal" />
                            : <Badge label="未读" color="orange" />}
                        </td>
                        <td style={{ color: "#888", fontSize: 12 }}>{m.read_time ? m.read_time.replace("T", " ").slice(0, 19) : "—"}</td>
                        <td>
                          <ActBtn
                            label={isOpen ? "收起" : "查看"}
                            color="blue"
                            onClick={() => setExpandedId(isOpen ? null : m.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {/* 展开的内容行 — 在表格里以 colspan 横跨所有列 */}
                  {expandedId && rows.find(r => r.id === expandedId) && (
                    <tr>
                      <td colSpan={9} style={{ background: "#fafbff", padding: 0 }}>
                        {(() => {
                          const m = rows.find(r => r.id === expandedId)!;
                          return (
                            <div style={{ padding: "16px 24px", borderLeft: "3px solid #1890ff" }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 8 }}>
                                {m.title || "(无标题)"}
                              </div>
                              <div style={{
                                fontSize: 14, color: "#555",
                                whiteSpace: "pre-wrap", lineHeight: 1.7,
                                maxHeight: 240, overflowY: "auto",
                              }}>
                                {m.content || <span style={{ color: "#bbb" }}>(无内容)</span>}
                              </div>
                              <div style={{ marginTop: 10, fontSize: 12, color: "#999" }}>
                                发送人: {m.sender || "system"}
                                {m.member_id && <> · 接收人: {m.member_account || `#${m.member_id}`}</>}
                                {!m.member_id && <> · 接收人: 全员广播</>}
                                {" · 发送时间: "}{(m.send_time || "").replace("T", " ").slice(0, 19)}
                                {m.read_time && <> · 阅读时间: {m.read_time.replace("T", " ").slice(0, 19)}</>}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          total={total}
          perPage={PER_PAGE}
          label="条记录"
          page={page}
          onPageChange={setPage}
        />
      </div>

      {sendOpen && (
        <SendMessageModal
          member={null}
          mode="broadcast"
          onClose={() => setSendOpen(false)}
          onDone={(msg, kind) => {
            setToast({ msg, kind });
            setSendOpen(false);
            // 重新加载列表
            load(applied, page);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed", top: 80, right: 24, zIndex: 1100,
            padding: "10px 18px",
            background: toast.kind === "ok" ? "#f6ffed" : "#fff1f0",
            border: `1px solid ${toast.kind === "ok" ? "#b7eb8f" : "#ffa39e"}`,
            color:      toast.kind === "ok" ? "#389e0d" : "#cf1322",
            borderRadius: 6, fontSize: 14, fontWeight: 500,
            boxShadow: "0 6px 16px rgba(0,0,0,.12)",
          }}
        >{toast.msg}</div>
      )}
    </div>
  );
}

function ReportInOutPage() {
  const [filters, setFilters] = useState({
    agent_id:       "",
    invite_code:    "",
    member_account: "",
    member_id:      "",
    start_time:     "",
    end_time:       "",
  });
  const [applied, setApplied] = useState<typeof filters>(filters);
  const [data, setData] = useState<{
    summary: {
      total_in: number;
      total_out: number;
      profit: number;
      member_count_register: number;
      member_count_in: number;
      member_count_out: number;
    };
    data: Array<{
      id: number; agent_id: number; invite_code: string;
      member_id: number; member_account: string | null;
      before: string; amount: string; after: string;
      type: string; notes: string; time: string;
    }>;
    total: number;
  }>({
    summary: { total_in: 0, total_out: 0, profit: 0,
               member_count_register: 0, member_count_in: 0, member_count_out: 0 },
    data: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  const load = async (f: typeof filters) => {
    setLoading(true);
    try {
      const params: any = {};
      if (f.agent_id)       params.agent_id       = Number(f.agent_id);
      if (f.invite_code)    params.invite_code    = f.invite_code;
      if (f.member_account) params.member_account = f.member_account;
      if (f.member_id)      params.member_id      = Number(f.member_id);
      if (f.start_time)     params.start_time     = f.start_time;
      if (f.end_time)       params.end_time       = f.end_time;
      params.limit = 200;
      params.offset = 0;
      const res = await api.reportInout(params);
      setData(res);
    } catch (e) {
      console.error("report/inout failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(applied); }, []);

  const onSearch = () => setApplied({ ...filters });
  const onReset = () => {
    const empty = {
      agent_id: "", invite_code: "", member_account: "",
      member_id: "", start_time: "", end_time: "",
    };
    setFilters(empty);
    setApplied(empty);
  };

  const fmtNum = (n: number) =>
    Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtCnt = (n: number) =>
    Number(n || 0).toLocaleString("en-US");

  const summaryCards = [
    { label: "入款合计",     value: data.summary.total_in,              color: "blue",   sign: "+",  fmt: fmtNum },
    { label: "出款合计",     value: data.summary.total_out,             color: "orange", sign: "-",  fmt: fmtNum },
    { label: "盈利合计",     value: data.summary.profit,                color: data.summary.profit >= 0 ? "green" : "red", sign: data.summary.profit >= 0 ? "+" : "", fmt: fmtNum },
    { label: "注册会员统计", value: data.summary.member_count_register, color: "teal",   sign: "",   fmt: fmtCnt },
    { label: "入款会员统计", value: data.summary.member_count_in,       color: "teal",   sign: "",   fmt: fmtCnt },
    { label: "出款会员统计", value: data.summary.member_count_out,      color: "teal",   sign: "",   fmt: fmtCnt },
  ];

  return (
    <div className="page-container">
      <div className="filter-bar">
        <span className="filter-label">总代编号：</span>
        <input className="filter-input" style={{ width: 100 }}
          placeholder="总代编号"
          value={filters.agent_id}
          onChange={e => setFilters({ ...filters, agent_id: e.target.value })}
        />
        <span className="filter-label">邀请码：</span>
        <input className="filter-input" style={{ width: 80 }}
          placeholder="邀请码"
          value={filters.invite_code}
          onChange={e => setFilters({ ...filters, invite_code: e.target.value })}
        />
        <span className="filter-label">会员账号：</span>
        <input className="filter-input" style={{ width: 120 }}
          placeholder="会员账号"
          value={filters.member_account}
          onChange={e => setFilters({ ...filters, member_account: e.target.value })}
        />
        <span className="filter-label">会员编号：</span>
        <input className="filter-input" style={{ width: 100 }}
          placeholder="会员编号"
          value={filters.member_id}
          onChange={e => setFilters({ ...filters, member_id: e.target.value })}
        />
        <span className="filter-label">时间范围：</span>
        <input className="filter-input" style={{ width: 150 }}
          placeholder="开始时间"
          value={filters.start_time}
          onChange={e => setFilters({ ...filters, start_time: e.target.value })}
        />
        <span className="filter-label">至</span>
        <input className="filter-input" style={{ width: 150 }}
          placeholder="结束时间"
          value={filters.end_time}
          onChange={e => setFilters({ ...filters, end_time: e.target.value })}
        />
        <button className="btn btn-primary" onClick={onSearch} disabled={loading}>
          {loading ? "加载中..." : "🔍 搜索"}
        </button>
        <button className="btn btn-warning" onClick={onReset} disabled={loading}>
          ↺ 重置
        </button>
      </div>

      <div className="summary-card">
        <div className="summary-title">出款入款汇总</div>
        <div className="summary-grid">
          {summaryCards.map(item => (
            <div key={item.label} className="summary-item">
              <div className="summary-item-label">{item.label}</div>
              <div className={`stat-value ${item.color}`} style={{ fontSize: 15 }}>
                {item.sign}{item.fmt(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="table-card" style={{ marginTop: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>总代</th>
                <th>邀请码</th>
                <th>会员编号 / 会员账号</th>
                <th>类型</th>
                <th>金额</th>
                <th>操作前 / 操作后</th>
                <th>备注</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#888" }}>加载中...</td></tr>
              ) : data.data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#888" }}>暂无出入款记录</td></tr>
              ) : (
                data.data.map(r => {
                  const isOut = r.type === "会员提现";
                  return (
                    <tr key={r.id}>
                      <td style={{ color: "#888" }}>{r.id}</td>
                      <td style={{ color: "#888" }}>{r.agent_id}</td>
                      <td style={{ color: "#888" }}>{r.invite_code}</td>
                      <td>
                        <div className="link-cell">{r.member_id}</div>
                        <div style={{ fontSize: 14, color: "#888" }}>{r.member_account || "-"}</div>
                      </td>
                      <td>
                        <Badge label={r.type} color={isOut ? "orange" : "blue"} />
                      </td>
                      <td className={isOut ? "isNeg" : "isPos"} style={{ fontWeight: 600 }}>
                        {isOut ? "-" : "+"}{fmtNum(Math.abs(Number(r.amount)))}
                      </td>
                      <td style={{ color: "#888", fontSize: 13 }}>
                        {fmtNum(r.before)} → {fmtNum(r.after)}
                      </td>
                      <td style={{ color: "#888", fontSize: 14, maxWidth: 220 }}>{r.notes || "-"}</td>
                      <td style={{ color: "#888", fontSize: 13 }}>{r.time}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data.total > 0 && (
          <div style={{ padding: "12px 16px", color: "#888", fontSize: 13 }}>
            共 <strong style={{ color: "#333" }}>{data.total}</strong> 条记录(当前显示 {data.data.length} 条)
          </div>
        )}
      </div>
    </div>
  );
}

function RechargeListPage() {
  return (
    <div className="page-container">
      <div className="filter-bar">
        <input className="filter-input" style={{ width: 60 }} placeholder="总代" />
        <input className="filter-input" style={{ width: 80 }} placeholder="邀请码" />
        <input className="filter-input" style={{ width: 100 }} placeholder="会员账号" />
        <input className="filter-input" style={{ width: 80 }} placeholder="会员ID" />
        <input className="filter-input" style={{ width: 110 }} placeholder="交易编号" />
        <input className="filter-input" style={{ width: 100 }} placeholder="订单号码" />
        <span className="filter-label">渠道：</span>
        <select className="filter-select"><option>全部</option></select>
        <span className="filter-label">状态：</span>
        <select className="filter-select"><option>全部</option><option>待审批</option><option>已同意</option><option>已拒绝</option></select>
        <span className="filter-label">添加时间：</span>
        <input className="filter-input" style={{ width: 120 }} placeholder="开始时间" />
        <input className="filter-input" style={{ width: 120 }} placeholder="结束时间" />
        <button className="btn btn-primary">🔍 搜索</button>
        <button className="btn btn-warning">↺ 重置</button>
      </div>
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" /></th>
                <th>ID</th><th>总代</th><th>邀请码</th>
                <th>会员编号 / 会员账号</th><th>交易编号</th>
                <th>充值信息</th><th>充值金额 / 审批金额</th>
                <th>状态</th><th>订单号码</th><th>渠道</th>
                <th>申请时间 / 审批时间</th><th>审批人</th><th>审批备注</th><th>操作</th>
              </tr>
            </thead>
            <tbody><EmptyState /></tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WithdrawListPage() {
  const { user: admin } = useAuth();
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  // 过滤条件
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterMember, setFilterMember] = useState("");

  // 模态框
  const [approveFor, setApproveFor] = useState<Withdrawal | null>(null);
  const [rejectFor, setRejectFor] = useState<Withdrawal | null>(null);
  const [approved, setApproved] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [acting, setActing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: perPage, offset: (page - 1) * perPage };
      if (filterStatus) params.status = filterStatus;
      if (filterType)   params.type   = filterType;
      if (filterMember.trim()) {
        if (/^\d+$/.test(filterMember.trim())) params.member_id = Number(filterMember.trim());
        else params.member_account = filterMember.trim();
      }
      const res = await api.withdrawals(params);
      setRows(res.data || []);
      setTotal(res.total ?? 0);
    } catch (e) {
      console.error("加载提现列表失败", e);
    } finally {
      setLoading(false);
    }
  }, [perPage, page, filterStatus, filterType, filterMember]);

  useEffect(() => { reload(); }, [reload]);

  const reset = () => { setFilterStatus(""); setFilterType(""); setFilterMember(""); setPage(1); };

  const openApprove = (w: Withdrawal) => {
    setApproveFor(w);
    setApproved(String(w.amount));
    setApproveNote("");
  };
  const openReject = (w: Withdrawal) => {
    setRejectFor(w);
    setRejectReason("");
    setRejectNote("");
  };

  const submitApprove = async () => {
    if (!approveFor) return;
    const amt = Number(approved);
    if (!Number.isFinite(amt) || amt <= 0) { alert("请输入有效金额"); return; }
    setActing(true);
    try {
      await api.approveWithdrawal(approveFor.id, {
        reviewer: admin?.display_name || admin?.username || "admin",
        approved: amt,
        admin_note: approveNote,
      });
      alert("已同意提现");
      setApproveFor(null);
      reload();
    } catch (e: any) {
      alert("同意失败: " + (e?.message || e));
    } finally {
      setActing(false);
    }
  };

  const submitReject = async () => {
    if (!rejectFor) return;
    if (!rejectReason.trim()) { alert("请填写拒绝原因"); return; }
    setActing(true);
    try {
      await api.rejectWithdrawal(rejectFor.id, {
        reviewer: admin?.display_name || admin?.username || "admin",
        reject_reason: rejectReason.trim(),
        admin_note: rejectNote,
      });
      alert("已拒绝,金额已退回");
      setRejectFor(null);
      reload();
    } catch (e: any) {
      alert("拒绝失败: " + (e?.message || e));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="filter-bar">
        <input
          className="filter-input"
          style={{ width: 140 }}
          placeholder="会员账号/ID"
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }}
        />
        <span className="filter-label">类型：</span>
        <select className="filter-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="银行卡">银行卡</option>
          <option value="数字币">数字币</option>
        </select>
        <span className="filter-label">状态：</span>
        <select className="filter-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="申请中">申请中</option>
          <option value="已同意">已同意</option>
          <option value="已拒绝">已拒绝</option>
          <option value="已退款">已退款</option>
        </select>
        <button className="btn btn-primary" onClick={() => setPage(1)}>🔍 搜索</button>
        <button className="btn btn-warning" onClick={reset}>↺ 重置</button>
      </div>
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>会员</th>
                <th>状态</th>
                <th>金额 / 实付 / 手续费</th>
                <th>类型 / 钱包快照</th>
                <th>申请时间 / 审批时间</th>
                <th>审批人</th>
                <th>原因/备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#888" }}>加载中...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#888" }}>暂无记录</td></tr>
              ) : rows.map((w) => (
                <tr key={w.id}>
                  <td style={{ color: "#888" }}>{w.id}</td>
                  <td className="link-cell">
                    <div>{w.member_account || `#${w.member_id}`}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>ID: {w.member_id}</div>
                  </td>
                  <td><Badge label={w.status} color={withdrawStatusColor[w.status] || "gray"} /></td>
                  <td className="num-cell">
                    <div>申请 {fmtNum(w.amount)}</div>
                    <div style={{ color: "#4caf50" }}>实付 {fmtNum(w.actual_amount ?? w.approved)}</div>
                    <div style={{ color: "#888", fontSize: 11 }}>手续费 {fmtNum(w.fee)}</div>
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 320 }}>
                    <Badge label={w.type} color={w.type === "数字币" ? "purple" : "black"} />
                    <div style={{ marginTop: 4, color: "#bbb", lineHeight: 1.5 }}>
                      {w.wallet_type === "bank" ? (
                        <>
                          <div>🏦 {w.snap_bank_name} {w.snap_branch && `(${w.snap_branch})`}</div>
                          <div>卡号: {w.snap_card_no ? maskCard(w.snap_card_no) : "-"}</div>
                          <div>持卡人: {w.snap_holder}</div>
                          {w.snap_ifsc && <div>IFSC: {w.snap_ifsc}</div>}
                          {w.snap_id_number && <div>身份证: {maskId(w.snap_id_number)}</div>}
                        </>
                      ) : w.wallet_type === "digital" ? (
                        <>
                          <div>💎 {w.snap_coin_type} ({w.snap_network})</div>
                          <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                            {w.snap_address ? maskAddr(w.snap_address) : "-"}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#666" }}>-</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "#888", fontSize: 12 }}>
                    {w.apply_time}
                    {w.approve_time && <><br /><span style={{ color: "#bbb" }}>{w.approve_time}</span></>}
                  </td>
                  <td style={{ color: "#666" }}>{w.reviewer || "-"}</td>
                  <td style={{ fontSize: 12, maxWidth: 200 }}>
                    {w.status === "已拒绝" && w.reject_reason && (
                      <div style={{ color: "#f44336" }}>❌ {w.reject_reason}</div>
                    )}
                    {w.admin_note && (
                      <div style={{ color: "#888", marginTop: 2 }}>📝 {w.admin_note}</div>
                    )}
                    {!w.reject_reason && !w.admin_note && <span style={{ color: "#666" }}>-</span>}
                  </td>
                  <td>
                    <div className="action-group">
                      {w.status === "申请中" && (
                        <>
                          <ActBtn label="✓ 同意" color="green" onClick={() => openApprove(w)} />
                          <ActBtn label="✕ 拒绝" color="red" onClick={() => openReject(w)} />
                        </>
                      )}
                      {w.status !== "申请中" && <span style={{ color: "#666", fontSize: 12 }}>已处理</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          total={total}
          perPage={perPage}
          page={page}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
      </div>

      {/* 同意模态框 */}
      {approveFor && (
        <div style={modalBackdropStyle} onClick={() => !acting && setApproveFor(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px" }}>同意提现 #{approveFor.id}</h3>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              会员: <strong>{approveFor.member_account || `#${approveFor.member_id}`}</strong> · 申请金额 {fmtNum(approveFor.amount)}
            </div>
            <WalletField label="实付金额 *" value={approved} onChange={setApproved} type="number" placeholder="可调整(默认等于申请金额)" />
            <WalletField label="管理员备注" value={approveNote} onChange={setApproveNote} placeholder="选填" textarea />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setApproveFor(null)} disabled={acting}>取消</button>
              <button className="btn btn-primary" onClick={submitApprove} disabled={acting}>
                {acting ? "处理中..." : "确认同意"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 拒绝模态框 */}
      {rejectFor && (
        <div style={modalBackdropStyle} onClick={() => !acting && setRejectFor(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", color: "#f44336" }}>拒绝提现 #{rejectFor.id}</h3>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              会员: <strong>{rejectFor.member_account || `#${rejectFor.member_id}`}</strong> · 金额 {fmtNum(rejectFor.amount)} 将退回余额
            </div>
            <WalletField label="拒绝原因 *" value={rejectReason} onChange={setRejectReason} placeholder="必填,用户可见" textarea />
            <WalletField label="管理员备注" value={rejectNote} onChange={setRejectNote} placeholder="选填,内部可见" textarea />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setRejectFor(null)} disabled={acting}>取消</button>
              <button className="btn btn-danger" onClick={submitReject} disabled={acting}>
                {acting ? "处理中..." : "确认拒绝并退款"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 模态框样式 — 与项目内现有风格一致
const modalBackdropStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};
const modalCardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 8, padding: 24, width: 480, maxWidth: "90%",
  boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
};

function WalletField({
  label, value, onChange, placeholder, type = "text", textarea = false,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean; }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, color: "#333", marginBottom: 4 }}>{label}</label>
      {textarea ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
        />
      ) : (
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 13, boxSizing: "border-box" }}
        />
      )}
    </div>
  );
}

function maskCard(no: string) {
  if (!no || no.length <= 8) return no;
  return no.slice(0, 4) + " **** **** " + no.slice(-4);
}
function maskId(id: string) {
  if (!id || id.length < 8) return id;
  return id.slice(0, 4) + "**********" + id.slice(-4);
}
function maskAddr(a: string) {
  if (!a || a.length <= 16) return a;
  return a.slice(0, 8) + "..." + a.slice(-8);
}

function FundDetailsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [sum,   setSum]   = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [page, setPage]     = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [filter, setFilter] = useState({
    member_account: "",
    member_id:      "",
    type:           "",
    start_time:     "",
    end_time:       "",
  });
  const [applied, setApplied] = useState(filter);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: perPage, offset: (page - 1) * perPage };
      if (applied.member_account) params.member_account = applied.member_account;
      if (applied.member_id)      params.member_id      = Number(applied.member_id);
      if (applied.type)           params.type           = applied.type;
      if (applied.start_time)     params.start_time     = applied.start_time;
      if (applied.end_time)       params.end_time       = applied.end_time;
      const data = await api.funds(params);
      setRows(data.data);
      setTotal(data.total);
      setSum(String(data.sum));
    } catch (e: any) {
      alert("加载失败: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { { load(); } }, [applied, page, perPage]);

  const reset = () => {
    const empty = { member_account: "", member_id: "", type: "", start_time: "", end_time: "" };
    setFilter(empty);
    setPage(1);
    setApplied(empty);
  };

  return (
    <div className="page-container">
      <div className="filter-bar">
        <input
          className="filter-input" style={{ width: 100 }}
          placeholder="会员账号"
          value={filter.member_account}
          onChange={e => setFilter(f => ({ ...f, member_account: e.target.value }))}
        />
        <input
          className="filter-input" style={{ width: 70 }}
          placeholder="会员ID"
          value={filter.member_id}
          onChange={e => setFilter(f => ({ ...f, member_id: e.target.value }))}
        />
        <span className="filter-label">资金类型：</span>
        <select
          className="filter-select"
          value={filter.type}
          onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
        >
          <option value="">全部</option>
          <option value="后台充值">后台充值</option>
          <option value="后台扣款">后台扣款</option>
          <option value="会员下单">会员下单</option>
          <option value="下推盈利">下推盈利</option>
          <option value="会员提现">会员提现</option>
        </select>
        <span className="filter-label">时间：</span>
        <input
          className="filter-input" style={{ width: 130 }} type="datetime-local"
          value={filter.start_time}
          onChange={e => setFilter(f => ({ ...f, start_time: e.target.value.replace("T", " ") + (e.target.value.length === 16 ? ":00" : "") }))}
        />
        <input
          className="filter-input" style={{ width: 130 }} type="datetime-local"
          value={filter.end_time}
          onChange={e => setFilter(f => ({ ...f, end_time: e.target.value.replace("T", " ") + (e.target.value.length === 16 ? ":00" : "") }))}
        />
        <button className="btn btn-primary" onClick={() => setApplied(filter)}>🔍 搜索</button>
        <button className="btn btn-warning" onClick={reset}>↺ 重置</button>
      </div>
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>总代</th><th>邀请码</th>
                <th>编号 | 账号</th>
                <th>变动之前</th><th>金额</th><th>变动之后</th>
                <th>资金类型</th><th>时间</th><th>备注</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "#888" }}>加载中…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "#888" }}>暂无数据</td></tr>
              ) : rows.map(f => {
                const amt = Number(f.amount);
                const isPos = amt > 0;
                return (
                  <tr key={f.id}>
                    <td style={{ color: "#888" }}>{f.id}</td>
                    <td style={{ color: "#888" }}>{f.agent_id}</td>
                    <td style={{ color: "#888" }}>{f.invite_code}</td>
                    <td className="link-cell">{f.member_id} / {f.member_account || "—"}</td>
                    <td className="num-cell">{fmtNum(Number(f.before))}</td>
                    <td className={`num-cell ${isPos ? "pos" : "neg"}`}>
                      {isPos ? `+${fmtNum(amt)}` : fmtNum(amt)}
                    </td>
                    <td className="num-cell">{fmtNum(Number(f.after))}</td>
                    <td><Badge label={f.type} color={fundTypeColor[f.type] || "gray"} /></td>
                    <td style={{ color: "#888", fontSize: 12 }}>{(f.time || "").replace("T", " ").slice(0, 19)}</td>
                    <td style={{ color: "#999", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{f.notes}</td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td colSpan={5} style={{ fontWeight: 700, color: "#d46b08" }}>合计</td>
                <td className="num-cell" style={{ color: "#d46b08", fontWeight: 700 }}>
                  {fmtNum(Number(sum))}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination
          total={total}
          perPage={perPage}
          label="条记录"
          page={page}
          onPageChange={setPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
        />
      </div>
    </div>
  );
}

function OrderListPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // 过滤
  const [orderId, setOrderId]       = useState("");
  const [memberAcct, setMemberAcct] = useState("");
  const [agentId, setAgentId]       = useState("");
  const [invite, setInvite]         = useState("");
  const [symbol, setSymbol]         = useState("");
  const [status, setStatus]         = useState("");
  const [direction, setDirection]   = useState("");
  const [startTime, setStartTime]   = useState("");
  const [endTime, setEndTime]       = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: perPage, offset: (page - 1) * perPage };
      if (orderId.trim() && /^\d+$/.test(orderId.trim()))  params.order_id       = Number(orderId.trim());
      if (memberAcct.trim())                                params.member_account = memberAcct.trim();
      if (agentId.trim()   && /^\d+$/.test(agentId.trim())) params.agent_id       = Number(agentId.trim());
      if (invite.trim())                                    params.invite_code    = invite.trim();
      if (symbol.trim())                                    params.symbol         = symbol.trim();
      if (status)                                           params.status         = status;
      if (direction)                                        params.direction      = direction;
      if (startTime)                                        params.start_time     = startTime;
      if (endTime)                                          params.end_time       = endTime;
      const res = await api.orders(params);
      setRows(res.data || []);
      setTotal(res.total ?? 0);
    } catch (e) { console.error("加载订单列表失败", e); }
    finally { setLoading(false); }
  }, [perPage, page, orderId, memberAcct, agentId, invite, symbol, status, direction, startTime, endTime]);

  useEffect(() => { reload(); }, [reload]);

  const reset = () => {
    setOrderId(""); setMemberAcct(""); setAgentId(""); setInvite("");
    setSymbol(""); setStatus(""); setDirection("");
    setStartTime(""); setEndTime(""); setPage(1);
  };

  const sumAmount = rows.reduce((s, o) => s + Number(o.amount || 0), 0);
  const sumProfit = rows.reduce((s, o) => s + Number(o.profit || 0), 0);

  return (
    <div className="page-container">
      <div className="filter-bar">
        <input className="filter-input" style={{ width: 100 }} placeholder="订单编号"
          value={orderId} onChange={(e) => setOrderId(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <input className="filter-input" style={{ width: 130 }} placeholder="会员账号"
          value={memberAcct} onChange={(e) => setMemberAcct(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <input className="filter-input" style={{ width: 80 }} placeholder="总代ID"
          value={agentId} onChange={(e) => setAgentId(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <input className="filter-input" style={{ width: 100 }} placeholder="邀请码"
          value={invite} onChange={(e) => setInvite(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <input className="filter-input" style={{ width: 100 }} placeholder="币种 (BTCUSDT)"
          value={symbol} onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }} />
        <span className="filter-label">状态:</span>
        <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="持仓中">持仓中</option>
          <option value="已平仓">已平仓</option>
          <option value="已取消">已取消</option>
        </select>
        <span className="filter-label">方向:</span>
        <select className="filter-select" value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }}>
          <option value="">全部</option>
          <option value="涨">涨</option>
          <option value="跌">跌</option>
        </select>
        <input className="filter-input" type="datetime-local" style={{ width: 170 }} placeholder="开始时间"
          value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <input className="filter-input" type="datetime-local" style={{ width: 170 }} placeholder="结束时间"
          value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setPage(1)}>🔍 搜索</button>
        <button className="btn btn-warning" onClick={reset}>↺ 重置</button>
      </div>

      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>总代</th>
                <th>邀请码</th>
                <th>会员编号 / 账号</th>
                <th>币种</th>
                <th>建仓价 / 平仓价</th>
                <th>建仓时间 / 平仓时间</th>
                <th>周期 / 赔率</th>
                <th>投注 / 盈利</th>
                <th>状态</th>
                <th>买涨买跌 / 实际</th>
                <th>添加时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ textAlign: "center", padding: 40, color: "#888" }}>加载中...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: "center", padding: 40, color: "#888" }}>暂无记录</td></tr>
              ) : rows.map((o) => {
                const isWin = o.status === "已平仓" && Number(o.profit || 0) > 0;
                const isLose = o.status === "已平仓" && Number(o.profit || 0) < 0;
                return (
                  <tr key={o.id}>
                    <td style={{ color: "#888" }}>{o.id}</td>
                    <td style={{ color: "#888" }}>{o.agent_id}</td>
                    <td style={{ color: "#888", fontSize: 11 }}>{o.invite_code}</td>
                    <td className="link-cell">
                      <div>{o.member_account || `#${o.member_id}`}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>ID: {o.member_id}</div>
                    </td>
                    <td><Badge label={o.symbol} color="blue" /></td>
                    <td className="num-cell" style={{ fontSize: 12 }}>
                      <div>{fmtNum(o.open_price)}</div>
                      {o.close_price != null && <div style={{ color: "#888" }}>{fmtNum(o.close_price)}</div>}
                    </td>
                    <td style={{ color: "#888", fontSize: 11 }}>
                      <div>{o.open_time}</div>
                      {o.close_time && <div style={{ color: "#bbb" }}>{o.close_time}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div>{o.period || "-"}</div>
                      <div style={{ color: "#888" }}>赔率 {o.return_rate ?? "-"}%</div>
                    </td>
                    <td className="num-cell" style={{ fontSize: 12 }}>
                      <div>投注 {fmtNum(o.amount)}</div>
                      {o.status === "已平仓" && (
                        <div style={{ color: isWin ? "#4caf50" : isLose ? "#f44336" : "#888" }}>
                          {isWin ? "+" : ""}{fmtNum(o.profit)}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge
                        label={o.status}
                        color={o.status === "持仓中" ? "orange" : o.status === "已平仓" ? "green" : "gray"}
                      />
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span style={{ color: o.direction === "涨" ? "#f44336" : "#4caf50", fontWeight: 600 }}>{o.direction}</span>
                      <span style={{ margin: "0 4px", color: "#888" }}>/</span>
                      <span style={{ color: "#888" }}>
                        {o.status === "已平仓"
                          ? (isWin ? "赢" : isLose ? "输" : "平")
                          : o.win_flag === 1 ? "要赢" : o.win_flag === 0 ? "要输" : "随机"}
                      </span>
                    </td>
                    <td style={{ color: "#888", fontSize: 11 }}>
                      {o.open_time}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#666" }}>
          <div>
            共 <strong style={{ color: "#333" }}>{total}</strong> 条 · 本页
            <strong style={{ color: "#4caf50" }}> {fmtNum(sumAmount)} </strong>
            投注 ·
            <strong style={{ color: sumProfit >= 0 ? "#4caf50" : "#f44336" }}> {fmtNum(sumProfit)} </strong>
            盈利
          </div>
          <Pagination
            total={total} perPage={perPage} page={page}
            onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Menu Config ──────────────────────────────────────────────────────
type MenuGroup = {
  key: string; label: string; icon: string;
  children?: { key: Page; label: string }[];
  page?: Page;
};

const menuConfig: MenuGroup[] = [
  { key: "home",    label: "首页",   icon: "🏠", page: "home" },
  { key: "members", label: "会员代理", icon: "👥", children: [
    { key: "members",        label: "会员列表" },
    { key: "digital-wallet", label: "数字钱包" },
    { key: "bank-wallet",    label: "银行钱包" },
  ]},
  { key: "employees", label: "员工管理", icon: "🧑‍💼", page: "employees" },
  { key: "messages", label: "消息通告", icon: "💬", children: [
    { key: "messages", label: "站内消息" },
  ]},
  { key: "report", label: "报表管理", icon: "📊", children: [
    { key: "report-inout", label: "出款入款" },
  ]},
  { key: "funds", label: "资金管理", icon: "💰", children: [
    { key: "recharge-list", label: "充值列表" },
    { key: "withdraw-list", label: "提现列表" },
    { key: "fund-details",  label: "资金明细" },
  ]},
  { key: "orders", label: "订单管理", icon: "📋", page: "order-list" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ currentPage, onNavigate, collapsed, username, onLogout }: {
  currentPage: Page; onNavigate: (p: Page) => void; collapsed: boolean;
  username: string; onLogout: () => void;
}) {
  const initOpen: Record<string, boolean> = {};
  menuConfig.forEach(g => {
    if (g.children) initOpen[g.key] = g.children.some(c => c.key === currentPage);
  });

  const [open, setOpen] = useState<Record<string, boolean>>(initOpen);
  const [query, setQuery] = useState("");
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);

  const isParentActive = (g: MenuGroup) =>
    g.page ? currentPage === g.page : (g.children?.some(c => c.key === currentPage) ?? false);

  const toggle = (key: string) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const matchGroup = (g: MenuGroup) => {
    const q = query.trim();
    if (!q) return true;
    if (g.label.includes(q)) return true;
    if (g.children?.some(c => c.label.includes(q))) return true;
    return false;
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-user">
        <div className="sidebar-avatar">👤</div>
        <div className="sidebar-username">{username}</div>
        <div className="sidebar-status">
          <span className="status-dot" />
          <span style={{ color: "#73d13d", fontSize: 13 }}>在线</span>
          <span
            onClick={onLogout}
            style={{ color: "#ff4d4f", fontSize: 14, marginLeft: 6, cursor: "pointer", userSelect: "none" }}
            title="点击注销"
          >• 注销</span>
        </div>
      </div>
      <input
        type="text"
        className="sidebar-search"
        placeholder="搜索菜单…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <nav className="sidebar-nav">
        {menuConfig.map(group => {
          const matched = matchGroup(group);
          const showPopover = collapsed && hoverGroup === group.key && group.children;
          return (
            <div
              key={group.key}
              className={`menu-group ${matched ? "" : "dimmed"}`}
              onMouseEnter={() => setHoverGroup(group.key)}
              onMouseLeave={() => setHoverGroup(prev => prev === group.key ? null : prev)}
            >
              <button
                className={`menu-item ${isParentActive(group) && !group.children ? "active" : ""}`}
                onClick={() => { group.page ? onNavigate(group.page) : toggle(group.key); }}
              >
                <div className="menu-item-left">
                  <span className="menu-icon">{group.icon}</span>
                  <span className="menu-label">{group.label}</span>
                </div>
                {group.children && !collapsed && (
                  <span className={`menu-arrow ${open[group.key] ? "open" : ""}`}>›</span>
                )}
              </button>
              {/* 展开模式:挂在菜单下面的子菜单 */}
              {group.children && !collapsed && open[group.key] && (
                <div className="submenu">
                  {group.children.map(child => (
                    <button
                      key={child.key}
                      className={`submenu-item ${currentPage === child.key ? "active" : ""}`}
                      onClick={() => onNavigate(child.key)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
              {/* 折叠模式:悬停弹出的浮动子菜单 */}
              {showPopover && (
                <div className="submenu-popover">
                  {group.children!.map(child => (
                    <button
                      key={child.key}
                      className={`submenu-item ${currentPage === child.key ? "active" : ""}`}
                      onClick={() => onNavigate(child.key)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

type QuickAction = {
  icon: string;
  label: string;
  page: Page;
  badge?: string;
  badgeKind?: "danger" | "success" | "warn" | "muted";
};

// ─── App ──────────────────────────────────────────────────────────────────────
const pageLabels: Record<Page, string> = {
  home: "首页", members: "会员列表", "digital-wallet": "数字钱包",
  "bank-wallet": "银行钱包", messages: "站内消息", "report-inout": "出款入款",
  "recharge-list": "充值列表", "withdraw-list": "提现列表",
  "fund-details": "资金明细", "order-list": "订单管理",
  employees: "员工管理",
  profile: "个人中心",
};

function renderPage(page: Page, onNavigate: (p: Page) => void) {
  switch (page) {
    case "home":          return <HomePage onNavigate={onNavigate} />;
    case "members":       return <MembersPage />;
    case "digital-wallet":return <DigitalWalletPage />;
    case "bank-wallet":   return <BankWalletPage />;
    case "messages":      return <MessagesPage />;
    case "report-inout":  return <ReportInOutPage />;
    case "recharge-list": return <RechargeListPage />;
    case "withdraw-list": return <WithdrawListPage />;
    case "fund-details":  return <FundDetailsPage />;
    case "order-list":    return <OrderListPage />;
    case "employees":     return <EmployeesPage />;
    case "profile":       return <ProfilePage />;
    default: return <HomePage onNavigate={onNavigate} />;
  }
}

// ─── Employees Page (员工管理 — super 专属) ──────────────────────────────────
type Employee = {
  id: number;
  username: string;
  display_name: string;
  role: "super" | "admin" | "operator";
  status: number;
  invite_code: string;
  last_login_time: string | null;
  created_at: string;
  customer_count: number;
};

function EmployeesPage() {
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<
    | null
    | { mode: "create" }
    | { mode: "resetCode"; newCode: string }
    | { mode: "delete"; id: number; username: string }
  >(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const flash = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2200);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/employees?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (r.ok) setList(d.items || []);
      else flash("err", d.message || "加载失败");
    } catch (e: any) {
      flash("err", e?.message || "网络错误");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { reload(); }, [reload]);

  const toggleStatus = async (id: number, enable: boolean) => {
    const action = enable ? "enable" : "disable";
    const r = await fetch(`/api/admin/employees/${id}/${action}`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { flash("ok", enable ? "已启用" : "已禁用"); reload(); }
    else flash("err", d.message || "操作失败");
  };

  const resetCode = async (id: number) => {
    const r = await fetch("/api/admin/regenerate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setModal({ mode: "resetCode", newCode: d.invite_code });
      reload();
    } else flash("err", d.message || "重置失败");
  };

  const roleLabel = (r: Employee["role"]) =>
    r === "super" ? "超级管理员" : r === "admin" ? "管理员" : "操作员";
  const roleColor = (r: Employee["role"]): string =>
    r === "super" ? "#f50" : r === "admin" ? "#1677ff" : "#722ed1";

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, gap: 12, flexWrap: "wrap",
      }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#222" }}>员工管理</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") reload(); }}
            placeholder="搜账号 / 姓名 / 邀请码"
            style={{
              padding: "7px 12px", border: "1px solid #d9d9d9", borderRadius: 4,
              fontSize: 13, width: 240, outline: "none",
            }}
          />
          <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
            + 新增员工
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>ID</th><th>账号</th><th>姓名</th><th>角色</th>
              <th>邀请码</th><th>客户数</th><th>状态</th>
              <th>最后登录</th><th>创建时间</th>
              <th style={{ width: 280 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: "#999" }}>加载中…</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: "#999" }}>暂无员工</td></tr>
            )}
            {list.map(emp => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td><b style={{ color: "#222" }}>{emp.username}</b></td>
                <td>{emp.display_name || <span style={{ color: "#bbb" }}>—</span>}</td>
                <td>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 10,
                    fontSize: 12, color: "#fff", background: roleColor(emp.role),
                  }}>{roleLabel(emp.role)}</span>
                </td>
                <td>
                  {emp.invite_code
                    ? <code style={{
                        background: "#f5f5f5", padding: "2px 8px", borderRadius: 3,
                        fontSize: 13, color: "#555", fontFamily: "monospace",
                      }}>{emp.invite_code}</code>
                    : <span style={{ color: "#bbb" }}>—</span>}
                </td>
                <td>{emp.customer_count ?? 0}</td>
                <td>
                  {emp.status === 1
                    ? <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 10,
                        fontSize: 12, color: "#fff", background: "#52c41a",
                      }}>启用</span>
                    : <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 10,
                        fontSize: 12, color: "#fff", background: "#bfbfbf",
                      }}>禁用</span>}
                </td>
                <td style={{ color: "#888", fontSize: 12 }}>{emp.last_login_time || "—"}</td>
                <td style={{ color: "#888", fontSize: 12 }}>{emp.created_at}</td>
                <td>
                  {emp.role !== "super" ? (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button
                        onClick={() => resetCode(emp.id)}
                        title="作废旧码,生成新码"
                        style={actionBtnStyle("#1677ff")}
                      >
                        重置邀请码
                      </button>
                      <button
                        onClick={() => emp.status === 1 ? toggleStatus(emp.id, false) : toggleStatus(emp.id, true)}
                        style={actionBtnStyle(emp.status === 1 ? "#fa8c16" : "#52c41a")}
                      >
                        {emp.status === 1 ? "禁用" : "启用"}
                      </button>
                      <button
                        onClick={() => setModal({ mode: "delete", id: emp.id, username: emp.username })}
                        style={actionBtnStyle("#ff4d4f")}
                      >
                        删除
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: "#bbb", fontSize: 12 }}>— 系统账号 —</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 创建员工 */}
      {modal?.mode === "create" && (
        <CreateEmployeeModal
          onClose={() => setModal(null)}
          onCreated={() => { setModal(null); reload(); }}
          onError={(m) => flash("err", m)}
        />
      )}

      {/* 重置邀请码结果 */}
      {modal?.mode === "resetCode" && (
        <div style={modalBackdropStyle} onClick={() => setModal(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#222" }}>邀请码已重置</h3>
            <p style={{ color: "#666", fontSize: 13, margin: "8px 0" }}>旧邀请码已作废,新码为:</p>
            <div style={{
              fontFamily: "monospace", fontSize: 24, fontWeight: 700,
              background: "#f6ffed", border: "1px solid #b7eb8f",
              padding: "16px", borderRadius: 6, textAlign: "center",
              letterSpacing: 2, color: "#389e0d", margin: "16px 0",
            }}>
              {modal.newCode}
            </div>
            <p style={{ color: "#fa8c16", fontSize: 12, margin: "8px 0 16px" }}>
              ⚠ 请立即复制给员工,关闭后不再显示
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={() => setModal(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 删除 */}
      {modal?.mode === "delete" && (
        <DeleteEmployeeModal
          id={modal.id}
          username={modal.username}
          onClose={() => setModal(null)}
          onDeleted={() => { setModal(null); reload(); }}
          onError={(m) => flash("err", m)}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          padding: "8px 20px", borderRadius: 4, color: "#fff", fontSize: 14,
          background: toast.kind === "ok" ? "#52c41a" : "#ff4d4f",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1100,
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

function actionBtnStyle(color: string): CSSProperties {
  return {
    padding: "4px 10px", fontSize: 12, cursor: "pointer",
    color, background: "#fff", border: `1px solid ${color}`,
    borderRadius: 3, transition: "all 0.15s",
  };
}

function CreateEmployeeModal({ onClose, onCreated, onError }: {
  onClose: () => void; onCreated: () => void; onError: (m: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("admin");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username || !password) return onError("账号和密码必填");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username, display_name: displayName, password, role,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return onError(d.message || "创建失败");
      onCreated();
    } catch (e: any) {
      onError(e?.message || "网络错误");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#222" }}>新增员工</h3>
        <WalletField
          label="账号"
          value={username}
          onChange={setUsername}
          placeholder="4-32 位字母数字下划线"
        />
        <WalletField
          label="姓名"
          value={displayName}
          onChange={setDisplayName}
          placeholder="可选"
        />
        <WalletField
          label="密码"
          value={password}
          onChange={setPassword}
          placeholder="6-32 位"
          type="password"
        />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#333", marginBottom: 4 }}>
            角色
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            style={{
              width: "100%", padding: 8, border: "1px solid #ddd",
              borderRadius: 4, fontSize: 13, boxSizing: "border-box", background: "#fff",
            }}
          >
            <option value="admin">管理员(全权限,排除 super)</option>
            <option value="operator">操作员(受限)</option>
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px", fontSize: 14, cursor: "pointer",
              background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, color: "#555",
            }}
          >取消</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? "创建中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteEmployeeModal({ id, username, onClose, onDeleted, onError }: {
  id: number; username: string; onClose: () => void; onDeleted: () => void; onError: (m: string) => void;
}) {
  const [reassignTo, setReassignTo] = useState<string>("admin");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignTo }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return onError(d.message || "删除失败");
      onDeleted();
    } catch (e: any) {
      onError(e?.message || "网络错误");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px", fontSize: 18, color: "#222" }}>
          删除员工 <span style={{ color: "#ff4d4f" }}>{username}</span>
        </h3>
        <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px", lineHeight: 1.6 }}>
          删除员工后,该员工名下的所有客户将转移给指定接收方(防止客户丢失归属)。
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#333", marginBottom: 4 }}>
            客户转移给
          </label>
          <select
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            style={{
              width: "100%", padding: 8, border: "1px solid #ddd",
              borderRadius: 4, fontSize: 13, boxSizing: "border-box", background: "#fff",
            }}
          >
            <option value="admin">超级管理员</option>
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px", fontSize: 14, cursor: "pointer",
              background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, color: "#555",
            }}
          >取消</button>
          <button className="btn-danger" onClick={submit} disabled={busy}>
            {busy ? "删除中…" : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, logout } = useAuth();

  // 未登录 → 拦截到 LoginPage
  if (!user) return <LoginPage />;

  return <AdminShell user={user} onLogout={logout} />;
}

function AdminShell({ user, onLogout }: {
  user: { username: string; display_name: string; role: string };
  onLogout: () => void;
}) {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [tabs, setTabs] = useState<Tab[]>([{ id: "home", label: "首页" }]);
  // 侧栏折叠:从 localStorage 读取初始值,之后每次变化持久化
  const COLLAPSE_KEY = "admin:sidebar:collapsed";
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1"
  );
  const [clock, setClock] = useState(new Date());
  const [spinning, setSpinning] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 折叠状态持久化
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // 快捷键:Ctrl/Cmd+B 切换折叠;[ (非输入框)切换折叠
  // 用 ref 持有 setCollapsed 引用,避免依赖数组反复变更 + StrictMode 双挂载造成监听器失效
  const setCollapsedRef = useRef(setCollapsed);
  setCollapsedRef.current = setCollapsed;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName) || "";
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsedRef.current(v => !v);
      } else if (e.key === "[" && !inField) {
        setCollapsedRef.current(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 点击下拉外区域关闭
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen]);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    if (!tabs.find(t => t.id === page)) {
      setTabs(prev => [...prev, { id: page, label: pageLabels[page] }]);
    }
    setUserMenuOpen(false);
  };

  const closeTab = (id: Page, e: MouseEvent) => {
    e.stopPropagation();
    if (id === "home") return;
    const next = tabs.filter(t => t.id !== id);
    setTabs(next);
    if (currentPage === id) setCurrentPage(next[next.length - 1].id);
  };

  const refresh = () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 800);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    onLogout();
  };

  const clockStr = clock.toLocaleString("zh-CN", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const displayName = user.display_name || user.username;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <header className="admin-header">
        <div className="header-logo">
          <button className="collapse-btn" onClick={() => setCollapsed(v => !v)}>☰</button>
          <div className="logo-icon">₿</div>
          <span className="logo-title">皮总团队交易所</span>
          <span style={{ marginLeft: 10, fontSize: 14, color: "#888", fontWeight: 400 }}>
            · 欢迎,{displayName}
          </span>
        </div>
        <div className="header-actions">
          {/* 用户下拉 */}
          <div ref={userMenuRef} style={{ position: "relative" }}>
            <button
              className="header-user"
              onClick={() => setUserMenuOpen(v => !v)}
              style={{
                background: userMenuOpen ? "rgba(24,144,255,0.1)" : "transparent",
                border: "none", cursor: "pointer", padding: "4px 10px",
                borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <div className="header-avatar">👤</div>
              <span>{displayName}</span>
              <span style={{ fontSize: 14, opacity: 0.8, transition: "transform 0.2s", transform: userMenuOpen ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
            </button>
            {userMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                minWidth: 180, background: "white",
                border: "1px solid #e8e8e8", borderRadius: 6,
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                padding: "4px 0", zIndex: 1000,
              }}>
                <DropdownItem icon="👤" label="个人中心" onClick={() => navigate("profile")} />
                <DropdownItem icon="🔑" label="修改密码" onClick={() => navigate("profile")} />
                <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />
                <DropdownItem icon="⎋" label="退出登录" onClick={handleLogout} danger />
              </div>
            )}
          </div>
          <button className="header-btn">⛶ 全屏</button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button className="tab-nav-btn" onClick={() => tabsRef.current?.scrollBy(-80, 0)}>‹</button>
        <div className="tabs-scroll" ref={tabsRef}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-item ${currentPage === tab.id ? "active" : ""}`}
              onClick={() => navigate(tab.id)}
            >
              {tab.label}
              {tab.id !== "home" && (
                <span className="tab-close" onClick={e => closeTab(tab.id, e)}>×</span>
              )}
            </button>
          ))}
        </div>
        <div className="tab-right-actions">
          <button className="tab-nav-btn" style={{ border: "none" }} onClick={() => tabsRef.current?.scrollBy(80, 0)}>›</button>
          <button
            className="refresh-btn"
            onClick={refresh}
            style={{ transform: spinning ? "rotate(360deg)" : "none", transition: spinning ? "transform 0.8s linear" : "none" }}
          >
            ↺ 刷新
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigate}
          collapsed={collapsed}
          username={displayName}
          onLogout={handleLogout}
        />
        <main className="main-content">
          {renderPage(currentPage, navigate)}
        </main>
      </div>

      {/* Footer */}
      <footer className="admin-footer">
        <span>{clockStr}</span>
        <span>copyright 2026 皮总团队交易所 reserved revision beta 1.0 release 2026/04/30</span>
      </footer>
    </div>
  );
}

function DropdownItem({ icon, label, onClick, danger }: {
  icon: ReactNode; label: string;
  onClick: () => void; danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 16px",
        background: hover ? (danger ? "#fff1f0" : "#f5f5f5") : "transparent",
        color: danger ? "#ff4d4f" : "#333",
        border: "none", borderRadius: 0,
        textAlign: "left", cursor: "pointer",
        fontSize: 14, fontWeight: 500,
      }}
    >
      <span style={{ width: 16, fontSize: 14, textAlign: "center" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
