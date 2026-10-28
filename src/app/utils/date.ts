/**
 * 通用时间格式化 — 日/月/年 时:分(24 小时制)
 *   输入: ISO 字符串 / "YYYY-MM-DD HH:mm:ss" / Date
 *   输出: "28/10/2026 22:22"
 *   失败回退: 原字符串
 *
 * 格式按 DD/MM/YYYY(日在前)—— 印度常用写法,例:2026年8月9日 → 09/08/2026
 *
 * 时区固定为印度标准时间(Asia/Kolkata, UTC+5:30),
 * 不跟浏览器所在时区走 —— 客户在印度看到的就是印度时间。
 *
 * 没带时区的 "YYYY-MM-DD HH:mm:ss" 按 UTC 解析 —— 后端给的就是 UTC。
 */
const TZ = "Asia/Kolkata";

function toDate(s: string | Date | null | undefined): Date | null {
  if (!s) return null;
  if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
  const raw = String(s).trim();
  if (!raw) return null;
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? null : d;
}

/** 取印度时区下的年月日时分 */
function istParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** "28/10/2026 22:22" */
export function fmtDateTime(s: string | Date | null | undefined): string {
  if (!s) return "-";
  const d = toDate(s);
  if (!d) return typeof s === "string" ? s : "-";
  const p = istParts(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** 仅日期 — "28/10/2026" */
export function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return "-";
  const d = toDate(s);
  if (!d) return typeof s === "string" ? s : "-";
  const p = istParts(d);
  return `${p.day}/${p.month}/${p.year}`;
}

/** 只要时间 — "22:22" */
export function fmtTimeOnly(s: string | Date | null | undefined): string {
  if (!s) return "-";
  const d = toDate(s);
  if (!d) return typeof s === "string" ? s : "-";
  const p = istParts(d);
  return `${p.hour}:${p.minute}`;
}
