/**
 * 后台浏览器验证 —— 站内信"查看"改成弹窗
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { ADMIN_BASE, ADMIN_USER, ADMIN_PWD } from './lib-env.mjs';

await launchChrome({ headless: true, width: 1440, height: 950 });
const page = await Cdp.attach(`${ADMIN_BASE}/`);
await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });
await page.sleep(2000);

await page.eval(`
  const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:${JSON.stringify(ADMIN_USER)}, password:${JSON.stringify(ADMIN_PWD)} }) });
  const d = await r.json();
  localStorage.setItem('admin_user', JSON.stringify(d.user));
  localStorage.setItem('admin_token', d.token);
  // 重置成展开态 —— 收起时子菜单是"悬停才弹出"的浮层,点不出来
  localStorage.setItem('admin:sidebar:collapsed', '0');
  return 1;
`);
await page.goto(`${ADMIN_BASE}/`);
await page.sleep(2500);

const nav = await page.eval(`
  const click = (label) => {
    const it = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.innerText && e.innerText.trim() === label);
    if (!it) return false;
    it.click();
    return true;
  };
  // 侧边栏"消息通告"是分组,点开子菜单后再点"站内消息"
  const a = click('消息通告');
  await new Promise(r => setTimeout(r, 600));
  const b = click('站内消息');
  return { 点开分组: a, 点子菜单: b };
`);
console.log('① 进消息通告页:', JSON.stringify(nav));
await page.sleep(4000);

const list = await page.eval(`
  const tbl = document.querySelector('table');
  return {
    表头: [...document.querySelectorAll('table th')].map(t => t.innerText.trim()),
    行数: document.querySelectorAll('table tbody tr').length,
    表格文本: tbl ? tbl.innerText.split(String.fromCharCode(10)).filter(Boolean).slice(0,12) : null,
    按钮: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean).slice(0,14),
  };
`);
console.log('② 列表状态:', JSON.stringify(list, null, 2));
await page.shot('30-messages-list');

// 点"查看" → 应该弹窗
await page.eval(`
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '查看');
  if (!b) throw new Error('没有查看按钮');
  b.click(); return 1;
`);
await page.sleep(1200);

const modal = await page.eval(`
  const fixed = [...document.querySelectorAll('div')].filter(d => d.style && d.style.position === 'fixed' && d.style.zIndex);
  const card = fixed.find(d => d.innerText.includes('发送人'));
  const h3 = card ? card.querySelector('h3') : null;
  const body = card ? card.querySelector('div[style*="pre-wrap"]') : null;
  const rows = [...document.querySelectorAll('table tbody tr')];
  return {
    有弹窗: !!card,
    标题: h3 ? h3.innerText.trim() : null,
    按钮: card ? [...card.querySelectorAll('button')].map(b => b.innerText.trim()) : [],
    元信息: card ? card.innerText.split(String.fromCharCode(10)).filter(l => l.indexOf(':') > 0).slice(0,8) : [],
    正文前100字: body ? body.innerText.slice(0,100) : null,
    表格里还有没有展开的内容行: rows.some(r => r.querySelector('td[colspan]')),
  };
`);
console.log('③ 点"查看"之后:', JSON.stringify(modal, null, 2));
await page.shot('31-message-modal');

// 关掉弹窗
await page.eval(`
  const fixed = [...document.querySelectorAll('div')].filter(d => d.style && d.style.position === 'fixed' && d.innerText.includes('发送人'));
  const card = fixed[0];
  const b = [...card.querySelectorAll('button')].find(x => x.innerText.trim() === '关闭');
  if (!b) throw new Error('没有关闭按钮');
  b.click(); return 1;
`);
await page.sleep(700);
const after = await page.eval(`
  const fixed = [...document.querySelectorAll('div')].filter(d => d.style && d.style.position === 'fixed' && d.innerText.includes('发送人'));
  return { 弹窗还在吗: fixed.length > 0 };
`);
console.log('④ 点"关闭"之后:', JSON.stringify(after));

await page.close();
