/**
 * 浏览器实测:提交"改资金密码"表单
 *  1) 旧密码填错 → 应提示 "Current fund password is incorrect"(说明旧密码真的被传了、也被后端校验了)
 *  2) 旧密码填对 → 应成功
 *
 * 三步跑完会把资金密码改回 123456,可重复执行。
 * 前置:会员 testuser01 的资金密码当前是 123456(跑 seed-local-test.mjs 即可复位)。
 */
import { launchChrome, Cdp } from './cdp.mjs';
import { FRONT_BASE, MEMBER_ACCOUNT, MEMBER_PWD } from './lib-env.mjs';

await launchChrome({ headless: true, width: 430, height: 932 });
const page = await Cdp.attach(`${FRONT_BASE}/login`);
await page.sleep(1800);

await page.eval(`
  const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ account:${JSON.stringify(MEMBER_ACCOUNT)}, password:${JSON.stringify(MEMBER_PWD)} }) });
  const d = await r.json();
  localStorage.setItem('exchange_user', JSON.stringify(d.user));
  return 1;
`);

const FILL = `
  const setNative = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const inputs = [...document.querySelectorAll('input[type="text"]')];
  const byPh = (p) => inputs.find(i => i.placeholder.includes(p));
  const oldI = byPh('old fund password');
  const newI = byPh('new fund password');
  const cnfI = byPh('again');
  if (!oldI || !newI || !cnfI) return { ok:false, why:'找不到输入框' };
  setNative(oldI, OLD);
  await new Promise(r=>setTimeout(r,120));
  setNative(newI, NEW);
  await new Promise(r=>setTimeout(r,120));
  setNative(cnfI, NEW);
  await new Promise(r=>setTimeout(r,200));
  const btn = document.querySelector('button[type="submit"]');
  return { btnDisabled: btn.disabled, btnText: btn.innerText.trim() };
`;

async function run(oldPwd, newPwd, tag) {
  await page.goto(`${FRONT_BASE}/security/trading-password`);
  await page.sleep(1400);
  const pre = await page.eval(FILL.replace('OLD', JSON.stringify(oldPwd)).replaceAll('NEW', JSON.stringify(newPwd)));
  await page.sleep(300);
  await page.eval(`document.querySelector('button[type="submit"]').click(); return 1;`);
  await page.sleep(1800);
  const res = await page.eval(`
    const err = [...document.querySelectorAll('div')].find(d => d.className.includes('text-red-400') && d.innerText.trim());
    const ok  = [...document.querySelectorAll('div')].find(d => d.className.includes('text-green-400') && d.innerText.trim());
    return { 错误提示: err?.innerText.trim() || null, 成功提示: ok?.innerText.trim() || null };
  `);
  console.log(`\n【${tag}】旧密码=${oldPwd} 新密码=${newPwd}`);
  console.log('   提交前按钮状态:', JSON.stringify(pre));
  console.log('   结果:', JSON.stringify(res));
  await page.shot(`change-pwd-${tag}`);
  return res;
}

// 第 1 次:故意填错旧密码(当前资金密码是 123456)
const wrong = await run('999999', '111111', 'wrong-old');
// 第 2 次:填对旧密码 123456 → 改成 654321
const right = await run('123456', '654321', 'correct-old');
// 第 3 次:改回 123456,让脚本可以重复跑
const back = await run('654321', '123456', 'restore');

// 断言
const ok = (cond, msg) => console.log(`   ${cond ? '✅' : '❌'} ${msg}`);
console.log('\n断言:');
ok(!!wrong.错误提示 && wrong.错误提示.includes('Current fund password is incorrect'),
   `旧密码填错被拒:${wrong.错误提示 ?? '(无提示)'}`);
ok(!!right.成功提示 && !right.错误提示,
   `旧密码填对成功:${right.成功提示 ?? '(无提示)'}`);
ok(!!back.成功提示, `改回 123456 成功:${back.成功提示 ?? '(无提示)'}`);

await page.close();
