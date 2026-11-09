/**
 * 生产环境只读审计 —— 全部只发 GET / OPTIONS,不含任何写方法。
 *
 * 用途:两件事
 *   1. 修复前跑 → 列出「免密能读到什么」
 *   2. 修复后跑 → 验证「免密什么都读不到」(期望全是 403)
 *
 * 目标:http://47.236.95.137:3001 (直连后端) 和 http://47.236.95.137 (经 nginx)
 *
 * ⚠️ 这个脚本不会写任何数据,可以对着生产跑。
 */
const BASE = process.env.SCAN_B_API || 'http://47.236.95.137:3001';

// ── 1. CORS ─────────────────────────────────────────────────────────────────
console.log('【1】CORS —— 任意 Origin 会不会被放行');
for (const origin of ['https://evil.example', 'https://attacker.com', 'null']) {
  const r = await fetch(BASE + '/api/health', { headers: { Origin: origin } });
  const acao = r.headers.get('access-control-allow-origin');
  console.log(`   Origin ${origin.padEnd(24)} → ACAO: ${acao || '(无)'}${acao === '*' ? '   🔴 任意站点都能调' : '   ✅'}`);
}
const rpre = await fetch(BASE + '/api/admin/employees', {
  method: 'OPTIONS',
  headers: {
    Origin: 'https://evil.example',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization',
  },
});
console.log(`   预检 OPTIONS /api/admin/employees → ${rpre.status}`);
console.log(`      ACAO: ${rpre.headers.get('access-control-allow-origin') || '(无)'}`);
console.log(`      ACAC: ${rpre.headers.get('access-control-allow-credentials') || '(无)'}`);

// ── 2. 安全响应头 ───────────────────────────────────────────────────────────
console.log('\n【2】安全响应头');
const rh = await fetch(BASE + '/');
for (const h of ['strict-transport-security', 'x-frame-options', 'x-content-type-options', 'content-security-policy', 'referrer-policy', 'x-powered-by', 'server']) {
  const v = rh.headers.get(h);
  const bad = (h === 'x-powered-by' || h === 'server') && v;
  console.log(`   ${h.padEnd(28)} = ${v || '(无)'}${bad ? '   🔴 暴露了技术栈' : ''}`);
}

// ── 3. 免密能读到什么(只列字段名和条数,不打数据) ──────────────────────────
console.log('\n【3】不带任何凭证,能读到的东西 —— 修复后应该全是 403');
const NOAUTH = [
  '/api/members/1',
  '/api/auth/me?member_id=1',
  '/api/wallets/bank',
  '/api/wallets/digital',
  '/api/admin/me',
  '/api/withdrawals/mine?member_id=1',
  '/api/funds/mine?member_id=1',
  '/api/orders/mine?member_id=1',
  '/api/messages/mine?member_id=1',
  '/api/messages/unread?member_id=1',
];
let leaks = 0;
for (const p of NOAUTH) {
  const r = await fetch(BASE + p);
  let d = '';
  try {
    const b = await r.json();
    const arr = Object.entries(b).find(([, v]) => Array.isArray(v));
    const obj = Object.entries(b).find(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
    d = arr ? `${arr[0]}[${arr[1].length}] 字段:${Object.keys(arr[1][0] || {}).join(',')}`
      : obj ? `${obj[0]}{${Object.keys(obj[1]).join(',')}}`
      : Object.keys(b).join(',');
  } catch { d = '(非 JSON)'; }
  const ok = r.status === 403 || r.status === 401;
  if (!ok) leaks++;
  console.log(`   ${String(r.status).padEnd(4)} ${p.padEnd(34)} ${ok ? '✅ 已挡住' : '🔴 还能读!'} ${d.slice(0, 90)}`);
}

// ── 4. 冒充超管 ─────────────────────────────────────────────────────────────
console.log('\n【4】冒充超管 —— 老的 X-Admin-Id 头必须不再被认');
for (const hdr of [{ 'X-Admin-Id': '1' }, { Authorization: 'Bearer deadbeefdeadbeef' }, { 'X-Admin-Id': '1', Authorization: 'Bearer nope' }]) {
  const r = await fetch(BASE + '/api/admin/employees', { headers: hdr });
  const label = Object.entries(hdr).map(([k, v]) => `${k}: ${v}`).join(' + ');
  const ok = r.status === 403 || r.status === 401;
  if (!ok) leaks++;
  console.log(`   ${String(r.status).padEnd(4)} ${label.padEnd(46)} ${ok ? '✅ 已挡住' : '🔴 还能进!'}`);
}

// ── 5. 对照:本来就有鉴权的接口 ─────────────────────────────────────────────
console.log('\n【5】对照 —— 本来就有角色守卫的接口');
for (const p of ['/api/orders', '/api/funds', '/api/messages', '/api/stats', '/api/report/inout']) {
  const r = await fetch(BASE + p);
  console.log(`   GET ${p.padEnd(26)} → ${r.status} ${r.status === 403 ? '✅ 有鉴权' : '🔴 没鉴权'}`);
}

// ── 6. 实时推送(SSE)必须校验 token ─────────────────────────────────────────
//   以前"会员没有 session_token 时谁来都能订阅",改个 URL 里的 id
//   就能看别人的余额/信用分推送。
console.log('\n【6】SSE 订阅 —— 无 token / 错 token 必须 401');
for (const p of ['/api/members/1/stream', '/api/members/1/stream?token=deadbeef']) {
  const r = await fetch(BASE + p);
  const ok = r.status === 401 || r.status === 403;
  if (!ok) leaks++;
  console.log(`   ${String(r.status).padEnd(4)} ${p.padEnd(40)} ${ok ? '✅ 已挡住' : '🔴 还能订阅!'}`);
}

// ── 7. 响应里不能带 session_token ─────────────────────────────────────────
//   前台的 SSE 推送以前把 session_token 一起推出去 —— 等于把凭据
//   同时泄到 nginx 日志、浏览器历史和任何能看到响应的人手里。
console.log('\n【7】响应体里不该出现 session_token');
const tokRes = await fetch(BASE + '/api/auth/me?member_id=1');
const tokBody = await tokRes.text();
const hasTok = /session_token/i.test(tokBody);
if (hasTok) leaks++;
console.log(`   GET /api/auth/me(无凭证) → ${tokRes.status}, body 含 session_token: ${hasTok ? '🔴 有' : '✅ 没有'}`);

console.log('\n' + '═'.repeat(60));
console.log(leaks === 0
  ? '✅ 免密一个都读不到 —— 符合预期'
  : `🔴 还有 ${leaks} 个地方免密能读 —— 还没修干净`);
console.log('═'.repeat(60));
process.exit(leaks === 0 ? 0 : 1);
