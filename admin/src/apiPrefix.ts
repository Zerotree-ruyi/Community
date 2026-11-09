/**
 * 后台 API 路径前缀
 *
 * 为什么要可配:
 *   生产上后台不是裸奔在一个 IP 上,而是挂在目录里 ——
 *   http://<你的域名>/manager/login
 *   nginx 那边:
 *     location /manager/api/ { proxy_pass http://127.0.0.1:3001/api/; }   ← 剥掉 /manager/api 前缀
 *     location /manager/     { ...静态文件... }
 *   所以后台前端调的接口要变成 /manager/api/xxx,不能跟会员端的 /api/xxx 撞车。
 *
 * 开发(默认值):
 *   "/api" —— vite 代理直接转到本地后端 http://localhost:3001
 *
 * 生产构建:
 *   VITE_API_PREFIX=/manager/api VITE_BASE_PATH=/manager/ npm run build
 */
export const API_PREFIX = (import.meta.env.VITE_API_PREFIX || "/api").replace(/\/+$/, "");

/**
 * 把 "/api/xxx" 改写成 前缀 + "/xxx"。
 * 只处理站内绝对路径;绝对 URL(http://...)和别的路径原样返回。
 */
export function rewriteApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  let s: string;
  if (typeof input === "string") s = input;
  else if (input instanceof URL) s = input.pathname + input.search + input.hash;
  else return input;                       // Request 对象 —— 极少用到,不动它
  if (!s.startsWith("/api")) return input;
  return API_PREFIX + s.slice(4);         // "/api/x" → "/manager/api/x"
}
