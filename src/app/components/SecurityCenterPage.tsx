import { ArrowLeft, Lock, Key, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export function SecurityCenterPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative">
        <button onClick={() => navigate(-1)} className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg">{t('security.title')}</h1>
      </div>

      {/* Security Options */}
      <div className="px-4 mt-6 space-y-3">
        {/* 登录密码 */}
        <Link to="/security/login-password">
          <div className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222222] transition-colors">
            <div className="w-12 h-12 bg-[#3a4a2a] rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-[#c4f82a]" />
            </div>
            <div className="flex-1">
              <div className="text-base mb-1">Login Password</div>
              <div className="text-xs text-gray-500">Used to log in to your account</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </div>
        </Link>

        {/* 资金密码(原"交易密码",统一改名) */}
        <Link to="/security/trading-password">
          <div className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222222] transition-colors">
            <div className="w-12 h-12 bg-[#3a4a2a] rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-[#c4f82a]" />
            </div>
            <div className="flex-1">
              <div className="text-base mb-1">Fund Password</div>
              <div className="text-xs text-gray-500">Used for withdrawals and important operation verification</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </div>
        </Link>
      </div>
    </div>
  );
}
