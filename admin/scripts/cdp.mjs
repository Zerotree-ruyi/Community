/**
 * 极简 CDP 驱动 — 直接用 Chrome 的 DevTools Protocol,不用装 Playwright。
 *
 * 用法:
 *   node scripts/cdp.mjs <url> [步骤JSON文件]
 * 或者作为模块被别的脚本 import。
 */

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// 9222 常被 adb 设备占用(安卓 Chrome 也监听那个口),换个不常见的端口
const PORT = Number(process.env.CDP_PORT || 9333);
// ⚠️ 不要放 /tmp —— macOS 会周期性清空 /tmp,Chrome profile 和截图都会被抹掉。
//    统一放 admin/.cdp-cache/ 下(gitignore 里已排除)。
const CACHE_DIR = process.env.CDP_CACHE_DIR
  || new URL('../.cdp-cache/', import.meta.url).pathname;
const PROFILE = `${CACHE_DIR}profile-${PORT}`;  // 端口不同的实例用不同 profile,避免抢锁
export const SHOT_DIR = process.env.SHOT_DIR || `${CACHE_DIR}shots`;
// Chrome 视系统配置可能只绑 IPv6([::1])或只绑 IPv4(127.0.0.1),两个都探
const CDP_HOSTS = ['[::1]', '127.0.0.1'];

export async function launchChrome({ headless = true, width = 430, height = 932 } = {}) {
  mkdirSync(SHOT_DIR, { recursive: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  const args = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    `--window-size=${width},${height}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-features=Translate,MediaRouter',
    '--hide-scrollbars',
    'about:blank',
  ];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(CHROME, args, { detached: true, stdio: 'ignore' });
  proc.unref();

  // 等调试端口起来。
  // 首次创建 profile 时 Chrome 可能要十几秒才监听,超时给足 60 秒。
  // 另外 Chrome 视系统配置可能只绑 IPv4 或只绑 IPv6,两个都探一遍。
  for (let i = 0; i < 240; i++) {
    for (const host of CDP_HOSTS) {
      try {
        const r = await fetch(`http://${host}:${PORT}/json/version`);
        if (r.ok) return proc;
      } catch { /* retry */ }
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Chrome 调试端口没起来(端口 ${PORT})`);
}

export class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []; }

  static async attach(targetUrl) {
    // 找一个能连上的 host(Chrome 可能只绑了其中一个协议栈)
    let target;
    let lastErr;
    for (const host of CDP_HOSTS) {
      try {
        const r = await fetch(`http://${host}:${PORT}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        target = await r.json();
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!target) throw new Error(`连不上 Chrome 调试端口(${PORT}): ${lastErr?.message}`);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const cdp = new Cdp(ws);
    cdp.targetId = target.id;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && cdp.pending.has(msg.id)) {
        const { resolve, reject } = cdp.pending.get(msg.id);
        cdp.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        cdp.events.push(msg);
      }
    };
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    // 自动接受 alert/confirm,并把内容记下来
    cdp.dialogs = [];
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Page.javascriptDialogOpening') {
        cdp.dialogs.push(msg.params.message);
        cdp.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
    });
    return cdp;
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`${method} 超时`)); }
      }, 30000);
    });
  }

  async goto(url) {
    this.events = [];
    await this.send('Page.navigate', { url });
    try { await this.waitFor('Page.loadEventFired', 15000); } catch { /* 可能已加载完 */ }
    await this.sleep(800);
  }

  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${expr} })()`,
      awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval 出错');
    return r.result.value;
  }

  waitFor(event, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        if (this.events.some(e => e.method === event)) return resolve();
        if (Date.now() - started > timeout) return reject(new Error(`等 ${event} 超时`));
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async shot(name) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const p = `${SHOT_DIR}/${name}.png`;
    writeFileSync(p, Buffer.from(data, 'base64'));
    return p;
  }

  async close() {
    try { this.ws.close(); } catch { /* noop */ }
    for (const host of CDP_HOSTS) {
      try { await fetch(`http://${host}:${PORT}/json/close/${this.targetId}`); } catch { /* noop */ }
    }
  }
}
