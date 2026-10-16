import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth'
import './index.css'

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
