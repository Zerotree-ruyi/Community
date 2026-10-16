/**
 * 通用时间格式化 — en-US 本地化显示
 *   输入: ISO 字符串 / "YYYY-MM-DD HH:mm:ss" / Date
 *   输出: "Oct 16, 2026, 11:00" (en-US, 24h)
 *   失败回退: 原字符串
 */
export function fmtDateTime(s: string | Date | null | undefined): string {
  if (!s) return '-';
  const d = s instanceof Date ? s : new Date(s);
  if (isNaN(d.getTime())) return typeof s === 'string' ? s : '-';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 仅日期 — "Oct 16, 2026"
 */
export function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return '-';
  const d = s instanceof Date ? s : new Date(s);
  if (isNaN(d.getTime())) return typeof s === 'string' ? s : '-';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
