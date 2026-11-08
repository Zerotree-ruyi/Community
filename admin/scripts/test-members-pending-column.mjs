/**
 * 后台会员列表 —— 确认"提现中"这一列显示且是绿色的
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { ADMIN_BASE, ADMIN_USER, ADMIN_PWD } from './lib-env.mjs';

await launchChrome({ headless: true, width: 1600, height: 950 });
const page = await Cdp.attach(`${ADMIN_BASE}/`);
await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1, mobile: false });
await page.sleep(1500);
await page.eval(`
  const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:${JSON.stringify(ADMIN_USER)}, password:${JSON.stringify(ADMIN_PWD)} }) });
  const d = await r.json();
  localStorage.setItem('admin_user', JSON.stringify(d.user));
  return 1;
`);
await page.goto(`${ADMIN_BASE}/`);
await page.sleep(2000);

// 侧边栏 → 会员代理 → 会员列表
await page.eval(`
  const click = (label) => {
    const it = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.innerText && e.innerText.trim() === label);
    if (!it) return false;
    it.click(); return true;
  };
  click('会员代理');
  await new Promise(r => setTimeout(r, 600));
  click('会员列表');
  return 1;
`);
await page.sleep(3000);

const r = await page.eval(`
  const ths = [...document.querySelectorAll('table th')].map(t => t.innerText.trim());
  const rows = [...document.querySelectorAll('table tbody tr')].map(tr => {
    const tds = [...tr.querySelectorAll('td')];
    const cell = tds.find(td => td.innerText.includes('|'));
    if (!cell) return null;
    const spans = [...cell.querySelectorAll('span')].map(s => ({ 文字: s.innerText.trim(), 颜色: getComputedStyle(s).color }));
    return { 账号: tds[2]?.innerText.trim(), 余额冻结提现中: cell.innerText.replace(/\\s+/g,' ').trim(), 绿色部分: spans };
  }).filter(Boolean);
  return { 表头: ths, 行: rows };
`);
console.log(JSON.stringify(r, null, 2));
await page.shot('60-members-pending-column');
await page.close();
