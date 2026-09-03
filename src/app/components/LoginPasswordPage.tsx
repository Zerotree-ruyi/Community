import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function LoginPasswordPage() {
  const { t } = useLanguage();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/security" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">{t('loginPassword.title')}</h1>
      </div>

      {/* Form */}
      <div className="px-4 mt-6">
        <div className="space-y-4">
          {/* Old Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('loginPassword.oldPassword')}</label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                placeholder={t('loginPassword.oldPasswordPlaceholder')}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showOldPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('loginPassword.newPassword')}</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder={t('loginPassword.newPasswordPlaceholder')}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {t('loginPassword.passwordRule')}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('loginPassword.confirmPassword')}</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('loginPassword.confirmPasswordPlaceholder')}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button className="w-full bg-gradient-to-r from-[#c4f82a] to-green-500 text-black py-4 rounded-xl mt-8">
          {t('loginPassword.confirmChange')}
        </button>

        {/* Tips */}
        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">{t('loginPassword.tips')}</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• {t('loginPassword.tip1')}</li>
            <li>• {t('loginPassword.tip2')}</li>
            <li>• {t('loginPassword.tip3')}</li>
            <li>• {t('loginPassword.tip4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}