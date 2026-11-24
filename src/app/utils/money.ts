/**
 * 金额 / 价格统一格式化
 *
 * 规则:**不带千分位逗号**,固定两位小数,例如
 *      1310887.00   (而不是 1,310,887.00)
 *
 * 为什么不用 toLocaleString('en-US'):
 *   它默认会加逗号(1,310,887.00),跟提现页的 toFixed 显示对不上,
 *   同一个数字在两个页面长得不一样,用户容易看错。
 *   小数点前的位数完整保留,也不做 1.31M 这种缩写。
 */

/** 金额:固定两位小数,无逗号。1310887 → "1310887.00" */
export function fmtMoney(n: number | string | undefined | null): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '0.00';
  return v.toFixed(2);
}

/**
 * 价格:按数量级决定小数位,同样不带逗号
 *   >= 1000 → 2 位   (65000.25)
 *   >= 1    → 2 位   (12.50)
 *   <  1    → 4 位   (0.1234)
 */
export function fmtPrice(n: number | string | undefined | null): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '0.00';
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

/** 带正负号的金额 —— 用于盈亏(+12.34 / -12.34) */
export function fmtSigned(n: number | string | undefined | null): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '+0.00';
  return (v > 0 ? '+' : '') + v.toFixed(2);
}
