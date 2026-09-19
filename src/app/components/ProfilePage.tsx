import { Settings, RefreshCw, Wallet, CreditCard, TrendingUp, History, Shield, ChevronRight, LogOut, Bell, Info } from 'lucide-react';
import profileImage from 'figma:asset/24411b954e9a7d0808d3690d275bfb16d666f530.png';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';

function fmtAmt(n: number | string | undefined | null): string {
  return Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProfilePage() {
  const { t } = useLanguage();
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // 进入页面从服务器拉一次最新的余额/信用分
  // 1) 首次挂载 / user.id 变化
  // 2) 从 bfcache / 别的页面返回(`pageshow`)— 这是下单后"我的"余额更新的关键
  useEffect(() => {
    if (user?.id) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const onShow = () => { if (user?.id) refresh(); };
    window.addEventListener('pageshow', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      window.removeEventListener('pageshow', onShow);
      window.removeEventListener('focus', onShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 站内信未读数 — 30s 轮询一次,挂载 / 路由切换 / 收到消息都刷新
  const fetchUnread = useCallback(async () => {
    if (!user?.id) { setUnreadCount(0); return; }
    try {
      const r = await fetch(`/api/messages/unread?member_id=${user.id}`);
      const d = await r.json();
      if (r.ok) setUnreadCount(Number(d.unread_count) || 0);
    } catch { /* ignore */ }
  }, [user?.id]);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 30_000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  // 监听 /messages 页面回来后清零(用 visibilitychange + 焦点事件)
  useEffect(() => {
    const onFocus = () => fetchUnread();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchUnread]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const handleLogout = () => {
    if (!window.confirm(t('profile.confirmLogout') || 'Are you sure you want to log out?')) return;
    logout();                                   // 清掉 AuthContext.user + localStorage
    navigate('/login', { replace: true });      // 跳到登录页
  };

  // 信用分从 "100|1" 之类格式里取前半段
  const creditScore = (() => {
    const c = String(user?.credit ?? '0').split('|')[0];
    return c || '0';
  })();
  
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
              <h2 className="text-xl mb-1">{user?.nickname || user?.account || t('profile.notLoggedIn')}</h2>
              <p className="text-xs text-gray-400">{t('profile.uid')}: {user?.id ?? '—'}</p>
              {!user && (
                <Link
                  to="/login"
                  className="text-xs text-[#c4f82a] hover:underline mt-1 inline-block"
                >
                  {t('profile.switchAccount')}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <Link
              to="/messages"
              className="relative w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
              title={unreadCount > 0 ? `Site Messages · ${unreadCount} unread` : "Site Messages"}
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0f1419]"
                  aria-label={`Unread ${unreadCount}`}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
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
              <span className="text-sm text-gray-300">{t('profile.totalAssets')}</span>
            </div>
            <button 
              onClick={handleRefresh}
              className="hover:bg-gray-700/50 p-1 rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl">{fmtAmt(Number(user?.balance ?? 0) + Number(user?.frozen ?? 0))}</span>
            </div>
          </div>

          {/* Asset Types */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                <Wallet className="w-3 h-3" />
                {t('profile.balance')}
              </div>
              <div className="text-base">{fmtAmt(user?.balance)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                <CreditCard className="w-3 h-3" />
                {t('profile.credit')}
              </div>
              <div className="text-base">{creditScore}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {t('profile.frozen')}
              </div>
              <div className="text-base">{fmtAmt(user?.frozen)}</div>
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

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        <Link to="/my-wallets">
          <button className="w-full bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <div className="text-sm">My Wallets</div>
                <div className="text-xs text-gray-500">Bank Cards / Crypto Wallets</div>
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
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </Link>

        {/* About + Messages — compact, sharing one rounded card */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 divide-y divide-gray-700/50">
          <Link
            to="/about"
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <div className="text-sm">{t('profile.about')}</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            to="/messages"
            className="w-full p-4 flex items-center justify-between relative"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <div className="text-sm">{t('profile.messages')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-8 mb-6">
        <button
          onClick={handleLogout}
          className="w-full bg-gray-900/50 border-2 border-red-600 hover:bg-red-900/20 text-red-500 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-lg">{t('profile.logout')}</span>
        </button>

        {/* Customer Service — bottom link */}
        <a
          href="https://google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mt-4 text-center text-sm text-[#c4f82a] hover:underline"
        >
          Click Here Contact Our Online Service
        </a>
      </div>
    </div>
  );
}