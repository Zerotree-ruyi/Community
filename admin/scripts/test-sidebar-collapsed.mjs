/**
 * 看后台侧栏收起/展开长什么样
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
  localStorage.setItem('admin_token', d.token);
  // 重置成展开态,保证脚本每次跑的初始状态一致(上次跑完可能是收起的)
  localStorage.setItem('admin:sidebar:collapsed', '0');
  return 1;
`);
await page.goto(`${ADMIN_BASE}/`);
await page.sleep(2500);

const before = await page.eval(`
  const sb = document.querySelector('.sidebar');
  const cs = sb ? getComputedStyle(sb) : null;
  return {
    侧栏宽度: cs ? cs.width : null,
    有collapsed类: sb ? sb.className : null,
    收起状态存在localStorage: localStorage.getItem('admin:sidebar:collapsed'),
    页面结构: [...document.body.firstElementChild.children].map(c => c.tagName + '.' + (c.className||'')),
  };
`);
console.log('展开态:', JSON.stringify(before, null, 2));
await page.shot('50-sidebar-expanded');

// 点 ☰ 收起
await page.eval(`
  const b = document.querySelector('.collapse-btn');
  if (!b) throw new Error('没有找到收起按钮');
  b.click(); return 1;
`);
await page.sleep(900);
const after = await page.eval(`
  const sb = document.querySelector('.sidebar');
  const cs = sb ? getComputedStyle(sb) : null;
  const nav = document.querySelector('.sidebar-nav');
  const ncs = nav ? getComputedStyle(nav) : null;
  const items = [...document.querySelectorAll('.sidebar-nav *')].slice(0, 14).map(e => ({
    cls: e.className, 文本: (e.innerText||'').trim().slice(0,12), 显示: getComputedStyle(e).display,
  }));
  return {
    侧栏宽度: cs ? cs.width : null,
    有collapsed类: sb ? sb.className : null,
    收起状态localStorage: localStorage.getItem('admin:sidebar:collapsed'),
    导航宽度: ncs ? ncs.width : null,
    前几个元素: items,
  };
`);
console.log('收起态:', JSON.stringify(after, null, 2));
await page.shot('51-sidebar-collapsed');

await page.close();
