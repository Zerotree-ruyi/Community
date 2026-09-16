import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSelector } from './LanguageSelector';
import loginDecoration from 'figma:asset/bd06caca71bbe78500a161706bf8396c06cd33e7.png';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, loading, error, clearError, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  // 被后台强制下线时,从 sessionStorage 拿一条提示,挂在表单顶部
  const [kickMsg, setKickMsg] = useState<string | null>(() => {
    try {
      const m = sessionStorage.getItem('exchange_kicked_msg');
      if (m) sessionStorage.removeItem('exchange_kicked_msg');
      return m;
    } catch { return null; }
  });

  // 已登录直接跳走
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // 切换 tab / 输入时清掉错误
  useEffect(() => () => clearError(), [clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !password || loading) return;
    const ok = await login(account, password);
    if (ok) navigate('/');
  };

  const errorMsg = error
    ? error === 'wrong_password' || error === 'not_found' || error === 'invalid_credentials'
      ? t('auth.errors.invalidCredentials')
      : error === 'account_disabled'
        ? t('auth.errors.accountDisabled')
        : error === 'invalid_input'
          ? t('auth.errors.invalidInput')
          : t('auth.errors.network')
    : null;

  const canSubmit = !!account && !!password && !loading;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Header — 登录页无返回键(第一次进应用就在这里) */}
      <div className="flex items-center justify-center p-4 relative">
        <h1 className="text-lg font-medium">{t('login.title')}</h1>
        <button
          onClick={() => setShowLanguageSelector(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
          aria-label="Change language"
        >
          <Globe className="w-4 h-4" />
        </button>
      </div>

      {/* Welcome Section with Decoration */}
      <div className="relative px-6 pt-4 pb-8">
        <img
          src={loginDecoration}
          alt="Welcome decoration"
          className="absolute right-0 top-0 w-64 h-40 object-contain opacity-90"
        />
        <div className="relative z-10">
          <h2 className="text-2xl font-medium mb-1">{t('login.welcome')}</h2>
          <p className="text-gray-400">{t('login.subtitle')}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-800 px-6">
        <button
          onClick={() => setActiveTab('login')}
          className={`flex-1 pb-3 relative ${
            activeTab === 'login' ? 'text-white' : 'text-gray-500'
          }`}
        >
          <span className="font-medium">{t('login.login')}</span>
          {activeTab === 'login' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c4f82a]" />
          )}
        </button>
        <button
          onClick={() => navigate('/register')}
          className={`flex-1 pb-3 relative ${
            activeTab === 'register' ? 'text-white' : 'text-gray-500'
          }`}
        >
          <span className="font-medium">{t('login.register')}</span>
          {activeTab === 'register' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c4f82a]" />
          )}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-6">
        <form onSubmit={handleLogin}>
          {/* Account Field */}
          <div className="mb-5">
            <label className="block text-sm text-gray-400 mb-2">
              {t('login.email')}
            </label>
            <div className="flex items-center border-b border-gray-700 focus-within:border-[#c4f82a] py-3 transition-colors">
              <Mail className="w-5 h-5 text-gray-500 mr-3" />
              <input
                type="text"
                value={account}
                onChange={(e) => { setAccount(e.target.value); if (error) clearError(); }}
                placeholder={t('login.emailPlaceholder')}
                autoComplete="username"
                disabled={loading}
                className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              {t('login.password')}
            </label>
            <div className="flex items-center border-b border-gray-700 focus-within:border-[#c4f82a] py-3 transition-colors">
              <Lock className="w-5 h-5 text-gray-500 mr-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) clearError(); }}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                disabled={loading}
                className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ml-2"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {kickMsg && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm rounded-lg px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{kickMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-[#c4f82a] text-black py-3.5 rounded-lg font-semibold hover:bg-[#b5e625] transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('login.loginButton')}
          </button>

          {/* Terms */}
          <p className="text-center text-xs text-gray-500">
            {t('login.terms')}{' '}
            <Link to="/regulatory" className="text-blue-400">
              {t('login.termsOfService')}
            </Link>
          </p>
        </form>
      </div>

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <LanguageSelector onClose={() => setShowLanguageSelector(false)} />
      )}
    </div>
  );
}
