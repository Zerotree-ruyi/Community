import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { enableProtection } from "./app/utils/protection";

// 防 F12 / 右键 / 调试器(生产构建才默认启用,开发模式用 ?protect=1 强制开)
enableProtection();

// ─── 会员身份:只靠 HttpOnly cookie ────────────────────────────────────────
//
// 以前这里包了一层 fetch,每次请求都从 localStorage 取 session_token
// 塞进 `X-Member-Token` 头。现在**不需要了**:
//   登录/注册时后端种了一个 HttpOnly cookie `session`,
//   浏览器同源请求会自动带上,后端拿它认人。
//
// 前端少了一堆东西:
//   - localStorage 里不再存令牌(令牌是 HttpOnly,JS 根本读不到)
//   - 不用管令牌过期、不用管"被后台踢下线后要清 token"
//   - 换设备/换浏览器只要重新登录一次,cookie 就在
//
// 后台的 Bearer 令牌是另一套(admin/src/),跟这里无关。

createRoot(document.getElementById("root")!).render(<App />);
