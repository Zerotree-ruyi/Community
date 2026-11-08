/**
 * 造一批测试站内信 —— 方便在后台测搜索/弹窗/未读红点。
 * 重复跑会先清掉上一轮同名的测试信。
 *
 * 用法:
 *   ALLOW_LOCAL_SEED=1 node scripts/seed-messages.mjs
 */
import { createConnection } from 'mysql2/promise';
import { loadEnv, assertLocalDb } from './lib-env.mjs';

const env = loadEnv();
assertLocalDb(env);

const db = await createConnection({
  host: env.DB_HOST || '127.0.0.1',
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
});

// 先清掉上一轮同名的测试信(方便重复跑)
await db.query("DELETE FROM messages WHERE title LIKE '测试%' OR title LIKE '[TEST]%'");

// 收件人用库里真实存在的会员 id —— 不能写死 3/4/5,本地库可能只有一两个会员,
// 写死会造出一堆指向不存在会员的孤儿信。
const [mrows] = await db.query(`SELECT id FROM members ORDER BY id LIMIT 5`);
const mIds = mrows.map(r => Number(r.id));
if (!mIds.length) {
  console.error('库里一个会员都没有,先跑 seed-local-test.mjs');
  process.exit(1);
}
// 会员不够就循环着用,够用的话给不同会员分不同的信
const pick = (n) => mIds[n % mIds.length];

const list = [
  // 收件人序号, title, content, sender, 分钟前, 已读
  [0,    '[TEST] 充值奖励发放通知',   '您的充值奖励已发放,请在账户余额中查收。',            'admin', 5,   true],
  [0,    '[TEST] 提现审核通过',       '您的一笔提现申请已审核通过,金额已打回可用余额。',       'admin', 30,  true],
  [0,    '[TEST] 实名认证(KYC)提醒',  '请尽快完成实名认证,否则无法提现。',                  'admin', 90,  false],
  [0,    '[TEST] 系统维护通知',       '今晚 02:00-04:00 系统维护,期间可能无法下单。',       'system', 200, false],
  [1,    '[TEST] 欢迎加入',           '欢迎加入,新用户完成首次充值为 USDT 赠送 10 USDT。',  'admin', 15,  true],
  [1,    '[TEST] 提现审核通过',       '您的一笔提现申请已审核通过,金额已打回可用余额。',       'admin', 60,  false],
  [1,    '[TEST] 交易手续费调整',     '现货交易手续费调整为 0.1%,请留意。',                 'admin', 300, false],
  [2,    '[TEST] 账号安全提醒',       '检测到您的账号在新设备登录,如非本人操作请修改密码。',  'admin', 45,  true],
  [2,    '[TEST] 提现审核被拒',       '您的一笔提现申请因收款信息不完整被拒,金额已退回。',     'admin', 120, false],
  [3,    '[TEST] 会员等级升级通知',   '恭喜,您的信誉分已提升至 100,VIP 等级已更新。',        'admin', 75,  false],
  [null, '[TEST] 全员广播:系统升级', '系统将于本周升级,升级期间短暂不可用,感谢理解。',       'admin', 10,  false],
  [null, '[TEST] 全员广播:活动公告', '充 100 送 10 活动进行中,详情请咨询客服。',             'admin', 150, false],
];

const ids = [];
for (const [who, title, content, sender, minsAgo, read] of list) {
  const mid = who === null ? null : pick(who);
  const st = new Date(Date.now() - minsAgo * 60000);
  const rt = read ? new Date(st.getTime() + 10 * 60000) : null;
  const fmt = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const [r] = await db.query(
    'INSERT INTO messages (member_id, title, content, sender, send_time, read_time) VALUES (?,?,?,?,?,?)',
    [mid, title, content, sender, fmt(st), rt ? fmt(rt) : null]
  );
  ids.push(r.insertId);
}

const [rows] = await db.query(
  `SELECT m.id, m.member_id, COALESCE(mem.account,'(全员广播)') AS 收件人, m.title, m.sender, m.send_time, m.read_time
     FROM messages m LEFT JOIN members mem ON mem.id = m.member_id
    ORDER BY m.send_time DESC`
);
console.table(rows);
console.log('共插入', ids.length, '条');
await db.end();
