/**
 * 今日入款的时区边界验证 ——
 *   库里存的是 MySQL 服务器本地时间,"今天"按 IST(UTC+5:30)切。
 *   在 IST 午夜前后各插一条记录,看新口径能不能正确区分。
 *
 * 边界是按**当前时间动态算**的,所以任何时候跑都有效。
 *   A: IST 午夜前 30 分钟 → 应算进"昨天",不该进今天
 *   B: IST 午夜后 30 分钟 → 应算进今天
 *
 * 用法:
 *   ALLOW_LOCAL_SEED=1 node scripts/test-stats-boundary.mjs
 */
import { createConnection } from 'mysql2/promise';
import { loadEnv, assertLocalDb } from './lib-env.mjs';

const env = loadEnv();

// 会往 fund_records 插测试行再删掉,同样过安全闸
assertLocalDb(env);

const db = await createConnection({
  host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
  password: env.DB_PASS, database: env.DB_NAME,
});

const IST_OFFSET_MIN = 330;   // Asia/Kolkata
const [[tz]]   = await db.query(`SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), NOW()) AS tzOffMin`);
const [[clock]] = await db.query(`SELECT NOW() AS dbNow, UTC_TIMESTAMP() AS utcNow`);
const tzOffMin = Number(tz.tzOffMin);

// IST 午夜在 **服务器本地时间** 里是几点?
//   IST 午夜 = UTC 当天 18:30 (前一天的 18:30)
//   服务器本地 = UTC + tzOffMin 分钟
const [[b]] = await db.query(
  `SELECT
     DATE_FORMAT(
       DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL ${IST_OFFSET_MIN} MINUTE), INTERVAL 1 DAY)
       + INTERVAL 1110 MINUTE + INTERVAL ${tzOffMin} MINUTE,
       '%Y-%m-%d %H:%i:%s') AS localMidnight,
     DATE(UTC_TIMESTAMP() + INTERVAL ${IST_OFFSET_MIN} MINUTE) AS istToday`
);
const localMidnight = b.localMidnight;   // 服务器本地时间的 IST 午夜那一刻

console.log('MySQL 服务器本地时间 :', clock.dbNow);
console.log('MySQL UTC 时间       :', clock.utcNow);
console.log('服务器时区偏移(分)   :', tzOffMin);
console.log('IST 今天             :', b.istToday);
console.log('IST 午夜(服务器本地) :', localMidnight);
console.log('');

// 清掉之前插的边界测试行(只删 notes 带标记的,不动别的)
await db.query(`DELETE FROM fund_records WHERE notes LIKE '边界测试%'`);

const toISTMin = IST_OFFSET_MIN - tzOffMin;
// A: IST 午夜前 30 分钟(服务器本地时间) → 应算进昨天
// B: IST 午夜后 30 分钟(服务器本地时间) → 应算进今天
await db.query(
  `INSERT INTO fund_records (agent_id, invite_code, member_id, \`before\`, amount, \`after\`, type, notes, time)
   VALUES (1,'TESTINV1',1,7000,111,7111,'后台充值','边界测试A',
             DATE_SUB('${localMidnight}', INTERVAL 30 MINUTE)),
          (1,'TESTINV1',1,7111,222,7333,'后台充值','边界测试B',
             DATE_ADD('${localMidnight}', INTERVAL 30 MINUTE))`
);

const [[r]] = await db.query(
  `SELECT
     (SELECT COALESCE(SUM(amount),0) FROM fund_records
       WHERE type='后台充值' AND DATE(time + INTERVAL ${toISTMin} MINUTE) = DATE(UTC_TIMESTAMP() + INTERVAL ${IST_OFFSET_MIN} MINUTE)) AS newIstSum,
     (SELECT COALESCE(SUM(amount),0) FROM fund_records
       WHERE type='后台充值' AND DATE(time + INTERVAL ${toISTMin} MINUTE) = DATE(UTC_TIMESTAMP() + INTERVAL ${IST_OFFSET_MIN} MINUTE) AND notes LIKE '边界测试%') AS newIstBoundaryOnly,
     (SELECT COALESCE(SUM(amount),0) FROM fund_records
       WHERE type='后台充值' AND DATE(time) = DATE(UTC_TIMESTAMP())) AS oldUtcSum`
);
console.log('新口径(IST 今天)合计      :', r.newIstSum);
console.log('  其中边界测试行           :', r.newIstBoundaryOnly, '  ← 应含 B 的 222,不含 A 的 111');
console.log('旧口径(UTC 今天)合计      :', r.oldUtcSum);
console.log('');

const a = 111, bAmt = 222;
const okBoundary = Number(r.newIstBoundaryOnly) === bAmt;
const okNotA = !String(r.newIstBoundaryOnly).includes('111');
console.log(okBoundary && okNotA
  ? '✅ 新口径正确区分了 IST 午夜前后(A 不在今天、B 在今天)'
  : '❌ 新口径没区分对');
console.log(Number(r.newIstSum) === Number(r.oldUtcSum)
  ? '⚠️  新旧口径结果相同 —— 今天的边界没落在午夜附近,这次验证区分度不高'
  : '✅ 新旧口径结果不同,说明按 IST 切日期确实影响统计');

// 清掉测试行
await db.query(`DELETE FROM fund_records WHERE notes LIKE '边界测试%'`);
await db.end();
