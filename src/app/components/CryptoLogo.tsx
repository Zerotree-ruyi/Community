/**
 * CryptoLogo — 加密货币 logo 组件(行情页 / 首页共享)
 *  - 优先显示 emoji 符号(零依赖,稳定可靠)
 *  - 没有 emoji 时 fallback 到首字母 + 品牌色
 *
 *  不用外网图床(国内/服务器经常被墙),全部走 unicode 符号。
 */
import { useState } from 'react';

interface Props {
  /** unicode 符号 / emoji(每个币种一个稳定符号) */
  symbol?: string;
  /** 首字母 fallback(图片加载失败时显示) */
  name: string;
  /** tailwind 背景色 class,如 bg-orange-500 */
  color?: string;
  className?: string;
}

export function CryptoLogo({ symbol, name, color = 'bg-gray-600', className = 'w-10 h-10' }: Props) {
  // 用 symbol 直接渲染(unicode 字符)
  if (symbol) {
    return (
      <div className={`${className} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
        <span
          className="leading-none"
          style={{
            fontSize: '110%',
            fontFamily: '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "Symbola", sans-serif',
          }}
        >{symbol}</span>
      </div>
    );
  }

  // fallback:首字母
  return (
    <div className={`${className} ${color} rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm`}>
      {name.substring(0, 1)}
    </div>
  );
}

export default CryptoLogo;