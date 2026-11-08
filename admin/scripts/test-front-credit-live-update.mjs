/**
 * 前台实时更新验证 —— 后台改信用分后,会员自己的前台页面能不能**立刻**看到新值。
 *
 * 步骤:
 *   1. 前台登录 testuser01,停在 profile 页
 *   2. 读出当前显示的信用分,挑一个**不同的**目标分(否则会误判成"已更新")
 *   3. 后台 API 改信用分
 *   4. 前台每 300ms 轮询一次页面上的显示值,记录多久才变成新值
 *
 * 判据:2 秒内变成 → 实时推送(SSE)生效;要等 15 秒以上 → 还是靠轮询,没修好。
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { FRONT_BASE, MEMBER_ACCOUNT, MEMBER_PWD } from './lib-env.mjs';

const readCredit = `
  const lab = [...document.querySelectorAll('*')].find(e => e.children.length===0 && /Credit/i.test(e.innerText||''));
  const val = lab?.parentElement?.querySelector('div.text-base')?.innerText?.trim();
  if (val) return val;
  const el = [...document.querySelectorAll('div')].find(d => {
    const t = (d.innerText||'').trim();
    return /^(0|\\d{1,3})$/.test(t) && d.parentElement?.innerText?.includes('Credit');
  });
  return el?.innerText?.trim() || null;
`;

const MEMBER_ID = 1;

await launchChrome({ headless: true, width: 430, height: 932 });
const page = await Cdp.attach(`${FRONT_BASE}/login`);
await page.sleep(1800);

await page.eval(`
  const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ account:${JSON.stringify(MEMBER_ACCOUNT)}, password:${JSON.stringify(MEMBER_PWD)} }) });
  const d = await r.json();
  if (!r.ok) return { ok:false, body:d };
  localStorage.setItem('exchange_user', JSON.stringify(d.user));
  return { ok:true };
`);
await page.goto(`${FRONT_BASE}/profile`);
await page.sleep(2000);

const before = await page.eval(readCredit);
console.log('① 前台改之前显示信用分:', before);

// 目标分必须跟当前值不同,否则"一直是目标值"会被误判成实时更新
const target = before === '66' ? '77' : '66';
console.log(`   目标改成: ${target}`);

const changed = await page.eval(`
  const lr = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username:'admin', password:'admin123' }) });
  const ld = await lr.json();
  const r = await fetch('/api/members/${MEMBER_ID}', { method:'PUT',
    headers:{'Content-Type':'application/json', 'X-Admin-Id': String(ld.user.id)},
    body: JSON.stringify({ credit: '${target}|3' }) });
  return { status: r.status, ok: (await r.json().catch(()=>null))?.ok };
`);
console.log('② 后台改信用分:', JSON.stringify(changed));

// 每 300ms 看一次,最多等 20 秒
const t0 = Date.now();
let hit = null;
while (Date.now() - t0 < 20_000) {
  await page.sleep(300);
  const now = await page.eval(readCredit);
  if (now === target) { hit = Date.now() - t0; break; }
}
const after = await page.eval(readCredit);
console.log(`③ 前台现在显示: ${after}`);

if (hit === null) {
  console.log('❌ 前台 20 秒内没更新到新信用分');
  await page.shot('80-front-credit-stale');
  await page.close();
  process.exit(1);
}

console.log(`✅ 前台在 ${hit}ms 内更新到了 ${target}(改之前是 ${before})`);
if (hit > 3000) {
  console.log(`⚠️  但 ${hit}ms 有点慢 —— 实时推送(SSE)应该 1 秒内就到,3000ms 以上可能是走了轮询兜底`);
}
await page.shot('81-front-credit-live');
await page.close();
