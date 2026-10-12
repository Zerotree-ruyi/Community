/**
 * 前端配置 — 客服链接按以下优先级解析 agent_id:
 *   1) 当前已登录会员的 agent_id(从 localStorage / AuthContext 读)
 *   2) URL 参数 ?agent=5(调试用)
 *   3) build 时由 vite.config.ts 注入的 VITE_AGENT_ID
 *   4) 全局默认 0
 *
 * 这样:
 *   - super 在后台给 agent_id=3 配了链接,所有用 SUPER03 邀请码(指 agent_id=3)注册的
 *     会员登录前台后,自动看到这个链接
 *   - 不同端口/域名的前台各自 build 时指定 VITE_AGENT_ID,未登录访问时也用对应链接
 *   - 调试时可以 ?agent=5 临时覆盖
 */

declare const __AGENT_ID__: string;

const STORAGE_KEY = "exchange_user";

/** 从 localStorage 读当前登录用户的 agent_id */
function readLoggedInAgentId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    const id = Number(u?.agent_id);
    if (Number.isFinite(id) && id >= 0) return id;
  } catch { /* ignore */ }
  return null;
}

/** 优先级 1 → 4 */
export function resolveAgentId(): number {
  // 1) URL 参数优先(便于调试)
  try {
    const q = new URL(window.location.href).searchParams.get("agent");
    if (q && /^\d+$/.test(q)) return Number(q);
  } catch { /* ignore */ }
  // 2) 当前已登录会员的 agent_id
  const fromUser = readLoggedInAgentId();
  if (fromUser !== null) return fromUser;
  // 3) build 时注入
  const injected = Number(__AGENT_ID__);
  if (Number.isFinite(injected) && injected >= 0) return injected;
  // 4) 兜底
  return 0;
}

export const AGENT_ID = resolveAgentId();

let inflight: Promise<{ url: string; label: string }> | null = null;

/**
 * 拉客服链接。
 * 关键:不做 in-memory 缓存 — admin 在后台改了链接,前台下一次拉就要看到新的。
 * 但同一时刻多次并发请求(同一页面多个组件同时调用)会共享同一个 Promise,避免重复 fetch。
 *
 * 后端: GET /api/support-link?agent_id=<AGENT_ID>
 */
export async function getSupportLink(): Promise<{ url: string; label: string }> {
  const agentId = resolveAgentId();

  // 同一 agent_id 的并发请求去重 — 共享一个 Promise
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      // 加 t= 时间戳让浏览器 / 代理不要按 URL 缓存
      const r = await fetch(`/api/support-link?agent_id=${agentId}&t=${Date.now()}`, {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      if (r.ok) {
        const d = await r.json();
        return { url: String(d.url || ""), label: String(d.label || "") };
      }
    } catch { /* fallback below */ }
    return { url: "https://t.me/your_support", label: "Default Support" };
  })();

  try {
    return await inflight;
  } finally {
    // 50ms 后清掉 inflight,避免极短时间内的串行调用复用过期 Promise
    setTimeout(() => { inflight = null; }, 50);
  }
}
