/**
 * Admin AuthContext — 后台管理员账号认证
 *
 * 设计:
 *  - 启动时从 localStorage['admin_user'] + localStorage['admin_token'] 读
 *  - login 调 /api/admin/login,成功后拿后端签发的 token 存起来
 *  - 之后每个请求自动带 `Authorization: Bearer <token>`(见 main.tsx 的 fetch 包装)
 *  - 启动时用 GET /api/admin/me 验一次 token —— 过期/被踢就自动退回登录页
 *
 * ⚠️ 这里不再用「前端自己填一个 id 给后端」的方式。
 *    以前所有请求带 `X-Admin-Id`,公网上任何人加这个头就是超管。
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  role: 'super' | 'admin' | 'operator';
  status: number;
  invite_code: string;
  last_login_time: string | null;
  created_at: string;
}

interface AuthValue {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (id: number, oldPwd: string, newPwd: string) => Promise<{ ok: boolean; code?: string; message?: string }>;
  regenerateInvite: (id: number) => Promise<{ ok: boolean; invite_code?: string; code?: string; message?: string }>;
  setUser: (u: AdminUser) => void;     // 邀请码更新后,刷新本地 user
  clearError: () => void;
}

const STORAGE_KEY = 'admin_user';
const TOKEN_KEY = 'admin_token';
const AuthContext = createContext<AuthValue | undefined>(undefined);

// ─── 令牌存取 ────────────────────────────────────────────────────────────────
// main.tsx 的 fetch 包装器要用,所以导出。
export function getAdminToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}
export function setAdminToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* 隐私模式下 localStorage 可能不可写 */ }
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
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
  const [user, setUserState] = useState<AdminUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try { setUserState(e.newValue ? JSON.parse(e.newValue) : null); }
        catch { setUserState(null); }
      }
      if (e.key === TOKEN_KEY && !e.newValue) setUserState(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((u: AdminUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else {
      localStorage.removeItem(STORAGE_KEY);
      setAdminToken('');
    }
  }, []);

  const setUser = useCallback((u: AdminUser) => persist(u), [persist]);

  // 启动时验一次 token —— 令牌过期 / 被踢 / 后端改了库,都能自动退回登录页
  useEffect(() => {
    const token = getAdminToken();
    if (!token || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.status === 401 || res.status === 403) {
          if (!cancelled) persist(null);
        }
      } catch { /* 网络断了就先不踢,下次操作会再验 */ }
    })();
    return () => { cancelled = true; };
  }, [user, persist]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const data = await postJSON<{ user: AdminUser; token?: string }>('/admin/login', { username, password });
      // 令牌存起来 —— 后面的请求靠它证明「我是谁」
      setAdminToken(data.token ?? '');
      persist(data.user);
      return true;
    } catch (e: any) {
      setError(e.code || 'network_error');
      return false;
    } finally { setLoading(false); }
  }, [persist]);

  const logout = useCallback(() => {
    // 先跟后端说一声(作废令牌),失败了也照样清本地
    void fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    persist(null);
  }, [persist]);

  const clearError = useCallback(() => setError(null), []);

  const changePassword = useCallback(async (id: number, oldPwd: string, newPwd: string) => {
    try {
      const data = await postJSON<{ ok: boolean; token?: string }>('/admin/change-password',
        { id, oldPassword: oldPwd, newPassword: newPwd });
      // 改完密码后端会换一个新令牌 —— 把旧的换掉,不然下次请求就 401 了
      if (data?.token) setAdminToken(data.token);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, code: e.code, message: e.message };
    }
  }, []);

  const regenerateInvite = useCallback(async (id: number) => {
    try {
      const data = await postJSON<{ ok: boolean; invite_code: string }>('/admin/regenerate-invite', { id });
      // 同步更新本地 user
      setUserState(prev => prev ? { ...prev, invite_code: data.invite_code } : prev);
      if (user) {
        const next = { ...user, invite_code: data.invite_code };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return { ok: true, invite_code: data.invite_code };
    } catch (e: any) {
      return { ok: false, code: e.code, message: e.message };
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, loading, error,
      login, logout, changePassword, regenerateInvite, setUser, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
