import { Headphones, ShieldCheck, CreditCard, FileText, Wallet, TrendingUp, Globe } from 'lucide-react';
import bitcoinLogo from 'figma:asset/3391a7389925b393a8af2bd8e4e6eca0fe64b272.png';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import '../../styles/slick.css';
import { useState, useEffect } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { useLeverage } from '../contexts/LeverageContext';

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

  useEffect(() => {
    const wsSymbol = symbol.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@ticker`);

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
    };

    ws.onerror = () => {
      setPrice('Error');
      setChange('--');
    };

    return () => ws.close();
  }, [symbol]);

  return { price, change, positive, sellPrice, buyPrice };
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

// 加密货币列表项
function CryptoListItem({ crypto, leverage, t, onRoute }: { crypto: CryptoData; leverage: number; t: (key: string) => string; onRoute: string }) {
  const { price, change, positive, sellPrice, buyPrice } = useRealtimePrice(crypto.symbol);

  return (
    <div className="mb-2.5 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-lg p-2.5 border border-gray-700/30">
      {/* Header: Name + Badge */}
      <Link to={onRoute} className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold hover:text-[#c4f82a] transition-colors">
            {crypto.name}<span className="text-gray-500">/{crypto.pair}</span>
          </span>
          {(crypto.name === 'BTC' || crypto.name === 'BNB') && (
            <span className="bg-[#c4f82a] text-black text-[9px] font-bold px-1.5 py-0.5 rounded">{leverage}X</span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{t('home.spread')}:50.0</span>
      </Link>

      {/* Buy/Sell Price Boxes */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Link to={onRoute} className="bg-gradient-to-br from-red-900/40 to-red-950/40 border border-red-800/50 rounded-lg p-1.5 text-left hover:from-red-900/60 hover:to-red-950/60 transition-all">
          <div className="text-red-400 text-base font-bold mb-0.5">{sellPrice}</div>
          <div className="text-red-400/80 text-[10px]">{t('trading.sell')}</div>
        </Link>

        <Link to={onRoute} className="bg-gradient-to-br from-green-900/40 to-green-950/40 border border-green-800/50 rounded-lg p-1.5 text-left hover:from-green-900/60 hover:to-green-950/60 transition-all">
          <div className="text-green-400 text-base font-bold mb-0.5">{buyPrice}</div>
          <div className="text-green-400/80 text-[10px]">{t('trading.buy')}</div>
        </Link>
      </div>

      {/* Footer: Balance + Change */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{t('home.change')}</span>
        <div className={`flex items-center gap-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp className="w-3 h-3" />
          <span className="font-medium">{change}</span>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const { t } = useLanguage();
  const { leverage } = useLeverage();

  const features = [
    { icon: Headphones, label: t('home.contactSupport'), key: 'contactSupport', color: 'from-yellow-400 to-yellow-600' },
    { icon: ShieldCheck, label: t('home.security'), key: 'security', color: 'from-green-400 to-green-600' },
    { icon: CreditCard, label: t('home.quickDeposit'), key: 'quickDeposit', color: 'from-orange-400 to-orange-600' },
    { icon: FileText, label: t('home.regulatory'), key: 'regulatory', color: 'from-blue-400 to-blue-600' },
    { icon: Wallet, label: t('home.loan'), key: 'loan', color: 'from-yellow-500 to-yellow-700', badge: 'HOT' },
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
        <div className="grid grid-cols-5 gap-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;

            if (feature.key === 'contactSupport') {
              return (
                <a
                  key={idx}
                  href="https://google.com"
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
              'loan': '/loan'
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

      {/* Crypto List */}
      <div className="px-4">
        {cryptos.map((crypto, idx) => {
          const route = crypto.name === 'EUR' ? '/forex-trading' : '/trading';
          return (
            <CryptoListItem
              key={idx}
              crypto={crypto}
              leverage={leverage}
              t={t}
              onRoute={route}
            />
          );
        })}
      </div>

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <LanguageSelector onClose={() => setShowLanguageSelector(false)} />
      )}
    </div>
  );
}
