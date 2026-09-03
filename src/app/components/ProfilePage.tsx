import { Headphones, ScanLine, Settings, RefreshCw, Wallet, CreditCard, TrendingUp, History, Shield, ChevronRight, Menu, LogOut } from 'lucide-react';
import profileImage from 'figma:asset/24411b954e9a7d0808d3690d275bfb16d666f530.png';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';

export function ProfilePage() {
  const { t } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 模拟刷新余额数据的延迟
    setTimeout(() => {
      setIsRefreshing(false);
      // 这里可以添加实际的余额数据刷新逻辑
      // 例如：fetchBalanceData()
    }, 500);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative pb-2">
              <div className="w-16 h-16 rounded-full border-2 border-[#c4f82a] p-0.5">
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-2xl">
                  👤
                </div>
              </div>
              <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 bg-gray-800 text-[#c4f82a] text-[10px] px-2 py-0.5 rounded-full border border-[#c4f82a] whitespace-nowrap">
                {t('profile.vip')}&nbsp;0
              </div>
            </div>
            <div>
              <h2 className="text-xl mb-1">aa112233</h2>
              <p className="text-xs text-gray-400">{t('profile.uid')}: 54</p>
              <Link 
                to="/login" 
                className="text-xs text-[#c4f82a] hover:underline mt-1 inline-block"
              >
                {t('profile.switchAccount')}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <a 
              href="https://google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <Headphones className="w-5 h-5 text-gray-300" />
            </a>
            <button className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-gray-300" />
            </button>
            <Link to="/settings" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-300" />
            </Link>
          </div>
        </div>

        {/* Bitcoin Logo */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-30 pointer-events-none">
          <img 
            src={profileImage} 
            alt="Bitcoin" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Total Assets Card */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-[#3a4a3a] via-[#2a3a2a] to-[#1a2a1a] rounded-2xl p-5 relative overflow-hidden border border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#c4f82a] rounded-full"></div>
              <span className="text-sm text-gray-300">TOTAL ASSETS</span>
            </div>
            <button 
              onClick={handleRefresh}
              className="hover:bg-gray-700/50 p-1 rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl">0.00</span>
              <span className="text-xl text-gray-300">USDT</span>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-xs">
              <Wallet className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">0</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span>+0</span>
            </div>
          </div>

          {/* Asset Types */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                <Wallet className="w-3 h-3" />
                {t('profile.balance')}
              </div>
              <div className="text-base">0.00</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                <CreditCard className="w-3 h-3" />
                {t('profile.credit')}
              </div>
              <div className="text-base">0.00</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {t('profile.equity')}
              </div>
              <div className="text-base">0.00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/deposit" className="bg-gradient-to-r from-[#c4f82a] to-green-500 text-black py-3 rounded-xl flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5" />
            <span>{t('profile.deposit')}</span>
          </Link>
          <Link to="/withdraw" className="bg-gradient-to-r from-gray-700 to-gray-800 text-white py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-600">
            <TrendingUp className="w-5 h-5" />
            <span>{t('profile.withdraw')}</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-2">{t('profile.winRate')}</div>
            <div className="text-xl text-green-400">0.0%</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-2">{t('profile.trades')}</div>
            <div className="text-xl">0</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-2">{t('profile.balance')}</div>
            <div className="text-xl text-yellow-500">$0</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        <Link to="/deposit">
          <button className="w-full bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <div className="text-sm">{t('profile.deposit')}</div>
                <div className="text-xs text-gray-400">Deposit</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </Link>

        <Link to="/fund-records">
          <button className="w-full bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <div className="text-sm">{t('profile.fundRecords')}</div>
                <div className="text-xs text-gray-400">View All</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </Link>

        <Link to="/security">
          <button className="w-full bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <div className="text-sm">{t('profile.security')}</div>
                <div className="text-xs text-gray-400">High Strength</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </Link>

        <Link to="/settings">
          <button className="w-full bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <div className="text-sm">{t('profile.settings')}</div>
                <div className="text-xs text-gray-400">Settings</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </Link>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-8 mb-6">
        <button
          onClick={() => {
            // Handle logout logic here
            if (window.confirm(t('profile.confirmLogout'))) {
              // Perform logout
              window.location.href = '/';
            }
          }}
          className="w-full bg-gray-900/50 border-2 border-red-600 hover:bg-red-900/20 text-red-500 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-lg">{t('profile.logout')}</span>
        </button>
      </div>
    </div>
  );
}