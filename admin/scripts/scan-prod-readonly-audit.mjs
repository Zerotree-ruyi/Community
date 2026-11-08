/**
 * 生产环境只读审计 —— 全部只发 GET / OPTIONS,不含任何写方法。
 *
 * 目标:http://47.236.95.137:3001 (直连后端) 和 http://47.236.95.137 (经 nginx)
 */
const BASE = process.env.SCAN_B_API || 'http://47.236.95.137:3001';

// ── 1. CORS ─────────────────────────────────────────────────────────────────
console.log('【1】CORS —— 任意 Origin 会不会被放行');
for (const origin of ['https://evil.example', 'https://attacker.com', 'null']) {
  const r = await fetch(BASE + '/api/health', { headers: { Origin: origin } });
  console.log(`   Origin ${origin.padEnd(24)} → Access-Control-Allow-Origin: ${r.headers.get('access-control-allow-origin') || '(无)'}`);
}
const rpre = await fetch(BASE + '/api/admin/employees', {
  method: 'OPTIONS',
  headers: {
    Origin: 'https://evil.example',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'x-admin-id',
  },
});
console.log(`   预检 OPTIONS /api/admin/employees → ${rpre.status}`);
console.log(`      ACAO: ${rpre.headers.get('access-control-allow-origin') || '(无)'}`);
console.log(`      ACAC: ${rpre.headers.get('access-control-allow-credentials') || '(无)'}`);
console.log(`      ACAH: ${rpre.headers.get('access-control-allow-headers') || '(无)'}`);

// ── 2. 安全响应头 ───────────────────────────────────────────────────────────
console.log('\n【2】安全响应头');
const rh = await fetch(BASE + '/');
for (const h of ['strict-transport-security', 'x-frame-options', 'x-content-type-options', 'content-security-policy', 'referrer-policy', 'x-powered-by', 'server']) {
  console.log(`   ${h.padEnd(28)} = ${rh.headers.get(h) || '(无)'}`);
}

// ── 3. 免密能读到什么 ───────────────────────────────────────────────────────
console.log('\n【3】不带任何凭证,能读到的东西(只列字段名和条数,不打数据)');
for (const p of [
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
]) {
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
  console.log(`   ${String(r.status).padEnd(4)} ${p.padEnd(34)} ${d.slice(0, 115)}`);
}

// ── 4. 对照:哪些接口有鉴权 ─────────────────────────────────────────────────
console.log('\n【4】对照 —— 同一个「无凭证」请求打到受保护接口');
for (const p of ['/api/orders', '/api/funds', '/api/messages', '/api/stats', '/api/admin/employees', '/api/admin/support-links', '/api/report/inout']) {
  const r = await fetch(BASE + p);
  console.log(`   GET ${p.padEnd(26)} → ${r.status} ${r.status === 403 ? '✅ 有鉴权' : '🔴 没鉴权'}`);
}
