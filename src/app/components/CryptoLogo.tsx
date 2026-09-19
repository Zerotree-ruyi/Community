/**
 * CryptoLogo — 加密货币 logo 组件(行情页 / 首页共享)
 *  - 优先加载本地 PNG 图片(public/coins/{KEY}.png)
 *  - 加载失败时 fallback 显示首字母 + 品牌色
 *
 *  本地图,不依赖外网图床(国内/服务器经常被墙),加载快。
 */
import { useState } from 'react';

interface Props {
  /** 币种 KEY(用于定位 /coins/{KEY}.png) — 必填 */
  symbol?: string;
  /** 首字母 fallback(图片加载失败时显示) */
  name: string;
  /** tailwind 背景色 class,如 bg-orange-500 */
  color?: string;
  className?: string;
}

export function CryptoLogo({ symbol, name, color = 'bg-gray-600', className = 'w-10 h-10' }: Props) {
  const [errored, setErrored] = useState(false);
  const showImg = symbol && !errored;

  if (showImg) {
    return (
      <div className={`${className} ${color} rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-white`}>
        <img
          src={`/coins/${symbol}.png`}
          alt={name}
          className="w-full h-full object-contain p-1"
          loading="lazy"
          onError={() => setErrored(true)}
        />
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