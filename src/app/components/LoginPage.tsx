import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import loginDecoration from 'figma:asset/bd06caca71bbe78500a161706bf8396c06cd33e7.png';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const handleLogin = () => {
    // Mock login logic
    console.log('Login with:', { email, password });
    // Navigate to home after login
    navigate('/');
  };

  const handleTabSwitch = (tab: 'login' | 'register') => {
    if (tab === 'register') {
      navigate('/register');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-medium">{t('login.title')}</h1>
        <div className="w-6" /> {/* Spacer */}
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
          onClick={() => handleTabSwitch('login')}
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
          onClick={() => handleTabSwitch('register')}
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
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          {/* Email/Username Field */}
          <div className="mb-5">
            <label className="block text-sm text-gray-400 mb-2">
              {t('login.email')}
            </label>
            <div className="bg-[#2a2a2a] rounded-lg flex items-center px-4 py-3">
              <Mail className="w-5 h-5 text-gray-500 mr-3" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              {t('login.password')}
            </label>
            <div className="bg-[#2a2a2a] rounded-lg flex items-center px-4 py-3">
              <Lock className="w-5 h-5 text-gray-500 mr-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ml-2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-[#c4f82a] text-black py-3.5 rounded-lg font-semibold hover:bg-[#b5e625] transition-colors mb-4"
          >
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
    </div>
  );
}