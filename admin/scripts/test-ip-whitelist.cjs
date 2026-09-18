#!/usr/bin/env node
/**
 * 员工 IP 白名单 — 完整功能测试
 * 覆盖:后端 CRUD 4 个接口 + 登录校验 + 边界场景
 */
const http = require('http');

const BASE = 'http://localhost:5175';
let testPass = 0, testFail = 0;
const log = (ok, msg, extra) => {
  if (ok) { testPass++; console.log(`✅ ${msg}`); }
  else    { testFail++; console.log(`❌ ${msg}`, extra ?? ''); }
};

// 简化的 fetch
const req = (method, path, body, headers = {}) => new Promise((resolve) => {
  const url = new URL(BASE + path);
  const opts = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  const r = http.request(opts, (res) => {
    let buf = '';
    res.on('data', c => buf += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
      catch { resolve({ status: res.statusCode, body: buf }); }
    });
  });
  r.on('error', e => resolve({ status: 0, body: { error: e.message } }));
  if (body) r.write(JSON.stringify(body));
  r.end();
});

const main = async () => {
  console.log('═══════════════════════════════════════════');
  console.log('   员工 IP 白名单 — 完整功能测试');
  console.log('═══════════════════════════════════════════\n');

  // ───── 1. 准备:super 登录 + 创建测试员工 ─────
  console.log('─── 准备 ───');

  const superLogin = await req('POST', '/api/admin/login',
    { username: 'admin', password: 'admin123' });
  log(superLogin.status === 200, '1.1 super 登录', superLogin.body);
  const superId = superLogin.body?.user?.id;

  // 创建测试员工 testemp
  const create = await req('POST', '/api/admin/employees',
    { username: 'testemp', display_name: '测试员工', password: 'Test1234', role: 'admin' },
    { 'X-Admin-Id': String(superId) });
  // 处理可能的冲突(已有 testemp — 先删除再建)
  let empId = create.body?.employee?.id;
  if (!empId && create.body?.message?.includes('Duplicate')) {
    // 找现有 testemp id
    const list = await req('GET', '/api/admin/employees', null, { 'X-Admin-Id': String(superId) });
    const found = list.body?.items?.find(e => e.username === 'testemp');
    if (found) {
      empId = found.id;
      console.log(`  ↳ 复用已有 testemp (id=${empId})`);
    }
  } else {
    log(!!empId, '1.2 创建员工 testemp', create.body);
  }
  // 兜底:如果 create 没返回 id,从列表找
  if (!empId) {
    const list = await req('GET', '/api/admin/employees', null, { 'X-Admin-Id': String(superId) });
    empId = list.body?.items?.find(e => e.username === 'testemp')?.id;
  }
  log(!!empId, `1.3 拿到员工 id = ${empId}`);
  if (!empId) { console.log('无法继续 — 员工 id 未拿到'); return; }

  // 清掉旧白名单(干净起点)
  await req('PUT', `/api/admin/employees/${empId}/ip-rules`, { ips: [] }, { 'X-Admin-Id': String(superId) });

  console.log('\n─── CRUD 测试 ───');

  // ───── 2. GET 列出(应为空) ─────
  const list1 = await req('GET', `/api/admin/employees/${empId}/ip-rules`, null, { 'X-Admin-Id': String(superId) });
  log(list1.status === 200 && Array.isArray(list1.body?.data) && list1.body.data.length === 0,
    '2.1 GET 列出白名单(初始为空)', list1.body);

  // ───── 3. POST 添加一条 ─────
  const add1 = await req('POST', `/api/admin/employees/${empId}/ip-rules`,
    { ip: '192.168.1.100', note: '办公网' }, { 'X-Admin-Id': String(superId) });
  log(add1.status === 200 && add1.body?.ok && typeof add1.body?.id === 'number',
    '3.1 POST 添加 IP 规则', add1.body);
  const ruleId1 = add1.body?.id;

  // ───── 4. POST 重复 IP(应失败) ─────
  const dup = await req('POST', `/api/admin/employees/${empId}/ip-rules`,
    { ip: '192.168.1.100', note: '重复' }, { 'X-Admin-Id': String(superId) });
  log(dup.status === 400 && dup.body?.error === 'duplicate_ip',
    '4.1 POST 重复 IP 应 400 duplicate_ip', dup.body);

  // ───── 5. POST 空 IP(应失败) ─────
  const emptyIp = await req('POST', `/api/admin/employees/${empId}/ip-rules`,
    { ip: '', note: '' }, { 'X-Admin-Id': String(superId) });
  log(emptyIp.status === 400 && emptyIp.body?.error === 'invalid_input',
    '5.1 POST 空 IP 应 400 invalid_input', emptyIp.body);

  // ───── 6. POST IPv6 ─────
  const ipv6 = await req('POST', `/api/admin/employees/${empId}/ip-rules`,
    { ip: '2001:db8::1', note: 'IPv6 测试' }, { 'X-Admin-Id': String(superId) });
  log(ipv6.status === 200 && ipv6.body?.ok,
    '6.1 POST IPv6 IP', ipv6.body);

  // ───── 7. GET 列出(应有 2 条) ─────
  const list2 = await req('GET', `/api/admin/employees/${empId}/ip-rules`, null, { 'X-Admin-Id': String(superId) });
  log(list2.status === 200 && list2.body?.data?.length === 2,
    '7.1 GET 列出应有 2 条', list2.body);

  // ───── 8. DELETE 单条 ─────
  const del = await req('DELETE', `/api/admin/employees/${empId}/ip-rules/${ruleId1}`,
    null, { 'X-Admin-Id': String(superId) });
  log(del.status === 200 && del.body?.ok,
    '8.1 DELETE 单条规则', del.body);

  // ───── 9. GET 列出(应有 1 条) ─────
  const list3 = await req('GET', `/api/admin/employees/${empId}/ip-rules`, null, { 'X-Admin-Id': String(superId) });
  log(list3.status === 200 && list3.body?.data?.length === 1,
    '9.1 GET 列出应有 1 条', list3.body);

  // ───── 10. PUT 整组覆盖 ─────
  const put = await req('PUT', `/api/admin/employees/${empId}/ip-rules`,
    { ips: [{ ip: '10.0.0.1', note: '家' }, { ip: '10.0.0.2', note: '公司' }, { ip: '10.0.0.3', note: '出差' }] },
    { 'X-Admin-Id': String(superId) });
  log(put.status === 200 && put.body?.ok, '10.1 PUT 整组覆盖', put.body);

  // ───── 11. GET 列出(应有 3 条) ─────
  const list4 = await req('GET', `/api/admin/employees/${empId}/ip-rules`, null, { 'X-Admin-Id': String(superId) });
  log(list4.status === 200 && list4.body?.data?.length === 3,
    '11.1 GET 列出应有 3 条', list4.body);

  // ───── 12. GET 详情接口(应包含 ip_rules) ─────
  const detail = await req('GET', `/api/admin/employees/${empId}`, null, { 'X-Admin-Id': String(superId) });
  log(detail.status === 200 && Array.isArray(detail.body?.employee?.ip_rules) && detail.body.employee.ip_rules.length === 3,
    '12.1 GET 详情包含 ip_rules', detail.body?.employee?.ip_rules?.length);

  console.log('\n─── 登录校验测试 ───');

  // ───── 13. testemp 登录(白名单=10.0.0.x,客户端=::1) → 应 403 ─────
  await req('PUT', `/api/admin/employees/${empId}/ip-rules`,
    { ips: [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }] }, { 'X-Admin-Id': String(superId) });
  const login1 = await req('POST', '/api/admin/login', { username: 'testemp', password: 'Test1234' });
  log(login1.status === 403 && login1.body?.error === 'ip_not_allowed',
    '13.1 testemp 登录(IP 不在白名单)应 403', login1.body);

  // ───── 14. testemp 登录(白名单=10.0.0.1,客户端=::1) → 应 403 ─────
  const login2 = await req('POST', '/api/admin/login', { username: 'testemp', password: 'Test1234' });
  log(login2.status === 403 && login2.body?.error === 'ip_not_allowed',
    '14.1 同一 IP 不匹配 → 403', login2.body);

  // ───── 15. testemp 登录(白名单=::1) → 应 200 ─────
  await req('PUT', `/api/admin/employees/${empId}/ip-rules`,
    { ips: [{ ip: '::1', note: '本地 IPv6' }] }, { 'X-Admin-Id': String(superId) });
  const login3 = await req('POST', '/api/admin/login', { username: 'testemp', password: 'Test1234' });
  log(login3.status === 200 && login3.body?.user?.username === 'testemp',
    '15.1 白名单匹配 → 200', login3.body?.user?.username);

  // ───── 16. 清空白名单 → testemp 不受限 ─────
  await req('PUT', `/api/admin/employees/${empId}/ip-rules`, { ips: [] }, { 'X-Admin-Id': String(superId) });
  const login4 = await req('POST', '/api/admin/login', { username: 'testemp', password: 'Test1234' });
  log(login4.status === 200 && login4.body?.user?.username === 'testemp',
    '16.1 空白名单 → testemp 不受限', login4.body?.user?.username);

  // ───── 17. 白名单非空但 super 登录 → 仍然成功 ─────
  await req('PUT', `/api/admin/employees/${superId}/ip-rules`,
    { ips: [{ ip: '1.2.3.4' }] }, { 'X-Admin-Id': String(superId) });
  const superLogin2 = await req('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  log(superLogin2.status === 200 && superLogin2.body?.user?.role === 'super',
    '17.1 super 始终不受 IP 白名单限制', superLogin2.body?.user?.role);

  console.log('\n─── 权限校验测试 ───');

  // ───── 18. 非 super 调 CRUD(用 testemp token) → 应 403 ─────
  // testemp 自己不能管白名单
  const empLogin = await req('POST', '/api/admin/login', { username: 'testemp', password: 'Test1234' });
  const empTokenId = empLogin.body?.user?.id;
  const forbidden = await req('GET', `/api/admin/employees/${empId}/ip-rules`, null, { 'X-Admin-Id': String(empTokenId) });
  log(forbidden.status === 403,
    '18.1 非 super 调 GET 应 403', forbidden.body);

  // ───── 19. 不传 X-Admin-Id 调 CRUD → 应 403 ─────
  const noAuth = await req('GET', `/api/admin/employees/${empId}/ip-rules`);
  log(noAuth.status === 403,
    '19.1 无 X-Admin-Id 应 403', noAuth.body);

  // ───── 20. 操作不存在的员工 id → 应 404 或空 ─────
  const notExist = await req('GET', '/api/admin/employees/99999', null, { 'X-Admin-Id': String(superId) });
  log(notExist.status === 404,
    '20.1 不存在员工 id 应 404', notExist.body);

  console.log('\n═══════════════════════════════════════════');
  console.log(`   测试完成: ${testPass} 通过, ${testFail} 失败`);
  console.log('═══════════════════════════════════════════');

  // 清理
  await req('PUT', `/api/admin/employees/${empId}/ip-rules`, { ips: [] }, { 'X-Admin-Id': String(superId) });
  console.log('(已清空测试员工白名单,testemp 保留方便后续 UI 测试)');
  process.exit(testFail > 0 ? 1 : 0);
};

main().catch(e => { console.error('测试异常:', e); process.exit(2); });
