import { ArrowLeft, Globe, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { useLeverage } from '../contexts/LeverageContext';

export function SettingsPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { leverage: globalLeverage, setLeverage: setGlobalLeverage } = useLeverage();
  const [confirmOrder, setConfirmOrder] = useState(true);
  const [confirmClose, setConfirmClose] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [chartType, setChartType] = useState('area');
  const [defaultLeverage, setDefaultLeverage] = useState(globalLeverage);
  const [orderType, setOrderType] = useState('market');
  const [defaultDirection, setDefaultDirection] = useState('long');
  const [klineInterval, setKlineInterval] = useState('15m');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('3s');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // 同步全局杠杆
  useEffect(() => {
    setDefaultLeverage(globalLeverage);
  }, [globalLeverage]);

  // 当defaultLeverage改变时，更新全局杠杆
  useEffect(() => {
    setGlobalLeverage(defaultLeverage);
  }, [defaultLeverage, setGlobalLeverage]);

  const resetToDefaults = () => {
    setConfirmOrder(true);
    setConfirmClose(true);
    setShowBalance(true);
    setChartType('area');
    setDefaultLeverage('10');
    setOrderType('market');
    setDefaultDirection('long');
    setKlineInterval('15m');
    setAutoRefresh(true);
    setRefreshInterval('3s');
  };

  // Get language name
  const getLanguageName = () => {
    const names: Record<string, string> = {
      'en': 'English',
      'ja': '日本語',
      'zh-CN': '简体中文',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
      'id': 'Bahasa Indonesia',
      'es': 'Español',
      'pt': 'Português',
      'ru': 'Русский',
      'ar': 'العربية',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh-TW': '繁體中文',
    };
    return names[language] || 'English';
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Link to="/profile">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg">{t('settings.preferences')}</h1>
      </div>

      <div className="px-4">
        {/* General Settings */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-3">{t('common.settings')}</h3>
          
          {/* Language Selection */}
          <button
            onClick={() => navigate('/language')}
            className="w-full bg-[#1a1a1a] rounded-xl p-4 flex items-center gap-3 mb-3"
          >
            <div className="w-10 h-10 bg-[#3a4a2a] rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-[#c4f82a]" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm">{t('settings.language')}</div>
              <div className="text-xs text-gray-400">{getLanguageName()}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Trading Settings */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-3">{t('trading.settings')}</h3>
          <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-4">
            {/* Confirm Order */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a3a1a] rounded-full flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-[#c4f82a] rounded-sm"></div>
              </div>
              <div className="flex-1">
                <div className="text-white mb-0.5">{t('trading.confirmOrder')}</div>
                <div className="text-xs text-gray-500">{t('trading.confirmOrderDesc')}</div>
              </div>
              <button
                onClick={() => setConfirmOrder(!confirmOrder)}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  confirmOrder ? 'bg-[#c4f82a]' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-black rounded-full transition-transform ${
                    confirmOrder ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Confirm Close */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a3a1a] rounded-full flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-[#c4f82a] rounded-full"></div>
              </div>
              <div className="flex-1">
                <div className="text-white mb-0.5">{t('trading.confirmClose')}</div>
                <div className="text-xs text-gray-500">{t('trading.confirmCloseDesc')}</div>
              </div>
              <button
                onClick={() => setConfirmClose(!confirmClose)}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  confirmClose ? 'bg-[#c4f82a]' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-black rounded-full transition-transform ${
                    confirmClose ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-3">{t('trading.display')}</h3>
          <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-4">
            {/* Show Balance */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3a3a1a] rounded-full flex items-center justify-center">
                <div className="w-4 h-3 border-2 border-[#c4f82a] rounded-sm relative">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1 bg-[#c4f82a]"></div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-white mb-0.5">{t('trading.showBalance')}</div>
                <div className="text-xs text-gray-500">{t('trading.showBalanceDesc')}</div>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  showBalance ? 'bg-[#c4f82a]' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-black rounded-full transition-transform ${
                    showBalance ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Default Chart */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#3a2a3a] rounded-full flex items-center justify-center">
                  <div className="text-[#c4f82a] text-xl">⚡</div>
                </div>
                <div className="flex-1">
                  <div className="text-white mb-0.5">{t('trading.defaultChart')}</div>
                  <div className="text-xs text-gray-500">{t('trading.defaultChartDesc')}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 ml-[52px]">
                <button
                  onClick={() => setChartType('candle')}
                  className={`py-2 rounded-lg transition-all ${
                    chartType === 'candle'
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-[#2a2a2a] text-gray-400'
                  }`}
                >
                  {t('trading.candleChart')}
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`py-2 rounded-lg transition-all ${
                    chartType === 'line'
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-[#2a2a2a] text-gray-400'
                  }`}
                >
                  {t('trading.lineChart')}
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`py-2 rounded-lg transition-all ${
                    chartType === 'area'
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-[#2a2a2a] text-gray-400'
                  }`}
                >
                  {t('trading.areaChart')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Page Settings */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-3">{t('trading.tradingPage')}</h3>
          <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-4">
            {/* Default Leverage */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1a2a3a] rounded-full flex items-center justify-center">
                  <div className="text-[#c4f82a] text-xl">📊</div>
                </div>
                <div className="flex-1">
                  <div className="text-white mb-0.5">{t('trading.leverage')}</div>
                  <div className="text-xs text-gray-500">{t('trading.defaultLeverageDesc')}</div>
                </div>
              </div>
              <div className="flex gap-2 ml-[52px]">
                {['5', '10', '20', '50', '100'].map((lev) => (
                  <button
                    key={lev}
                    onClick={() => setDefaultLeverage(lev)}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      defaultLeverage === lev
                        ? 'bg-[#c4f82a] text-black'
                        : 'bg-[#2a2a2a] text-gray-400'
                    }`}
                  >
                    {lev}X
                  </button>
                ))}
              </div>
            </div>

            {/* Default Order Type */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1a3a2a] rounded-full flex items-center justify-center">
                  <div className="text-[#c4f82a] text-xl">📄</div>
                </div>
                <div className="flex-1">
                  <div className="text-white mb-0.5">{t('trading.orderType')}</div>
                  <div className="text-xs text-gray-500">{t('trading.defaultOrderTypeDesc')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-[52px]">
                <button
                  onClick={() => setOrderType('market')}
                  className={`py-2.5 rounded-lg transition-all ${
                    orderType === 'market'
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-[#2a2a2a] text-gray-400'
                  }`}
                >
                  {t('trading.market')}
                </button>
                <button
                  onClick={() => setOrderType('limit')}
                  className={`py-2.5 rounded-lg transition-all ${
                    orderType === 'limit'
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-[#2a2a2a] text-gray-400'
                  }`}
                >
                  {t('trading.limit')}
                </button>
              </div>
            </div>

            {/* Default Direction */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1a2a3a] rounded-full flex items-center justify-center">
                  <div className="text-[#c4f82a] text-xl">📈</div>
                </div>
                <div className="flex-1">
                  <div className="text-white mb-0.5">{t('trading.direction')}</div>
                  <div className="text-xs text-gray-500">{t('trading.defaultDirectionDesc')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-[52px]">
                <button
                  onClick={() => setDefaultDirection('long')}
                  className={`py-2.5 rounded-lg transition-all ${
                    defaultDirection === 'long'
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-[#2a2a2a] text-gray-400'
                  }`}
                >
                  {t('trading.long')}
                </button>
                <button
                  onClick={() => setDefaultDirection('short')}
                  className={`py-2.5 rounded-lg transition-all ${
                    defaultDirection === 'short'
                      ? 'bg-[#c4f82a] text-black'
                      : 'bg-[#2a2a2a] text-gray-400'
                  }`}
                >
                  {t('trading.short')}
                </button>
              </div>
            </div>

            {/* Default K-line Interval */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#2a1a3a] rounded-full flex items-center justify-center">
                  <div className="text-[#c4f82a] text-xl">⏱️</div>
                </div>
                <div className="flex-1">
                  <div className="text-white mb-0.5">{t('trading.klineInterval')}</div>
                  <div className="text-xs text-gray-500">{t('trading.defaultKlineIntervalDesc')}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 ml-[52px]">
                {['1m', '5m', '15m', '1h'].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setKlineInterval(interval)}
                    className={`py-2 rounded-lg transition-all ${
                      klineInterval === interval
                        ? 'bg-[#c4f82a] text-black'
                        : 'bg-[#2a2a2a] text-gray-400'
                    }`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 ml-[52px] mt-2">
                {['4h', '1d'].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setKlineInterval(interval)}
                    className={`py-2 rounded-lg transition-all ${
                      klineInterval === interval
                        ? 'bg-[#c4f82a] text-black'
                        : 'bg-[#2a2a2a] text-gray-400'
                    }`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Holdings Page Settings */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-3">{t('trading.holdingsPage')}</h3>
          <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-4">
            {/* Auto Refresh */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a2a3a] rounded-full flex items-center justify-center">
                <div className="text-[#c4f82a] text-xl">🔄</div>
              </div>
              <div className="flex-1">
                <div className="text-white mb-0.5">{t('trading.autoRefresh')}</div>
                <div className="text-xs text-gray-500">{t('trading.autoRefreshDesc')}</div>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  autoRefresh ? 'bg-[#c4f82a]' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-black rounded-full transition-transform ${
                    autoRefresh ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Refresh Interval */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1a3a3a] rounded-full flex items-center justify-center">
                  <div className="text-[#c4f82a] text-xl">⏲️</div>
                </div>
                <div className="flex-1">
                  <div className="text-white mb-0.5">{t('trading.refreshInterval')}</div>
                  <div className="text-xs text-gray-500">{t('trading.refreshIntervalDesc')}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 ml-[52px]">
                {['1s', '3s', '5s', '10s'].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setRefreshInterval(interval)}
                    className={`py-2 rounded-lg transition-all ${
                      refreshInterval === interval
                        ? 'bg-[#c4f82a] text-black'
                        : 'bg-[#2a2a2a] text-gray-400'
                    }`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetToDefaults}
          className="w-full bg-red-900/30 text-red-400 py-4 rounded-xl border border-red-900/50 hover:bg-red-900/40 transition-colors mb-6"
        >
          {t('trading.resetDefaults')}
        </button>
      </div>

      {/* Language Selector */}
      {showLanguageSelector && (
        <LanguageSelector
          onClose={() => setShowLanguageSelector(false)}
        />
      )}
    </div>
  );
}