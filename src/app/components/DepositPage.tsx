import { ArrowLeft, Copy, ScanLine } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function DepositPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [sourceAddress, setSourceAddress] = useState('');

  const depositAddress = 'TBcqmyMwrtTpxug750w85eEGr6cKXaGw8';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg">{t('deposit.title')}</h1>
            <p className="text-xs text-gray-500">{t('deposit.selectCurrency')}</p>
          </div>
        </div>
        <Link to="/deposit/history" className="text-sm text-[#c4f82a]">
          {t('deposit.history')}
        </Link>
      </div>

      <div className="px-4">
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

        {/* Deposit Address */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-gray-400">{t('deposit.address')}</h3>
            <button className="text-xs text-[#c4f82a] flex items-center gap-1">
              {t('deposit.scanCode')}
            </button>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-4 mb-3">
            <p className="text-sm break-all text-gray-300">{depositAddress}</p>
          </div>

          <button
            onClick={copyToClipboard}
            className="w-full bg-[#3a4a2a] text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#4a5a3a] transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>{t('deposit.copyAddress')}</span>
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-3">{t('deposit.amount')} (USDT)</h3>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('deposit.amountPlaceholder')}
            className="w-full bg-[#1a1a1a] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#c4f82a] transition-all placeholder-gray-600 text-white"
          />
        </div>

        {/* Transaction Hash */}
        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-3">{t('deposit.txHash')}</h3>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder={t('deposit.txHashPlaceholder')}
            className="w-full bg-[#1a1a1a] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#c4f82a] transition-all placeholder-gray-600 text-white"
          />
        </div>

        {/* Source Address */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-400 mb-3">{t('deposit.sourceAddress')}</h3>
          <input
            type="text"
            value={sourceAddress}
            onChange={(e) => setSourceAddress(e.target.value)}
            placeholder={t('deposit.sourceAddressPlaceholder')}
            className="w-full bg-[#1a1a1a] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#c4f82a] transition-all placeholder-gray-600 text-white"
          />
        </div>

        {/* Submit Button */}
        <button className="w-full bg-[#c4f82a] text-black py-4 rounded-xl mb-4 hover:opacity-90 transition-opacity">
          {t('deposit.submit')}
        </button>

        {/* Notice */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('deposit.minAmountNotice')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('deposit.networkNotice')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('deposit.confirmationNotice')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>{t('deposit.supportNotice')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}