/**
 * 页面保护 —— 防 F12 / 右键
 *
 * ⚠️ 说实话:这是**客户端**保护,只能挡「随手按个 F12 就想看源码」的人。
 *    懂行的人 view-source、curl、抓包,拿到的东西跟你前端里的一模一样。
 *    真正值钱的东西(密码、余额、权限判定)必须放在**后端**,前端这套只是门面。
 *
 * ⚠️ 这里只留「拦按键」这一档,**调试器计时陷阱已经删掉了** ——
 *    那玩意儿会在页面切走(blur)、手机息屏、或者机器卡一下的时候误判,
 *    把整个 body 清空 → 客户看到的是莫名其妙的白屏。
 *    代价大、收益接近零,不值得留。
 *
 * 用法(main.tsx):
 *   import { enableProtection } from './protection';
 *   enableProtection();
 *
 * 开关:
 *   - 开发模式(import.meta.env.DEV)默认**不启用** —— 否则没法用 DevTools 调试
 *   - 生产构建默认启用
 *   - URL 加 ?protect=1 强制启用 / ?protect=0 强制关闭(两个模式都能覆盖)
 */

const WARNING_TEXT =
  '此页面受高级代码版权保护。检测到越权访问,当前会话已被安全终端拦截。如需获取底层数据,请与官方业务部取得联系';

/** 应用挂点 —— 前后台都是 #root */
const ROOT_ID = 'root';

function isDev(): boolean {
  try {
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
}

/** 拦截生效:把应用容器换成警告文字 */
function hijack(): void {
  const root = document.getElementById(ROOT_ID) ?? document.body;
  try {
    root.innerHTML = `<h1 style="padding:100px 0;color:#000;text-align:center;">${WARNING_TEXT}</h1>`;
  } catch {
    /* ignore */
  }
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
}
