import { Headphones, ShieldCheck, CreditCard, FileText, TrendingUp, Globe } from 'lucide-react';
import bitcoinLogo from 'figma:asset/3391a7389925b393a8af2bd8e4e6eca0fe64b272.png';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import '../../styles/slick.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { CryptoLogo } from './CryptoLogo';
import { useLanguage } from '../contexts/LanguageContext';
import { useLeverage } from '../contexts/LeverageContext';
import { MARKET_COINS, MarketCoin } from '../data/marketConfig';

interface HotCoin {
  name: string;
  pair: string;
  price: string;
  change: string;
  positive: boolean;
  color: string;
  symbol: string;
}

interface CryptoData {
  name: string;
  pair: string;
  price: string;
  change: string;
  positive: boolean;
  sellPrice: string;
  buyPrice: string;
  volume: string;
  symbol: string;
}

// 实时价格 Hook
function useRealtimePrice(symbol: string) {
  const [price, setPrice] = useState<string>('--');
  const [change, setChange] = useState<string>('--');
  const [positive, setPositive] = useState<boolean>(true);
  const [sellPrice, setSellPrice] = useState<string>('--');
  const [buyPrice, setBuyPrice] = useState<string>('--');
  const [rawPrice, setRawPrice]   = useState<number | null>(null); // 用于排序
  const [rawChange, setRawChange] = useState<number | null>(null); // 涨跌幅百分比数值

  useEffect(() => {
    const wsSymbol = symbol.toLowerCase();
    const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${wsSymbol}@ticker`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentPrice = parseFloat(data.c);
      const priceChange = parseFloat(data.p);
      const changePercent = parseFloat(data.P);
      const isPositive = priceChange >= 0;

      setPrice(currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setChange(`${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`);
      setPositive(isPositive);

      // 设置买卖价（加上/减去点差）
      const spread = currentPrice * 0.0001; // 0.01% 点差
      setSellPrice((currentPrice - spread).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setBuyPrice((currentPrice + spread).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

      // 排序用原始数值
      setRawPrice(currentPrice);
      setRawChange(changePercent);
    };

    ws.onerror = () => {
      setPrice('Error');
      setChange('--');
    };

    return () => ws.close();
  }, [symbol]);

  return { price, change, positive, sellPrice, buyPrice, rawPrice, rawChange };
}

// 热门币种卡片
function HotCoinCard({ coin }: { coin: HotCoin }) {
  const { price, change, positive } = useRealtimePrice(coin.symbol);

  return (
    <Link
      to={coin.name === 'EUR' ? '/forex-trading' : '/trading'}
      className="bg-[#1a1f2e] rounded-lg p-3 border border-gray-800 hover:border-[#c4f82a] transition-colors"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-2 h-2 rounded-full ${coin.color}`}></div>
        <span className="text-xs">{coin.name}</span>
        <span className="text-[10px] text-gray-500">/{coin.pair}</span>
      </div>
      <div className="text-base font-bold mb-2">{price}</div>
      <div className={`text-xs py-1 px-2 rounded border text-center ${
        positive ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'
      }`}>
        {change}
      </div>
    </Link>
  );
}

// 行情表格行(首页 / 行情页共享数据)

// 行情表格行(首页 / 行情页共享数据)
function MarketTableRow({ coin, price, change, positive }: {
  coin: MarketCoin;
  price: string;
  change: string;
  positive: boolean;
}) {

  return (
    <Link
      to={`/trading?symbol=${coin.key.toLowerCase()}`}
      className="grid grid-cols-12 items-center py-3 px-3 border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
    >
      {/* 币种 */}
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <CryptoLogo symbol={coin.glyph} name={coin.key} color={coin.color} />
        <div className="min-w-0">
          <div className="text-base text-white truncate">{coin.key}</div>
          <div className="text-xs text-gray-500 truncate">{coin.name}</div>
        </div>
      </div>
      {/* 最新价 */}
      <div className="col-span-4 pl-[60px] text-left text-base text-white">
        <span>{price}</span>
      </div>
      {/* 涨跌幅 */}
      <div className={`col-span-4 text-right text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
        <span>{change}</span>
      </div>
    </Link>
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

// 单个币种行 — 数据由父级 HomePage 通过 props 传入 (合并 WS 模式)

export function HomePage() {
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const { t } = useLanguage();
  const { leverage } = useLeverage();

  // 排序状态
  const [sortKey, setSortKey] = useState<'price' | 'change' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // 排序逻辑
  const handleSort = (key: 'price' | 'change') => {
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortKey(null); setSortDir('desc'); }
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // === 实时价格 — 用 Binance 合并 stream 一条 WS 拿全部 22 个 (同 MarketPage 模式) ===
  const dataMapRef = useRef<Record<string, {
    price: number; change: number; positive: boolean;  // 原始数
  }>>({});
  const loadedSetRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // 重置
    dataMapRef.current = {};
    loadedSetRef.current = new Set();

    // 22 个币种合成一个 stream URL
    const streams = MARKET_COINS
      .map(c => {
        const ws = c.symbol.replace('BINANCE:', '').replace('FX:', '').toLowerCase();
        if (!ws || c.symbol.startsWith('FX:')) return null;
        return `${ws}@ticker`;
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
  }, []);

  // 计算排序后的币种列表
  const sortedCoins = (() => {
    if (!sortKey) return MARKET_COINS;
    const data = dataMapRef.current;
    const arr = [...MARKET_COINS];
    arr.sort((a, b) => {
      const aKey = a.symbol.replace('BINANCE:', '').replace('FX:', '').toUpperCase();
      const bKey = b.symbol.replace('BINANCE:', '').replace('FX:', '').toUpperCase();
      const av = data[aKey]?.[sortKey];
      const bv = data[bKey]?.[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  })();

  // 把原始数字格式化成字符串 (同 MarketPage PriceOnly)
  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };
  const formatChange = (cp: number, positive: boolean) =>
    `${positive ? '+' : ''}${cp.toFixed(2)}%`;

  // 单个币种行数据 helper
  const getRowData = (coin: MarketCoin) => {
    const wsKey = coin.symbol.replace('BINANCE:', '').replace('FX:', '').toUpperCase();
    const data = dataMapRef.current[wsKey];
    const loaded = loadedSetRef.current.has(wsKey);
    return {
      price: data ? formatPrice(data.price) : '--',
      change: data ? formatChange(data.change, data.positive) : '--',
      positive: data?.positive ?? true,
      loaded,
    };
  };

  const features = [
    { icon: Headphones, label: t('home.contactSupport'), key: 'contactSupport', color: 'from-yellow-400 to-yellow-600' },
    { icon: ShieldCheck, label: t('home.security'), key: 'security', color: 'from-green-400 to-green-600' },
    { icon: CreditCard, label: t('home.quickDeposit'), key: 'quickDeposit', color: 'from-orange-400 to-orange-600' },
    { icon: FileText, label: t('home.regulatory'), key: 'regulatory', color: 'from-blue-400 to-blue-600' },
  ];

  // 热门币种配置 - 使用 Binance WebSocket 格式
  const hotCoins: HotCoin[] = [
    { name: 'BTC', pair: 'USDT', price: '--', change: '--', positive: true, color: 'bg-green-500', symbol: 'btcusdt' },
    { name: 'BNB', pair: 'USDT', price: '--', change: '--', positive: true, color: 'bg-blue-500', symbol: 'bnbusdt' },
    { name: 'EUR', pair: 'USDT', price: '--', change: '--', positive: true, color: 'bg-orange-500', symbol: 'eurusdt' },
  ];

  // 加密货币列表配置
  const cryptos: CryptoData[] = [
    {
      name: 'BTC',
      pair: 'USDT',
      price: '--',
      change: '--',
      positive: true,
      sellPrice: '--',
      buyPrice: '--',
      volume: '--',
      symbol: 'btcusdt',
    },
    {
      name: 'BNB',
      pair: 'USDT',
      price: '--',
      change: '--',
      positive: true,
      sellPrice: '--',
      buyPrice: '--',
      volume: '--',
      symbol: 'bnbusdt',
    },
    {
      name: 'EUR',
      pair: 'USDT',
      price: '--',
      change: '--',
      positive: true,
      sellPrice: '--',
      buyPrice: '--',
      volume: '--',
      symbol: 'btcusdt', // EUR/USD 使用 BTC 作为近似
    },
  ];

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: false,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link to="/profile" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center border-2 border-gray-600 hover:border-[#c4f82a] transition-colors">
            <span className="text-base">👤</span>
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

      {/* Hero Section with Slider */}
      <div className="relative px-6 py-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl mb-2 italic">CAREFULLY</h1>
          <h1 className="text-2xl italic">SELECTED FOR YOU</h1>
        </div>

        <Slider {...sliderSettings}>
          <div>
            <div className="relative h-32 flex items-center justify-center">
              <img
                src={bitcoinLogo}
                alt="Bitcoin"
                className="h-28 object-contain"
              />
              {/* Decorative elements */}
              <div className="absolute top-4 left-8 w-12 h-12 rounded-full bg-gradient-to-br from-[#c4f82a] to-green-600 opacity-70 blur-xl"></div>
              <div className="absolute bottom-4 left-1/4 w-6 h-6 rounded-full bg-yellow-400"></div>
              <div className="absolute bottom-8 right-1/4 w-3 h-3 rounded-full bg-gray-500"></div>
              <div className="absolute top-1/4 right-8">
                <div className="text-[#c4f82a] text-2xl">★</div>
              </div>
            </div>
          </div>
        </Slider>
      </div>

      {/* Features Grid */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-4 gap-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;

            if (feature.key === 'contactSupport') {
              return (
                <a
                  key={idx}
                  href="https://t.me/your_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`relative w-11 h-11 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] text-gray-300 text-center leading-tight">{feature.label}</span>
                </a>
              );
            }

            const routeMap: { [key: string]: string } = {
              'security': '/security',
              'quickDeposit': '/deposit',
              'regulatory': '/regulatory',
            };

            const route = routeMap[feature.key];

            if (route) {
              return (
                <Link key={idx} to={route} className="flex flex-col items-center gap-2">
                  <div className={`relative w-11 h-11 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                    {feature.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1.5 rounded-full">
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-300 text-center leading-tight">{feature.label}</span>
                </Link>
              );
            }

            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`relative w-11 h-11 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] text-gray-300 text-center leading-tight">{feature.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hot Coins Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">🔥 {t('home.hotCrypto')}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {hotCoins.map((coin, idx) => (
            <HotCoinCard key={idx} coin={coin} />
          ))}
        </div>
      </div>

      {/* Market Table — 币种 / 最新价 / 涨跌幅 */}
      <div className="px-4 mb-6">
        <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
          {/* 表头 — 价格 / 涨跌幅 可点击排序 */}
          <div className="grid grid-cols-12 py-3 px-3 bg-gray-800/60 border-b border-gray-700/50 text-xs text-gray-400 uppercase">
            <div className="col-span-4">Pair</div>
            <button
              onClick={() => handleSort('price')}
              className="col-span-4 pl-[60px] text-left flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Latest Price</span>
              <SortArrows active={sortKey === 'price'} dir={sortDir} />
            </button>
            <button
              onClick={() => handleSort('change')}
              className="col-span-4 text-right flex items-center justify-end gap-1 hover:text-white transition-colors"
            >
              <SortArrows active={sortKey === 'change'} dir={sortDir} />
              <span>24h Change</span>
            </button>
          </div>
          {sortedCoins.map(coin => {
            const d = getRowData(coin);
            return (
              <MarketTableRow
                key={coin.key}
                coin={coin}
                price={d.price}
                change={d.change}
                positive={d.positive}
              />
            );
          })}
        </div>
      </div>

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <LanguageSelector onClose={() => setShowLanguageSelector(false)} />
      )}
    </div>
  );
}
