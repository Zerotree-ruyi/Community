/**
 * safePwd — 密码混淆
 *
 * 用户输入任意密码,前端在提交前转成 14 位 base62 强密码串。
 * 浏览器/密码管理器看到的是这个 14 位乱码,不会触发
 * "密码数据泄露"警告,也不会保存到 Chrome 密码库。
 *
 * 关键:确定性 — 同一个输入永远生成同一个输出。
 *   所以注册时 `bcrypt(safePwd("123456"))` 存的哈希,
 *   登录/提现时再调 `safePwd("123456")` 就能匹配上。
 *
 * 注意:只是给浏览器看的混淆,不是加密 — 后端存的哈希就是这个 14 位串。
 */
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function fnv1aHash(s: string): number {
  // 32-bit FNV-1a hash — 简单稳定,够用(不是密码学强度)
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function safePwd(input: string): string {
  // 用 FNV-1a 哈希作为种子,生成 14 位 base62
  // 同样的 input 永远生成同样的 output(确定性)
  let n = fnv1aHash(input);
  // 乘一个大质数,把短输入(如 6 位)也分散到整个数轴
  n = (n * 0x9e3779b1) >>> 0;
  let out = '';
  for (let i = 0; i < 14; i++) {
    out += BASE62[n % 62];
    n = Math.floor(n / 62) || fnv1aHash(input + i);  // 防 n 变 0 卡死
  }
  return out;
}
