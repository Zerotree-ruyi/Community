import { RefreshCcw, MoreHorizontal, Clock, History, ChevronLeft, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function PositionsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'binary'>('positions');
  const [filterTab, setFilterTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 模拟刷新延迟
    setTimeout(() => {
      setIsRefreshing(false);
      // 这里可以添加实际的数据刷新逻辑
    }, 500);
  };

  // Mock binary options orders data
  const binaryOrders = [
    {
      id: 1,
      pair: 'BTC/USDT',
      type: 'Call',
      result: 'Draw',
      status: 'settled',
      pnl: 0,
      betAmount: 500,
      payoutRate: '8%',
      openPrice: 88648.92,
      settlementPrice: 88648.92,
      duration: '30 seconds',
      time: '01/04, 02:01 PM',
    },
    {
      id: 2,
      pair: 'ETH/USDT',
      type: 'Put',
      result: 'Win',
      status: 'profit',
      pnl: 540,
      betAmount: 500,
      payoutRate: '8%',
      openPrice: 3250.50,
      settlementPrice: 3245.30,
      duration: '60 seconds',
      time: '01/04, 02:05 PM',
    },
    {
      id: 3,
      pair: 'BNB/USDT',
      type: 'Call',
      result: 'Loss',
      status: 'loss',
      pnl: -500,
      betAmount: 500,
      payoutRate: '8%',
      openPrice: 859.51,
      settlementPrice: 858.20,
      duration: '30 seconds',
      time: '01/04, 02:10 PM',
    },
    {
      id: 4,
      pair: 'SOL/USDT',
      type: 'Call',
      result: 'Pending',
      status: 'pending',
      pnl: 0,
      betAmount: 300,
      payoutRate: '8%',
      openPrice: 145.60,
      settlementPrice: 0,
      duration: '30 seconds',
      time: '01/04, 02:15 PM',
    },
  ];

  // Filter binary orders based on selected filter
  const filteredBinaryOrders = binaryOrders.filter((order) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'pending') return order.status === 'pending';
    if (filterTab === 'profit') return order.status === 'profit';
    if (filterTab === 'loss') return order.status === 'loss';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0f1419] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl">{activeTab === 'binary' ? t('orders.myOrders') : t('orders.position')}</h1>
        <button 
          onClick={handleRefresh}
          className="hover:bg-gray-700/50 p-2 rounded transition-colors"
        >
          <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-[#c4f82a]' : 'text-gray-400'}`} />
        </button>
      </div>

      {activeTab === 'binary' && (
        <div className="px-4 mb-1">
          <p className="text-sm text-gray-400">{t('orders.binaryHistory')}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 bg-gray-800/30 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
              activeTab === 'positions'
                ? 'bg-[#c4f82a] text-black'
                : 'bg-transparent text-gray-400'
            }`}
          >
            {t('trading.positions')}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
              activeTab === 'orders'
                ? 'bg-[#c4f82a] text-black'
                : 'bg-transparent text-gray-400'
            }`}
          >
            {t('orders.ordersTab')} (1)
          </button>
          <button
            onClick={() => setActiveTab('binary')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
              activeTab === 'binary'
                ? 'bg-[#c4f82a] text-black'
                : 'bg-transparent text-gray-400'
            }`}
          >
            {t('orders.binaryOptions')}
          </button>
        </div>
      </div>

      {/* Positions Tab Content */}
      {activeTab === 'positions' && (
        <>
          {/* Account Summary */}
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-2xl p-5 border border-gray-700/30">
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">{t('orders.totalAssets')}</div>
                <div className="text-3xl">$20,000.00</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 mb-1">{t('orders.unrealizedPnl')}</div>
                  <div className="text-green-400">+0.00</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-1">{t('orders.marginLevel')}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-green-400">450.50%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Positions Header */}
          <div className="px-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base">{t('orders.currentPositions')}</h2>
              <span className="text-xs text-gray-500">0</span>
            </div>
            <button className="flex items-center gap-1 text-sm text-[#c4f82a]">
              <History className="w-4 h-4" />
              {t('orders.history')}
            </button>
          </div>

          {/* Empty State */}
          <div className="px-4 flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-full flex items-center justify-center mb-4 border border-gray-700/30">
              <Wallet className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">{t('orders.noActivePositions')}</p>
          </div>
        </>
      )}

      {/* Orders Tab Content */}
      {activeTab === 'orders' && (
        <>
          {/* Account Summary */}
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-2xl p-5 border border-gray-700/30">
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">{t('orders.totalAssets')}</div>
                <div className="text-3xl">$0.00</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 mb-1">{t('orders.unrealizedPnl')}</div>
                  <div className="text-green-400">+0.00</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-1">{t('orders.marginLevel')}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-green-400">450.50%</div>
                    <div className="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-green-400"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'all', label: t('orders.all') },
                { id: 'pending', label: t('orders.pending') },
                { id: 'filled', label: t('orders.filled') },
                { id: 'cancelled', label: t('orders.cancelled') },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterTab(filter.id)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                    filterTab === filter.id
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/30'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Empty State */}
          <div className="px-4 flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-full flex items-center justify-center mb-4 border border-gray-700/30">
              <Clock className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">{t('orders.noOrders')}</p>
          </div>
        </>
      )}

      {/* Binary Options Tab Content */}
      {activeTab === 'binary' && (
        <>
          {/* Filter Tabs for Binary */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'all', label: t('orders.all') },
                { id: 'pending', label: t('orders.pending') },
                { id: 'profit', label: t('orders.profit') },
                { id: 'loss', label: t('orders.loss') },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterTab(filter.id)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                    filterTab === filter.id
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/30'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Binary Orders List */}
          <div className="px-4 space-y-3">
            {filteredBinaryOrders.length > 0 ? (
              filteredBinaryOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-2xl p-4 border border-gray-700/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{order.pair}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          order.type === 'Call'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {order.type === 'Call' ? t('orders.call') : t('orders.put')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">—</span>
                      <span
                        className={`text-sm ${
                          order.result === 'Win'
                            ? 'text-green-400'
                            : order.result === 'Loss'
                            ? 'text-red-400'
                            : order.result === 'Pending'
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {order.result === 'Win' 
                          ? t('orders.win') 
                          : order.result === 'Loss' 
                          ? t('orders.lossResult') 
                          : order.result === 'Pending'
                          ? t('orders.pendingText')
                          : t('orders.draw')}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">{t('orders.profitLoss')}</div>
                    <div
                      className={`text-2xl ${
                        order.pnl > 0 ? 'text-green-400' : order.pnl < 0 ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      ${order.pnl.toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('orders.betAmount')}</div>
                      <div className="text-sm">${order.betAmount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('orders.payoutRate')}</div>
                      <div className="text-sm text-green-400">{order.payoutRate}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('orders.openPrice')}</div>
                      <div className="text-sm">${order.openPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('orders.settlementPrice')}</div>
                      <div className="text-sm">
                        {order.settlementPrice > 0
                          ? `$${order.settlementPrice.toFixed(2)}`
                          : t('orders.pendingText')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{order.duration}</span>
                    <span>{order.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-full flex items-center justify-center mb-4 border border-gray-700/30">
                  <Clock className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">{t('orders.noOrdersFound')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}