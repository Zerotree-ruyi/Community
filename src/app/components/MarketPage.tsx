import { Search, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LanguageSelector } from './LanguageSelector';
import { CryptoLogo } from './CryptoLogo';
import { useLanguage } from '../contexts/LanguageContext';
import { MARKET_COINS as CRYPTO_CONFIG } from '../data/marketConfig';


// Fallback translations for market page headers
const marketHeaderFallback: Record<string, any> = {
  en: {
    nameVolume: 'Name / 24H Vol',
    trend: 'Trend',
    latestPrice: 'Latest Price',
  },
  ja: {
    nameVolume: '名称 / 24H量',
    trend: 'トレンド',
    latestPrice: '最新価格',
  },
  'zh-CN': {
    nameVolume: '名称 / 24H量',
    trend: '走势',
    latestPrice: '最新价',
  },
  th: {
    nameVolume: 'ชื่อ / ปริมาณ 24 ชม.',
    trend: 'แนวโน้ม',
    latestPrice: 'ราคาล่าสุด',
  },
};

// 迷你走势图组件 - 更精美的曲线
function MiniChart({ positive }: { positive: boolean }) {
  // 更复杂的曲线数据点
  const chartColor = positive ? '#22c55e' : '#ef4444';
  const gradientId = positive ? 'greenGradient' : 'redGradient';

  // 生成更自然的曲线
  const generatePath = () => {
    const points = [];
    const width = 60;
    const height = 24;

    if (positive) {
      // 上涨曲线 - 波动上升
      points.push(`M 0 ${height - 4}`);
      points.push(`Q 8 ${height - 8}, 12 ${height - 10}`);
      points.push(`T 24 ${height - 14}`);
      points.push(`T 36 ${height - 8}`);
      points.push(`T 48 ${height - 12}`);
      points.push(`T 60 ${height - 18}`);
    } else {
      // 下跌曲线 - 波动下降
      points.push(`M 0 ${height - 18}`);
      points.push(`Q 8 ${height - 14}, 12 ${height - 12}`);
      points.push(`T 24 ${height - 8}`);
      points.push(`T 36 ${height - 14}`);
      points.push(`T 48 ${height - 10}`);
      points.push(`T 60 ${height - 6}`);
    }

    return points.join(' ');
  };

  return (
    <div className="w-20 flex justify-center flex-shrink-0">
      <svg className="w-full h-8" viewBox="0 0 60 24" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 渐变填充区域 */}
        <path
          d={generatePath() + ` L 60 24 L 0 24 Z`}
          fill={`url(#${gradientId})`}
        />
        {/* 曲线 */}
        <path
          d={generatePath()}
          fill="none"
          stroke={chartColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 尾端圆点 */}
        <circle
          cx="58"
          cy={positive ? 6 : 18}
          r="2"
          fill={chartColor}
        />
      </svg>
    </div>
  );
}

