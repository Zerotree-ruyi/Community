/**
 * 前台文案小工具 —— 专门防「中文漏到客户眼前」。
 *
 * 背景:后台有些报错信息是中文(比如以前下单失败会返回
 * 「只能查看自己的数据」),前台直接 `data.message` 弹出来,
 * 客户看到的就是一句中文 —— 这就是客户投诉的
 * 「下单的时候有中文」。
 *
 * 现在前台所有把后端 message 直接显示出来的地方,都过一遍
 * pickEnglish():有中文就换成英文兜底,没有就原样用。
 */

/** 字符串里有没有中日韩文字(汉字 / 假名 / 谚文 / 全角符号) */
export function hasCJK(s: string): boolean {
  if (!s) return false;
  return /[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿가-힯＀-￯]/.test(s);
}

/**
 * 挑一句能直接给客户看的英文。
 *
 * @param message  后端返回的 message(可能是任何语言)
 * @param fallback message 带中文 / 为空时的英文兜底
 */
export function pickEnglish(message: unknown, fallback: string): string {
  const m = typeof message === 'string' ? message.trim() : '';
  if (!m) return fallback;
  if (hasCJK(m)) return fallback;
  return m;
}
