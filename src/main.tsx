
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { enableProtection } from "./app/utils/protection";

  // 防 F12 / 右键 / 调试器(生产构建才默认启用,开发模式用 ?protect=1 强制开)
  enableProtection();

  // ─── 全局 fetch 包装:自动带上会员自己的 session_token ────────────────────
  //
  // 为什么:后端现在认「你是谁」了。以前会员接口只认一个裸的 ?member_id=1,
  //          谁都能改成别人的 id 去查别人的流水、卡号、订单。
  //          现在必须同时带上登录时后端发给这个账号的 session_token,
  //          后端比对上了才放行。
  //
  // 令牌从哪来:
  //   - 登录/注册时后端种了一个 HttpOnly cookie `session`(浏览器自动带,这里不用管)
  //   - 这个头是备份:cookie 被清掉、或者走的是跨域直连后端时靠它兜底
  const MEMBER_STORAGE_KEY = "exchange_user";
  const _origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const raw = localStorage.getItem(MEMBER_STORAGE_KEY);
      if (raw) {
        const token = JSON.parse(raw)?.session_token;
        if (token) {
          init = init ?? {};
          const headers = new Headers(init.headers ?? {});
          if (!headers.has("X-Member-Token")) {
            headers.set("X-Member-Token", String(token));
          }
          init.headers = headers;
        }
      }
    } catch {
      /* 静默 — 没登录 / localStorage 坏了 */
    }
    return _origFetch(input, init);
  };

  createRoot(document.getElementById("root")!).render(<App />);
