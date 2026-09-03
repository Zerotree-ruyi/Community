import { ArrowLeft, Zap, BarChart3, TrendingUp, TrendingDown, PercentCircle, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export function FlashContractPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const features = [
    { icon: 'timer', title: t('flash.from30s'), subtitle: t('flash.fastTrade') },
    { icon: 'percent', title: t('flash.upto90'), subtitle: t('flash.fixedReturn') },
    { icon: 'chart', title: t('flash.easyUnderstand'), subtitle: t('flash.upDownPrediction') },
  ];

  const contracts = [
    {
      name: 'BTC/USDT',
      pair: 'BTCUSDT',
      price: '$93586.43',
      change: '-0.40%',
      positive: false,
      icon: '₿',
      color: 'bg-orange-500',
      maxReturn: '90%',
      times: [
        { duration: '30', return: '8%' },
        { duration: '60', return: '12%' },
        { duration: '90', return: '15%' },
        { duration: '120', return: '20%' },
        { duration: '200', return: '90%' },
      ]
    },
    {
      name: 'ETH/USDT',
      pair: 'ETHUSDT',
      price: '$3090.77',
      change: '-0.91%',
      positive: false,
      icon: 'Ξ',
      color: 'bg-blue-500',
      maxReturn: '90%',
      times: [
        { duration: '30', return: '8%' },
        { duration: '60', return: '12%' },
        { duration: '90', return: '15%' },
        { duration: '120', return: '20%' },
        { duration: '200', return: '90%' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#0f1419]">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#c4f82a]" />
              <h1 className="text-base font-semibold">{t('nav.flash')}</h1>
            </div>
            <p className="text-[10px] text-gray-400">{t('flash.fastTrade')} · {t('flash.fixedReturn')}</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#c4f82a] rounded-md flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" />
            </div>
            <h2 className="text-sm font-medium">{t('flash.features')}</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {features.map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center gap-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  idx === 0 ? 'bg-[#2d3436]' : idx === 1 ? 'bg-[#1a3a2e]' : 'bg-[#1e3a5f]'
                }`}>
                  {idx === 0 && (
                    <svg className="w-6 h-6 text-[#c4f82a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  )}
                  {idx === 1 && (
                    <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12" y2="16"/>
                    </svg>
                  )}
                  {idx === 2 && (
                    <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium">{feature.title}</div>
                  <div className="text-[10px] text-gray-400">{feature.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Selection */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">{t('flash.selectPair')}</h3>
          <span className="text-xs text-gray-500">7 {t('flash.pairsAvailable')}</span>
        </div>

        {/* Contracts List */}
        <div className="space-y-3">
          {contracts.map((contract, idx) => (
            <div key={idx} className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30 rounded-xl p-4">
              {/* Contract Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${contract.color} rounded-full flex items-center justify-center text-lg`}>
                    {contract.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-medium">{contract.name}</span>
                      <span className="text-[10px] text-gray-500">{contract.pair}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{contract.price}</span>
                      <span className={`text-xs flex items-center gap-0.5 ${contract.positive ? 'text-green-400' : 'text-red-400'}`}>
                        {contract.positive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {contract.change}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">{t('flash.maxReturn')}</div>
                  <div className="text-xl font-semibold text-[#c4f82a]">{contract.maxReturn}</div>
                </div>
              </div>

              {/* Time Options */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {contract.times.map((time, timeIdx) => (
                  <button
                    key={timeIdx}
                    className="py-2.5 px-2 rounded-lg bg-gray-800/40 border border-gray-700/30 text-gray-300"
                  >
                    <div className="text-[10px] text-gray-500">{time.duration}</div>
                    <div className="text-xs font-medium">{t('flash.seconds')}</div>
                    <div className="text-sm font-semibold mt-0.5">{time.return}</div>
                  </button>
                ))}
              </div>

              {/* Investment Range & Trade Button */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{t('flash.betRange')}: $100 - $10000</span>
                <button 
                  onClick={() => navigate('/flash-trading')}
                  className="bg-[#c4f82a] text-black text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <span>{t('flash.tradeNow')}</span>
                  <Zap className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}