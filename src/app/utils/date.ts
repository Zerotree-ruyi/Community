/**
 * 通用时间格式化 — 年月日 时:分(24 小时制)
 *   输入: ISO 字符串 / "YYYY-MM-DD HH:mm:ss" / Date
 *   输出: "2026-10-28 22:22"
 *   失败回退: 原字符串
 *
 * 时间统一按浏览器所在时区显示(后端给的是 UTC ISO 串)。
 * 没带时区的 "YYYY-MM-DD HH:mm:ss" 按 UTC 解析 —— 和后台显示保持一致。
 */
function toDate(s: string | Date | null | undefined): Date | null {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  const raw = String(s).trim();
  if (!raw) return null;
  const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-28 22:22" */
export function fmtDateTime(s: string | Date | null | undefined): string {
  if (!s) return '-';
  const d = toDate(s);
  if (!d) return typeof s === 'string' ? s : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 仅日期 — "2026-10-28" */
export function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return '-';
  const d = toDate(s);
  if (!d) return typeof s === 'string' ? s : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
