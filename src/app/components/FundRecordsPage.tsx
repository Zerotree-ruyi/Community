import { ArrowLeft, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export function FundRecordsPage() {
  const { t } = useLanguage();
  // Mock data for fund records
  const records = [
    {
      id: 1,
      type: 'deposit',
      amount: '500.00',
      currency: 'USDT',
      status: 'completed',
      date: '2024-01-15 14:30',
      txId: '0x1234...5678'
    },
    {
      id: 2,
      type: 'withdraw',
      amount: '200.00',
      currency: 'USDT',
      status: 'completed',
      date: '2024-01-14 10:15',
      txId: '0xabcd...efgh'
    },
    {
      id: 3,
      type: 'deposit',
      amount: '1000.00',
      currency: 'USDT',
      status: 'pending',
      date: '2024-01-13 16:45',
      txId: '0x9876...5432'
    },
    {
      id: 4,
      type: 'withdraw',
      amount: '150.00',
      currency: 'USDT',
      status: 'completed',
      date: '2024-01-12 09:20',
      txId: '0xijkl...mnop'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/profile" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">{t('fundRecords.title')}</h1>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-4">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[#c4f82a] text-black rounded-lg text-sm">
            {t('fundRecords.all')}
          </button>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">
            {t('fundRecords.deposit')}
          </button>
          <button className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">
            {t('fundRecords.withdraw')}
          </button>
        </div>
      </div>

      {/* Records List */}
      <div className="px-4 space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    record.type === 'deposit'
                      ? 'bg-green-500/20'
                      : 'bg-red-500/20'
                  }`}
                >
                  {record.type === 'deposit' ? (
                    <TrendingDown className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm mb-1">
                    {record.type === 'deposit' ? t('fundRecords.deposit') : t('fundRecords.withdraw')}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {record.date}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-base mb-1 ${
                    record.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {record.type === 'deposit' ? '+' : '-'}
                  {record.amount} {record.currency}
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    record.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {record.status === 'completed' ? t('fundRecords.completed') : t('fundRecords.pending')}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 border-t border-gray-700 pt-2 mt-2">
              {t('fundRecords.txId')}: {record.txId}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State (if no records) */}
      {records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📋</div>
          <div className="text-base">{t('fundRecords.noRecords')}</div>
          <div className="text-sm mt-2">{t('fundRecords.recordsWillShow')}</div>
        </div>
      )}
    </div>
  );
}