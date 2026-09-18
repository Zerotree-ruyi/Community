/**
 * Admin LoginPage — 后台管理员登录
 *
 * 全屏居中卡片,深色背景,带品牌 logo。
 * 调用 AuthContext.login(),成功后由 App 的 isLoggedIn 切到主界面。
 *
 * IP 显示策略(浏览器优先,因为浏览器走用户的梯子):
 *  1) 浏览器并发打5 个公网 IP API — 任一成功即用
 *     (浏览器在梯子后面 → 拿到的是梯子出口 IP,不是真实 IP)
 *  2) 浏览器失败时,降级用后端 /api/admin/login-context
 *     (后端在用户机器上直连 → 拿到的是真实公网 IP)
 *  3) 全失败时显示 "—"
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from './auth';

interface LoginContext {
  current_ip: string;
  current_region: '本机' | '内网' | '公网' | '未知' | string;
  public_ip: string | null;
  public_ip_src: string | null;
  last_login: { last_login_time: string | null; last_login_ip: string | null } | null;
}

// ── 浏览器侧公网 IP 查询 ────────────────────────────
// 浏览器通过用户的梯子出站 — 拿到的 IP 就是用户在公网上看到的 IP
// 多个 API 并发 race(任一成功即用),5 秒超时
async function fetchPublicIpBrowser(): Promise<{ ip: string; source: string } | null> {
  const sources: Array<{
    name: string; url: string;
    type: 'json' | 'text' | 'raw';
    extract: (data: any) => string | null;
  }> = [
    { name: 'ipify',       url: 'https://api.ipify.org?format=json',         type: 'json', extract: d => typeof d?.ip === 'string' ? d.ip : null },
    { name: 'ip.sb',       url: 'https://api.ip.sb/lookup?format=json',      type: 'json', extract: d => typeof d?.ip === 'string' ? d.ip : null },
    { name: 'ifconfig.me', url: 'https://ifconfig.me/ip',                    type: 'text', extract: t => { const s = String(t ?? '').trim(); return isPublicIp(s) ? s : null; } },
    { name: 'icanhazip',   url: 'https://icanhazip.com/',                    type: 'text', extract: t => { const s = String(t ?? '').trim(); return isPublicIp(s) ? s : null; } },
    { name: 'cloudflare',  url: 'https://cloudflare.com/cdn-cgi/trace',      type: 'text', extract: t => { const m = String(t ?? '').match(/^ip=([^\n]+)/m); const v = m ? m[1].trim() : null; return isPublicIp(v) ? v : null; } },
    { name: 'pconline',    url: 'https://whois.pconline.com.cn/ipJson.jsp?json=true', type: 'json', extract: d => typeof d?.ip === 'string' ? d.ip : null },
  ];

  const tasks = sources.map(async (cfg) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const r = await fetch(cfg.url, {
        signal: ctrl.signal,
        // 浏览器加 no-cors 也不行,这些 API 都开放 CORS
        headers: { 'Accept': '*/*' },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = cfg.type === 'json' ? await r.json() : await r.text();
      const ip = cfg.extract(data);
      if (!ip) throw new Error('empty/invalid');
      return { ok: true as const, ip, name: cfg.name };
    } catch (e: any) {
      return { ok: false as const, name: cfg.name, err: e?.message ?? String(e) };
    } finally {
      clearTimeout(timer);
    }
  });
  const results = await Promise.all(tasks);
  const winner = results.find(r => r.ok);
  if (!winner) return null;
  return { ip: winner.ip, source: winner.name };
}

function isPublicIp(v: any): v is string {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return false;
  const [a, b] = s.split('.').map(Number);
  if (a === 0 || a === 127) return false;
  if (a === 10) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 169 && b === 254) return false;
  return true;
}

