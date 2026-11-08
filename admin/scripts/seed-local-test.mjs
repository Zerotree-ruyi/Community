/**
 * 本地测试数据播种 —— 只往本机 MySQL 写,不碰任何远程/生产库。
 *
 * 用法:
 *   ALLOW_LOCAL_SEED=1 node scripts/seed-local-test.mjs
 *
 * 造的东西:
 *   - 管理员 admin / admin123 (super)
 *   - 会员 testuser01 / Test123456,资金密码 123456(已设置)
 *   - 一张银行卡钱包
 *   - 一笔"后台充值" 6000(后台首页"今日入款"卡片要显示 6000)
 *   - 一笔"申请中"的提现 100(用来测后台拒绝)
 *   - 2 条未读站内信(测 Site Messages 红点)
 */

import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { loadEnv, assertLocalDb, safePwd, MEMBER_PWD, MEMBER_FUND_PWD } from './lib-env.mjs';

const env = loadEnv();

// ⚠️ 安全闸:这个脚本会往库里写测试会员/提现单。
//    生产机(B台)的 .env 指向的是本机 MySQL(127.0.0.1),光看地址拦不住,
//    所以必须显式开闸:ALLOW_LOCAL_SEED=1 才会执行。
assertLocalDb(env);

const db = await createConnection({
  host: env.DB_HOST || '127.0.0.1',
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
});

// 管理员
await db.query(
  `INSERT INTO admin_users (username, password_hash, display_name, role, status, invite_code)
   VALUES ('admin', ?, '本地测试超管', 'super', 1, 'TESTINV1')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 1, role = 'super'`,
  [bcrypt.hashSync('admin123', 10)]
);
const [[admin]] = await db.query(`SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1`);

// 会员(已设置资金密码)
//   初始余额 1000,再通过"后台充值"上 6000 → 7000。
//   后台首页"今日入款"卡片读的就是 fund_records 里 type='后台充值' 的当天合计。
//
// ⚠️ 登录密码存**明文的哈希**,不套 safePwd —— 前台 AuthContext.login 发的是
//    用户原样输入的密码(只有资金密码才走 safePwd 混淆)。
//    套了 safePwd 的话,浏览器里正常登录会 401。
const BASE_BALANCE = 1000.00;
const RECHARGE = 6000.00;
await db.query(
  `INSERT INTO members
     (account, nickname, password_hash, fund_password, session_token, status, balance, frozen,
      credit, agent_id, invite_code, type, register_time)
   VALUES ('testuser01', '测试会员', ?, ?, 'testsessiontoken0000000000000001', 1, ?, 0.00,
           '100|3', ?, 'TESTINV1', '会员', NOW())
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), fund_password = VALUES(fund_password),
                           balance = VALUES(balance), status = 1`,
  [bcrypt.hashSync(MEMBER_PWD, 10), bcrypt.hashSync(safePwd(MEMBER_FUND_PWD), 10),
   BASE_BALANCE, admin.id]
);
const [[member]] = await db.query(`SELECT id FROM members WHERE account = 'testuser01' LIMIT 1`);

// 后台充值 6000 —— 走真实口径:fund_records.type='后台充值',金额为正
await db.query(`DELETE FROM fund_records WHERE member_id = ? AND notes LIKE '本地测试充值%'`, [member.id]);
await db.query(
  `INSERT INTO fund_records
     (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
   VALUES (?, 'TESTINV1', ?, ?, ?, ?, '后台充值', '本地测试充值6000', NOW())`,
  [admin.id, member.id, BASE_BALANCE, RECHARGE, BASE_BALANCE + RECHARGE]
);
await db.query(`UPDATE members SET balance = ? WHERE id = ?`, [BASE_BALANCE + RECHARGE, member.id]);

// 银行卡钱包
await db.query(`DELETE FROM bank_wallets WHERE member_id = ?`, [member.id]);
const [wres] = await db.query(
  `INSERT INTO bank_wallets
     (member_id, bank_name, card_no, holder, id_number, branch, ifsc, contact, notes, is_default)
   VALUES (?, 'Test Bank', '6222021234567890', 'ZHANG SAN', '110101199001011234',
           'Test Branch', 'TESTIFSC0001', '13800000000', 'local test wallet', 1)`,
  [member.id]
);
const walletId = wres.insertId;

// 一笔"申请中"的提现(用来测后台拒绝 —— 尤其拒绝理由超长)
await db.query(`DELETE FROM withdrawals WHERE member_id = ?`, [member.id]);
await db.query(
  `INSERT INTO withdrawals
     (agent_id, invite_code, member_id, wallet_id, wallet_type, status, amount, fee,
      actual_amount, approved, type, apply_time)
   VALUES (?, 'TESTINV1', ?, ?, 'bank', '申请中', 100.00, 1.00, 99.00, 0, '银行卡', NOW())`,
  [admin.id, member.id, walletId]
);

// 站内信(测 Site Messages 未读红点)
//   只清掉给这个会员的信 + 广播信(member_id IS NULL)。
//   广播信也算未读,不一起清的话红点数字每次跑都不一样。
await db.query(`DELETE FROM messages WHERE member_id = ? OR member_id IS NULL`, [member.id]);
await db.query(
  `INSERT INTO messages (member_id, title, content, sender, send_time) VALUES
     (?, 'Deposit reward issued', 'Your deposit reward has been credited to your balance.', 'admin', NOW()),
     (?, 'Withdrawal under review', 'We are reviewing your withdrawal request.', 'admin', NOW())`,
  [member.id, member.id]
);

const [[w]] = await db.query(`SELECT id, amount, status FROM withdrawals WHERE member_id = ? LIMIT 1`, [member.id]);
console.log(JSON.stringify({
  admin:      { username: 'admin',   password: 'admin123' },
  member:     { account: 'testuser01', password: MEMBER_PWD, fundPassword: MEMBER_FUND_PWD, id: member.id },
  withdrawal: w,
  messages:   2,
}, null, 2));

await db.end();
