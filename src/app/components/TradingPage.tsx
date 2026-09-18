import { ArrowLeft, Star, Menu, X, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ProductListSidebar } from './ProductListSidebar';
import { TradingViewWidget } from './TradingViewWidget';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

// 周期选项 (时间 + 收益率 — 写死对应关系,选周期即定收益率)
const PERIODS: { duration: string; returnRate: string; value: number }[] = [
  { duration: '30s',  returnRate: '20%', value: 20 },
  { duration: '60s',  returnRate: '30%', value: 30 },
  { duration: '120s', returnRate: '40%', value: 40 },
  { duration: '180s', returnRate: '50%', value: 50 },
  { duration: '240s', returnRate: '60%', value: 60 },
];

const cryptoProducts = [
  {
    symbol: 'BTC/USDT', name: 'Bitcoin/USDT', icon: '₿', color: 'bg-orange-500',
    price: '88648.92', change: '+1.24%', positive: true,
  },
  {
    symbol: 'ETH/USDT', name: 'Ethereum/USDT', icon: 'Ξ', color: 'bg-blue-500',
    price: '2965.39', change: '+0.90%', positive: true,
  },
  {
    symbol: 'BNB/USDT', name: 'BNB/USDT', icon: 'B', color: 'bg-yellow-500',
    price: '859.51', change: '+0.78%', positive: true,
  },
  {
    symbol: 'SOL/USDT', name: 'Solana/USDT', icon: 'S', color: 'bg-purple-500',
    price: '124.63', change: '+1.08%', positive: true,
  },
  {
    symbol: 'ADA/USDT', name: 'Cardano/USDT', icon: 'A', color: 'bg-blue-600',
    price: '0.35', change: '-1.33%', positive: false,
  },
  {
    symbol: 'TRX/USDT', name: 'TRON/USDT', icon: 'T', color: 'bg-red-500',
    price: '0.29', change: '+0.60%', positive: true,
  },
  {
    symbol: 'DOGE/USDT', name: 'Dogecoin/USDT', icon: 'Ð', color: 'bg-yellow-600',
    price: '0.12', change: '+0.05%', positive: true,
  },
];

