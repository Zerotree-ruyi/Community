/**
 * TradingView 图表 — 直接拼 widgetembed URL,带 studies(MACD 等)
 *
 * URL 模板:
 *   https://s.tradingview.com/widgetembed/?...&studies=...#{"symbol":"BINANCE:BTCUSDT.P",...}
 *
 *  - BINANCE:BTCUSDT   现货 spot
 *  - BINANCE:BTCUSDT.P USDT-margined 永续合约(我们用这个)
 *
 *  studies 同时放在 hash 配置(JSON 数组)和 URL 查询参数里。
 */
import { useEffect, useRef } from 'react';

interface Props {
  symbol: string;          // 例如 "BINANCE:BTCUSDT.P"
  height?: number;
  interval?: string;
  theme?: 'light' | 'dark';
  locale?: string;
  hide_top_toolbar?: boolean;
  studies?: string[];      // 例如 ["MACD@tv-basicstudies"]
}

export function TradingViewWidget({
  symbol,
  height = 420,
  interval = '60',
  theme = 'dark',
  locale = 'en',
  hide_top_toolbar = false,
  studies = ['MACD@tv-basicstudies'],
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = {
      symbol,
      frameElementId: `tv_${Math.random().toString(36).slice(2, 8)}`,
      interval,
      save_image: '1',
      studies,                       // 数组形式放在 hash
      theme,
      style: '1',
      timezone: 'Etc/UTC',
      studies_overrides: '{}',
      hide_top_toolbar: hide_top_toolbar ? '1' : '0',
      utm_source: 'localhost',
      utm_medium: 'widget',
      utm_campaign: 'chart',
      utm_term: symbol,
      'page-uri': typeof window !== 'undefined' ? window.location.href : '',
    };

    const iframeId = config.frameElementId;
    const wrapper = containerRef.current;

    // URL 查询参数里的 studies(逗号分隔,不要 JSON 数组 — widgetembed 不解析 JSON)
    const studiesParam = studies.join(',');

    wrapper.innerHTML = `
      <iframe
        title="TradingView advanced chart"
        id="${iframeId}"
        src="https://s.tradingview.com/widgetembed/?hideideas=1&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=${locale}&interval=${interval}&timezone=Etc%2FUTC&theme=${theme}&style=1&symboledit=1&saveimage=1&toolbarbg=rgba(0%2C0%2C0%2C0)&studies=${studiesParam}#${encodeURIComponent(JSON.stringify(config))}"
        style="width:100%;height:100%;margin:0!important;padding:0!important;border:0;"
        allowtransparency="true"
        scrolling="no"
        allowfullscreen="true"
      ></iframe>
    `;

    return () => {
      wrapper.innerHTML = '';
    };
  }, [symbol, interval, theme, locale, hide_top_toolbar, JSON.stringify(studies)]);

  return (
    <div
      ref={containerRef}
      className={`tradingview-widget-container w-full ${height ? '' : 'h-full'}`}
      style={height ? { height } : undefined}
    />
  );
}

export default TradingViewWidget;