// 后端备用 — 浏览器全失败时(被墙/没梯子)用
async function fetchLoginContext(refresh = false): Promise<LoginContext> {
  const qs = refresh ? '?refresh=1' : '';
  const r = await fetch(`/api/admin/login-context${qs}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`login-context ${r.status}`);
  return r.json();
}

export function LoginPage() {
  const { login, loading, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // 每次挂载都从空开始 — 强制刷新就重新查
  const [ipInfo, setIpInfo]     = useState<LoginContext | null>(null);
  const [ipLoading, setIpLoading] = useState(true);
  const [ipSource, setIpSource] = useState<'browser' | 'server' | 'none'>('none');

  useEffect(() => () => clearError(), [clearError]);

  // 策略:浏览器优先(走用户梯子)→ 后端兜底(直连)
  useEffect(() => {
    setIpInfo(null);
    setIpLoading(true);
    setIpSource('none');

    (async () => {
      // 1) 浏览器侧 — 走梯子,显示梯子出口 IP
      const browserResult = await fetchPublicIpBrowser();
      if (browserResult) {
        setIpInfo({
          current_ip: '', // 浏览器侧不提供
          current_region: '公网',
          public_ip: browserResult.ip,
          public_ip_src: `${browserResult.source}/browser`,
          last_login: null,
        });
        setIpSource('browser');
        setIpLoading(false);
        return;
      }
      // 2) 后端兜底 — 浏览器全失败(被墙/无 CORS)时用
      try {
        const info = await fetchLoginContext();
        setIpInfo(info);
        setIpSource('server');
      } catch {
        /* 全失败,保持 "—" */
      }
      setIpLoading(false);
    })();
  }, []);

  // 手动刷新 — 换梯子后用
  const handleRefreshIp = async () => {
    if (ipLoading) return;
    setIpLoading(true);
    setIpSource('none');

    // 强制重试浏览器侧
    const browserResult = await fetchPublicIpBrowser();
    if (browserResult) {
      setIpInfo({
        current_ip: '',
        current_region: '公网',
        public_ip: browserResult.ip,
        public_ip_src: `${browserResult.source}/browser`,
        last_login: null,
      });
      setIpSource('browser');
      setIpLoading(false);
      return;
    }
    // 浏览器失败再走后端(并强制刷新其缓存)
    try {
      const info = await fetchLoginContext(true);
      setIpInfo(info);
      setIpSource('server');
    } catch {
      /* keep */
    }
    setIpLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password || loading) return;
    await login(username, password);
  };

  const errorMsg = (() => {
    if (!error) return null;
    if (error === 'not_found' || error === 'wrong_password')
      return '账号或密码错误';
    if (error === 'account_disabled') return '账号已被禁用';
    if (error === 'ip_not_allowed') return '当前 IP 不在白名单内,请联系超级管理员';
    if (error === 'invalid_input') return '请输入账号和密码';
    return '登录失败,请重试';
  })();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1d3a 0%, #112a52 50%, #0a1d3a 100%)',
      padding: 16,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255,255,255,0.96)',
        borderRadius: 12,
        padding: '40px 32px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
      }}>
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, margin: '0px auto 12px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 32, fontWeight: 700,
            boxShadow: '0 4px 12px rgba(24,144,255,0.35)',
          }}>
            ₿
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
            皮总团队交易所
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888' }}>
            管理后台 · Admin Console
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6 }}>
              账号
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1px solid #d9d9d9', borderRadius: 6,
              padding: '0 12px', background: 'white',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ color: '#999', fontSize: 14 }}>👤</span>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); if (error) clearError(); }}
                placeholder="请输入账号"
                autoComplete="username"
                autoFocus
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 10px',
                  border: 'none', outline: 'none',
                  fontSize: 14, color: '#333', background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6 }}>
              密码
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1px solid #d9d9d9', borderRadius: 6,
              padding: '0 12px', background: 'white',
            }}>
              <span style={{ color: '#999', fontSize: 14 }}>🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) clearError(); }}
                placeholder="请输入密码"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 10px',
                  border: 'none', outline: 'none',
                  fontSize: 14, color: '#333', background: 'transparent',
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', marginBottom: 14,
              background: '#fff1f0', border: '1px solid #ffa39e',
              borderRadius: 4, color: '#cf1322', fontSize: 13,
            }}>
              <span style={{ fontSize: 14 }}>⚠</span>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!username || !password || loading}
            style={{
              width: '100%', padding: '11px 0',
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              color: 'white', border: 'none', borderRadius: 6,
              fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(24,144,255,0.3)',
              opacity: (!username || !password || loading) ? 0.5 : 1,
            }}
          >
            {loading && <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span>}
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        {/* 浏览器出口 IP(走用户梯子)— 反映真实使用环境 */}
        <div style={{
          marginTop: 18, padding: '8px 14px',
          background: '#fafbff', border: '1px solid #e6ebf5',
          borderRadius: 6, fontSize: 12, color: '#555',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888' }}>
            <span style={{ fontSize: 13 }}>🌐</span>
            {ipSource === 'browser' ? '出口 IP(浏览器)' :
             ipSource === 'server'   ? '本机公网 IP(直连)' :
             '公网 IP'}
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: '#333', fontWeight: 500,
            }}>
              {ipLoading ? '查询中…' : (ipInfo?.public_ip || '—')}
            </span>
            {!ipLoading && ipInfo?.public_ip_src && (
              <span style={{
                fontSize: 11, padding: '1px 6px', borderRadius: 3,
                background: ipSource === 'browser' ? '#f6ffed' : '#fff7e6',
                color:      ipSource === 'browser' ? '#389e0d' : '#d46b08',
                border: '1px solid',
                borderColor: ipSource === 'browser' ? '#b7eb8f' : '#ffd591',
              }} title="哪个公网 IP API 返回的">
                via {ipInfo.public_ip_src}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefreshIp}
              disabled={ipLoading}
              title="换梯子后点这个强制重新获取"
              style={{
                marginLeft: 4,
                border: 'none', background: 'transparent',
                cursor: ipLoading ? 'default' : 'pointer',
                padding: '2px 6px', borderRadius: 4,
                color: '#1890ff', fontSize: 14,
                opacity: ipLoading ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!ipLoading) e.currentTarget.style.background = '#e6f4ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {ipLoading ? '↻' : '⟳'}
            </button>
          </span>
        </div>

        <p style={{ textAlign: 'center', margin: '20px 0 0', fontSize: 12, color: '#aaa' }}>
          © 2026 皮总团队交易所 · 仅限授权人员使用
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
