/**
 * 生产环境只读扫描 v2 —— 区分「真的文件泄露」和「SPA try_files 回退」。
 *
 * 判定方法:把每个 200 的响应体和根路径 / 的响应体比哈希。
 *   一样  → 只是 SPA 回退(index.html),不是真泄露
 *   不一样 → 真·文件暴露,要立刻处理
 */
import { createHash } from 'node:crypto';

const A = process.env.SCAN_A || 'http://47.236.172.111';
const B = process.env.SCAN_B || 'http://47.236.95.137';
const B_API = process.env.SCAN_B_API || 'http://47.236.95.137:3001';
const TARGETS = [
  { name: 'A台80   ', base: A },
  { name: 'B台80   ', base: B },
  { name: 'B台3001 ', base: B_API },
];

const PATHS = [
  '/.env', '/.env.example', '/admin/.env', '/.git/HEAD', '/.git/config',
  '/admin/.env.example', '/server.ts', '/admin/server.ts', '/package.json',
  '/admin/package.json', '/admin/schema.sql', '/admin/schema-admin.sql',
  '/src/main.tsx', '/admin/src/main.tsx', '/admin/src/App.tsx',
  '/dist/index.html', '/admin/dist/index.html', '/backup.sql', '/dump.sql',
  '/db.sql', '/.DS_Store', '/robots.txt', '/nginx.conf', '/.gitignore',
  '/admin/scripts/lib-env.mjs', '/admin/scripts/seed-local-test.mjs',
  '/admin/scripts/test-e2e.cjs', '/admin/vite.config.ts', '/vite.config.ts',
];

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

for (const t of TARGETS) {
  console.log(`\n${'═'.repeat(72)}\n▶ ${t.name} ${t.base}`);
  let rootHash = null, rootLen = null;
  try {
    const r0 = await fetch(t.base + '/', { redirect: 'manual' });
    const b0 = await r0.text();
    rootHash = sha(b0); rootLen = b0.length;
    console.log(`  基准 / → ${r0.status}, ${rootLen} 字节, hash ${rootHash}`);
  } catch (e) {
    console.log('  基准 / 取不到:', e.message);
    continue;
  }
  for (const p of PATHS) {
    let r, body;
    try {
      r = await fetch(t.base + p, { redirect: 'manual' });
      body = await r.text();
    } catch { console.log(`  ERR  ${p}`); continue; }
    if (r.status !== 200) { console.log(`  ${String(r.status).padEnd(5)} ${p}`); continue; }
    const h = sha(body);
    if (h === rootHash) {
      console.log(`  200   ${p.padEnd(34)} = SPA 回退(同 index.html)`);
    } else {
      console.log(`  🔴200 ${p.padEnd(34)} ≠ index.html!  ${body.length} 字节  hash ${h}`);
      console.log(`       └─ 内容前 200 字: ${body.slice(0, 200).replace(/\s+/g, ' ')}`);
    }
  }
}
