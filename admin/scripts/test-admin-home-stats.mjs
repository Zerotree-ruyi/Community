/**
 * 后台首页 —— 确认"今日入款"卡片显示的是手动上分合计
 *
 * 前置:
 *   1) 本机 MySQL 起着,跑过 ALLOW_LOCAL_SEED=1 node scripts/seed-local-test.mjs
 *   2) 后端 node scripts/../server.ts 起着(3001)
 *   3) 后台 vite dev 起着(5174)
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { ADMIN_BASE, ADMIN_USER, ADMIN_PWD } from './lib-env.mjs';

await launchChrome({ headless: true, width: 1440, height: 950 });
const page = await Cdp.attach(`${ADMIN_BASE}/`);
await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });
await page.sleep(1500);

await page.eval(`
  const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:${JSON.stringify(ADMIN_USER)}, password:${JSON.stringify(ADMIN_PWD)} }) });
  const d = await r.json();
  localStorage.setItem('admin_user', JSON.stringify(d.user));
  return 1;
`);
await page.goto(`${ADMIN_BASE}/`);
await page.sleep(3000);

const r = await page.eval(`
  const NL = String.fromCharCode(10);
  const all = [...document.querySelectorAll('div')];
  const card = all.filter(d => d.innerText && d.innerText.includes('今日入款'));
  const pick = card.length ? card[card.length - 1] : null;
  const lines = pick ? pick.innerText.split(NL).map(s => s.trim()).filter(Boolean) : [];
  return {
    卡片文字: lines.slice(0, 6),
    有6000: document.body.innerText.includes('6,000') || document.body.innerText.includes('6000'),
    侧边栏充值列表徽标: (() => {
      const el = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.innerText && e.innerText.trim() === '6,000');
      return el ? '6,000' : null;
    })(),
  };
`);
console.log(JSON.stringify(r, null, 2));
await page.shot('40-admin-home');
await page.close();
