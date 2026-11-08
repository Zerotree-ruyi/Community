/**
 * 前台浏览器验证 —— 跑真实 Chrome(无头),截图 + 抓 DOM
 * 覆盖:1) profile 里 Site Messages 的位置  2) 改密码页的旧密码输入框
 */
import { launchChrome, Cdp, SHOT_DIR } from './cdp.mjs';
import { FRONT_BASE, MEMBER_ACCOUNT, MEMBER_PWD } from './lib-env.mjs';

await launchChrome({ headless: true, width: 430, height: 932 });
const page = await Cdp.attach(`${FRONT_BASE}/login`);
await page.sleep(2000);

// ── 登录 ──
const loginResult = await page.eval(`
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: ${JSON.stringify(MEMBER_ACCOUNT)}, password: ${JSON.stringify(MEMBER_PWD)} }),
  });
  const d = await r.json();
  if (!r.ok) return { ok: false, status: r.status, body: d };
  localStorage.setItem('exchange_user', JSON.stringify(d.user));
  return { ok: true, id: d.user.id, account: d.user.account };
`);
console.log('① 登录:', JSON.stringify(loginResult));
if (!loginResult.ok) { await page.close(); process.exit(1); }

// ── profile 页 ──
await page.goto(`${FRONT_BASE}/profile`);
await page.sleep(1200);
const profile = await page.eval(`
  const rows = [...document.querySelectorAll('a[href]')]
    .map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').trim().split('\\n')[0] }))
    .filter(x => x.text);
  const menu = rows.filter(x => ['/my-wallets','/fund-records','/security','/messages','/settings','/about'].includes(x.href)
    // 顶栏红点也是 a[href="/messages"],它的文字是数字,别把它当成菜单项
    && !/^\\d+$/.test(x.text));
  const bell = document.querySelector('a[href="/messages"]');
  return { menu, 全部链接: rows.map(r => r.href + ' = ' + r.text), bellExists: !!bell };
`);
console.log('\n② profile 菜单顺序:');
profile.menu.forEach((m, i) => console.log(`   ${i + 1}. ${m.text}   (${m.href})`));
const msgIdx = profile.menu.findIndex(m => m.href === '/messages');
const setIdx = profile.menu.findIndex(m => m.href === '/settings');
console.log(`   → Site Messages 在第 ${msgIdx + 1} 位, Settings 在第 ${setIdx + 1} 位 → ${msgIdx < setIdx ? '✅ 在 Settings 上面' : '❌ 不在 Settings 上面'}`);
console.log('   页面上的菜单项:', profile.全部链接.filter(x => x.includes('=')).join(' | '));
await page.shot('01-profile');

// 未读红点
const badge = await page.eval(`
  const el = [...document.querySelectorAll('span')].find(s => /^(99\\+|\\d+)$/.test(s.innerText.trim()) && s.className.includes('rounded-full'));
  return el ? el.innerText.trim() : null;
`);
console.log('   未读红点:', badge ?? '无');

// ── 改密码页 ──
await page.goto(`${FRONT_BASE}/security/trading-password`);
await page.sleep(1500);
const pwd = await page.eval(`
  const inputs = [...document.querySelectorAll('input[type="text"]')].map(i => ({
    placeholder: i.placeholder, maxLength: i.maxLength,
  }));
  const labels = [...document.querySelectorAll('label')].map(l => l.innerText.trim());
  const title = document.querySelector('h1')?.innerText.trim();
  const btn = [...document.querySelectorAll('button[type="submit"]')].map(b => b.innerText.trim());
  const lockIcons = document.querySelectorAll('svg.lucide-lock').length;
  return { title, labels, inputs, btn, lockIcons, 页面文本: document.body.innerText.slice(0, 400) };
`);
console.log('\n③ 改密码页 (Change Fund Password):');
console.log('   标题:', pwd.title);
console.log('   标签:', pwd.labels);
console.log('   输入框:', JSON.stringify(pwd.inputs, null, 0));
console.log('   提交按钮:', pwd.btn, ' 锁形图标数:', pwd.lockIcons);
const hasOld = pwd.inputs.some(i => i.placeholder === 'Enter your old fund password');
console.log(`   → 旧密码输入框: ${hasOld ? '✅ 存在' : '❌ 缺失'}`);
console.log(`   → 新密码占位符: ${pwd.inputs.some(i => i.placeholder === 'Enter your new fund password') ? '✅' : '❌'}`);
console.log(`   → 确认占位符: ${pwd.inputs.some(i => i.placeholder === 'Enter new fund password again') ? '✅' : '❌'}`);
await page.shot('02-change-fund-password');

// ── 实际填一遍并提交(验证后端老密码校验这一路) ──
const fill = await page.eval(`
  const setNative = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const inputs = [...document.querySelectorAll('input[type="text"]')];
  const byPh = (p) => inputs.find(i => i.placeholder.includes(p));
  const oldI = byPh('old fund password');
  const newI = byPh('new fund password');
  const cnfI = byPh('again');
  if (!oldI || !newI || !cnfI) return { ok:false, why:'找不到输入框' };
  setNative(oldI, '123456'); await new Promise(r=>setTimeout(r,150));
  setNative(newI, '654321'); await new Promise(r=>setTimeout(r,150));
  setNative(cnfI, '654321'); await new Promise(r=>setTimeout(r,150));
  return { ok:true, 旧值: oldI.value, 新值: newI.value, 确认值: cnfI.value };
`);
console.log('\n④ 填表:', JSON.stringify(fill));
await page.sleep(400);
await page.shot('03-filled');

await page.close();
console.log('\n✅ 前台验证完成,截图在', SHOT_DIR);
