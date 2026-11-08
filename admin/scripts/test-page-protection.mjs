/**
 * 页面保护自检 —— 验证防 F12 / 禁右键 / 拦截提示是否生效。
 *
 * 用法:
 *   FRONT_BASE=http://localhost:5176 node scripts/test-page-protection.mjs
 *   ADMIN_BASE=http://localhost:5175 node scripts/test-page-protection.mjs
 *
 * 注意:开发模式默认不启用保护,这里用 ?protect=1 强制打开。
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { FRONT_BASE, ADMIN_BASE } from './lib-env.mjs';

const which = process.argv[2] === 'admin' ? 'admin' : 'front';
const BASE = which === 'admin' ? ADMIN_BASE : FRONT_BASE;

await launchChrome({ headless: true, width: 1280, height: 900 });
const page = await Cdp.attach(`${BASE}/?protect=1`);
await page.sleep(2500);

// ① 保护有没有装上(看事件监听有没有生效)
const installed = await page.eval(`
  return {
    // 手动派发一个 F12(keyCode=123),看容器是不是被换成警告文字
    after: (() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        keyCode: 123, which: 123, key: 'F12', bubbles: true, cancelable: true
      }));
      const root = document.getElementById('root');
      return (root?.innerText || '').trim();
    })(),
  };
`);
console.log('① 按 F12 后页面内容:', JSON.stringify(installed.after.slice(0, 60)));
const f12Blocked = installed.after.includes('版权保护');
console.log(f12Blocked ? '✅ F12 已被拦截,页面显示版权保护警告' : '❌ F12 没被拦截');

// ② 右键菜单
const ctx = await page.eval(`
  const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  document.dispatchEvent(ev);
  return ev.defaultPrevented;
`);
console.log(ctx ? '✅ 右键菜单已被禁用' : '❌ 右键菜单没禁用');

// ③ 样式有没有被拆掉(拦截后应该只剩裸文字)
await page.sleep(1200);
const styles = await page.eval(`
  return {
    styleTags: document.querySelectorAll('style, link[rel="stylesheet"]').length,
    text: (document.getElementById('root')?.innerText || '').trim().slice(0, 40),
  };
`);
console.log('③ 拦截后剩余样式标签数:', styles.styleTags, '(0 = 样式已拆掉,页面变裸的)');

// 截图:拦截之后页面被拆得只剩裸文字,截图可能超时 —— 失败不影响结论
try {
  await page.shot(`90-protection-${which}`);
} catch {
  console.log('   (截图失败,不影响判定)');
}
await page.close();

const pass = f12Blocked && ctx;
console.log('');
console.log(pass ? `✅ ${which} 页面保护生效` : `❌ ${which} 页面保护没生效`);
process.exit(pass ? 0 : 1);
