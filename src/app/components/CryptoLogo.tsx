/**
 * CryptoLogo — 加密货币 logo 组件(首页 / 行情页共享)
 *  - 加载完成 fade in
 *  - 加载失败 fallback 显示首字母
 */
import { useState } from 'react';

interface Props {
  src?: string;
  name: string;
  className?: string; // 自定义尺寸/样式 (默认 w-10 h-10)
}

export function CryptoLogo({ src, name, className = 'w-10 h-10' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={`${className} bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0`}>
        {name.substring(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${className} rounded-full object-cover shrink-0 ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
    />
  );
}

export default CryptoLogo;