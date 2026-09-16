/**
 * 前端 API 客户端 — 调用 Express 后端 (admin/server.ts)
 * 通过 Vite 代理转发,前端直接 fetch("/api/...") 即可
 */

const API = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Stats {
  members: number;
  todayMembers: number;
  pendingWithdrawals: number;
  todayWithdraw: number;
  todayRecharge: number;
}

export interface Member {
  id: number;
  account: string;
  status: number;
  balance: string | number;
  frozen: string | number;
  credit: string;
  tag: string;
  direction: "涨" | "跌";
  ban_order: number;
  ban_withdraw: number;
  agent_id: number;
  invite_code: string;
  type: string;
  kyc_status: string;
  register_time: string;
  last_login_time: string | null;
  last_login_ip: string | null;
}

export interface Withdrawal {
  id: number;
  member_id: number;
  member_account?: string | null;
  wallet_id: number | null;
  wallet_type: "bank" | "digital" | null;
  status: "申请中" | "已同意" | "已拒绝" | "已退款";
  reject_reason: string;
  admin_note: string;
  amount: number;
  fee: number;
  actual_amount: number;
  approved: number;
  type: string;
  apply_time: string;
  approve_time: string | null;
  reviewer: string;
  // 银行快照
  snap_bank_name?: string | null;
  snap_card_no?:   string | null;
  snap_holder?:    string | null;
  snap_branch?:    string | null;
  snap_ifsc?:      string | null;
  snap_id_number?: string | null;
  // 数字币快照
  snap_coin_type?: string | null;
  snap_network?:   string | null;
  snap_address?:   string | null;
}

export interface BankWalletRow {
  id: number;
  member_id: number;
  member_account?: string | null;
  bank_name: string;
  card_no: string;
  holder: string;
  id_number: string | null;
  branch: string;
  ifsc: string;
  contact: string;
  notes: string;
  is_default: 0 | 1;
  created_at: string;
}

