/**
 * 复现:后台改信用分后,会员列表的「信誉 | VIP」列有没有实时更新。
 *
 * 步骤:
 *   1. 后台登录 → 进会员列表
 *   2. 记下 testuser01 那一行的信誉分
 *   3. 点账号打开编辑弹窗 → 改信誉分 → 保存
 *   4. 弹窗关掉后,立刻看列表那一行显示的信誉分
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { ADMIN_BASE, ADMIN_USER, ADMIN_PWD } from './lib-env.mjs';

const readRow = `
  const tr = [...document.querySelectorAll('table tbody tr')]
    .find(r => r.innerText.includes('testuser01'));
  if (!tr) return null;
  const tds = [...tr.querySelectorAll('td')].map(t => t.innerText.trim());
  return { 账号: tds[2], 信誉VIP: tds[5], 整行: tds.join(' | ') };
`;

await launchChrome({ headless: true, width: 1600, height: 950 });
const page = await Cdp.attach(`${ADMIN_BASE}/`);
await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1, mobile: false });
await page.sleep(1500);

await page.eval(`
  const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:${JSON.stringify(ADMIN_USER)}, password:${JSON.stringify(ADMIN_PWD)} }) });
  const d = await r.json();
  localStorage.setItem('admin_user', JSON.stringify(d.user));
  localStorage.setItem('admin:sidebar:collapsed', '0');
  return 1;
`);
await page.goto(`${ADMIN_BASE}/`);
await page.sleep(2000);

// 进会员列表
await page.eval(`
  const click = (label) => {
    const it = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.innerText?.trim() === label);
    if (!it) return false; it.click(); return true;
  };
  click('会员代理'); await new Promise(r => setTimeout(r, 600));
  click('会员列表'); return 1;
`);
await page.sleep(2500);

const before = await page.eval(readRow);
console.log('① 改之前列表显示:', JSON.stringify(before));

// 打开编辑弹窗
await page.eval(`
  const tr = [...document.querySelectorAll('table tbody tr')].find(r => r.innerText.includes('testuser01'));
  const cell = [...tr.querySelectorAll('td')].find(td => td.innerText.trim() === 'testuser01');
  cell.click(); return 1;
`);
await page.sleep(1500);

// 读弹窗里信誉分输入框当前值
const modalBefore = await page.eval(`
  const labels = [...document.querySelectorAll('label')].map(l => l.innerText.trim());
  const inputs = [...document.querySelectorAll('input')].map(i => ({ value: i.value, ph: i.placeholder }));
  return { labels, inputs };
`);
console.log('② 弹窗字段:', JSON.stringify(modalBefore.inputs.filter(i => i.value !== '')));

// 改信誉分:找"信誉分"对应的 input
const NEW_SCORE = '88';
await page.eval(`
  const setNative = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  // 弹窗里:信誉分和 VIP等级是相邻的两个 input,第一个是信誉分
  const labels = [...document.querySelectorAll('label')];
  const scoreLabel = labels.find(l => l.innerText.includes('信誉分'));
  if (!scoreLabel) throw new Error('找不到"信誉分"标签');
  const holder = scoreLabel.parentElement;
  const inputs = [...holder.querySelectorAll('input')].filter(i => i.type === 'text' || !i.type);
  setNative(inputs[0], '${NEW_SCORE}');
  await new Promise(r => setTimeout(r, 300));
  return inputs.map(i => i.value);
`);
await page.sleep(500);

// 点保存
const saved = await page.eval(`
  const btns = [...document.querySelectorAll('button')].filter(b => /保存|提交|确定/.test(b.innerText));
  if (!btns.length) return { ok:false, 页面按钮: [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean).slice(0,20) };
  btns[0].click(); return { ok:true, 按钮: btns[0].innerText.trim() };
`);
console.log('③ 点保存:', JSON.stringify(saved));
await page.sleep(2500);

const after = await page.eval(readRow);
console.log('④ 改之后列表显示:', JSON.stringify(after));

// 再等一轮自动刷新
await page.sleep(6000);
const afterRefresh = await page.eval(readRow);
console.log('⑤ 再等 6 秒后:', JSON.stringify(afterRefresh));

await page.shot('70-credit-update');
await page.close();

console.log('');
if (!after) {
  console.log('❌ 保存后列表里找不到 testuser01');
} else if (after.信誉VIP === before.信誉VIP) {
  console.log(`❌ 没实时更新:改之前 ${before.信誉VIP} → 改之后还是 ${after.信誉VIP}`);
} else {
  console.log(`✅ 实时更新了:${before.信誉VIP} → ${after.信誉VIP}`);
}
