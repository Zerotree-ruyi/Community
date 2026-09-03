import { ChevronLeft, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function WithdrawHistoryPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  // Mock withdraw history data
  const withdrawals = [
    {
      id: 1,
      amount: '500.00',
      currency: 'USDT',
      method: 'TRC20',
      status: 'completed',
      time: '2024-01-05 14:20:15',
      address: 'TXh3...8sK9',
      fee: '1.00',
    },
    {
      id: 2,
      amount: '1000.00',
      currency: 'USDT',
      method: 'ERC20',
      status: 'pending',
      time: '2024-01-04 18:45:30',
      address: '0x1234...5678',
      fee: '1.00',
    },
    {
      id: 3,
      amount: '300.00',
      currency: 'USDT',
      method: 'TRC20',
      status: 'completed',
      time: '2024-01-03 11:10:00',
      address: 'TYh8...3jL2',
      fee: '1.00',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('deposit.completed');
      case 'pending':
        return t('deposit.pending');
      case 'failed':
        return t('deposit.failed');
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1419]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Link to="/withdraw" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg">{t('withdraw.history')}</h1>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        <button
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
            activeTab === 'all' ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          {t('orders.all')}
        </button>
        <button
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
            activeTab === 'completed' ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          {t('deposit.completed')}
        </button>
        <button
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
            activeTab === 'pending' ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          {t('deposit.pending')}
        </button>
        <button
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
            activeTab === 'failed' ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('failed')}
        >
          {t('deposit.failed')}
        </button>
      </div>

      {/* History List */}
      <div className="px-4 space-y-3">
        {withdrawals.length > 0 ? (
          withdrawals
            .filter((withdrawal) => {
              if (activeTab === 'all') return true;
              return withdrawal.status === activeTab;
            })
            .map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg text-red-400">-{withdrawal.amount}</span>
                      <span className="text-sm text-gray-400">{withdrawal.currency}</span>
                    </div>
                    <div className="text-xs text-gray-400">{withdrawal.method}</div>
                  </div>
                  <div className={`text-sm ${getStatusColor(withdrawal.status)}`}>
                    {getStatusText(withdrawal.status)}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('orders.time')}</span>
                    <span className="text-gray-300">{withdrawal.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('withdraw.address')}</span>
                    <span className="text-gray-300 font-mono">{withdrawal.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('withdraw.fee')}</span>
                    <span className="text-gray-300">{withdrawal.fee} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('withdraw.receive')}</span>
                    <span className="text-green-400">
                      {(parseFloat(withdrawal.amount) - parseFloat(withdrawal.fee)).toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-2">No withdrawal records</div>
            <div className="text-sm text-gray-500">You haven't made any withdrawals yet</div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-3">Statistics</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Withdrawals</div>
              <div className="text-lg">{withdrawals.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Amount</div>
              <div className="text-lg text-red-400">
                {withdrawals
                  .filter((w) => w.status === 'completed')
                  .reduce((sum, w) => sum + parseFloat(w.amount), 0)
                  .toFixed(2)}{' '}
                USDT
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
