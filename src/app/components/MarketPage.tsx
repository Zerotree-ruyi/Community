import { Search, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';

// 币种配置 - 带官方Logo URL
const CRYPTO_CONFIG = [
  { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', color: 'bg-orange-500', key: 'BTC' },
  { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', color: 'bg-blue-500', key: 'ETH' },
  { symbol: 'BINANCE:BNBUSDT', name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', color: 'bg-yellow-500', key: 'BNB' },
  { symbol: 'BINANCE:SOLUSDT', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', color: 'bg-purple-500', key: 'SOL' },
  { symbol: 'BINANCE:ADAUSDT', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', color: 'bg-blue-600', key: 'ADA' },
  { symbol: 'BINANCE:TRXUSDT', name: 'TRON', logo: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png', color: 'bg-red-500', key: 'TRX' },
  { symbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', color: 'bg-yellow-600', key: 'DOGE' },
];


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
            `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=1h&limit=20`
          );
          const data = await response.json();
          // 提取收盘价
          const closePrices = data.map((k: any[]) => parseFloat(k[4]));
          setCandleData(closePrices);
        } catch (e) {
          // 如果失败，使用WebSocket获取方向
          const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@ticker`);
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

// 价格显示组件 - 垂直排列
function PriceOnly({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [positive, setPositive] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsSymbol = symbol.replace('BINANCE:', '').replace('FX:', '');
    const binanceSymbol = symbol.startsWith('BINANCE:') ? wsSymbol : null;

    if (binanceSymbol) {
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@ticker`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setPrice(parseFloat(data.c));
        setChangePercent(parseFloat(data.P));
        setPositive(parseFloat(data.P) >= 0);
        setLoading(false);
      };

      ws.onerror = () => setLoading(false);

      return () => ws.close();
    }
  }, [symbol]);

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

// Logo图片组件 - 撑满容器
function CryptoLogo({ src, name }: { src: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
        {name.substring(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`w-10 h-10 rounded-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
    />
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

      {/* Table Header */}
      <div className="px-4 mb-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <div className="w-10"></div>
            <div>{getMarketHeaderText('nameVolume')}</div>
          </div>
          <div className="w-20 text-center flex-shrink-0">{getMarketHeaderText('trend')}</div>
          <div className="w-24 text-right">{getMarketHeaderText('latestPrice')}</div>
        </div>
      </div>

      {/* Crypto/Forex List */}
      <div className="px-4 space-y-2">
        {currentConfig.map((item) => {
          const symbolKey = item.key.replace('/', '').toLowerCase();
          const tradingLink = `/trading?symbol=${symbolKey}`;

          return (
            <Link
              key={item.symbol}
              to={tradingLink}
              className="block bg-gray-800/30 rounded-xl p-3 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Left: Logo & Info */}
                <div className="flex items-center gap-3">
                  {/* 加密货币显示官方Logo */}
                  <CryptoLogo
                    src={(item as any).logo}
                    name={item.name}
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

                {/* Right: Price only */}
                <PriceOnly symbol={item.symbol} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
