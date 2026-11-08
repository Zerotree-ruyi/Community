import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth'
import { enableProtection } from './protection'
import './index.css'

// 防 F12 / 右键 / 调试器(生产构建才默认启用,开发模式用 ?protect=1 强制开)
enableProtection()

// ─── 全局 fetch 包装:自动注入 X-Admin-Id ──────────────────────────────────
// 后端用此 header 识别当前管理员,做行级归属过滤(super 看全部,普通员工只看自己客户)
const _origFetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const raw = localStorage.getItem('admin_user')
    if (raw) {
      const admin = JSON.parse(raw)
      if (admin?.id) {
        init = init ?? {}
        const headers = new Headers(init.headers ?? {})
        if (!headers.has('X-Admin-Id')) {
          headers.set('X-Admin-Id', String(admin.id))
        }
        init.headers = headers
      }
    }
  } catch { /* 静默 — 没登录时 raw 不存在或损坏 */ }
  return _origFetch(input, init)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
