/**
 * AuthContext — 前台用户认证状态
 *
 * 设计:
 *  - 启动时从 localStorage 读取上次登录的用户
 *  - login / register 调 /api/auth/* 接口
 *  - 成功后把 user 对象写回 localStorage
 *  - 失败时把后端的 error 字段(如 'account_taken')放进 error 状态供 UI 翻译
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { safePwd } from '../utils/safePwd';

export interface User {
  id: number;
  account: string;
  nickname?: string | null;
  status: number;
  balance: number;
  frozen: number;
  credit: string;
  tag: string;
  direction?: "涨" | "跌";
  ban_order: number;
  ban_withdraw: number;
  agent_id: number;
  invite_code: string;
  type: string;
  kyc_status: string;
  register_time: string;
  /** 会话令牌 — 后台「下线」会旋转此值,本地发现不一致即自动登出 */
  session_token?: string;
}

export interface RegisterPayload {
  account: string;
  email: string;
  password: string;
  fundPassword: string;
  fundPasswordConfirm: string;
  inviteCode: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (account: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'exchange_user';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// 走 A 台 nginx 反代(/api → B 台 :3001),HTTPS 友好,无 mixed content
//   - login / register / 任何 postJSON 调用都走这里
const DIRECT_API = "/api";

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${DIRECT_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const err: any = new Error(data.message || data.error || `HTTP ${res.status}`);
    err.code = data.error || 'network_error';
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 跨标签页同步登出/登入
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 会员自己改密码 → 后端会旋转 session_token,组件会把新 token 写进 localStorage
  //   这里监听一下,把内存里的 user 也换掉(SSE 才会用新 token 重新订阅)
  useEffect(() => {
    const onRotated = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        setUser(JSON.parse(raw) as User);
      } catch { /* ignore */ }
    };
    window.addEventListener('exchange_session_rotated', onRotated);
    return () => window.removeEventListener('exchange_session_rotated', onRotated);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const login = useCallback(async (account: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await postJSON<{ user: User }>('/auth/login', { account, password });
      persist(data.user);
      return true;
    } catch (e: any) {
      setError(e.code || 'network_error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true);
    setError(null);
    try {
      // 客户端兜底:资金密码两次必须一致(后端也会校验,这里给即时反馈)
      if (payload.fundPassword !== payload.fundPasswordConfirm) {
        setError('fund_password_mismatch');
        setLoading(false);
        return false;
      }
      const data = await postJSON<{ user: User }>('/auth/register', {
        account: payload.account,
        password: payload.password,
        // 提交前用 safePwd 转 14 位 base62 强密码,屏蔽 Chrome 密码泄露警告
        fundPassword: safePwd(payload.fundPassword),
        fundPasswordConfirm: safePwd(payload.fundPasswordConfirm),
        inviteCode: payload.inviteCode,
      });
      persist(data.user);
      return true;
    } catch (e: any) {
      setError(e.code || 'network_error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => persist(null), []);

  const clearError = useCallback(() => setError(null), []);

  // 从服务器刷新当前用户(余额、信誉等)
  //   - 若返回的 session_token 与本地不一致 → 视为被后台强制下线,自动登出
  //   - 若 status=0 (账号被禁用) → 也自动登出
  const refresh = useCallback(async () => {
    let current: User | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) current = JSON.parse(raw) as User;
    } catch { /* ignore */ }
    if (!current?.id) return;
    try {
      const res = await fetch(`/api/auth/me?member_id=${current.id}`);
      const data = await res.json().catch(() => ({} as any));
      const fresh: User | undefined = data?.user;
      if (!fresh) return;

      // 401/403 = 身份对不上(令牌过期、被踢、或者老账号压根没有 session_token)。
      //   这时候不能继续用本地的旧数据装正常 —— 让用户重新登录一次,
      //   重新登录会发一个全新的 session_token,之后一切照旧。
      if (res.status === 401 || res.status === 403) {
        persist(null);
        try {
          sessionStorage.setItem(
            'exchange_kicked_msg',
            'Your session has expired. Please sign in again.'
          );
        } catch { /* ignore */ }
        try { window.location.assign('/login'); } catch { /* ignore */ }
        return;
      }

      // 会话令牌被旋转 → 后台踢人
      if (current.session_token && fresh.session_token &&
          current.session_token !== fresh.session_token) {
        persist(null);
        try {
          sessionStorage.setItem(
            'exchange_kicked_msg',
            'Your account has been logged in on another device or forcibly logged out by an administrator'
          );
        } catch { /* ignore */ }
        // 跳转登录页
        try { window.location.assign('/login'); } catch { /* ignore */ }
        return;
      }

      // 账号被禁用
      if (fresh.status === 0 && current.status !== 0) {
        persist(null);
        try {
          sessionStorage.setItem('exchange_kicked_msg', 'Your account has been disabled');
        } catch { /* ignore */ }
        try { window.location.assign('/login'); } catch { /* ignore */ }
        return;
      }

      persist(fresh);
    } catch {
      // 静默失败,保留本地状态
    }
  }, []);

  // 定期 poll /api/auth/me,及时发现后台「强制下线」
  //  - 登录中:每 15 秒检查一次
  //  - 未登录:不轮询
  //  (这只是兜底;真正的实时更新靠下面的 SSE 推送)
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => { refresh(); }, 15_000);
    return () => clearInterval(id);
  }, [user, refresh]);

  // ─── 实时推送(SSE)────────────────────────────────────────────────────────────
  // 后台改了信用分 / 余额 / 冻结 / 状态,后端会立刻通过这条流推过来,
  // 前台不用等 15 秒轮询就能看到新值。
  //
  // 浏览器 EventSource 自带断线重连,所以这里不用自己写重试逻辑;
  // 连不上时会退回到上面的 15 秒轮询,功能不受影响。
  useEffect(() => {
    const memberId = user?.id;
    if (!memberId) return;

    let source: EventSource | null = null;
    let closed = false;

    // EventSource 不能自定义 header,会话令牌只能走 query
    const token = user?.session_token ? `?token=${encodeURIComponent(user.session_token)}` : '';
    try {
      source = new EventSource(`/api/members/${memberId}/stream${token}`);
    } catch {
      source = null;
    }
    if (!source) return;

    source.onmessage = (ev) => {
      if (closed) return;
      let payload: any;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }
      // 后台强制下线 / 作废会话 —— 立刻下线,不用等 15 秒轮询
      if (payload?.type === 'session-revoked') {
        try {
          sessionStorage.setItem(
            'exchange_kicked_msg',
            'Your account has been logged in on another device or forcibly logged out by an administrator'
          );
        } catch { /* ignore */ }
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        try { window.location.assign('/login'); } catch { /* ignore */ }
        return;
      }

      const m = payload?.member;
      if (!m) return;

      setUser((prev) => {
        if (!prev || Number(prev.id) !== Number(m.id)) return prev;

        // 账号被后台禁用 → 立刻下线(不用等 15 秒轮询)
        if (Number(m.status) === 0 && Number(prev.status) !== 0) {
          try {
            sessionStorage.setItem('exchange_kicked_msg', 'Your account has been disabled');
          } catch { /* ignore */ }
          try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
          try { window.location.assign('/login'); } catch { /* ignore */ }
          return null;
        }

        const next: User = {
          ...prev,
          balance: Number(m.balance ?? prev.balance),
          frozen: Number(m.frozen ?? prev.frozen),
          credit: String(m.credit ?? prev.credit),
          status: Number(m.status ?? prev.status),
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    };

    // 连接出问题一般交给 EventSource 自己重连,避免和轮询打架。
    // 但有一种是"重连也没用"的:服务端没有这个接口(404 / Content-Type 不对)
    // —— 这时浏览器会把 readyState 置成 CLOSED 并且不再重连。
    // 这时我们主动 close() 关掉,前台退回 15 秒轮询,只是慢一点,不会一直报错。
    source.onerror = () => {
      if (source && source.readyState === 2 /* CLOSED */) {
        try { source.close(); } catch { /* ignore */ }
      }
    };

    return () => {
      closed = true;
      try { source?.close(); } catch { /* ignore */ }
    };
  }, [user?.id, user?.session_token]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
