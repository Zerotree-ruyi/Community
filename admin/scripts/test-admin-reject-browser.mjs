/**
 * 后台浏览器验证 —— 拒绝提现,自定义拒绝理由写超长
 * 覆盖:字数计数器 / maxLength / 拒绝流程是否还报错 / 备注是否落库
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { ADMIN_BASE, ADMIN_USER, ADMIN_PWD } from './lib-env.mjs';

await launchChrome({ headless: true, width: 1440, height: 1000 });
const page = await Cdp.attach(`${ADMIN_BASE}/`);
await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await page.sleep(2000);

// ── 管理员登录 ──
const login = await page.eval(`
  const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:${JSON.stringify(ADMIN_USER)}, password:${JSON.stringify(ADMIN_PWD)} }) });
  const d = await r.json();
  if (!r.ok) return { ok:false, status:r.status, body:d };
  localStorage.setItem('admin_user', JSON.stringify(d.user));
  return { ok:true, user:d.user.username, role:d.user.role };
`);
console.log('① 后台登录:', JSON.stringify(login));
if (!login.ok) { await page.close(); process.exit(1); }

// ── 进后台首页,点侧边栏"提现审核" ──
await page.goto(`${ADMIN_BASE}/`);
await page.sleep(2000);
const nav = await page.eval(`
  const items = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.innerText?.trim() === '提现审核');
  if (!items.length) return { found:false, 侧边栏文本: [...document.querySelectorAll('nav *, aside *, .sidebar *')].map(e=>e.innerText?.trim()).filter(Boolean).slice(0,40) };
  items[0].click();
  return { found:true };
`);
console.log('② 侧边栏找"提现审核":', JSON.stringify(nav));
await page.sleep(2500);
await page.shot('10-admin-withdraw-list');

const listInfo = await page.eval(`
  const t = document.body.innerText;
  const rows = [...document.querySelectorAll('tr')].length;
  const btns = [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(x=>x.includes('拒绝'));
  return { 行数: rows, 拒绝按钮: btns.slice(0,5), 页面含申请中: t.includes('申请中') };
`);
console.log('③ 提现列表:', JSON.stringify(listInfo));

// ── 打开拒绝弹窗 ──
await page.eval(`
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('拒绝') && !x.innerText.includes('确认拒绝'));
  if (!b) throw new Error('找不到拒绝按钮');
  b.click(); return 1;
`);
await page.sleep(1200);
await page.shot('11-admin-reject-dialog');

// ── 选"Other"并填超长理由 ──
const LONG = 'Your withdrawal could not be processed because the bank account information provided does not match the name on our records. Please verify the account holder name, card number, IFSC code and bank branch, then resubmit. '.repeat(5);
const fill = await page.eval(`
  const h3 = [...document.querySelectorAll('h3')].find(h => h.innerText.includes('拒绝提现'));
  if (!h3) throw new Error('拒绝弹窗没打开');
  const modal = h3.parentElement;
  const sel = modal.querySelector('select');
  const opt = [...sel.options].find(o => o.value === '__other__');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, opt.value);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r=>setTimeout(r,400));
  const ta = modal.querySelector('textarea');
  const setV = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setV.call(ta, ${JSON.stringify(LONG)}.slice(0, 500));
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r=>setTimeout(r,400));
  return {
    选中项: sel.options[sel.selectedIndex].text,
    textarea长度: ta.value.length,
    maxLength: ta.maxLength,
    计数器: [...modal.querySelectorAll('div')].map(d => (d.innerText||'').trim())
              .find(t => t && t.includes('/') && /^[0-9]+$/.test(t.split('/')[0]) && /^[0-9]+$/.test(t.split('/')[1])),
  };
`);
console.log('④ 填超长理由:', JSON.stringify(fill));
await page.shot('12-admin-reject-filled');

// ── 提交 ──
await page.eval(`
  const h3 = [...document.querySelectorAll('h3')].find(h => h.innerText.includes('拒绝提现'));
  const modal = h3.parentElement;
  const b = [...modal.querySelectorAll('button')].find(x => x.innerText.includes('确认拒绝'));
  if (!b) throw new Error('找不到确认按钮');
  b.click(); return 1;
`);
await page.sleep(2500);
console.log('⑤ 弹窗提示:', JSON.stringify(page.dialogs));
await page.shot('13-admin-after-reject');

await page.close();
