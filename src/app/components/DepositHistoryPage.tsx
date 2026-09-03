import { ChevronLeft, Search, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function DepositHistoryPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  // Mock deposit history data
  const deposits = [
    {
      id: 1,
      amount: '1000.00',
      currency: 'USDT',
      method: 'TRC20',
      status: 'completed',
      time: '2024-01-05 10:30:25',
      txHash: '0x1234...5678',
    },
    {
      id: 2,
      amount: '500.00',
      currency: 'USDT',
      method: 'ERC20',
      status: 'pending',
      time: '2024-01-04 15:20:10',
      txHash: '0xabcd...efgh',
    },
    {
      id: 3,
      amount: '2000.00',
      currency: 'USDT',
      method: 'TRC20',
      status: 'completed',
      time: '2024-01-03 08:15:30',
      txHash: '0x9876...5432',
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
        return t('depositHistory.completed');
      case 'pending':
        return t('depositHistory.pending');
      case 'failed':
        return t('depositHistory.failed');
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1419]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Link to="/deposit" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg">{t('depositHistory.title')}</h1>
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
          {t('depositHistory.all')}
        </button>
        <button
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
            activeTab === 'completed' ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          {t('depositHistory.completed')}
        </button>
        <button
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
            activeTab === 'pending' ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          {t('depositHistory.pending')}
        </button>
        <button
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm ${
            activeTab === 'failed' ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('failed')}
        >
          {t('depositHistory.failed')}
        </button>
      </div>

      {/* History List */}
      <div className="px-4 space-y-3">
        {deposits.length > 0 ? (
          deposits
            .filter((deposit) => {
              if (activeTab === 'all') return true;
              return deposit.status === activeTab;
            })
            .map((deposit) => (
              <div
                key={deposit.id}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">+{deposit.amount}</span>
                      <span className="text-sm text-gray-400">{deposit.currency}</span>
                    </div>
                    <div className="text-xs text-gray-400">{deposit.method}</div>
                  </div>
                  <div className={`text-sm ${getStatusColor(deposit.status)}`}>
                    {getStatusText(deposit.status)}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('depositHistory.time')}</span>
                    <span className="text-gray-300">{deposit.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('depositHistory.txHash')}</span>
                    <span className="text-gray-300 font-mono">{deposit.txHash}</span>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-2">{t('depositHistory.noRecords')}</div>
            <div className="text-sm text-gray-500">{t('depositHistory.noDeposit')}</div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-3">{t('depositHistory.statistics')}</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">{t('depositHistory.totalCount')}</div>
              <div className="text-lg">{deposits.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">{t('depositHistory.totalAmount')}</div>
              <div className="text-lg text-[#c4f82a]">
                {deposits
                  .filter((d) => d.status === 'completed')
                  .reduce((sum, d) => sum + parseFloat(d.amount), 0)
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