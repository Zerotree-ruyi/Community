#!/usr/bin/env node
/**
 * 端到端测试 — 覆盖前台(会员)和后台(管理员)核心功能
 *
 * 测试场景:
 *   A. super 登录 + 拿邀请码
 *   B. 会员注册(正常/重复/错误邀请码)
 *   C. 会员登录(正常/错密码/错账号)
 *   D. 会员加银行卡 / 数字币钱包 + 列表 + 必填校验
 *   E. super 后台入款
 *   F. 会员下单(30s 周期)→ 余额冻结 → 等到期 → 触发结算
 *   G. 会员提现申请 + super 审核通过
 *   H. super 站内信 → 会员读取 → 标记已读
 *   I. RBAC:非 super 员工不能看 super 的客户
 *   J. 清理测试数据
 */
const http = require('http');
const mysql = require('mysql2/promise');

// 默认连后台 dev(5174);端口可用 ADMIN_BASE 覆盖
const BASE = process.env.ADMIN_BASE || 'http://localhost:5174';

// 资金密码在前台提交前会先过一遍 safePwd(14 位 base62 混淆),
// 后端只认混淆后的串 —— 这里必须同样混淆,否则注册会被 RE_FUND_PWD 拦掉。
// 登录密码**不**混淆,原样发。
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function fnv1aHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}
function safePwd(input) {
  let n = fnv1aHash(input);
  n = (n * 0x9e3779b1) >>> 0;
  let out = '';
  for (let i = 0; i < 14; i++) {
    out += BASE62[n % 62];
    n = Math.floor(n / 62) || fnv1aHash(input + i);
  }
  return out;
}
const FUND_PWD = safePwd('123456');
let pass = 0, fail = 0;
const log = (ok, msg, extra) => {
  if (ok) { pass++; console.log(`✅ ${msg}`); }
  else    { fail++; console.log(`❌ ${msg}`, extra ? `\n   → ${JSON.stringify(extra).slice(0, 300)}` : ''); }
};

