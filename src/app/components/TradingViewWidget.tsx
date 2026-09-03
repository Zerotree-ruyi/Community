// TradingView Widget 组件 - 显示实时加密货币价格和图表
import { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  symbol: string;  // 例如: "BINANCE:BTCUSDT"
  width?: string | number;
  height?: string | number;
  interval?: string;
  timezone?: string;
  theme?: 'light' | 'dark';
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  hide_top_toolbar?: boolean;
  hide_legend?: boolean;
  save_image?: boolean;
  details?: boolean;
  hotlist?: boolean;
  calendar?: boolean;
  show_popup?: boolean;
  popup_width?: string | number;
  popup_height?: string | number;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => { remove: () => void };
    };
  }
}

export function TradingViewWidget({
  symbol,
  width = '100%',
  height = 400,
  interval = '60',
  timezone = 'Etc/UTC',
  theme = 'dark',
  locale = 'en',
  toolbar_bg = '#1a1f2e',
  enable_publishing = false,
  hide_top_toolbar = false,
  hide_legend = false,
  save_image = true,
  details = false,
  hotlist = false,
  calendar = false,
  show_popup = false,
  popup_width = '900',
  popup_height = '405',
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    // 动态加载 TradingView widget 脚本
    const scriptId = 'tradingview-widget-script';

    const loadWidget = () => {
      if (containerRef.current && window.TradingView) {
        // 清理旧组件
        if (widgetRef.current) {
          widgetRef.current.remove();
        }
        containerRef.current.innerHTML = '';

        // 创建新组件
        const widget = new window.TradingView.widget({
          symbol: symbol,
          width: width,
          height: height,
          interval: interval,
          timezone: timezone,
          theme: theme,
          style: '1',
          locale: locale,
          toolbar_bg: toolbar_bg,
          enable_publishing: enable_publishing,
          hide_top_toolbar: hide_top_toolbar,
          hide_legend: hide_legend,
          save_image: save_image,
          details: details,
          hotlist: hotlist,
          calendar: calendar,
          show_popup: show_popup,
          popup_width: popup_width,
          popup_height: popup_height,
          container_id: containerRef.current.id,
        });

        widgetRef.current = widget;
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = loadWidget;
      document.head.appendChild(script);
    } else {
      loadWidget();
    }

    return () => {
      try {
        if (widgetRef.current && containerRef.current) {
          widgetRef.current.remove();
          widgetRef.current = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [symbol, width, height, interval, timezone, theme, locale, toolbar_bg, enable_publishing, hide_top_toolbar, hide_legend, save_image, details, hotlist, calendar, show_popup, popup_width, popup_height]);

  return (
    <div
      id={`tradingview-widget-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`}
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height }}
    />
  );
}

// TradingView 价格列表小部件
interface TradingViewMiniTickerProps {
  symbols: string[];  // 例如: ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT"]
}

export function TradingViewMiniTicker({ symbols }: TradingViewMiniTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = 'tradingview-ticker-script';

    const loadTicker = () => {
      if (containerRef.current && window.TradingView) {
        containerRef.current.innerHTML = '';

        symbols.forEach((symbol) => {
          const containerId = `ticker-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;
          const tickerContainer = document.createElement('div');
          tickerContainer.id = containerId;
          tickerContainer.style.marginBottom = '10px';
          containerRef.current?.appendChild(tickerContainer);

          new window.TradingView.widget({
            symbol: symbol,
            width: '100%',
            height: 80,
            interval: '1',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: locale,
            toolbar_bg: '#1a1f2e',
            enable_publishing: false,
            hide_top_toolbar: true,
            hide_legend: true,
            save_image: false,
            details: false,
            hotlist: false,
            calendar: false,
            show_popup: false,
            container_id: containerId,
          });
        });
      }
    };

    const locale = 'en';

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = loadTicker;
      document.head.appendChild(script);
    } else {
      loadTicker();
    }

    return () => {
      // 清理
    };
  }, [symbols]);

  return <div ref={containerRef} />;
}
