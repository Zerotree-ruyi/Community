/**
 * 公共小工具 —— 给 scripts/ 下的本地测试脚本用。
 *
 * 包含:
 *   loadEnv()   读 admin/.env(外部环境变量优先)
 *   assertLocalDb()  安全闸:只允许写本机 MySQL
 *   ADMIN_BASE / FRONT_BASE  开发服务器地址(可用环境变量覆盖)
 */

import { readFileSync } from 'node:fs';

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * safePwd —— 必须与 src/app/utils/safePwd.ts 和 admin/server.ts 完全一致。
 * 前台登录密码是明文经这层混淆后才发给后端的。
 */
export function fnv1aHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function safePwd(input) {
  let n = fnv1aHash(input);
  n = (n * 0x9e3779b1) >>> 0;
  let out = '';
  for (let i = 0; i < 14; i++) {
    out += BASE62[n % 62];
    n = Math.floor(n / 62) || fnv1aHash(input + i);
  }
  return out;
}

/** 读 admin/.env,同名环境变量优先(方便临时指向别的库) */
export function loadEnv() {
  const env = {};
  let raw = '';
  try {
    raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  } catch {
    // 没有 .env 就只用环境变量
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && !m[1].startsWith('#')) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  for (const k of Object.keys(env)) {
    if (process.env[k] !== undefined) env[k] = process.env[k];
  }
  return env;
}

/**
 * 安全闸 —— 会写库的脚本必须先过这一关。
 *
 * 注意:B台(生产)的 .env 指向的也是 127.0.0.1 上的本机 MySQL,
 * 光看地址拦不住,所以还要显式开闸 ALLOW_LOCAL_SEED=1。
 */
export function assertLocalDb(env) {
  if (process.env.ALLOW_LOCAL_SEED !== '1') {
    console.error('拒绝执行:这个脚本只用于本地测试库。');
    console.error('确认是本地测试库的话,请加环境变量重跑:');
    console.error('  ALLOW_LOCAL_SEED=1 node scripts/<脚本名>');
    process.exit(1);
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(String(env.DB_HOST))) {
    console.error(`拒绝执行:DB_HOST=${env.DB_HOST} 不是本机地址,禁止写入。`);
    process.exit(1);
  }
}

/** 后台开发服务器(默认 5174) */
export const ADMIN_BASE = process.env.ADMIN_BASE || 'http://localhost:5174';
/** 前台开发服务器(默认 5173) */
export const FRONT_BASE = process.env.FRONT_BASE || 'http://localhost:5173';

/** 本地测试用的后台账号(见 scripts/seed-local-test.mjs) */
export const ADMIN_USER = process.env.ADMIN_USER || 'admin';
export const ADMIN_PWD = process.env.ADMIN_PWD || 'admin123';
/** 本地测试用的会员账号 */
export const MEMBER_ACCOUNT = process.env.MEMBER_ACCOUNT || 'testuser01';
export const MEMBER_PWD = process.env.MEMBER_PWD || 'Test123456';
export const MEMBER_FUND_PWD = process.env.MEMBER_FUND_PWD || '123456';