const req = (method, path, body, headers = {}) => new Promise((resolve) => {
  const url = new URL(BASE + path);
  const r = http.request({
    method, hostname: url.hostname, port: url.port, path: url.pathname + url.search,
    headers: { 'Content-Type': 'application/json', ...headers },
    // SSE 这类长连接必须有超时,否则测试会挂死
    timeout: 8000,
  }, (res) => {
    let buf = '';
    res.on('data', c => buf += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
      catch { resolve({ status: res.statusCode, body: buf }); }
    });
  });
  r.on('timeout', () => { r.destroy(); resolve({ status: 0, body: { error: 'timeout' } }); });
  r.on('error', e => resolve({ status: 0, body: { error: e.message } }));
  if (body) r.write(JSON.stringify(body));
  r.end();
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

const main = async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('   端到端测试 — 前台会员 + 后台管理员全流程');
  console.log('═══════════════════════════════════════════════════\n');

  const ts = Date.now();
  const testAccount = `test_${ts}`;
  const empAccount  = `test_emp_${ts}`;

  // ─── 阶段 A:super 登录 ───
  console.log('══ A. super 登录 ══');
  const superLogin = await req('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  log(superLogin.status === 200 && superLogin.body?.user?.id, 'A1 super admin/admin123 登录', superLogin.body);
  const superId = superLogin.body?.user?.id;
  // 后台身份 = 登录时后端签发的令牌(不再用「随便填个 id」的 X-Admin-Id 头)
  const superAuth = { Authorization: `Bearer ${superLogin.body?.token}` };

  const inviteList = await req('GET', '/api/admin/employees', null, superAuth);
  const superEmp = inviteList.body?.items?.find(e => e.id === superId);
  const superInviteCode = superEmp?.invite_code;
  log(!!superInviteCode, `A2 拿到 super 邀请码 = ${superInviteCode}`);

  // ─── 阶段 B:会员注册 ───
  console.log('\n══ B. 会员注册 ══');
  const reg = await req('POST', '/api/auth/register', {
    account: testAccount,
    password: 'Pass1234',
    fundPassword: FUND_PWD,
    fundPasswordConfirm: FUND_PWD,
    inviteCode: superInviteCode,
  });
  log(reg.status === 201 && !!reg.body?.user?.id, 'B1 会员注册', reg.body);
  const memberId = reg.body?.user?.id;

  const dupReg = await req('POST', '/api/auth/register', {
    account: testAccount, password: 'Pass1234', fundPassword: FUND_PWD,
    fundPasswordConfirm: FUND_PWD, inviteCode: superInviteCode,
  });
  log(dupReg.status === 409 && dupReg.body?.error === 'account_taken', 'B2 重复注册应 409 account_taken', dupReg.body);

  const badReg = await req('POST', '/api/auth/register', {
    account: `bad_${ts}`, password: 'Pass1234', fundPassword: FUND_PWD,
    fundPasswordConfirm: FUND_PWD, inviteCode: 'WRONG99',
  });
  log(badReg.status === 400 && /invalid_invite_code|retired/.test(badReg.body?.error || ''),
    'B3 错误邀请码应 400', badReg.body);

  // ─── 阶段 C:会员登录 ───
  console.log('\n══ C. 会员登录 ══');
  const memberLogin = await req('POST', '/api/auth/login', { account: testAccount, password: 'Pass1234' });
  log(memberLogin.status === 200 && memberLogin.body?.user?.id === memberId, 'C1 会员登录', memberLogin.body?.user?.account);
  // 会员身份 = 自己的 session_token(登录会刷新它,每次重新登录都要更新)
  let memberToken = memberLogin.body?.user?.session_token;
  const memberAuth = () => ({ 'X-Member-Token': memberToken });

  const wrongPwd = await req('POST', '/api/auth/login', { account: testAccount, password: 'WRONG' });
  log(wrongPwd.status === 401 && wrongPwd.body?.error === 'wrong_password', 'C2 错密码应 401 wrong_password', wrongPwd.body);

  const noAcc = await req('POST', '/api/auth/login', { account: 'nonexist', password: 'x' });
  log(noAcc.status === 401 && noAcc.body?.error === 'not_found', 'C3 不存在账号应 401 not_found', noAcc.body);

  // ─── 阶段 D:会员加钱包 ───
  console.log('\n══ D. 会员钱包 ══');
  // 银行卡:走 admin(super) 视角加,需要后台令牌
  const addBank = await req('POST', `/api/members/${memberId}/wallets/bank`, {
    bank_name: '中国工商银行', card_no: '6222021234567890', holder: '张三',
    branch: '北京中关村支行', notes: '主卡', is_default: true,
  }, superAuth);
  log(addBank.status === 201 && !!addBank.body?.id, 'D1 加银行卡钱包', addBank.body);
  const bankWalletId = addBank.body?.id;

  // 数字钱包要 VIP5(后端兜底,前端也拦)。新会员默认 VIP1 → 先测被拦,再升 VIP 再加。
  const digitalDenied = await req('POST', `/api/members/${memberId}/wallets/digital`, {
    type1: 'USDT', type2: 'TRC20', address: 'TXxx...mockaddress', is_default: true, notes: '主钱包',
  }, superAuth);
  log(digitalDenied.status === 403 && digitalDenied.body?.error === 'vip_required',
    'D2a VIP1 加数字币钱包应 403 vip_required', digitalDenied.body);

  await req('PUT', `/api/members/${memberId}`, { credit: '100|5' }, superAuth);

  const addDigital = await req('POST', `/api/members/${memberId}/wallets/digital`, {
    type1: 'USDT', type2: 'TRC20', address: 'TXxx...mockaddress', is_default: true, notes: '主钱包',
  }, superAuth);
  log(addDigital.status === 201 && !!addDigital.body?.id, 'D2b VIP5 加数字币钱包', addDigital.body);
  const digitalWalletId = addDigital.body?.id;

  const bankList = await req('GET', `/api/members/${memberId}/wallets/bank`, null, superAuth);
  log(bankList.status === 200 && bankList.body?.data?.length >= 1, 'D3 列银行卡', bankList.body?.data?.length);

  const digitalList = await req('GET', `/api/members/${memberId}/wallets/digital`, null, superAuth);
  log(digitalList.status === 200 && digitalList.body?.data?.length >= 1, 'D4 列数字币', digitalList.body?.data?.length);

  const missingField = await req('POST', `/api/members/${memberId}/wallets/bank`, { bank_name: 'X' }, superAuth);
  log(missingField.status === 400, 'D5 银行卡缺字段应 400', missingField.body);

  // ─── 阶段 E:super 后台入款 ───
  console.log('\n══ E. super 后台入款 ══');
  const recharge = await req('POST', `/api/members/${memberId}/recharge`, {
    amount: 10000, notes: '测试入款', reviewer: 'admin',
  }, superAuth);
  log(recharge.status === 200 && Number(recharge.body?.after) === 10000, 'E1 super 给会员入款 10000', recharge.body);

  // ─── 阶段 F:会员下单 ───
  console.log('\n══ F. 会员下单(30s 周期) ══');
  // 下单必须带会员自己的 token —— 后端现在认「你是谁」,不再只看 member_id
  const order = await req('POST', '/api/orders', {
    member_id: memberId, symbol: 'BTCUSDT', direction: '涨', amount: 100,
    open_price: 65000, period: '30s', return_rate: 20,
  }, memberAuth());
  log(order.status === 200 && !!order.body?.order_id, 'F1 会员下单 100元 BTCUSDT 涨 30s', order.body);
  const orderId = order.body?.order_id;

  const myOrders = await req('GET', `/api/orders/mine?member_id=${memberId}`, null, memberAuth());
  log(myOrders.status === 200 && myOrders.body?.data?.length >= 1, 'F2 会员看自己订单', myOrders.body?.data?.length);

  const myFunds = await req('GET', `/api/funds/mine?member_id=${memberId}`, null, memberAuth());
  log(myFunds.status === 200 && myFunds.body?.data?.length >= 1, 'F3 会员看自己资金流水', myFunds.body?.data?.length);

  // 下单只扣 balance,**不动 frozen**(frozen 只表示后台手动冻结的金额,
  // 见 migrations/2026_frozen_admin_only.sql)
  const memberInfo = await req('POST', '/api/auth/login', { account: testAccount, password: 'Pass1234' });
  // 每次重新登录都会刷新 session_token —— 旧的立刻失效,必须换成新的
  memberToken = memberInfo.body?.user?.session_token;
  log(Number(memberInfo.body?.user?.balance) === 9900 && Number(memberInfo.body?.user?.frozen) === 0,
    'F4 下单扣 balance 100,可用 9900,frozen 不变(仍为 0)',
    { balance: memberInfo.body?.user?.balance, frozen: memberInfo.body?.user?.frozen });

  // 等 32s 触发结算
  console.log('  (等待 32 秒让订单到期...)');
  await sleep(32000);
  const settle = await req('POST', '/api/orders/settle-due', null, memberAuth());
  log(settle.status === 200, 'F5 触发到期订单结算', settle.body);

  // 查结算结果
  const orderDetail = await req('GET', `/api/orders/${orderId}?member_id=${memberId}`, null, memberAuth());
  log(orderDetail.status === 200 && orderDetail.body?.order?.status === '已平仓',
    'F6 订单状态应为已平仓', orderDetail.body?.order?.status);

  // 重新查余额
  const memberAfter = await req('POST', '/api/auth/login', { account: testAccount, password: 'Pass1234' });
  memberToken = memberAfter.body?.user?.session_token;
  console.log(`  结算后: balance=${memberAfter.body?.user?.balance}, frozen=${memberAfter.body?.user?.frozen}`);

  // ─── 阶段 G:提现申请 + 审核 ───
  console.log('\n══ G. 提现申请 + 审核 ══');
  // 提现需要 wallet_id + wallet_type + fund_password
  const withdraw = await req('POST', '/api/withdrawals', {
    member_id: memberId,
    wallet_type: 'bank',
    wallet_id: bankWalletId,
    amount: 500,
    fund_password: FUND_PWD,
  }, memberAuth());
  log(withdraw.status === 200 && !!withdraw.body?.withdrawal?.id, 'G1 会员申请提现 500', withdraw.body);
  const withdrawId = withdraw.body?.withdrawal?.id;

  if (withdrawId) {
    const approve = await req('POST', `/api/withdrawals/${withdrawId}/approve`, {
      reviewer: 'admin', actual_amount: 500,
    }, superAuth);
    log(approve.status === 200 && approve.body?.ok, 'G2 super 审核通过提现', approve.body);
  } else {
    log(false, 'G2 跳过 — 提现单未创建');
  }

  // ─── 阶段 H:站内消息 ───
  console.log('\n══ H. 站内消息 ══');
  const sendMsg = await req('POST', '/api/messages', {
    member_id: memberId, title: '测试消息', content: '这是一条测试消息', sender: 'admin',
  }, superAuth);
  log(sendMsg.status === 200 && !!sendMsg.body?.id, 'H1 super 给会员发消息', sendMsg.body);

  const myMsgs = await req('GET', `/api/messages/mine?member_id=${memberId}`, null, memberAuth());
  log(myMsgs.status === 200 && myMsgs.body?.data?.length >= 1, 'H2 会员看自己消息', myMsgs.body?.data?.length);

  const msgId = myMsgs.body?.data?.[0]?.id;
  if (msgId) {
    const markRead = await req('POST', `/api/messages/${msgId}/read`, { member_id: memberId }, memberAuth());
    log(markRead.status === 200 && markRead.body?.ok, 'H3 标记消息已读', markRead.body);
  }

  // ─── 阶段 I:RBAC(员工权限) ───
  console.log('\n══ I. RBAC 测试(非 super 不能看其他会员) ══');
  const empCreate = await req('POST', '/api/admin/employees', {
    username: empAccount, display_name: '测试员工', password: 'Test1234', role: 'admin',
  }, superAuth);
  const empId = empCreate.body?.employee?.id;
  log(!!empId, `I1 创建测试员工 id=${empId}`);

  if (empId) {
    const empLogin = await req('POST', '/api/admin/login', { username: empAccount, password: 'Test1234' });
    log(empLogin.status === 200, 'I2 员工登录', empLogin.body?.user?.username);
    const empAuth = { Authorization: `Bearer ${empLogin.body?.token}` };

    // 员工查 super 的客户 — 应 403
    const empSeeOther = await req('GET', `/api/members/${memberId}`, null, empAuth);
    log(empSeeOther.status === 403, 'I3 员工查 super 的客户应 403', empSeeOther.body);

    // 员工查员工列表 — 应 403
    const empSeeList = await req('GET', '/api/admin/employees', null, empAuth);
    log(empSeeList.status === 403, 'I4 员工查员工列表应 403', empSeeList.body);
  }

  // ─── 阶段 J:清理 ───
  console.log('\n══ J. 清理测试数据 ══');
  // ---- 阶段 K:安全回归(免密读写必须全被挡) ----
  console.log('\n== K. 安全回归 — 免密访问必须 403 ==');
  const noAuth = [
    ['会员详情',   `/api/members/${memberId}`],
    ['自己的流水', `/api/funds/mine?member_id=${memberId}`],
    ['自己的订单', `/api/orders/mine?member_id=${memberId}`],
    ['自己的消息', `/api/messages/mine?member_id=${memberId}`],
    ['银行卡列表(带身份证号)', `/api/wallets/bank`],
    ['数字币钱包列表',         `/api/wallets/digital`],
    ['员工列表',   `/api/admin/employees`],
    ['全站统计',   `/api/stats`],
  ];
  for (const [name, p] of noAuth) {
    const r = await req('GET', p);
    log(r.status === 403, `K1 ${name} 无凭证应 403`, { status: r.status, body: r.body });
  }

  // 冒充超管 —— 老的 X-Admin-Id 头必须不再被认
  const fakeAdmin = await req('GET', `/api/admin/employees`, null, { 'X-Admin-Id': '1' });
  log(fakeAdmin.status === 403, 'K2 伪造 X-Admin-Id: 1 应 403', { status: fakeAdmin.status });

  // 随便编一个令牌
  const fakeToken = await req('GET', `/api/admin/employees`, null, { Authorization: 'Bearer deadbeefdeadbeef' });
  log(fakeToken.status === 403, 'K3 伪造 Bearer 令牌应 403', { status: fakeToken.status });

  // 会员拿自己的令牌读别人的数据 —— 应 403
  const crossRead = await req('GET', '/api/members/999999', null, memberAuth());
  log(crossRead.status === 403, 'K4 会员读别人的会员应 403', { status: crossRead.status });

  // 会员带自己的令牌读自己的数据 —— 必须 200(不能把正常功能也堵了)
  const selfRead = await req('GET', `/api/funds/mine?member_id=${memberId}`, null, memberAuth());
  log(selfRead.status === 200, 'K5 会员带自己的令牌读自己数据应 200', { status: selfRead.status });

  // 带正确令牌的后台 —— 必须 200
  const adminOk = await req('GET', `/api/members/${memberId}`, null, superAuth);
  log(adminOk.status === 200, 'K6 后台带令牌读会员应 200', { status: adminOk.status });

  // ---- 会员不能给自己提权(带自己的令牌也不行) ----
  //   这一组是重点:如果"会员本人"也能过 requireMemberAccess,
  //   会员就能给自己改信用分/加钱/冻结 —— 那是提权,必须单独挡住。
  const selfEscalate = [
    ['改信用分',  'PUT',  `/api/members/${memberId}`, { credit: '99|3' }],
    ['加钱',      'POST', `/api/members/${memberId}/recharge`, { amount: 1000, notes: 'self' }],
    ['冻结',      'POST', `/api/members/${memberId}/freeze`, { amount: 100, action: 'freeze' }],
    ['重置密码',  'POST', `/api/members/${memberId}/reset-password`, { new_password: 'Hacked123' }],
    ['启用禁用',  'POST', `/api/members/${memberId}/toggle-status`, {}],
    ['删银行卡',  'DELETE', `/api/wallets/bank/1`, null],
    ['删站内信',  'DELETE', `/api/messages/1`, null],
  ];
  for (const [name, m, p, b] of selfEscalate) {
    const r = await req(m, p, b, memberAuth());
    log(r.status === 403, `K7 会员给自己${name}应 403`, { status: r.status, body: r.body });
  }

  // ---- 实时推送(SSE)必须校验 token ----
  //   以前"会员没有 session_token 时谁来都能订阅",改个 URL 里的 id
  //   就能看别人的余额/信用分。
  const sseNoToken = await req('GET', `/api/members/${memberId}/stream`);
  log(sseNoToken.status === 401, 'K8 SSE 无 token 订阅应 401', { status: sseNoToken.status });

  const sseBadToken = await req('GET', `/api/members/${memberId}/stream?token=deadbeef`);
  log(sseBadToken.status === 401, 'K9 SSE 错 token 订阅应 401', { status: sseBadToken.status });

  // ---- 强制下线后旧 token 必须失效 ----
  const kick = await req('POST', `/api/admin/members/${memberId}/force-logout`, { reviewer: 'admin' }, superAuth);
  log(kick.status === 200, 'K10 后台强制下线应 200', { status: kick.status, body: kick.body });
  const afterKick = await req('GET', `/api/funds/mine?member_id=${memberId}`, null, memberAuth());
  log(afterKick.status === 403, 'K11 强制下线后旧 token 应失效 403', { status: afterKick.status });


  try {
    const c = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'exchange_db',
    });
    await c.execute('DELETE FROM messages WHERE member_id = ?', [memberId]);
    await c.execute('DELETE FROM fund_records WHERE member_id = ?', [memberId]);
    await c.execute('DELETE FROM withdrawals WHERE member_id = ?', [memberId]);
    await c.execute('DELETE FROM orders WHERE member_id = ?', [memberId]);
    await c.execute('DELETE FROM bank_wallets WHERE member_id = ?', [memberId]);
    await c.execute('DELETE FROM digital_wallets WHERE member_id = ?', [memberId]);
    await c.execute('DELETE FROM members WHERE id = ?', [memberId]);
    await c.execute('DELETE FROM admin_users WHERE username = ?', [empAccount]);
    await c.end();
    console.log('  ✅ 测试数据已清理');
  } catch (e) {
    console.log('  ⚠ 清理失败(非阻塞):', e.message);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`   测试完成: ${pass} 通过, ${fail} 失败`);
  console.log('═══════════════════════════════════════════════════');
  process.exit(fail > 0 ? 1 : 0);
};

main().catch(e => { console.error('测试异常:', e); process.exit(2); });
