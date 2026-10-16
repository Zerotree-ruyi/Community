/**
 * Admin AuthContext — 后台管理员账号认证
 *
 * 设计:
 *  - 启动时从 localStorage['admin_user'] 读
 *  - login 调 /api/admin/login,成功后写 localStorage + state
 *  - changePassword 调 /api/admin/change-password
 *  - regenerateInvite 调 /api/admin/regenerate-invite
 *  - 本期不做 token/session 校验(后端无状态,前端 localStorage 即可)
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
const AuthContext = createContext<AuthValue | undefined>(undefined);

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
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = (u: AdminUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const setUser = useCallback((u: AdminUser) => persist(u), []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const data = await postJSON<{ user: AdminUser }>('/admin/login', { username, password });
      persist(data.user);
      return true;
    } catch (e: any) {
      setError(e.code || 'network_error');
      return false;
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => persist(null), []);
  const clearError = useCallback(() => setError(null), []);

  const changePassword = useCallback(async (id: number, oldPwd: string, newPwd: string) => {
    try {
      await postJSON('/admin/change-password', { id, oldPassword: oldPwd, newPassword: newPwd });
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
