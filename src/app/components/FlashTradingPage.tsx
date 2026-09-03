import { ArrowLeft, ChevronDown, Search, TrendingUp, TrendingDown, X, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { OrderInProgressDialog } from './OrderInProgressDialog';
import { useLanguage } from '../contexts/LanguageContext';

// Fallback translations for predict texts
const predictTextFallback: Record<string, { up: string; down: string }> = {
  en: { up: 'Predict Price Rise', down: 'Predict Price Fall' },
  ja: { up: '価格上昇を予測', down: '価格下降を予測' },
  'zh-CN': { up: '预测价格上涨', down: '预测价格下跌' },
  th: { up: 'คาดการณ์ราคาขึ้น', down: 'คาดการณ์ราคาลง' },
};

// Fallback translations for missing flash texts
const flashTextFallback: Record<string, any> = {
  en: {
    selectPeriod: 'Select Period',
    returnRate: 'Return Rate',
    betAmount: 'Bet Amount',
    available: 'Available',
    enterAmount: 'Enter Amount',
    riskWarning: 'Risk Warning: Incorrect predictions will result in loss of principal. Please bet reasonably according to your situation and trade rationally.',
  },
  ja: {
    selectPeriod: '期間を選択',
    returnRate: '収益率',
    betAmount: 'ベット金額',
    available: '利用可能',
    enterAmount: '���額を入力',
    riskWarning: 'リスク警告：予測が間違っていた場合、元本をすべて失います。ご自身の状況に応じて合理的に賭け、理性的に取引してください。',
  },
  'zh-CN': {
    selectPeriod: '选择周期',
    returnRate: '收益金额率',
    betAmount: '投注金额',
    available: '可用',
    enterAmount: '输入金额',
    riskWarning: '风险提示：预测错误将损失全部本金，请根自身情况合理投注，理性交易。',
  },
  th: {
    selectPeriod: 'เลือกระยะเวลา',
    returnRate: 'อัตราผลตอบแทน',
    betAmount: 'จำนวนเดิมพัน',
    available: 'ที่มีอยู่',
    enterAmount: 'ป้อนจำนวนเงิน',
    riskWarning: 'คำเตือนความเสี่ยง: การคาดการณ์ที่ไม่ถูกต้องจะส่งผลให้สูญเสียเงินต้นทั้งหมด โปรดเดิมพันอย่างสมเหตุสมผลตามสถานการณ์ของคุณและซื้อขายอย่างมีเหตุผล',
  },
};

export function FlashTradingPage() {
  const { t, language } = useLanguage();
  
  // Helper to get predict text with fallback
  const getPredictText = (direction: 'up' | 'down') => {
    const translation = t(`flash.predict${direction === 'up' ? 'Up' : 'Down'}`);
    if (translation.startsWith('flash.predict')) {
      return (predictTextFallback[language] || predictTextFallback.en)[direction];
    }
    return translation;
  };
  
  // Helper to get flash text with fallback
  const getFlashText = (key: string) => {
    // Try flash section first
    const flashTranslation = t(`flash.${key}`);
    if (!flashTranslation.startsWith('flash.')) {
      return flashTranslation;
    }
    
    // Try orders section for betAmount
    if (key === 'betAmount') {
      const ordersTranslation = t('orders.betAmount');
      if (!ordersTranslation.startsWith('orders.')) {
        return ordersTranslation;
      }
    }
    
    // Use fallback
    return (flashTextFallback[language] || flashTextFallback.en)[key] || key;
  };
  
  const [selectedTime, setSelectedTime] = useState('30');
  const [amount, setAmount] = useState('');
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderDirection, setOrderDirection] = useState<'up' | 'down'>('up');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('BTC/USDT');
  const [searchQuery, setSearchQuery] = useState('');

  const products = [
    {
      symbol: 'BTC/USDT',
      pair: 'BTCUSDT',
      price: '$93586.43',
      change: '-0.40%',
      positive: false,
      icon: '₿',
      color: 'bg-orange-500',
      durations: '5 durations',
    },
    {
      symbol: 'ETH/USDT',
      pair: 'ETHUSDT',
      price: '$3098.77',
      change: '-0.91%',
      positive: false,
      icon: 'Ξ',
      color: 'bg-blue-500',
      durations: '5 durations',
    },
    {
      symbol: 'BNB/USDT',
      pair: 'BNBUSDT',
      price: '$918.66',
      change: '-0.78%',
      positive: false,
      icon: 'B',
      color: 'bg-yellow-500',
      durations: '5 durations',
    },
    {
      symbol: 'TRX/USDT',
      pair: 'TRXUSDT',
      price: '$0.29',
      change: '-1.15%',
      positive: false,
      icon: 'T',
      color: 'bg-red-500',
      durations: '5 durations',
    },
    {
      symbol: 'DOGE/USDT',
      pair: 'DOGEUSDT',
      price: '$0.14',
      change: '-0.46%',
      positive: false,
      icon: 'Ð',
      color: 'bg-yellow-400',
      durations: '5 durations',
    },
    {
      symbol: 'ADA/USDT',
      pair: 'ADAUSDT',
      price: '$0.39',
      change: '+8.31%',
      positive: true,
      icon: 'A',
      color: 'bg-blue-400',
      durations: '5 durations',
    },
    {
      symbol: 'BCH/USDT',
      pair: 'BCHUSDT',
      price: '$639.20',
      change: '-0.88%',
      positive: false,
      icon: 'B',
      color: 'bg-green-500',
      durations: '5 durations',
    },
  ];

  const filteredProducts = products.filter(product =>
    product.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.pair.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentProduct = products.find(p => p.symbol === selectedProduct) || products[0];

  const timeOptions = [
    { duration: '30', label: '30 seconds', return: '8%' },
    { duration: '60', label: '60 seconds', return: '12%' },
    { duration: '90', label: '90 seconds', return: '15%' },
    { duration: '120', label: '120 seconds', return: '20%' },
    { duration: '180', label: '180 seconds', return: '50%' },
    { duration: '200', label: '200 seconds', return: '90%' },
  ];

  const quickAmounts = [10, 50, 100, 500, 1000];

  const chartTimeframes = ['K线图', '实时', '1m', '5m', '15m', '1h'];

  return (
    <div className="min-h-screen bg-[#0f1419] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#0f1419]">
        <div className="flex items-center gap-3">
          <Link to="/flash">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-lg">{currentProduct.symbol}</h1>
            <p className="text-xs text-gray-400">{currentProduct.pair}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg">{currentProduct.price}</div>
            <div className={`text-xs flex items-center gap-1 ${
              currentProduct.positive ? 'text-green-400' : 'text-red-400'
            }`}>
              <TrendingUp className={`w-3 h-3 ${currentProduct.positive ? '' : 'rotate-180'}`} />
              {currentProduct.change}
            </div>
          </div>
          <button onClick={() => setShowProductSelector(true)}>
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Product Selector Sidebar */}
      {showProductSelector && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setShowProductSelector(false)}
          />

          {/* Sidebar */}
          <div className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-[#1a1a1a] z-50 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#c4f82a] rounded-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Select Product</h2>
                  <p className="text-[10px] text-gray-400">Binary Options</p>
                </div>
              </div>
              <button
                onClick={() => setShowProductSelector(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search symbol..."
                  className="w-full bg-[#242424] text-sm text-white pl-10 pr-4 py-2.5 rounded-lg border border-gray-700 focus:border-[#c4f82a] outline-none"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="px-4 pb-4 space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.symbol}
                  onClick={() => {
                    setSelectedProduct(product.symbol);
                    setShowProductSelector(false);
                  }}
                  className={`w-full p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedProduct === product.symbol
                      ? 'bg-gradient-to-r from-[#3a4a2a] to-[#2a3a1a] border-[#c4f82a]'
                      : 'bg-[#242424] border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${product.color} rounded-full flex items-center justify-center text-lg font-bold`}>
                        {product.icon}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">{product.symbol}</div>
                        <div className="text-[10px] text-gray-400">{product.pair} · {product.durations}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">{product.price}</div>
                        <div
                          className={`text-[10px] ${
                            product.positive ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {product.change}
                        </div>
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle refresh action here
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Chart */}
      <div className="bg-[#0f1419] p-4 mb-4">
        {/* Chart Timeframe Selector */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {chartTimeframes.map((timeframe, idx) => (
            <button
              key={idx}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                timeframe === '1m'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>

        {/* Chart Area - Simplified representation */}
        <div className="relative h-48 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg p-4">
          {/* Price levels */}
          <div className="absolute right-2 top-4 space-y-4 text-xs text-gray-500">
            <div>89100.00</div>
            <div>89000.00</div>
            <div className="text-[#c4f82a]">88952.63</div>
            <div>88900.00</div>
            <div>88700.00</div>
          </div>

          {/* Simplified chart line */}
          <svg className="w-full h-full" viewBox="0 0 300 150">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c4f82a" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#c4f82a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 100 Q 30 120, 50 110 T 100 90 T 150 70 T 200 60 T 250 50 L 280 55"
              fill="none"
              stroke="#c4f82a"
              strokeWidth="2"
            />
            <path
              d="M 0 100 Q 30 120, 50 110 T 100 90 T 150 70 T 200 60 T 250 50 L 280 55 L 280 150 L 0 150 Z"
              fill="url(#chartGradient)"
            />
          </svg>

          {/* Time labels */}
          <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-gray-500">
            <span>J:15</span>
            <span>11:00</span>
            <span>11:35</span>
          </div>

          {/* Current price marker */}
          <div className="absolute right-0 top-1/3 bg-[#c4f82a] text-black text-xs px-2 py-0.5 rounded-l">
            88952.63
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {/* Period Selection */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm">{getFlashText('selectPeriod')}</h3>
          <button className="text-xs text-gray-400 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            {getFlashText('returnRate')}
          </button>
        </div>

        {/* Time Options */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {timeOptions.map((option) => (
            <button
              key={option.duration}
              onClick={() => setSelectedTime(option.duration)}
              className={`p-3 rounded-xl border transition-all ${
                selectedTime === option.duration
                  ? 'bg-[#c4f82a]/20 border-[#c4f82a] text-[#c4f82a]'
                  : 'bg-gray-800/40 border-gray-700/30 text-gray-300'
              }`}
            >
              <div className="text-xs mb-1">{option.label.split(' ')[0]}</div>
              <div className="text-xs">{option.label.split(' ')[1]}</div>
              <div className="text-base mt-1">{option.return}</div>
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm">{getFlashText('betAmount')}</h3>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              {getFlashText('available')}: $0.00
              <RotateCcw className="w-3 h-3" />
            </div>
          </div>

          <div className="bg-gray-800/40 rounded-xl p-3 mb-3 border border-gray-700/30">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={getFlashText('enterAmount')}
              className="w-full bg-transparent text-xl outline-none placeholder-gray-600"
            />
            <div className="text-xs text-gray-400 text-right mt-0.5">USDT</div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className="bg-gray-800/40 border border-gray-700/30 text-white py-2 px-3 rounded-lg text-sm hover:bg-gray-700/50 transition-colors"
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Warning */}
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            {getFlashText('riskWarning')}
          </p>
        </div>

        {/* Trade Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl flex flex-col items-center justify-center"
            onClick={() => {
              setOrderDirection('down');
              setShowOrderDialog(true);
            }}
          >
            <div className="text-xs mb-0.5">{t('orders.put')}</div>
            <div className="text-[10px] text-red-200">{getPredictText('down')}</div>
          </button>
          <button
            className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl flex flex-col items-center justify-center"
            onClick={() => {
              setOrderDirection('up');
              setShowOrderDialog(true);
            }}
          >
            <div className="text-xs mb-0.5">{t('orders.call')}</div>
            <div className="text-[10px] text-green-200">{getPredictText('up')}</div>
          </button>
        </div>
      </div>

      {/* Order In Progress Dialog */}
      <OrderInProgressDialog
        isOpen={showOrderDialog}
        onClose={() => setShowOrderDialog(false)}
        direction={orderDirection}
        amount={parseFloat(amount) || 500}
        duration={parseInt(selectedTime)}
        openPrice={88648.92}
        currentPrice={88648.92}
      />
    </div>
  );
}