export interface DigitalWalletRow {
  id: number;
  member_id: number;
  member_account?: string | null;
  type1: "USDT" | "BTC" | "ETH";
  type2: string;
  address: string;
  notes: string;
  is_default: 0 | 1;
  created_at: string;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),

  stats: () => request<Stats>("/stats"),

  members: (params?: {
    limit?: number;
    offset?: number;
    status?: number | string;
    type?: string;
    kyc?: string;
    keyword?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.limit)       q.set("limit",   String(params.limit));
    if (params?.offset)      q.set("offset",  String(params.offset));
    if (params?.status !== undefined && params.status !== "") q.set("status", String(params.status));
    if (params?.type)        q.set("type",    params.type);
    if (params?.kyc)         q.set("kyc",     params.kyc);
    if (params?.keyword)     q.set("keyword", params.keyword);
    const qs = q.toString() ? `?${q}` : "";
    return request<{ data: Member[]; total: number; normal: number; disabled: number }>(`/members${qs}`);
  },

  toggleMemberStatus: (id: number) =>
    request<{ ok: boolean }>(`/members/${id}/toggle-status`, {
      method: "POST",
    }),

  updateMember: (id: number, payload: {
    nickname:    string;
    phone:       string;
    email:       string;
    gender:      "男" | "女" | "";
    remark:      string;
    credit:      string;
    win_mode?:   number;  // 1=要赢 0=要输 2=随机
    tag:         string;
    status:      "启用" | "禁用";
    direction:   "up" | "down";
    ban_order:   "allow" | "ban";
    ban_withdraw: "allow" | "ban";
    reviewer?:   string;
  }) =>
    request<{ ok: boolean; member: Member }>(`/members/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  rechargeMember: (id: number, amount: number, notes: string, reviewer = "admin") =>
    request<{ ok: boolean; record_id: number; account: string; before: number; after: number; amount: number; type: string; notes: string }>(
      `/members/${id}/recharge`,
      { method: "POST", body: JSON.stringify({ amount, notes, reviewer }) },
    ),

  deductMember: (id: number, amount: number, notes: string, reviewer = "admin") =>
    request<{ ok: boolean; record_id: number; account: string; before: number; after: number; amount: number; type: string; notes: string }>(
      `/members/${id}/deduct`,
      { method: "POST", body: JSON.stringify({ amount, notes, reviewer }) },
    ),

  freezeMember: (id: number, amount: number, notes: string, action: "freeze" | "unfreeze", reviewer = "admin") =>
    request<{ ok: boolean; account: string; action: string; amount: number; balance: number; frozen: number }>(
      `/members/${id}/freeze`,
      { method: "POST", body: JSON.stringify({ amount, notes, action, reviewer }) },
    ),

  resetLoginPassword: (id: number, newPassword: string, reviewer = "admin") =>
    request<{ ok: boolean; account: string; action: string }>(
      `/members/${id}/reset-password`,
      { method: "POST", body: JSON.stringify({ new_password: newPassword, reviewer }) },
    ),

  resetFundPassword: (id: number, newPassword: string, reviewer = "admin") =>
    request<{ ok: boolean; account: string; action: string }>(
      `/members/${id}/reset-fund-password`,
      { method: "POST", body: JSON.stringify({ new_password: newPassword, reviewer }) },
    ),

  sendMessage: (payload: { member_id?: number | null; title: string; content: string; sender?: string }) =>
    request<{ ok: boolean; id: number; member_id: number | null }>(
      `/messages`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  listMessages: (params?: {
    limit?: number; offset?: number;
    member_id?: number; member_filter?: "all" | "specific" | "";
    read?: "read" | "unread" | ""; keyword?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.limit)         q.set("limit",         String(params.limit));
    if (params?.offset)        q.set("offset",        String(params.offset));
    if (params?.member_id)     q.set("member_id",     String(params.member_id));
    if (params?.member_filter) q.set("member_filter", params.member_filter);
    if (params?.read)          q.set("read",          params.read);
    if (params?.keyword)       q.set("keyword",       params.keyword);
    const qs = q.toString() ? `?${q}` : "";
    return request<{
      data: Array<{
        id: number;
        member_id: number | null;
        member_account: string | null;
        title: string;
        content: string;
        sender: string;
        send_time: string;
        read_time: string | null;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>(`/messages${qs}`);
  },

  withdrawals: (params?: {
    limit?: number; offset?: number;
    status?: string; type?: string;
    member_id?: number; member_account?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.limit)   q.set("limit",   String(params.limit));
    if (params?.offset)  q.set("offset",  String(params.offset));
    if (params?.status)  q.set("status",  params.status);
    if (params?.type)    q.set("type",    params.type);
    if (params?.member_id)      q.set("member_id",      String(params.member_id));
    if (params?.member_account) q.set("member_account", params.member_account);
    const qs = q.toString() ? `?${q}` : "";
    return request<{ data: Withdrawal[]; total: number; limit: number; offset: number }>(`/withdrawals${qs}`);
  },

  orders: (params?: {
    limit?: number; offset?: number;
    order_id?: number; symbol?: string; status?: string; direction?: string;
    member_account?: string; agent_id?: number; invite_code?: string;
    start_time?: string; end_time?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.limit)          q.set("limit",          String(params.limit));
    if (params?.offset)         q.set("offset",         String(params.offset));
    if (params?.order_id)       q.set("order_id",       String(params.order_id));
    if (params?.symbol)         q.set("symbol",         params.symbol);
    if (params?.status)         q.set("status",         params.status);
    if (params?.direction)      q.set("direction",      params.direction);
    if (params?.member_account) q.set("member_account", params.member_account);
    if (params?.agent_id)       q.set("agent_id",       String(params.agent_id));
    if (params?.invite_code)    q.set("invite_code",    params.invite_code);
    if (params?.start_time)     q.set("start_time",     params.start_time);
    if (params?.end_time)       q.set("end_time",       params.end_time);
    const qs = q.toString() ? `?${q}` : "";
    return request<{
      data: Array<{
        id: number; agent_id: number; invite_code: string;
        member_id: number; member_account: string | null;
        symbol: string; direction: "涨" | "跌";
        amount: string | number; open_price: string | number; close_price: string | number | null;
        profit: string | number | null; status: string;
        open_time: string; close_time: string | null;
        period: string | null; return_rate: string | number | null;
        win_flag: number; scale: string | number | null;
        billing_time: string | null; settle_amount: string | number | null;
      }>;
      total: number; limit: number; offset: number;
    }>(`/orders${qs}`);
  },

  funds: (params?: {
    limit?:         number;
    offset?:        number;
    type?:          string;
    member_account?:string;
    member_id?:     number;
    agent_id?:      number;
    invite_code?:   string;
    start_time?:    string;
    end_time?:      string;
  }) => {
    const q = new URLSearchParams();
    if (params?.limit)         q.set("limit",         String(params.limit));
    if (params?.offset)        q.set("offset",        String(params.offset));
    if (params?.type)          q.set("type",          params.type);
    if (params?.member_account)q.set("member_account",params.member_account);
    if (params?.member_id)     q.set("member_id",     String(params.member_id));
    if (params?.agent_id)      q.set("agent_id",      String(params.agent_id));
    if (params?.invite_code)   q.set("invite_code",   params.invite_code);
    if (params?.start_time)    q.set("start_time",    params.start_time);
    if (params?.end_time)      q.set("end_time",      params.end_time);
    const qs = q.toString() ? `?${q}` : "";
    return request<{
      data: Array<{
        id: number; agent_id: number; invite_code: string;
        member_id: number; member_account: string | null;
        before: string; amount: string; after: string;
        type: string; notes: string; time: string;
      }>;
      total: number; sum: string; limit: number; offset: number;
    }>(`/funds${qs}`);
  },

  reportInout: (params?: {
    agent_id?:       number;
    invite_code?:    string;
    member_account?: string;
    member_id?:      number;
    start_time?:     string;
    end_time?:       string;
    limit?:          number;
    offset?:         number;
  }) => {
    const q = new URLSearchParams();
    if (params?.agent_id)       q.set("agent_id",       String(params.agent_id));
    if (params?.invite_code)    q.set("invite_code",    params.invite_code);
    if (params?.member_account) q.set("member_account", params.member_account);
    if (params?.member_id)      q.set("member_id",      String(params.member_id));
    if (params?.start_time)     q.set("start_time",     params.start_time);
    if (params?.end_time)       q.set("end_time",       params.end_time);
    if (params?.limit)          q.set("limit",          String(params.limit));
    if (params?.offset)         q.set("offset",         String(params.offset));
    const qs = q.toString() ? `?${q}` : "";
    return request<{
      summary: {
        total_in:           number;
        total_out:          number;
        profit:             number;
        member_count_register: number;
        member_count_in:    number;
        member_count_out:   number;
      };
      data: Array<{
        id: number; agent_id: number; invite_code: string;
        member_id: number; member_account: string | null;
        before: string; amount: string; after: string;
        type: string; notes: string; time: string;
      }>;
      total: number; limit: number; offset: number;
    }>(`/report/inout${qs}`);
  },

  approveWithdrawal: (id: number, payload: { reviewer: string; approved?: number; admin_note?: string }) =>
    request<{ ok: boolean; account: string; amount: number; approved: number }>(
      `/withdrawals/${id}/approve`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  rejectWithdrawal: (id: number, payload: { reviewer: string; reject_reason: string; admin_note?: string }) =>
    request<{ ok: boolean; account: string; refunded: number }>(
      `/withdrawals/${id}/reject`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  // 钱包查询(admin 端按会员过滤)
  listBankWallets: (params?: { member_id?: number; member_account?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.member_id)      q.set("member_id",      String(params.member_id));
    if (params?.member_account) q.set("member_account", params.member_account);
    if (params?.limit)          q.set("limit",          String(params.limit));
    if (params?.offset)         q.set("offset",         String(params.offset));
    const qs = q.toString() ? `?${q}` : "";
    return request<{ data: BankWalletRow[]; total: number; limit: number; offset: number }>(`/wallets/bank${qs}`);
  },

  listDigitalWallets: (params?: { member_id?: number; member_account?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.member_id)      q.set("member_id",      String(params.member_id));
    if (params?.member_account) q.set("member_account", params.member_account);
    if (params?.limit)          q.set("limit",          String(params.limit));
    if (params?.offset)         q.set("offset",         String(params.offset));
    const qs = q.toString() ? `?${q}` : "";
    return request<{ data: DigitalWalletRow[]; total: number; limit: number; offset: number }>(`/wallets/digital${qs}`);
  },
};