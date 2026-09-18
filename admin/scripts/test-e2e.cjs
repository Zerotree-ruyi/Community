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

const BASE = 'http://localhost:5175';
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
  }, (res) => {
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

  const inviteList = await req('GET', '/api/admin/employees', null, { 'X-Admin-Id': String(superId) });
  const superEmp = inviteList.body?.items?.find(e => e.id === superId);
  const superInviteCode = superEmp?.invite_code;
  log(!!superInviteCode, `A2 拿到 super 邀请码 = ${superInviteCode}`);

  // ─── 阶段 B:会员注册 ───
  console.log('\n══ B. 会员注册 ══');
  const reg = await req('POST', '/api/auth/register', {
    account: testAccount,
    password: 'Pass1234',
    fundPassword: '123456',
    fundPasswordConfirm: '123456',
    inviteCode: superInviteCode,
  });
  log(reg.status === 201 && !!reg.body?.user?.id, 'B1 会员注册', reg.body);
  const memberId = reg.body?.user?.id;

  const dupReg = await req('POST', '/api/auth/register', {
    account: testAccount, password: 'Pass1234', fundPassword: '123456',
    fundPasswordConfirm: '123456', inviteCode: superInviteCode,
  });
  log(dupReg.status === 409 && dupReg.body?.error === 'account_taken', 'B2 重复注册应 409 account_taken', dupReg.body);

  const badReg = await req('POST', '/api/auth/register', {
    account: `bad_${ts}`, password: 'Pass1234', fundPassword: '123456',
    fundPasswordConfirm: '123456', inviteCode: 'WRONG99',
  });
  log(badReg.status === 400 && /invalid_invite_code|retired/.test(badReg.body?.error || ''),
    'B3 错误邀请码应 400', badReg.body);

  // ─── 阶段 C:会员登录 ───
  console.log('\n══ C. 会员登录 ══');
  const memberLogin = await req('POST', '/api/auth/login', { account: testAccount, password: 'Pass1234' });
  log(memberLogin.status === 200 && memberLogin.body?.user?.id === memberId, 'C1 会员登录', memberLogin.body?.user?.account);

  const wrongPwd = await req('POST', '/api/auth/login', { account: testAccount, password: 'WRONG' });
  log(wrongPwd.status === 401 && wrongPwd.body?.error === 'wrong_password', 'C2 错密码应 401 wrong_password', wrongPwd.body);

  const noAcc = await req('POST', '/api/auth/login', { account: 'nonexist', password: 'x' });
  log(noAcc.status === 401 && noAcc.body?.error === 'not_found', 'C3 不存在账号应 401 not_found', noAcc.body);

  // ─── 阶段 D:会员加钱包 ───
  console.log('\n══ D. 会员钱包 ══');
  // 银行卡(必须加 with X-Admin-Id 或 member_id 验证 — readMemberAccess 检查 member_id 或 admin)
  // 这里走 admin(super) 视角加,需要 X-Admin-Id
  const addBank = await req('POST', `/api/members/${memberId}/wallets/bank`, {
    bank_name: '中国工商银行', card_no: '6222021234567890', holder: '张三',
    branch: '北京中关村支行', notes: '主卡', is_default: true,
  }, { 'X-Admin-Id': String(superId) });
  log(addBank.status === 201 && !!addBank.body?.id, 'D1 加银行卡钱包', addBank.body);
  const bankWalletId = addBank.body?.id;

  const addDigital = await req('POST', `/api/members/${memberId}/wallets/digital`, {
    type1: 'USDT', type2: 'TRC20', address: 'TXxx...mockaddress', is_default: true, notes: '主钱包',
  }, { 'X-Admin-Id': String(superId) });
  log(addDigital.status === 201 && !!addDigital.body?.id, 'D2 加数字币钱包', addDigital.body);
  const digitalWalletId = addDigital.body?.id;

  const bankList = await req('GET', `/api/members/${memberId}/wallets/bank`, null, { 'X-Admin-Id': String(superId) });
  log(bankList.status === 200 && bankList.body?.data?.length >= 1, 'D3 列银行卡', bankList.body?.data?.length);

  const digitalList = await req('GET', `/api/members/${memberId}/wallets/digital`, null, { 'X-Admin-Id': String(superId) });
  log(digitalList.status === 200 && digitalList.body?.data?.length >= 1, 'D4 列数字币', digitalList.body?.data?.length);

  const missingField = await req('POST', `/api/members/${memberId}/wallets/bank`, { bank_name: 'X' }, { 'X-Admin-Id': String(superId) });
  log(missingField.status === 400, 'D5 银行卡缺字段应 400', missingField.body);

  // ─── 阶段 E:super 后台入款 ───
  console.log('\n══ E. super 后台入款 ══');
  const recharge = await req('POST', `/api/members/${memberId}/recharge`, {
    amount: 10000, notes: '测试入款', reviewer: 'admin',
  }, { 'X-Admin-Id': String(superId) });
  log(recharge.status === 200 && Number(recharge.body?.after) === 10000, 'E1 super 给会员入款 10000', recharge.body);

  // ─── 阶段 F:会员下单 ───
  console.log('\n══ F. 会员下单(30s 周期) ══');
  // 下单需要 member_id,无 X-Admin-Id 也行(register 时已记录)
  // 但下单路由里没看到 requireMemberAccess,所以可以直传 member_id
  const order = await req('POST', '/api/orders', {
    member_id: memberId, symbol: 'BTCUSDT', direction: '涨', amount: 100,
    open_price: 65000, period: '30s', return_rate: 20,
  });
  log(order.status === 200 && !!order.body?.order_id, 'F1 会员下单 100元 BTCUSDT 涨 30s', order.body);
  const orderId = order.body?.order_id;

  const myOrders = await req('GET', `/api/orders/mine?member_id=${memberId}`);
  log(myOrders.status === 200 && myOrders.body?.data?.length >= 1, 'F2 会员看自己订单', myOrders.body?.data?.length);

  const myFunds = await req('GET', `/api/funds/mine?member_id=${memberId}`);
  log(myFunds.status === 200 && myFunds.body?.data?.length >= 1, 'F3 会员看自己资金流水', myFunds.body?.data?.length);

  // 余额应冻结 100
  const memberInfo = await req('POST', '/api/auth/login', { account: testAccount, password: 'Pass1234' });
  log(Number(memberInfo.body?.user?.frozen) === 100 && Number(memberInfo.body?.user?.balance) === 9900,
    'F4 余额冻结 100,可用 9900', { balance: memberInfo.body?.user?.balance, frozen: memberInfo.body?.user?.frozen });

  // 等 32s 触发结算
  console.log('  (等待 32 秒让订单到期...)');
  await sleep(32000);
  const settle = await req('POST', '/api/orders/settle-due');
  log(settle.status === 200, 'F5 触发到期订单结算', settle.body);

  // 查结算结果
  const orderDetail = await req('GET', `/api/orders/${orderId}?member_id=${memberId}`);
  log(orderDetail.status === 200 && orderDetail.body?.order?.status === '已平仓',
    'F6 订单状态应为已平仓', orderDetail.body?.order?.status);

  // 重新查余额
  const memberAfter = await req('POST', '/api/auth/login', { account: testAccount, password: 'Pass1234' });
  console.log(`  结算后: balance=${memberAfter.body?.user?.balance}, frozen=${memberAfter.body?.user?.frozen}`);

  // ─── 阶段 G:提现申请 + 审核 ───
  console.log('\n══ G. 提现申请 + 审核 ══');
  // 提现需要 wallet_id + wallet_type + fund_password
  const withdraw = await req('POST', '/api/withdrawals', {
    member_id: memberId,
    wallet_type: 'bank',
    wallet_id: bankWalletId,
    amount: 500,
    fund_password: '123456',
  });
  log(withdraw.status === 200 && !!withdraw.body?.withdrawal?.id, 'G1 会员申请提现 500', withdraw.body);
  const withdrawId = withdraw.body?.withdrawal?.id;

  if (withdrawId) {
    const approve = await req('POST', `/api/withdrawals/${withdrawId}/approve`, {
      reviewer: 'admin', actual_amount: 500,
    }, { 'X-Admin-Id': String(superId) });
    log(approve.status === 200 && approve.body?.ok, 'G2 super 审核通过提现', approve.body);
  } else {
    log(false, 'G2 跳过 — 提现单未创建');
  }

  // ─── 阶段 H:站内消息 ───
  console.log('\n══ H. 站内消息 ══');
  const sendMsg = await req('POST', '/api/messages', {
    member_id: memberId, title: '测试消息', content: '这是一条测试消息', sender: 'admin',
  }, { 'X-Admin-Id': String(superId) });
  log(sendMsg.status === 200 && !!sendMsg.body?.id, 'H1 super 给会员发消息', sendMsg.body);

  const myMsgs = await req('GET', `/api/messages/mine?member_id=${memberId}`);
  log(myMsgs.status === 200 && myMsgs.body?.data?.length >= 1, 'H2 会员看自己消息', myMsgs.body?.data?.length);

  const msgId = myMsgs.body?.data?.[0]?.id;
  if (msgId) {
    const markRead = await req('POST', `/api/messages/${msgId}/read`, { member_id: memberId });
    log(markRead.status === 200 && markRead.body?.ok, 'H3 标记消息已读', markRead.body);
  }

  // ─── 阶段 I:RBAC(员工权限) ───
  console.log('\n══ I. RBAC 测试(非 super 不能看其他会员) ══');
  const empCreate = await req('POST', '/api/admin/employees', {
    username: empAccount, display_name: '测试员工', password: 'Test1234', role: 'admin',
  }, { 'X-Admin-Id': String(superId) });
  const empId = empCreate.body?.employee?.id;
  log(!!empId, `I1 创建测试员工 id=${empId}`);

  if (empId) {
    const empLogin = await req('POST', '/api/admin/login', { username: empAccount, password: 'Test1234' });
    log(empLogin.status === 200, 'I2 员工登录', empLogin.body?.user?.username);

    // 员工查 super 的客户 — 应 403
    const empSeeOther = await req('GET', `/api/members/${memberId}`, null, { 'X-Admin-Id': String(empId) });
    log(empSeeOther.status === 403, 'I3 员工查 super 的客户应 403', empSeeOther.body);

    // 员工查员工列表 — 应 403
    const empSeeList = await req('GET', '/api/admin/employees', null, { 'X-Admin-Id': String(empId) });
    log(empSeeList.status === 403, 'I4 员工查员工列表应 403', empSeeList.body);
  }

  // ─── 阶段 J:清理 ───
  console.log('\n══ J. 清理测试数据 ══');
  try {
    const c = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: 'zero' });
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
