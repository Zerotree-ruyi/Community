import { ArrowLeft, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function WithdrawPage() {
  const { t } = useLanguage();
  const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link to="/profile">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-lg">{t('withdraw.title')}</h1>
            <p className="text-xs text-gray-500">{t('deposit.selectCurrency')}</p>
          </div>
        </div>
        <Link to="/withdraw/history" className="text-sm text-[#c4f82a]">
          {t('withdraw.history')}
        </Link>
      </div>

      <div className="px-4">
        {/* Available Balance */}
        <div className="mb-6 bg-gradient-to-br from-[#3a4a3a] via-[#2a3a2a] to-[#1a2a1a] rounded-2xl p-5 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">{t('withdraw.available')}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl">0.00</span>
            <span className="text-lg text-gray-300">USDT</span>
          </div>
        </div>

        {/* Network Selection */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-400 mb-3">{t('deposit.selectNetwork')}</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedNetwork('TRC20')}
              className={`flex-1 py-3 rounded-xl transition-all ${
                selectedNetwork === 'TRC20'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              TRC20
            </button>
            <button
              onClick={() => setSelectedNetwork('ERC20')}
              className={`flex-1 py-3 rounded-xl transition-all ${
                selectedNetwork === 'ERC20'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              ERC20
            </button>
            <button
              onClick={() => setSelectedNetwork('BEP20')}
              className={`flex-1 py-3 rounded-xl transition-all ${
                selectedNetwork === 'BEP20'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              BEP20
            </button>
          </div>
        </div>

        {/* Withdraw Address */}
        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-3">{t('withdraw.address')}</h3>
          <input
            type="text"
            value={withdrawAddress}
            onChange={(e) => setWithdrawAddress(e.target.value)}
            placeholder={t('withdraw.addressPlaceholder')}
            className="w-full bg-[#1a1a1a] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#c4f82a] transition-all placeholder-gray-600 text-white"
          />
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-gray-400">{t('withdraw.amount')} (USDT)</h3>
            <button 
              onClick={() => setAmount('0.00')}
              className="text-xs text-[#c4f82a]"
            >
              {t('withdraw.all')}
            </button>
          </div>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('withdraw.amountPlaceholder')}
            className="w-full bg-[#1a1a1a] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#c4f82a] transition-all placeholder-gray-600 text-white"
          />
        </div>

        {/* Fee Info */}
        <div className="mb-6 bg-[#1a1a1a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">{t('withdraw.fee')}</span>
            <span className="text-sm">1 USDT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{t('withdraw.receive')}</span>
            <span className="text-sm text-[#c4f82a]">
              {amount ? (parseFloat(amount) - 1).toFixed(2) : '0.00'} USDT
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button className="w-full bg-[#c4f82a] text-black py-4 rounded-xl mb-4 hover:opacity-90 transition-opacity">
          {t('withdraw.submit')}
        </button>

        {/* Notice */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('withdraw.minAmountNotice')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('withdraw.dailyLimitNotice')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('withdraw.processingNotice')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('withdraw.addressNotice')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('withdraw.supportNotice')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}