import { ArrowLeft, Star, BarChart3, Activity, TrendingDown, Plus, Minus, ChevronDown, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { ProductListSidebar } from './ProductListSidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { useLeverage } from '../contexts/LeverageContext';

// Generate realistic candle data based on timeframe
const generateCandleData = (count: number, timeframe: string, basePrice: number = 117180) => {
  const data = [];
  let currentPrice = basePrice;
  
  // Adjust volatility and count based on timeframe for forex (smaller ranges than crypto)
  const config = {
    '1m': { count: 200, volatility: 5, increment: 2 },
    '5m': { count: 150, volatility: 10, increment: 4 },
    '15m': { count: 120, volatility: 20, increment: 8 },
    '1H': { count: 100, volatility: 40, increment: 15 },
    '4H': { count: 80, volatility: 80, increment: 30 },
    '1D': { count: 60, volatility: 150, increment: 50 },
  };
  
  const params = config[timeframe as keyof typeof config] || config['15m'];
  
  for (let i = 0; i < params.count; i++) {
    const volatility = Math.random() * params.volatility + params.increment;
    const isGreen = Math.random() > 0.5;
    
    const open = currentPrice + (Math.random() - 0.5) * params.increment;
    const close = isGreen ? open + volatility : open - volatility;
    const high = Math.max(open, close) + Math.random() * (params.increment * 0.5);
    const low = Math.min(open, close) - Math.random() * (params.increment * 0.5);
    
    data.push({
      open,
      close,
      high,
      low,
      isGreen
    });
    
    currentPrice = close;
  }
  
  return data;
};

const forexProducts = [
  {
    symbol: 'EUR/USD',
    name: 'Euro vs US Dollar',
    icon: '🇪🇺',
    color: 'bg-blue-600',
    price: '1.17195',
    change: '-0.02%',
    positive: false,
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound vs US Dollar',
    icon: '🇬🇧',
    color: 'bg-blue-700',
    price: '1.38452',
    change: '+0.15%',
    positive: true,
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar vs Japanese Yen',
    icon: '🇯🇵',
    color: 'bg-red-600',
    price: '109.845',
    change: '-0.08%',
    positive: false,
  },
  {
    symbol: 'AUD/USD',
    name: 'Australian Dollar vs US Dollar',
    icon: '🇦🇺',
    color: 'bg-green-600',
    price: '0.75632',
    change: '+0.22%',
    positive: true,
  },
  {
    symbol: 'USD/CHF',
    name: 'US Dollar vs Swiss Franc',
    icon: '🇨🇭',
    color: 'bg-red-700',
    price: '0.91234',
    change: '-0.12%',
    positive: false,
  },
  {
    symbol: 'USD/CAD',
    name: 'US Dollar vs Canadian Dollar',
    icon: '🇨🇦',
    color: 'bg-red-500',
    price: '1.25678',
    change: '+0.05%',
    positive: true,
  },
];

// Fallback translations for forex trading page
const forexTradeFallback: Record<string, any> = {
  en: {
    buyLong: 'Buy Long',
    sellShort: 'Sell Short',
    marketPrice: 'Market',
    limitPrice: 'Limit',
    availableBalance: 'Available Balance',
    quantity: 'Quantity',
    takeProfit: 'Take Profit',
    stopLoss: 'Stop Loss',
    price: 'Price',
    maximum: 'Maximum',
    estimatedCost: 'Estimated Cost',
    fee: 'Fee',
  },
  ja: {
    buyLong: '買いロング',
    sellShort: '売りショート',
    marketPrice: '成行',
    limitPrice: '指値',
    availableBalance: '利用可能残高',
    quantity: '数量',
    takeProfit: '利確',
    stopLoss: '損切',
    price: '価格',
    maximum: '最大',
    estimatedCost: '予想コスト',
    fee: '手数料',
  },
  'zh-CN': {
    buyLong: '买入做多',
    sellShort: '卖做空',
    marketPrice: '市价',
    limitPrice: '限价',
    availableBalance: '可用余额',
    quantity: '数量',
    takeProfit: '止盈',
    stopLoss: '止损',
    price: '价格',
    maximum: '最大',
    estimatedCost: '预计成本',
    fee: '手续费',
  },
  th: {
    buyLong: 'ซื้อลอง',
    sellShort: 'ขายชอร์ต',
    marketPrice: 'ราคาตลาด',
    limitPrice: 'จำกัดราคา',
    availableBalance: 'ยอดคงเหลือที่มี',
    quantity: 'ปริมาณ',
    takeProfit: 'ทำกำไร',
    stopLoss: 'หยุดขาดทุน',
    price: 'ราคา',
    maximum: 'สูงสุด',
    estimatedCost: 'ต้นทุนโดยประมาณ',
    fee: 'ค่าธรรมเนียม',
  },
};

export function ForexTradingPage() {
  const [selectedTab, setSelectedTab] = useState('15m');
  const [tradeType, setTradeType] = useState('buy');
  const [showLeverageSelector, setShowLeverageSelector] = useState(false);
  const [price, setPrice] = useState('1.17180');
  const [margin, setMargin] = useState('0.00');
  const [amount, setAmount] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>('candle');
  const [candleData, setCandleData] = useState(() => generateCandleData(100, '15m'));
  // 初始offset设置为负值，使最新K线显示在右侧
  const [offset, setOffset] = useState(() => {
    const initialData = generateCandleData(100, '15m');
    return -(initialData.length - 30) * 10; // 显示最后30根K线
  });
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [showProductList, setShowProductList] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const chartRef = useRef<HTMLDivElement>(null);

  const { t, language } = useLanguage();
  const { leverage, setLeverage } = useLeverage();
  
  // Helper to get forex trade text with fallback
  const getForexText = (key: string) => {
    const translation = t(`forex.${key}`);
    if (translation.startsWith('forex.')) {
      return (forexTradeFallback[language] || forexTradeFallback.en)[key] || key;
    }
    return translation;
  };

  const leverageOptions = ['5', '10', '20', '50', '100'];

  const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D'];

  // Update candle data when timeframe changes
  useEffect(() => {
    setCandleData(generateCandleData(100, selectedTab));
    setOffset(() => {
      const newData = generateCandleData(100, selectedTab);
      return -(newData.length - 30) * 10; // 显示最后30根K线
    });
  }, [selectedTab]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    const newOffset = offset + diff / 5; // Adjust sensitivity
    
    // Limit scrolling range
    const maxOffset = 0;
    const minOffset = -(candleData.length - 30) * 10;
    
    setOffset(Math.max(minOffset, Math.min(maxOffset, newOffset)));
    setStartX(currentX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const currentX = e.clientX;
    const diff = currentX - startX;
    const newOffset = offset + diff / 5;
    
    const maxOffset = 0;
    const minOffset = -(candleData.length - 30) * 10;
    
    setOffset(Math.max(minOffset, Math.min(maxOffset, newOffset)));
    setStartX(currentX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate line/area chart path from candle data
  const getChartPath = () => {
    const visibleCount = 50;
    const startIdx = Math.max(0, Math.floor(-offset / 10));
    const endIdx = Math.min(candleData.length, startIdx + visibleCount);
    const visible = candleData.slice(startIdx, endIdx);
    
    if (visible.length === 0) return '';
    
    const width = 400;
    const height = 400;
    const spacing = width / visible.length;
    
    const prices = visible.map(d => (d.open + d.close) / 2);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const points = visible.map((d, i) => {
      const x = i * spacing;
      const avgPrice = (d.open + d.close) / 2;
      const y = height - ((avgPrice - minPrice) / priceRange) * (height - 80) - 40;
      return `${x},${y}`;
    }).join(' L ');
    
    return 'M ' + points;
  };

  const getAreaPath = () => {
    const path = getChartPath();
    if (!path) return '';
    return path + ' L 400,400 L 0,400 Z';
  };

  return (
    <div className="h-screen bg-[#0a0e13] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <Link to="/market">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">EURUSD.FX</h1>
            <span className="text-base text-red-400">1.17180</span>
            <span className="text-xs text-red-400">-0.18%</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowProductList(true)}>
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={() => {
              setIsFavorited(!isFavorited);
              setToastMessage(isFavorited ? t('common.removedFromFavorites') : t('common.addedToFavorites'));
              setShowToast(true);
              setTimeout(() => setShowToast(false), 2000);
            }}
          >
            <Star className={`w-5 h-5 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>

      {/* Product List Sidebar */}
      <ProductListSidebar
        isOpen={showProductList}
        onClose={() => setShowProductList(false)}
        products={forexProducts}
        currentSymbol="EUR/USD"
        title="Forex"
        subtitle="Currency Pairs"
        searchPlaceholder="Search pairs..."
        linkPrefix="/forex-trading"
      />

      {/* Timeframe Selector */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-1.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTab(tf)}
              className={`px-2.5 py-1 rounded text-xs ${
                selectedTab === tf
                  ? 'bg-[#c4f82a] text-black font-medium'
                  : 'text-gray-400'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {/* Candle Chart Button */}
          <button 
            onClick={() => setChartType('candle')}
            className={`p-1.5 rounded ${chartType === 'candle' ? 'bg-[#c4f82a]' : ''}`}
          >
            <svg className={`w-4 h-4 ${chartType === 'candle' ? 'text-black' : 'text-gray-400'}`} viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="2" height="12" fill="currentColor"/>
              <rect x="7" y="5" width="2" height="8" fill="currentColor"/>
              <rect x="12" y="3" width="2" height="10" fill="currentColor"/>
            </svg>
          </button>
          
          {/* Line Chart Button */}
          <button 
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded ${chartType === 'line' ? 'bg-[#c4f82a]' : ''}`}
          >
            <svg className={`w-4 h-4 ${chartType === 'line' ? 'text-black' : 'text-gray-400'}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1,12 4,8 7,10 10,4 13,6 15,3" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </button>
          
          {/* Area Chart Button */}
          <button 
            onClick={() => setChartType('area')}
            className={`p-1.5 rounded ${chartType === 'area' ? 'bg-[#c4f82a]' : ''}`}
          >
            <svg className={`w-4 h-4 ${chartType === 'area' ? 'text-black' : 'text-gray-400'}`} viewBox="0 0 16 16" fill="currentColor">
              <path d="M1,12 L3,8 L6,10 L9,4 L12,6 L15,3 L15,15 L1,15 Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content - 3 sections */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Top Section: Chart (Full Width) */}
        <div 
          ref={chartRef}
          className="h-72 bg-[#0a0e13] relative border-b border-gray-800 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Price scale on right */}
          <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-600 pr-2 py-4 z-10 pointer-events-none">
            <div>1.1760</div>
            <div>1.1750</div>
            <div>1.1740</div>
            <div>1.1730</div>
            <div>1.1720</div>
          </div>

          {/* Current price indicator */}
          <div className="absolute right-0 top-[65%] flex items-center z-20 pointer-events-none">
            <div className="bg-teal-500 text-black text-[10px] px-2 py-0.5 rounded-l font-medium">
              1.17180
            </div>
          </div>

          {/* Chart Content */}
          <div className="w-full h-full overflow-hidden pr-12">
            <svg 
              className="w-full h-full" 
              viewBox="0 0 400 400" 
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Horizontal grid lines */}
              {[80, 160, 240, 320].map(y => (
                <line 
                  key={y}
                  x1="0" 
                  y1={y} 
                  x2="400" 
                  y2={y} 
                  stroke="#1a2332" 
                  strokeWidth="0.5" 
                  strokeDasharray="4,4" 
                />
              ))}

              {/* Current Price Horizontal Line */}
              <line 
                x1="0" 
                y1="260" 
                x2="400" 
                y2="260" 
                stroke="#c4f82a" 
                strokeWidth="1" 
                strokeDasharray="3,3" 
                opacity="0.8"
              />

              {/* Render based on chart type */}
              {chartType === 'candle' && (
                <g transform={`translate(${offset}, 0)`}>
                  {candleData.map((candle, i) => {
                    const visibleStart = Math.max(0, Math.floor(-offset / 10));
                    const visibleEnd = Math.min(candleData.length, visibleStart + 50);
                    
                    if (i < visibleStart || i > visibleEnd) return null;
                    
                    const x = i * 10;
                    const candleWidth = 6;
                    
                    // Calculate positions
                    const prices = candleData.map(d => Math.max(d.high, d.low));
                    const minPrice = Math.min(...prices.map(p => p));
                    const maxPrice = Math.max(...prices.map(p => p));
                    const priceRange = maxPrice - minPrice || 1;
                    
                    const scaleY = (price: number) => {
                      return 360 - ((price - minPrice) / priceRange) * 320;
                    };
                    
                    const highY = scaleY(candle.high);
                    const lowY = scaleY(candle.low);
                    const openY = scaleY(candle.open);
                    const closeY = scaleY(candle.close);
                    const bodyTop = Math.min(openY, closeY);
                    const bodyHeight = Math.abs(closeY - openY) || 1;
                    
                    const color = candle.isGreen ? '#10b981' : '#ef4444';
                    
                    return (
                      <g key={i}>
                        {/* Wick (shadow) */}
                        <line
                          x1={x + candleWidth / 2}
                          y1={highY}
                          x2={x + candleWidth / 2}
                          y2={lowY}
                          stroke={color}
                          strokeWidth="1"
                        />
                        
                        {/* Body */}
                        <rect
                          x={x}
                          y={bodyTop}
                          width={candleWidth}
                          height={bodyHeight}
                          fill={color}
                          stroke={color}
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Line Chart */}
              {chartType === 'line' && (
                <path
                  d={getChartPath()}
                  fill="none"
                  stroke="#c4f82a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Area Chart */}
              {chartType === 'area' && (
                <>
                  <path
                    d={getAreaPath()}
                    fill="url(#chartGradient)"
                  />
                  
                  <path
                    d={getChartPath()}
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Bottom Section: Trading Panel + Market Quote (Same Height) */}
        <div className="flex flex-1">
          {/* Left Bottom: Trading Panel */}
          <div className="flex-1 bg-[#1a1a1a] p-4 relative">
            <div className="max-w-full">
              {/* Top row: Cross and Leverage */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Cross</span>
                <button 
                  className="bg-[#c4f82a] text-black text-xs px-2 py-1 rounded flex items-center gap-1 font-medium" 
                  onClick={() => setShowLeverageSelector(!showLeverageSelector)}
                >
                  {leverage}x
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Leverage Selector Modal */}
              {showLeverageSelector && (
                <>
                  <div 
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setShowLeverageSelector(false)}
                  />
                  <div className="fixed inset-x-0 bottom-0 bg-[#1a1a1a] rounded-t-2xl p-6 z-50 animate-slide-up">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-medium mb-1">{t('trading.leverage')}</h3>
                      <p className="text-xs text-gray-400">{t('trading.defaultLeverageDesc')}</p>
                    </div>
                    <div className="flex gap-2 mb-4">
                      {leverageOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setLeverage(option);
                            setShowLeverageSelector(false);
                          }}
                          className={`flex-1 py-3 rounded-lg transition-all ${
                            leverage === option
                              ? 'bg-[#c4f82a] text-black'
                              : 'bg-[#2a2a2a] text-gray-400'
                          }`}
                        >
                          {option}x
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowLeverageSelector(false)}
                      className="w-full py-3 bg-gray-700 text-white rounded-lg mt-2"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </>
              )}

              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setTradeType('buy')}
                  className={`py-2 rounded font-medium text-xs ${
                    tradeType === 'buy'
                      ? 'bg-[#16a34a] text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {getForexText('buyLong')}
                </button>
                <button
                  onClick={() => setTradeType('sell')}
                  className={`py-2 rounded font-medium text-xs ${
                    tradeType === 'sell'
                      ? 'bg-[#dc2626] text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {getForexText('sellShort')}
                </button>
              </div>

              {/* Order Type */}
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-gray-400">{getForexText('limitPrice')}</span>
                <span className="text-white">{getForexText('marketPrice')}</span>
              </div>

              {/* Margin Checkbox */}
              <div className="mb-2">
                <label className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <input type="checkbox" className="w-3 h-3 rounded bg-gray-800 border-gray-600" />
                    <span className="text-gray-400">{getForexText('availableBalance')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white">{margin}</span>
                    <button>
                      <Plus className="w-3 h-3 text-[#c4f82a]" />
                    </button>
                  </div>
                </label>
              </div>

              {/* Price input */}
              <div className="bg-[#0a0e13] rounded p-2 flex items-center justify-between mb-2">
                <button>
                  <Minus className="w-3 h-3 text-gray-400" />
                </button>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 bg-transparent text-center outline-none text-sm text-white font-medium"
                />
                <button>
                  <Plus className="w-3 h-3 text-gray-400" />
                </button>
              </div>

              {/* Additional Fields */}
              <div className="space-y-1.5 mb-2 text-xs">
                <div className="bg-[#0a0e13] rounded p-2 flex items-center justify-between">
                  <span className="text-gray-400">{getForexText('quantity')}</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="USDT"
                    className="flex-1 bg-transparent text-right outline-none text-sm text-white font-medium placeholder:text-gray-600"
                  />
                </div>
                <div className="bg-[#0a0e13] rounded p-2 flex items-center justify-between">
                  <span className="text-gray-400">{getForexText('takeProfit')}</span>
                  <input
                    type="text"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder={getForexText('price')}
                    className="flex-1 bg-transparent text-right outline-none text-sm text-white font-medium placeholder:text-gray-600"
                  />
                </div>
                <div className="bg-[#0a0e13] rounded p-2 flex items-center justify-between">
                  <span className="text-gray-400">{getForexText('stopLoss')}</span>
                  <input
                    type="text"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder={getForexText('price')}
                    className="flex-1 bg-transparent text-right outline-none text-sm text-white font-medium placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1 text-[10px] text-gray-500 mb-3">
                <div className="flex items-center justify-between">
                  <span>{getForexText('maximum')}</span>
                  <span className="text-white">0.0000 EURUSD.FX</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{getForexText('estimatedCost')}</span>
                  <span className="text-white">0.00 USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{getForexText('fee')}</span>
                  <span className="text-white">0.00 USDT</span>
                </div>
              </div>

              {/* Buy/Sell button */}
              <button className={`w-full py-2 rounded-lg font-medium text-sm ${
                tradeType === 'buy'
                  ? 'bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white'
                  : 'bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white'
              }`}>
                {tradeType === 'buy' ? getForexText('buyLong') : getForexText('sellShort')}
              </button>
            </div>
          </div>

          {/* Right Bottom: Market Quote */}
          <div className="flex-1 bg-[#0f1419] border-l border-gray-800 p-3">
            {/* Market Quote Header */}
            <div className="mb-3">
              <div className="text-[10px] text-gray-400 font-medium">MARKET QUOTE</div>
              <div className="text-[9px] text-gray-600">Real-time Quote</div>
            </div>

            {/* Bid/Ask Prices */}
            <div className="space-y-2 mb-3">
              {/* Bid */}
              <div className="bg-green-900/20 border border-green-500/30 rounded p-2">
                <div className="text-[9px] text-gray-400 mb-0.5">Bid</div>
                <div className="text-green-400 text-xs font-medium whitespace-nowrap">1.34339</div>
              </div>
              
              {/* Ask */}
              <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
                <div className="text-[9px] text-gray-400 mb-0.5">Ask</div>
                <div className="text-red-400 text-xs font-medium whitespace-nowrap">1.34344</div>
              </div>
            </div>

            {/* Spread */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Spread</span>
                <span className="text-white font-medium">0.00005</span>
              </div>
            </div>

            {/* Mini chart */}
            <div className="h-20 relative mb-3 bg-[#0a0e13] rounded overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 140 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="miniChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Mini area chart */}
                <path
                  d="M 0 40 L 20 35 L 40 30 L 60 35 L 80 45 L 100 35 L 120 30 L 140 40 L 140 80 L 0 80 Z"
                  fill="url(#miniChartGradient)"
                />
                
                {/* Line */}
                <path
                  d="M 0 40 L 20 35 L 40 30 L 60 35 L 80 45 L 100 35 L 120 30 L 140 40"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2"
                />
              </svg>

              {/* Current price label */}
              <div className="absolute bottom-1.5 right-1.5 bg-teal-500 text-black text-[9px] px-1.5 py-0.5 rounded font-medium">
                1.34342
              </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] text-green-500 font-medium">Live</span>
              <span className="text-[8px] text-gray-600 ml-auto">Real-time</span>
            </div>

            {/* Bottom spacing for scrolling */}
            <div className="h-64"></div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}