export function TradingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const symbolParam = searchParams.get('symbol') || 'btcusdt';
  // 自动补 USDT 后缀 — 链接可能传 "btc" 或 "btcusdt",TradingView 需要完整 "BTCUSDT"
  const withQuote = /usdt$/i.test(symbolParam) ? symbolParam : `${symbolParam}usdt`;
  const tradingSymbol = withQuote.toUpperCase();

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
  const [currentPriceRaw, setCurrentPriceRaw] = useState<number>(88648.92); // 纯数字,给下单计算用
  const [priceChange, setPriceChange] = useState('+1.24%');
  const [priceChangeValue, setPriceChangeValue] = useState('+1089.24');
  const [isPositive, setIsPositive] = useState(true);

  // 订单面板状态
  const [showOrderSheet, setShowOrderSheet] = useState(false);
  const [orderDirection, setOrderDirection] = useState<'buy' | 'sell'>('buy');
  const [selectedPeriod, setSelectedPeriod] = useState('30s');
  const [orderAmount, setOrderAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 收益率跟随周期(写死对应关系):30s→20%, 60s→30%, 120s→40%, 180s→50%, 240s→60%
  const selectedReturnRate = (PERIODS.find(p => p.duration === selectedPeriod)?.value) ?? 20;

  const { t } = useLanguage();
  const { user, refresh } = useAuth();

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

      setCurrentPriceRaw(currentPriceValue);
      setCurrentPrice(currentPriceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setPriceChange(`${positive ? '+' : ''}${changePercent.toFixed(2)}%`);
      setPriceChangeValue(`${positive ? '+' : ''}${changeValue.toFixed(2)}`);
      setIsPositive(positive);
    };

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, [symbolParam]);

  // 触发下单面板
  const openOrderSheet = (direction: 'buy' | 'sell') => {
    setOrderDirection(direction);
    setOrderAmount(''); // 重置
    setSubmitError(null);
    setShowOrderSheet(true);
  };
  const closeOrderSheet = () => {
    if (submitting) return;
    setShowOrderSheet(false);
  };

  const bumpAmount = (delta: number) => {
    const cur = parseFloat(orderAmount || '0');
    const next = Math.max(0, cur + delta);
    setOrderAmount(next === 0 ? '' : next.toString());
  };

  // 计算结算金额(amount × (1 + returnRate/100)),用于底部信息提示
  // 用 selectedReturnRate(用户在下单抽屉选的收益率),而不是周期默认表
  const amountNum = parseFloat(orderAmount || '0');
  const settlePreview = (Number.isFinite(amountNum) && amountNum > 0)
    ? (amountNum * (1 + selectedReturnRate / 100)).toFixed(2)
    : '--';

  const baseCoin = tradingSymbol.replace(/USDT$/, '');
  const currentReturn = `${selectedReturnRate}%`;

  // 提交订单
  const handleSubmitOrder = async () => {
    setSubmitError(null);
    // 校验金额必填
    if (!orderAmount || amountNum <= 0 || !Number.isFinite(amountNum)) {
      setSubmitError(t('orders.invalidAmount') || '请填写订单金额');
      return;
    }
    if (!user) {
      setSubmitError('请先登录');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: user.id,
          symbol: tradingSymbol,
          direction: orderDirection === 'buy' ? '涨' : '跌',
          amount: amountNum,
          open_price: currentPriceRaw,
          period: selectedPeriod,
          return_rate: selectedReturnRate,   // 用户选的收益率(覆盖周期默认)
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setSubmitError(data.message || '下单失败');
        return;
      }
      // 成功 → 刷新当前用户余额(冻结金额变化)→ 关闭抽屉 → 跳到 /orders 持仓 tab
      refresh().catch(() => {});
      setShowOrderSheet(false);
      navigate('/orders', { state: { tab: 'positions' } });
    } catch (err: any) {
      setSubmitError(err?.message || '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-[#0a0e13] text-white flex flex-col overflow-hidden relative">
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
        title={t('trading.crypto')}
        subtitle={t('trading.cryptoPairs')}
        searchPlaceholder={t('trading.searchPlaceholder')}
        linkPrefix="/trading"
      />

      {/* Chart — 高度加大给 MACD 副图留位置 */}
      <div className="h-[420px] bg-[#0a0e13] relative border-b border-gray-800 flex-shrink-0">
        <TradingViewWidget symbol={`BINANCE:${tradingSymbol}.P`} height={420} hide_top_toolbar={false} />
      </div>

      {/* 两个按钮 — 紧贴图表下方,点击触发底部抽屉 */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-[#1a1a1a]">
        <button
          onClick={() => openOrderSheet('buy')}
          className="py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white active:scale-[0.98] transition-all"
        >
          {t('trading.openLong')}
        </button>
        <button
          onClick={() => openOrderSheet('sell')}
          className="py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white active:scale-[0.98] transition-all"
        >
          {t('trading.openShort')}
        </button>
      </div>

      {/* 订单抽屉 (Bottom Sheet) — 从底部滑出 */}
      {showOrderSheet && (
        <>
          {/* 遮罩层 — 半透明黑 */}
          <div
            onClick={closeOrderSheet}
            className="fixed inset-0 bg-black/60 z-40 animate-[fadeIn_0.3s_ease-out]"
          />

          {/* 抽屉面板 */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-[#1a1a1a] rounded-t-2xl p-5 pb-6 max-h-[85vh] overflow-y-auto animate-[slideUp_0.3s_ease-out] shadow-2xl shadow-black/60">
            {/* 顶部信息栏 — 交易对 + 价格 + 关闭 */}
            <div className="flex items-center justify-between mb-5">
              <div className="font-bold text-base">
                {tradingSymbol}
                <span className="ml-2 font-normal text-gray-300">{currentPrice}</span>
              </div>
              <button
                onClick={closeOrderSheet}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* 周期选择区 — Select order period */}
            <div className="mb-5">
              <h3 className="font-bold text-sm mb-3">{t('trading.selectPeriod')}</h3>
              <div className="grid grid-cols-5 gap-2">
                {PERIODS.map((p, idx) => {
                  const selected = selectedPeriod === p.duration;
                  return (
                    <button
                      key={p.duration}
                      onClick={() => setSelectedPeriod(p.duration)}
                      className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
                        selected
                          ? 'bg-[#c4f82a] text-black border-2 border-[#c4f82a]'
                          : 'bg-[#1a1a1a] text-white border border-gray-700'
                      }`}
                    >
                      <span className={`text-sm font-medium ${selected ? 'text-black' : 'text-white'}`}>
                        {p.duration}
                      </span>
                      <span className={`text-xs mt-0.5 ${selected ? 'text-black/80' : 'text-red-500'}`}>
                        {p.returnRate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 收益率跟随周期 — 不再单独选择,周期按钮下方已显示对应收益率 */}

            {/* 金额输入区 — Enter order amount */}
            <div className="mb-5">
              <h3 className="font-bold text-sm mb-3">{t('trading.enterAmount')}</h3>
              <div className="flex items-center bg-[#0a0e13] rounded-lg border border-gray-700 overflow-hidden">
                <input
                  type="number"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-3 text-white text-base outline-none placeholder:text-gray-600"
                  placeholder=""
                />
                <div className="flex flex-col border-l border-gray-700">
                  <button
                    onClick={() => bumpAmount(1)}
                    className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => bumpAmount(-1)}
                    className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border-t border-gray-700"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 订单信息展示表 — Currency / Price / Amount */}
            <div className="mb-5 rounded-lg overflow-hidden border border-gray-700">
              <div className="grid grid-cols-3 bg-[#2a2a2a] text-gray-200 text-sm font-medium">
                <div className="py-2.5 text-center">{t('trading.currency')}</div>
                <div className="py-2.5 text-center">{t('trading.price')}</div>
                <div className="py-2.5 text-center">{t('trading.amount')}</div>
              </div>
              <div className="grid grid-cols-3 bg-[#0a0e13] text-white text-sm">
                <div className="py-3 text-center font-medium">{baseCoin}</div>
                <div className="py-3 text-center">{currentPrice}</div>
                <div className="py-3 text-center text-gray-400">{orderAmount || '--'}</div>
              </div>
            </div>

            {/* 预期收益率 + 结算金额 */}
            <div className="mb-3 text-xs text-gray-400 flex items-center justify-between">
              <span>
                {orderDirection === 'buy' ? t('trading.openLong') : t('trading.openShort')}
                {' · '}
                {selectedPeriod} · {currentReturn}
              </span>
              {Number.isFinite(amountNum) && amountNum > 0 && (
                <span className="text-[#c4f82a]">
                  {t('orders.detail.settleAmount') || '结算金额'} ≈ {settlePreview}
                </span>
              )}
            </div>

            {/* 提交错误提示 */}
            {submitError && (
              <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* 底部 — Submit Order 按钮 */}
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className={`w-full py-4 rounded-xl text-white font-semibold text-base active:scale-[0.98] transition-all ${
                orderDirection === 'buy'
                  ? 'bg-gradient-to-r from-[#16a34a] to-[#15803d]'
                  : 'bg-gradient-to-r from-[#dc2626] to-[#b91c1c]'
              } ${submitting ? 'opacity-60' : ''}`}
            >
              {submitting ? '提交中...' : t('trading.submitOrder')}
            </button>
          </div>
        </>
      )}

      {/* 抽屉 / 遮罩的 CSS 动画 — slideUp + fadeIn (全局 Tailwind 不带,这里用 inline style 注入 keyframes) */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Toast */}
      {showToast && (
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}