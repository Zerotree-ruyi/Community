import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider, getAdminToken, setAdminToken } from './auth'
import { rewriteApiUrl } from './apiPrefix'
import { enableProtection } from './protection'
import './index.css'

// 防 F12 / 右键 / 调试器(生产构建才默认启用,开发模式用 ?protect=1 强制开)
enableProtection()

// ─── 全局 fetch 包装:自动注入 Authorization: Bearer <令牌> ──────────────────
// 后端靠这个令牌认「当前是哪个管理员」,做角色守卫和行级归属过滤。
//
// ⚠️ 这里以前注入的是 `X-Admin-Id` —— 那个头是前端自己填的,公网上任何人
//    加一句 `X-Admin-Id: 1` 就是超级管理员。现在换成后端签发的随机令牌,
//    没有令牌后台接口一律 403。
// 令牌失效 → 清掉本地登录态,并通知 AuthProvider 把 React 里的 user 也清掉。
//   只清 localStorage 是不够的 —— App.tsx 判的是 React 状态,不清的话页面
//   仍然停在后台首页,用户自己回不到登录页。
function invalidateLocalSession() {
  try {
    setAdminToken('')
    localStorage.removeItem('admin_user')
  } catch { /* ignore */ }
  try { window.dispatchEvent(new Event('admin_session_invalid')) } catch { /* ignore */ }
}

const _origFetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  // 路径前缀改写 —— 生产上后台挂在 /manager/ 目录下,接口要变成 /manager/api/xxx
  // (开发时默认还是 "/api",什么都不变)
  try { input = rewriteApiUrl(input) } catch { /* ignore */ }

  try {
    const token = getAdminToken()
    if (token) {
      init = init ?? {}
      const headers = new Headers(init.headers ?? {})
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      init.headers = headers
    }
  } catch { /* 静默 — 没登录时 token 不存在 */ }

  return _origFetch(input, init).then((res) => {
    try {
      const url = typeof input === 'string'
        ? input
        : (input instanceof Request ? input.url : String(input))
      const isApi = url.includes('/api')
      // 登录接口本身也返回 401,别把那个当成掉线
      const isLogin = url.includes('/api/admin/login')

      // 令牌过期 / 被踢 → 清掉本地登录态,App 会自动退回登录页
      if (res.status === 401 && isApi && !isLogin) {
        invalidateLocalSession()
      }
      // 403 + no_admin —— 令牌无效(数据库重置过 / 后端换了实例 / 令牌被清空)。
      //   以前这里只认 401,结果无效令牌会一直卡在后台首页:
      //   所有接口 403 "未识别管理员",用户连登录页都回不去。
      else if (res.status === 403 && isApi && !isLogin) {
        res.clone().json()
          .then((d: any) => { if (d?.error === 'no_admin') invalidateLocalSession() })
          .catch(() => { /* 响应不是 JSON,忽略 */ })
      }
    } catch { /* 忽略 */ }
    return res
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
