/**
 * 前台 用户端 API 抽象层
 *
 * 风格对齐 admin/src/api.ts — Vite 已 proxy /api → :3001
 * 错误结构: { error: string_code, message: string_human }
 * 抛 ApiError 时带 .code / .status
 */

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

// 走 A 台 nginx 反代(/api → B 台 :3001),HTTPS 友好,无 mixed content
const API = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new ApiError(
      data?.error || `HTTP_${res.status}`,
      data?.message || data?.error || `HTTP ${res.status}`,
      res.status
    );
  }
  return data as T;
}

// ─── 类型 ────────────────────────────────────────────────────────────────────
export interface BankWallet {
  id: number;
  member_id: number;
  bank_name: string;
  card_no: string;
  holder: string;
  id_number?: string | null;
  branch: string;
  ifsc: string;
  contact: string;
  notes: string;
  is_default: 0 | 1;
  created_at: string;
}

export interface DigitalWallet {
  id: number;
  member_id: number;
  type1: 'USDT' | 'BTC' | 'ETH';
  type2: string;
  address: string;
  notes: string;
  is_default: 0 | 1;
  created_at: string;
}

export interface Withdrawal {
  id: number;
  member_id: number;
  wallet_id: number | null;
  wallet_type: 'bank' | 'digital' | null;
  amount: string | number;
  fee: string | number;
  actual_amount: string | number;
  approved: string | number;
  status: '申请中' | '已同意' | '已拒绝' | '已退款';
  type: string;
  apply_time: string;
  approve_time: string | null;
  reviewer: string;
  reject_reason: string;
  admin_note: string;
  // 银行快照
  snap_bank_name?: string | null;
  snap_card_no?: string | null;
  snap_holder?: string | null;
  snap_branch?: string | null;
  snap_ifsc?: string | null;
  snap_id_number?: string | null;
  // 数字币快照
  snap_coin_type?: string | null;
  snap_network?: string | null;
  snap_address?: string | null;
}

export interface FundRecord {
  id: number;
  member_id: number;
  type: string;
  before: string | number;
  amount: string | number;
  after: string | number;
  notes: string;
  time: string;
}

// ─── 钱包 ────────────────────────────────────────────────────────────────────
export const api = {
  // 银行卡
  listBankWallets:  (memberId: number) =>
    request<{ data: BankWallet[] }>(`/members/${memberId}/wallets/bank`),

  createBankWallet: (memberId: number, payload: Omit<BankWallet, 'id' | 'member_id' | 'created_at'>) =>
    request<{ ok: boolean; id: number }>(`/members/${memberId}/wallets/bank`, {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateBankWallet: (memberId: number, wid: number, payload: Partial<BankWallet>) =>
    request<{ ok: boolean }>(`/members/${memberId}/wallets/bank/${wid}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  deleteBankWallet: (memberId: number, wid: number) =>
    request<{ ok: boolean }>(`/members/${memberId}/wallets/bank/${wid}`, {
      method: "DELETE",
    }),

  // 数字币
  listDigitalWallets:  (memberId: number) =>
    request<{ data: DigitalWallet[] }>(`/members/${memberId}/wallets/digital`),

  createDigitalWallet: (memberId: number, payload: Omit<DigitalWallet, 'id' | 'member_id' | 'created_at'>) =>
    request<{ ok: boolean; id: number }>(`/members/${memberId}/wallets/digital`, {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateDigitalWallet: (memberId: number, wid: number, payload: Partial<DigitalWallet>) =>
    request<{ ok: boolean }>(`/members/${memberId}/wallets/digital/${wid}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  deleteDigitalWallet: (memberId: number, wid: number) =>
    request<{ ok: boolean }>(`/members/${memberId}/wallets/digital/${wid}`, {
      method: "DELETE",
    }),

  // 提现
  createWithdrawal: (payload: {
    member_id: number;
    wallet_type: 'bank' | 'digital';
    wallet_id: number;
    amount: number;
    fund_password: string;
  }) =>
    request<{
      ok: boolean;
      withdrawal: Withdrawal;
      balance: number;
      frozen: number;
    }>(`/withdrawals`, { method: "POST", body: JSON.stringify(payload) }),

  myWithdrawals: (memberId: number, status?: string) => {
    const q = new URLSearchParams({ member_id: String(memberId) });
    if (status) q.set("status", status);
    return request<{ data: Withdrawal[] }>(`/withdrawals/mine?${q}`);
  },

  // 资金记录(给前端用, FundRecordsPage 当前直 fetch 也行,这里保留)
  myFunds: (memberId: number, limit = 200) =>
    request<{ data: FundRecord[] }>(`/funds/mine?member_id=${memberId}&limit=${limit}`),
};