import { ArrowLeft, Lock, Key, UserCheck, ChevronRight, Info } from 'lucide-react';
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
        {/* Change Login Password */}
        <Link to="/security/login-password">
          <div className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222222] transition-colors">
            <div className="w-12 h-12 bg-[#3a4a2a] rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-[#c4f82a]" />
            </div>
            <div className="flex-1">
              <div className="text-base mb-1">{t('security.loginPassword')}</div>
              <div className="text-xs text-gray-500">Change Login Password</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </div>
        </Link>

        {/* Trading Password */}
        <Link to="/security/trading-password">
          <div className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222222] transition-colors">
            <div className="w-12 h-12 bg-[#3a4a2a] rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-[#c4f82a]" />
            </div>
            <div className="flex-1">
              <div className="text-base mb-1">{t('security.tradingPassword')}</div>
              <div className="text-xs text-gray-500">{t('security.tradingPasswordDesc')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </div>
        </Link>

        {/* KYC Verification */}
        <Link to="/security/kyc">
          <div className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222222] transition-colors">
            <div className="w-12 h-12 bg-[#3a4a2a] rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-[#c4f82a]" />
            </div>
            <div className="flex-1">
              <div className="text-base mb-1 flex items-center gap-2">
                {t('security.kyc')}
                <div className="flex items-center gap-1">
                  <Info className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">{t('security.notSet')}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">{t('security.kycDesc')}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </div>
        </Link>
      </div>
    </div>
  );
}