// 价格+走势图组件 - 获取真实K线数据
function PriceWithChart({ symbol }: { symbol: string }) {
  const [candleData, setCandleData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsSymbol = symbol.replace('BINANCE:', '').replace('FX:', '');
    const binanceSymbol = symbol.startsWith('BINANCE:') ? wsSymbol : null;

    if (binanceSymbol) {
      // 获取真实K线数据
      const fetchKlines = async () => {
        try {
          const response = await fetch(
            `/api/binance/klines?symbol=${binanceSymbol.toUpperCase()}&interval=1h&limit=20`
          );
          const data = await response.json();
          // 提取收盘价
          const closePrices = data.map((k: any[]) => parseFloat(k[4]));
          setCandleData(closePrices);
        } catch (e) {
          // 如果失败，使用WebSocket获取方向
          const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${binanceSymbol.toLowerCase()}@ticker`);
          ws.onmessage = (event) => {
            const tick = JSON.parse(event.data);
            setCandleData([parseFloat(tick.c)]);
          };
          ws.onerror = () => setLoading(false);
        }
        setLoading(false);
      };

      fetchKlines();
    }
  }, [symbol]);

  if (loading) {
    return (
      <div className="w-20 flex justify-center flex-shrink-0">
        <div className="animate-pulse w-full h-8 bg-gray-700 rounded"></div>
      </div>
    );
  }

  return <RealMiniChart data={candleData} />;
}

// 真实K线迷你图
function RealMiniChart({ data }: { data: number[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="w-20 flex justify-center flex-shrink-0">
        <div className="animate-pulse w-full h-8 bg-gray-700 rounded"></div>
      </div>
    );
  }

  const positive = data[data.length - 1] >= data[0];
  const chartColor = positive ? '#22c55e' : '#ef4444';
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  // 计算价格范围
  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const priceRange = maxPrice - minPrice || 1;

  // 缩放价格到图表高度
  const scaleY = (price: number) => {
    return 24 - ((price - minPrice) / priceRange) * 20;
  };

  // 生成路径
  const width = 60;
  const height = 24;
  const stepX = width / (data.length - 1);

  const pathPoints = data.map((price, i) => {
    const x = i * stepX;
    const y = scaleY(price);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  // 填充区域路径
  const fillPath = pathPoints + ` L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="w-20 flex justify-center flex-shrink-0">
      <svg className="w-full h-8" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 渐变填充 */}
        <path d={fillPath} fill={`url(#${gradientId})`} />
        {/* 曲线 */}
        <path
          d={pathPoints}
          fill="none"
          stroke={chartColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 尾端点 */}
        <circle
          cx={(data.length - 1) * stepX}
          cy={scaleY(data[data.length - 1])}
          r="2"
          fill={chartColor}
        />
      </svg>
    </div>
  );
}

// 价格显示组件 - 垂直排列 (数据由父级 MarketPage 通过 props 传入)
function PriceOnly({ price, changePercent, positive, loading }: {
  price: number;
  changePercent: number;
  positive: boolean;
  loading: boolean;
}) {
  const formatPrice = (p: number) => {
    if (p >= 1000) {
      return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (p >= 1) {
      return p.toFixed(2);
    } else {
      return p.toFixed(4);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="animate-pulse h-5 w-20 bg-gray-700 rounded"></div>
        <div className="animate-pulse h-4 w-14 bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="text-base font-medium">{formatPrice(price)}</div>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
        positive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      }`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {positive ? '+' : ''}{changePercent.toFixed(2)}%
      </div>
    </div>
  );
}

// 排序箭头 ▲▼
function SortArrows({ active, dir, muted }: { active: boolean; dir: 'asc' | 'desc'; muted?: boolean }) {
  const baseColor = muted ? 'text-gray-600' : active ? 'text-[#c4f82a]' : 'text-gray-400';
  return (
    <span className={`inline-flex flex-col leading-none ${baseColor}`} aria-hidden>
      <span className={`text-[8px] ${active && dir === 'asc' ? 'opacity-100' : 'opacity-50'}`}>▲</span>
      <span className={`text-[8px] ${active && dir === 'desc' ? 'opacity-100' : 'opacity-50'}`}>▼</span>
    </span>
  );
}

export function MarketPage() {
  const [activeTab, setActiveTab] = useState('crypto');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const { t, language } = useLanguage();

  // 收藏功能 - 读取 localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : ['btc', 'eth'];
  });

  const getFavoritesConfig = () => {
    return CRYPTO_CONFIG.filter(item => {
      const symbolKey = item.key.replace('/', '').toLowerCase();
      return favorites.includes(symbolKey);
    });
  };

  const getMarketHeaderText = (key: string) => {
    const translation = t(`market.${key}`);
    if (translation.startsWith('market.')) {
      return (marketHeaderFallback[language] || marketHeaderFallback.en)[key] || key;
    }
    return translation;
  };

  const getCurrentConfig = () => {
    if (activeTab === 'favorites') {
      return getFavoritesConfig();
    }
    return CRYPTO_CONFIG;
  };

  // 检查是否已收藏
  const isItemFavorite = (item: any) => {
    const symbolKey = item.key.replace('/', '').toLowerCase();
    return favorites.includes(symbolKey);
  };

  const currentConfig = getCurrentConfig();

  // === 排序状态 ===
  const [sortKey, setSortKey] = useState<'price' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const handleSort = () => {
    if (sortKey === 'price') {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortKey(null); setSortDir('desc'); }
    } else {
      setSortKey('price');
      setSortDir('desc');
    }
  };

  // === 实时价格数据 — 用 Binance 合并 stream 单条 WS 拉全部 ===
  const dataMapRef = useRef<Record<string, { price: number; change: number; positive: boolean }>>({});
  const loadedSetRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    // 重置
    dataMapRef.current = {};
    loadedSetRef.current = new Set();

    const streams = currentConfig
      .map(item => {
        const wsSymbol = item.symbol.replace('BINANCE:', '').replace('FX:', '').toLowerCase();
        if (!wsSymbol || item.symbol.startsWith('FX:')) return null;
        return `${wsSymbol}@ticker`;
      })
      .filter(Boolean)
      .join('/');

    if (!streams) return;

    const ws = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${streams}`);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const data = msg.data;
        if (!data || !data.s) return;
        const prev = dataMapRef.current[data.s];
        const next = {
          price: parseFloat(data.c),
          change: parseFloat(data.P),
          positive: parseFloat(data.P) >= 0,
        };
        if (prev?.price === next.price && prev.change === next.change) return;
        dataMapRef.current[data.s] = next;
        loadedSetRef.current.add(data.s);
        forceUpdate(n => n + 1);
      } catch {}
    };
    return () => { try { ws.close(); } catch {} };
  }, [currentConfig]);

  // === 计算排序后的列表 ===
  const sortedConfig = (() => {
    if (!sortKey) return currentConfig;
    const data = dataMapRef.current;
    const arr = [...currentConfig];
    arr.sort((a, b) => {
      const aKey = a.symbol.replace('BINANCE:', '').replace('FX:', '').toUpperCase();
      const bKey = b.symbol.replace('BINANCE:', '').replace('FX:', '').toUpperCase();
      const av = data[aKey]?.price;
      const bv = data[bKey]?.price;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link to="/profile" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center hover:ring-2 hover:ring-[#c4f82a] transition-all">
            <span className="text-lg">👤</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLanguageSelector(true)}
            className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <LanguageSelector onClose={() => setShowLanguageSelector(false)} />
      )}

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'favorites' ? 'border-[#c4f82a] text-white' : 'border-transparent text-gray-400'
            }`}
          >
            ⭐ {t('common.favorites')}
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'crypto' ? 'border-[#c4f82a] text-white' : 'border-transparent text-gray-400'
            }`}
          >
            {t('market.crypto')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="bg-gray-800/50 rounded-xl p-3 flex items-center gap-2 border border-gray-700/50">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={t('market.search')}
            className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
          />
        </div>
      </div>

      {/* Table Header — 最新价 可点击排序 */}
      <div className="px-4 mb-2">
        <div className="flex items-center justify-between text-xs text-gray-500 pr-3">
          <div className="flex items-center gap-3">
            <div className="w-10"></div>
            <div>{getMarketHeaderText('nameVolume')}</div>
          </div>
          <div className="w-20 text-center flex-shrink-0">{getMarketHeaderText('trend')}</div>
          <button
            onClick={handleSort}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <SortArrows active={sortKey === 'price'} dir={sortDir} />
            <span>{getMarketHeaderText('latestPrice')}</span>
          </button>
        </div>
      </div>

      {/* Crypto/Forex List */}
      <div className="px-4 space-y-2">
        {sortedConfig.map((item) => {
          const symbolKey = item.key.replace('/', '').toLowerCase();
          const tradingLink = `/trading?symbol=${symbolKey}`;
          const wsKey = item.symbol.replace('BINANCE:', '').replace('FX:', '').toUpperCase();
          const data = dataMapRef.current[wsKey];
          const loaded = loadedSetRef.current.has(wsKey);

          return (
            <Link
              key={item.symbol}
              to={tradingLink}
              className="block bg-gray-800/30 rounded-xl p-3 pr-3 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Left: Logo & Info */}
                <div className="flex items-center gap-3">
                  {/* 加密货币显示官方Logo */}
                  <CryptoLogo
                    symbol={(item as any).glyph}
                    name={item.name}
                    color={item.color}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{item.key}</span>
                      <span className="bg-gray-700 text-[#c4f82a] text-[10px] px-1.5 py-0.5 rounded">
                        100x
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{item.name}</div>
                  </div>
                </div>

                {/* Middle: Mini Chart */}
                <PriceWithChart symbol={item.symbol} />

                {/* Right: Price only (数据由父级 WS 推送) */}
                <PriceOnly
                  price={data?.price ?? 0}
                  changePercent={data?.change ?? 0}
                  positive={data?.positive ?? true}
                  loading={!loaded}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
