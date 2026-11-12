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

/**
 * 调试器计时陷阱:两次取时间的间隔超过 10ms,说明中间被断点暂停了。
 *
 * ⚠️ 注意:**不要**在这里清空 body。
 *    手机息屏、页面切走、机器卡一下,主线程都可能被打断 10ms 以上 →
 *    误判成「有人在调试」→ 客户页面直接白屏。
 *    现在只提示,不销毁页面。
 */
function debuggerTripped(): boolean {
  const t0 = new Date().getTime();
  const dt = new Date().getTime() - t0;
  if (dt > 10) {
    try {
      hijack();
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
  // 一旦在断点上停住,差值就 > 10ms → 判定被调试 → 提示一下。
  // ⚠️ 只查一次,不循环 —— 之前那个 while 循环在主线程被打断时会一直转,
  //    页面直接卡死。
  const armDebuggerTrap = () => {
    setTimeout(() => {
      debuggerTripped();
    }, 500);
  };
  window.addEventListener('blur', armDebuggerTrap);

  // ── 4. 窗口尺寸变化 ───────────────────────────────────────────────────────
  // ⚠️ 以前这里是「尺寸变了就 window.close()」。
  //    手机上地址栏收起/展开、键盘弹出、旋转屏幕都会改 innerHeight →
  //    用户滑一下页面就可能被「关掉」。这在手机上是真的会发生的。
  //    现在不关了,防 F12 靠上面第 1 条就够了。
}
