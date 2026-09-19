/**
 * KLineChart — 轻量级 K 线图表
 *  - 动态从 unpkg 加载 lightweight-charts (TradingView 出品的开源库)
 *  - 从 Binance REST API 拉历史 K 线 (国内网络下 api.binance.com 被墙,用 data-api.binance.vision 镜像)
 *  - 自动回退:主端点失败时依次尝试备用端点
 *  - WebSocket 实时更新当前 K 线 + 最新价
 *  - 支持 1m / 5m / 15m / 1h 切换
 *
 * 不再依赖 s3.tradingview.com/tv.js (国内网络环境拉不到)
 */
import { useEffect, useRef, useState } from 'react';

// 从本地 public/ 加载,不走外网 CDN(国内网络 unpkg 经常被卡,导致图表空白)
const SCRIPT_SRC = '/lightweight-charts.standalone.production.js';
// 多个端点回退 — 优先走本后端代理(同源,无 CORS),失败再试公网镜像
const REST_HOSTS = [
  '/api/binance',  // 本后端代理 — 首选
  'https://data-api.binance.vision',
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api.binance.us',
];
const buildKlinesUrl = (host: string, symbol: string, interval: string, limit = 200) => {
  // 本后端代理(走 A 台反代) — 相对路径,加 /klines 子路径
  if (host.startsWith('/')) {
    return `${host}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  }
  // 公网 Binance 镜像 — 绝对 URL,走 /api/v3/klines
  return `${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
};
const INTERVAL_DEFAULT = '15m';

interface Props { symbol: string; /* 例如 BTCUSDT */ }

declare global {
  interface Window {
    LightweightCharts?: any;
  }
}

const INTERVALS = [
  { code: '1m',  label: '1m' },
  { code: '5m',  label: '5m' },
  { code: '15m', label: '15m' },
  { code: '1h',  label: '1h' },
  { code: '4h',  label: '4h' },
  { code: '1d',  label: '1d' },
];

export function KLineChart({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef     = useRef<any>(null);
  const seriesRef    = useRef<any>(null);
  const wsRef        = useRef<WebSocket | null>(null);

  const [ready, setReady]     = useState(false);
  const [interval, setIntv]   = useState(INTERVAL_DEFAULT);
  const [latest, setLatest]   = useState<number | null>(null);
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);  // K线数据是否到位

  // 1) 加载 lightweight-charts 脚本(只跑一次)
  useEffect(() => {
    const id = 'lightweight-charts-script';
    if (window.LightweightCharts) { setReady(true); return; }
    if (document.getElementById(id)) {
      // 已经插入,等 onload
      const existing = document.getElementById(id) as HTMLScriptElement;
      existing.addEventListener('load', () => setReady(true), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload  = () => setReady(true);
    s.onerror = () => setErrMsg('图表库加载失败,请检查网络');
    document.head.appendChild(s);
  }, []);

  // 2) 创建图表 + 拉历史 + 订阅 WebSocket
  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const lwc = window.LightweightCharts;
    const chart = lwc.createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 288,
      layout: { background: { color: '#0a0e13' }, textColor: '#d1d4dc' },
      grid:   { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#374151' },
      rightPriceScale: { borderColor: '#374151' },
      crosshair: { mode: lwc.CrosshairMode?.Normal ?? 0 },
    });
    // 水印 (像 TradingView 的左下角标记)
    const watermark = document.createElement('div');
    watermark.style.cssText = `
        position:absolute;bottom:8px;left:12px;font-size:18px;font-weight:600;
        color:rgba(120,120,140,0.18);pointer-events:none;z-index:1;letter-spacing:1px;
      `;
    watermark.textContent = symbol;
    containerRef.current.style.position = 'relative';
    containerRef.current.appendChild(watermark);

    // v5 API: addSeries(CandlestickSeries, options)
    const series = chart.addSeries(lwc.CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    chartRef.current  = chart;
    seriesRef.current = series;

    // 自适应宽度
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    (async () => {
      let lastErr: any = null;
      for (const host of REST_HOSTS) {
        try {
          const r = await fetch(buildKlinesUrl(host, symbol, interval));
          if (!r.ok) { lastErr = new Error(`HTTP ${r.status}`); continue; }
          const raw: any[] = await r.json();
          if (!Array.isArray(raw) || raw.length === 0) { lastErr = new Error('空数据'); continue; }
          const data = raw.map(k => ({
            time: Math.floor(k[0] / 1000),
            open:  parseFloat(k[1]),
            high:  parseFloat(k[2]),
            low:   parseFloat(k[3]),
            close: parseFloat(k[4]),
          }));
          series.setData(data);
          chart.timeScale().fitContent();
          if (data.length) setLatest(data[data.length - 1].close);
          setDataLoaded(true);
          return; // 成功
        } catch (e: any) {
          lastErr = e;
        }
      }
      setErrMsg(`Failed to load K-line: ${lastErr?.message || 'All mirrors unreachable'}`);
    })();

    // WebSocket 实时推送
    try {
      const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${symbol.toLowerCase()}@kline_${interval}`);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          const k = m.k;
          if (!k) return;
          series.update({
            time: Math.floor(k.t / 1000),
            open:  parseFloat(k.o),
            high:  parseFloat(k.h),
            low:   parseFloat(k.l),
            close: parseFloat(k.c),
          });
          setLatest(parseFloat(k.c));
        } catch {}
      };
      ws.onerror = () => {/* 静默,不影响图表 */}
    } catch {/* ignore */}

    return () => {
      try { wsRef.current?.close(); } catch {}
      try { chartRef.current?.remove(); } catch {}
      // 清掉水印
      try {
        const wm = containerRef.current?.querySelector(':scope > div');
        if (wm && wm.textContent === symbol) wm.remove();
      } catch {}
      chartRef.current = null;
      seriesRef.current = null;
      ro.disconnect();
    };
  }, [ready, symbol, interval]);

  // 切换 symbol/interval 时重置 dataLoaded
  useEffect(() => {
    setDataLoaded(false);
    setErrMsg(null);
  }, [symbol, interval]);

  const changeColor = latest == null
    ? 'text-gray-400'
    : (seriesRef.current && latest > 0) ? 'text-green-400' : 'text-red-400';

  return (
    <div className="relative w-full h-full">
      {/* 顶部条:interval 切换 + 当前价 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 text-[10px]">
        <div className="flex gap-1">
          {INTERVALS.map(it => (
            <button
              key={it.code}
              onClick={() => setIntv(it.code)}
              className={`px-1.5 py-0.5 rounded ${
                it.code === interval
                  ? 'bg-[#c4f82a] text-black font-bold'
                  : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
        {latest != null && (
          <div className={`bg-gray-900/80 px-2 py-0.5 rounded ${changeColor} font-mono`}>
            {latest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </div>

      <div ref={containerRef} className="w-full h-full" />

      {errMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 text-sm bg-black/70 gap-2 z-20">
          <div className="text-base">⚠ {errMsg}</div>
          <div className="text-xs text-gray-500">Try refreshing the page or switching the trading pair</div>
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-black/40 z-20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#c4f82a] animate-pulse"></div>
            图表库加载中…
          </div>
        </div>
      )}
      {ready && !dataLoaded && !errMsg && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs bg-black/30 z-20">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></div>
            K线数据加载中…
          </div>
        </div>
      )}
    </div>
  );
}

export default KLineChart;