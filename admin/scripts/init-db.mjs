#!/usr/bin/env node
/**
 * 一键建库脚本 — Node.js 跨平台版本
 *
 * 用法:
 *   node scripts/init-db.mjs                     # 用 .env 配置
 *   node scripts/init-db.mjs --root-pass xxx     # 传 root 密码
 *   node scripts/init-db.mjs --help
 *
 * 功能同 init-db.sh(创建 DB + 用户 + 导入 schema + migrations + 可选 seed)
 * 用 mysql2/promise,无需 mysql CLI,Windows / macOS / Linux 都能跑
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const C = {
    red: '\x1b[0;31m', green: '\x1b[0;32m', yellow: '\x1b[1;33m',
    blue: '\x1b[0;34m', gray: '\x1b[0;90m', nc: '\x1b[0m',
};
const info = (...a) => console.log(`${C.blue}[INFO]${C.nc}`, ...a);
const ok   = (...a) => console.log(`${C.green}[OK]${C.nc}`, ...a);
const warn = (...a) => console.log(`${C.yellow}[WARN]${C.nc}`, ...a);
const err  = (...a) => { console.error(`${C.red}[ERR]${C.nc}`, ...a); process.exit(1); };

// ── 读取 .env(若存在) ────────────────────────────────────────
function loadEnv() {
    const envPath = resolve(PROJECT_ROOT, '.env');
    if (!existsSync(envPath)) return {};
    const env = {};
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
        if (m && !m[1].startsWith('#')) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
    return env;
}

// ── 解析命令行 ──────────────────────────────────────────────
function parseArgs() {
    const args = { _: [] };
    for (let i = 2; i < process.argv.length; i++) {
        const a = process.argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = process.argv[i + 1];
            if (next && !next.startsWith('--')) { args[key] = next; i++; }
            else args[key] = true;
        } else args._.push(a);
    }
    return args;
}

const env  = loadEnv();
const args = parseArgs();
if (args.help || args.h) {
    console.log(`
用法: node scripts/init-db.mjs [选项]

选项:
  --root-user <user>   MySQL root 用户名       (默认: root)
  --root-pass <pass>   MySQL root 密码          (默认: 交互输入)
  --host <host>        MySQL host              (默认: 127.0.0.1)
  --port <port>        MySQL port              (默认: 3306)
  --name <name>        数据库名                (默认: exchange_db)
  --user <user>        应用账号                (默认: exchange_user)
  --pass <pass>        应用账号密码             (默认: Ex@2026!DbPass)
  --skip-seed          不创建默认管理员
  -h, --help           显示帮助
`);
    process.exit(0);
}

const cfg = {
    rootUser: args['root-user'] || env.MYSQL_ROOT_USER || 'root',
    rootPass: args['root-pass'] || env.MYSQL_ROOT_PASS || '',
    host:     args.host    || env.DB_HOST || '127.0.0.1',
    port:     Number(args.port || env.DB_PORT || 3306),
    dbName:   args.name    || env.DB_NAME || 'exchange_db',
    dbUser:   args.user    || env.DB_USER || 'exchange_user',
    dbPass:   args.pass    || env.DB_PASS || 'Ex@2026!DbPass',
    skipSeed: !!args['skip-seed'],
};

async function askPass() {
    if (cfg.rootPass) return cfg.rootPass;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question('MySQL root 密码: ', ans => { rl.close(); resolve(ans); });
    });
}

async function main() {
    info(`连接 MySQL mysql://${cfg.rootUser}@${cfg.host}:${cfg.port} ...`);
    cfg.rootPass = await askPass();

    const root = await createConnection({
        host: cfg.host, port: cfg.port,
        user: cfg.rootUser, password: cfg.rootPass,
        multipleStatements: true,
    });
    ok('MySQL 已连通');

    // 1. 创建库
    info(`创建数据库 ${cfg.dbName} ...`);
    await root.query(
        `CREATE DATABASE IF NOT EXISTS \`${cfg.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    // 2. 创建/更新应用账号
    info(`创建/更新应用账号 ${cfg.dbUser}@localhost ...`);
    // DROP 先清干净(密码如果变了,得 recreate)
    await root.query(`DROP USER IF EXISTS '${cfg.dbUser}'@'localhost'`);
    await root.query(`CREATE USER '${cfg.dbUser}'@'localhost' IDENTIFIED BY '${cfg.dbPass}'`);
    await root.query(`GRANT ALL PRIVILEGES ON \`${cfg.dbName}\`.* TO '${cfg.dbUser}'@'localhost'`);
    await root.query(`FLUSH PRIVILEGES`);
    ok('数据库 + 账号就绪');

    await root.end();

    // 3. 用应用账号导入 schema
    const app = await createConnection({
        host: cfg.host, port: cfg.port,
        user: cfg.dbUser, password: cfg.dbPass,
        database: cfg.dbName,
        multipleStatements: true,
    });

    async function runSqlFile(path, label) {
        if (!existsSync(path)) err(`找不到 SQL: ${path}`);
        info(`导入 ${label || basename(path)} ...`);
        const sql = readFileSync(path, 'utf8');
        await app.query(sql);
        ok(`  → ${label || basename(path)}`);
    }

    await runSqlFile(resolve(PROJECT_ROOT, 'schema.sql'));
    await runSqlFile(resolve(PROJECT_ROOT, 'schema-admin.sql'));

    const migDir = resolve(PROJECT_ROOT, 'migrations');
    if (existsSync(migDir)) {
        const { readdirSync } = await import('node:fs');
        const migs = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
        if (migs.length === 0) info('(无迁移文件)');
        for (const f of migs) await runSqlFile(resolve(migDir, f), `migrations/${f}`);
    }

    // 4. 默认管理员
    if (!cfg.skipSeed) {
        const [rows] = await app.query(
            `SELECT COUNT(*) AS cnt FROM admin_users WHERE username = 'admin'`
        );
        if (rows[0].cnt === 0) {
            warn('将创建默认管理员 admin / admin123(请登录后立即改密码)');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            const ans = await new Promise(resolve => rl.question('是否创建? [y/N] ', resolve));
            rl.close();
            if (ans.toLowerCase() === 'y') {
                const hash = bcrypt.hashSync('admin123', 10);
                await app.query(
                    `INSERT INTO admin_users (username, password_hash, display_name, role, status, invite_code)
                     VALUES ('admin', ?, '超级管理员', 'super', 1, 'SUPER01')`,
                    [hash]
                );
                ok('已创建 admin 账号');
            }
        } else {
            ok('admin 账号已存在,跳过');
        }
    }

    await app.end();

    console.log();
    ok('✅ 数据库初始化完成');
    console.log(`   数据库: ${C.green}${cfg.dbName}${C.nc}`);
    console.log(`   账号:   ${C.green}${cfg.dbUser}@localhost${C.nc}`);
    console.log(`   密码:   ${C.green}${cfg.dbPass}${C.nc}`);
    console.log();
    console.log('请把这些写到 admin/.env:');
    console.log(C.gray + `DB_HOST=${cfg.host}\nDB_PORT=${cfg.port}\nDB_USER=${cfg.dbUser}\nDB_PASS=${cfg.dbPass}\nDB_NAME=${cfg.dbName}\nPORT=3001` + C.nc);
}

main().catch(e => err(e.message));