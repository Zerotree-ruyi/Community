/**
 * 页面保护 —— 防 F12 / 右键 / 防调试器
 *
 * ⚠️ 说实话:这是**客户端**保护,只能挡「随手按个 F12 就想看源码」的人。
 *    懂行的人 view-source、curl、抓包,拿到的东西跟你前端里的一模一样。
 *    真正值钱的东西(密码、余额、权限判定)必须放在**后端**,前端这套只是门面。
 *
 * 用法(main.tsx):
 *   import { enableProtection } from './app/utils/protection';
 *   enableProtection();
 *
 * 开关:
 *   - 开发模式(import.meta.env.DEV)默认**不启用** —— 否则没法用 DevTools 调试
 *   - 生产构建默认启用
 *   - URL 加 ?protect=1 强制启用 / ?protect=0 强制关闭(两个模式都能覆盖)
 */

const WARNING_TEXT =
  '此页面受高级代码版权保护。检测到越权访问,当前会话已被安全终端拦截。如需获取底层数据,请与官方业务部取得联系';

/** 应用挂载点 —— 前后台都是 #root */
const ROOT_ID = 'root';

function isDev(): boolean {
  try {
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
}

/** 拦截生效:清空应用容器 + 拆掉样式,页面变成"裸"的警告文字 */
function hijack(): void {
  const root = document.getElementById(ROOT_ID) ?? document.body;
  try {
    root.innerHTML = `<h1 style="padding:100px 0;color:#000;text-align:center;">${WARNING_TEXT}</h1>`;
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    // 只拆样式(style / 外链 css)。
    // <script> 拆了对已经在跑的 React 没有任何影响,反而会打断 Vite 的 HMR,
    // 所以不拆 —— 拦截效果靠上面的 innerHTML 就够了。
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
  }, 800);
}

/** 调试器计时陷阱:两次取时间的间隔超过 10ms,说明中间被断点暂停了 */
function debuggerTripped(): boolean {
  const t0 = new Date().getTime();
  const dt = new Date().getTime() - t0;
  if (dt > 10) {
    try {
      document.body.innerHTML = '';
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

export function enableProtection(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ── 开关判断 ──────────────────────────────────────────────────────────────
  const forced = new URLSearchParams(window.location.search).get('protect');
  const shouldRun = forced === '1' ? true : forced === '0' ? false : !isDev();
  if (!shouldRun) return;

  // ── 1. 拦 F12 / Ctrl+Shift+I / Ctrl+Shift+J / Shift+F12 ───────────────────
  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      const code = e.keyCode;
      const hitF12 = code === 123; // F12
      const hitDevtoolsCombo = e.ctrlKey && e.shiftKey && (code === 73 || code === 74); // Ctrl+Shift+I / J
      const hitLegacy = e.shiftKey && code === 121; // 老 IE 的 F12
      if (hitF12 || hitDevtoolsCombo || hitLegacy) {
        e.preventDefault();
        hijack();
      }
    },
    true
  );

  // ── 2. 禁右键菜单 ─────────────────────────────────────────────────────────
  document.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());

  // ── 3. 调试器陷阱 ─────────────────────────────────────────────────────────
  // 平时不会触发(两次取时间挨着,差值 0ms);
  // 一旦在断点上停住,差值就 > 10ms → 判定被调试 → 清空页面。
  const armDebuggerTrap = () => {
    setTimeout(() => {
      while (debuggerTripped()) {
        /* 反复检查,直到没被暂停 */
      }
    }, 500);
  };
  window.addEventListener('blur', armDebuggerTrap);

  // ── 4. 窗口尺寸变化 = 有人在开/关 DevTools → 尝试关掉窗口 ─────────────────
  // 注意:普通标签页里 window.close() 是无效的(浏览器只允许脚本开的窗口自关),
  // 所以这一条只是"能关就关",真正起作用的是上面 1~3 条。
  const initH = window.innerHeight;
  const initW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerHeight !== initH || window.innerWidth !== initW) {
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }
  });
}
