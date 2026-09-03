import { ArrowLeft, Star, Plus, Minus, ChevronDown, Menu } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ProductListSidebar } from './ProductListSidebar';
import { TradingViewWidget } from './TradingViewWidget';
import { useLanguage } from '../contexts/LanguageContext';
import { useLeverage } from '../contexts/LeverageContext';

// OrderBook Component - Real-time order book from Binance
function OrderBook({ symbol }: { symbol: string }) {
  const [orders, setOrders] = useState<{ bids: [string, string][]; asks: [string, string][] }>({
    bids: [],
    asks: []
  });

  useEffect(() => {
    const wsSymbol = symbol.toLowerCase() + 'usdt';
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@depth20`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setOrders({ bids: data.bids || [], asks: data.asks || [] });
    };

    ws.onerror = () => {
      // Ignore connection errors
    };

    return () => {
      try {
        ws.close();
      } catch (e) {
        // Ignore close errors
      }
    };
  }, [symbol]);

  const maxAmount = Math.max(
    ...orders.bids.map(([, amt]) => parseFloat(amt)),
    ...orders.asks.map(([, amt]) => parseFloat(amt))
  );

  return (
    <div className="space-y-1 mb-3">
      {/* Sell orders (red) - show top 5 */}
      <div className="space-y-0.5">
        {orders.asks.slice(0, 5).reverse().map(([price, amount], idx) => {
          const widthPercent = (parseFloat(amount) / maxAmount) * 100;
          return (
            <div key={`ask-${idx}`} className="grid grid-cols-2 gap-1 text-[10px] relative">
              <div className="absolute inset-0 bg-red-500/10" style={{ width: `${widthPercent}%` }}></div>
              <span className="text-red-400 relative z-10">{parseFloat(price).toFixed(2)}</span>
              <span className="text-gray-400 text-right relative z-10">{parseFloat(amount).toFixed(4)}</span>
            </div>
          );
        })}
      </div>

      {/* Current price */}
      <div className="bg-green-900/30 border border-green-500/40 px-2 py-1 rounded my-1.5">
        <div className="text-green-400 text-xs font-medium text-center">
          {orders.bids[0] ? parseFloat(orders.bids[0][0]).toFixed(2) : '--'}
        </div>
      </div>

      {/* Buy orders (green) - show top 5 */}
      <div className="space-y-0.5">
        {orders.bids.slice(0, 5).map(([price, amount], idx) => {
          const widthPercent = (parseFloat(amount) / maxAmount) * 100;
          return (
            <div key={`bid-${idx}`} className="grid grid-cols-2 gap-1 text-[10px] relative">
              <div className="absolute inset-0 bg-green-500/10" style={{ width: `${widthPercent}%` }}></div>
              <span className="text-green-400 relative z-10">{parseFloat(price).toFixed(2)}</span>
              <span className="text-gray-400 text-right relative z-10">{parseFloat(amount).toFixed(4)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cryptoProducts = [
  {
    symbol: 'BTC/USDT',
    name: 'Bitcoin/USDT',
    icon: '₿',
    color: 'bg-orange-500',
    price: '88648.92',
    change: '+1.24%',
    positive: true,
  },
  {
    symbol: 'ETH/USDT',
    name: 'Ethereum/USDT',
    icon: 'Ξ',
    color: 'bg-blue-500',
    price: '2965.39',
    change: '+0.90%',
    positive: true,
  },
  {
    symbol: 'BNB/USDT',
    name: 'BNB/USDT',
    icon: 'B',
    color: 'bg-yellow-500',
    price: '859.51',
    change: '+0.78%',
    positive: true,
  },
  {
    symbol: 'SOL/USDT',
    name: 'Solana/USDT',
    icon: 'S',
    color: 'bg-purple-500',
    price: '124.63',
    change: '+1.08%',
    positive: true,
  },
  {
    symbol: 'ADA/USDT',
    name: 'Cardano/USDT',
    icon: 'A',
    color: 'bg-blue-600',
    price: '0.35',
    change: '-1.33%',
    positive: false,
  },
  {
    symbol: 'TRX/USDT',
    name: 'TRON/USDT',
    icon: 'T',
    color: 'bg-red-500',
    price: '0.29',
    change: '+0.60%',
    positive: true,
  },
  {
    symbol: 'DOGE/USDT',
    name: 'Dogecoin/USDT',
    icon: 'Ð',
    color: 'bg-yellow-600',
    price: '0.12',
    change: '+0.05%',
    positive: true,
  },
];

export function TradingPage() {
  const [searchParams] = useSearchParams();
  const symbolParam = searchParams.get('symbol') || 'btcusdt';
  const tradingSymbol = symbolParam.toUpperCase();

  const [tradeType, setTradeType] = useState('buy');
  const [showLeverageSelector, setShowLeverageSelector] = useState(false);
  const [price, setPrice] = useState('88648.9200');
  const [amount, setAmount] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 收藏功能 - 与 MarketPage 同步
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : ['btc', 'eth'];
  });

  const isFavorited = favorites.includes(symbolParam.toLowerCase());

  const toggleFavorite = () => {
    const newFavorites = isFavorited
      ? favorites.filter(f => f !== symbolParam.toLowerCase())
      : [...favorites, symbolParam.toLowerCase()];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setToastMessage(isFavorited ? t('common.removedFromFavorites') : t('common.addedToFavorites'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };
  const [currentPrice, setCurrentPrice] = useState('88648.9200');
  const [priceChange, setPriceChange] = useState('+1.24%');
  const [priceChangeValue, setPriceChangeValue] = useState('+1089.24');
  const [isPositive, setIsPositive] = useState(true);

  const { t } = useLanguage();
  const { leverage, setLeverage } = useLeverage();

  const leverageOptions = ['5', '10', '20', '50', '100'];

  // WebSocket for real-time price
  useEffect(() => {
    const wsSymbol = symbolParam.toLowerCase() + 'usdt';
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@ticker`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentPriceValue = parseFloat(data.c);
      const changeValue = parseFloat(data.p);
      const changePercent = parseFloat(data.P);
      const positive = changePercent >= 0;

      setCurrentPrice(currentPriceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setPriceChange(`${positive ? '+' : ''}${changePercent.toFixed(2)}%`);
      setPriceChangeValue(`${positive ? '+' : ''}${changeValue.toFixed(2)}`);
      setIsPositive(positive);
    };

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, [symbolParam]);

  return (
    <div className="h-screen bg-[#0a0e13] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <Link to="/market">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">{tradingSymbol}</h1>
            <span className={`text-base ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{currentPrice}</span>
            <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{priceChange}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowProductList(true)}>
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={toggleFavorite}>
            <Star className={`w-5 h-5 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>

      {/* Product List Sidebar */}
      <ProductListSidebar
        isOpen={showProductList}
        onClose={() => setShowProductList(false)}
        products={cryptoProducts}
        currentSymbol={`${symbolParam.toUpperCase()}/USDT`}
        title="Crypto"
        subtitle="Crypto Pairs"
        searchPlaceholder="Search symbol..."
        linkPrefix="/trading"
      />


      {/* Main Content - 2 sections */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Top Section: TradingView Chart */}
        <div className="h-72 bg-[#0a0e13] relative border-b border-gray-800 flex-shrink-0">
          <TradingViewWidget
            symbol={`BINANCE:${tradingSymbol}`}
            width="100%"
            height={288}
            interval="15"
            timezone="Etc/UTC"
            theme="dark"
            toolbar_bg="#1a1a1a"
            enable_publishing={false}
            hide_top_toolbar={false}
            hide_legend={false}
            save_image={false}
            details={false}
            hotlist={false}
            calendar={false}
          />
        </div>

        {/* Bottom Section: Trading Panel + Order Book (Same Height) */}
        <div className="flex flex-1">
          {/* Left Bottom: Trading Panel */}
          <div className="flex-1 bg-[#1a1a1a] p-4 relative">
            <div className="max-w-sm">
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
                  Open Long
                </button>
                <button
                  onClick={() => setTradeType('sell')}
                  className={`py-2 rounded font-medium text-xs ${
                    tradeType === 'sell'
                      ? 'bg-[#dc2626] text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Open Short
                </button>
              </div>

              {/* Order Type */}
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-white">Limit</span>
                <span className="text-gray-400">Market</span>
              </div>

              {/* Available Balance */}
              <div className="mb-2">
                <label className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <input type="checkbox" className="w-3 h-3 rounded bg-gray-800 border-gray-600" />
                    <span className="text-gray-400">Available Balance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white">0.00</span>
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
                  <span className="text-gray-400">Qty</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="USDT"
                    className="flex-1 bg-transparent text-right outline-none text-sm text-white font-medium placeholder:text-gray-600"
                  />
                </div>
                <div className="bg-[#0a0e13] rounded p-2 flex items-center justify-between">
                  <span className="text-gray-400">Take Profit</span>
                  <input
                    type="text"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Price"
                    className="flex-1 bg-transparent text-right outline-none text-sm text-white font-medium placeholder:text-gray-600"
                  />
                </div>
                <div className="bg-[#0a0e13] rounded p-2 flex items-center justify-between">
                  <span className="text-gray-400">Stop Loss</span>
                  <input
                    type="text"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Price"
                    className="flex-1 bg-transparent text-right outline-none text-sm text-white font-medium placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1 text-[10px] text-gray-500 mb-3">
                <div className="flex items-center justify-between">
                  <span>Max Buyable</span>
                  <span className="text-white">0.0000 BTCUSDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estimated Cost</span>
                  <span className="text-white">0.00 USDT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fee</span>
                  <span className="text-white">0.00 USDT</span>
                </div>
              </div>

              {/* Buy/Sell button */}
              <button className={`w-full py-2 rounded-lg font-medium text-sm ${
                tradeType === 'buy'
                  ? 'bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white'
                  : 'bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white'
              }`}>
                {tradeType === 'buy' ? 'Open Long' : 'Open Short'}
              </button>
            </div>
          </div>

          {/* Right Bottom: Order Book + Recent Trades */}
          <div className="flex-1 bg-[#0f1419] border-t border-gray-800 p-4">
            {/* Order Book Header */}
            <div className="mb-2">
              <div className="text-xs text-gray-400 font-medium">ORDER BOOK</div>
              <div className="text-[10px] text-gray-600">订单簿</div>
            </div>

            {/* Order book entries - Real-time from Binance */}
            <OrderBook symbol={symbolParam} />

            {/* Recent Trades Section */}
            <div className="pt-3 border-t border-gray-700">
              <div className="mb-2">
                <div className="text-xs text-gray-400 font-medium">RECENT TRADES</div>
                <div className="text-[10px] text-gray-600">最新成交</div>
              </div>

              {/* Trade list */}
              <div className="space-y-1">
                {[
                  { price: '92283.0900', amount: '0.0813', time: '21:45' },
                  { price: '92282.8900', amount: '0.0113', time: '21:45' },
                  { price: '92282.7800', amount: '0.0813', time: '21:44' },
                  { price: '92282.1900', amount: '0.0026', time: '21:44' },
                ].map((trade, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${idx % 2 === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.price}
                      </span>
                      <span className="text-[9px] text-gray-600">{trade.time}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">{trade.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom spacing for scrolling */}
            <div className="h-24"></div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}