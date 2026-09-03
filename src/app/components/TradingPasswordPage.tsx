import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function TradingPasswordPage() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false); // Mock state

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/security" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">{hasPassword ? t('tradingPassword.title') : t('tradingPassword.setTitle')}</h1>
      </div>

      {/* Info Card */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-[#3a4a2a] to-[#2a3a2a] rounded-xl p-4 border border-[#c4f82a]/30 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-[#c4f82a]" />
            <span className="text-sm">{t('tradingPassword.about')}</span>
          </div>
          <div className="text-xs text-gray-400">
            {t('tradingPassword.description')}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Current Password (only if has password) */}
          {hasPassword && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">{t('tradingPassword.currentPassword')}</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder={t('tradingPassword.currentPasswordPlaceholder')}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
                />
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              {hasPassword ? t('tradingPassword.newPassword') : t('tradingPassword.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('tradingPassword.passwordPlaceholder')}
                maxLength={6}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('tradingPassword.confirmPassword')}</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('tradingPassword.confirmPasswordPlaceholder')}
                maxLength={6}
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
          {hasPassword ? t('tradingPassword.confirmChange') : t('tradingPassword.confirmSet')}
        </button>

        {/* Tips */}
        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">{t('tradingPassword.securityTips')}</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• {t('tradingPassword.tip1')}</li>
            <li>• {t('tradingPassword.tip2')}</li>
            <li>• {t('tradingPassword.tip3')}</li>
            <li>• {t('tradingPassword.tip4')}</li>
            <li>• {t('tradingPassword.tip5')}</li>
          </ul>
        </div>

        {/* Forgot Password Link */}
        {hasPassword && (
          <div className="text-center mt-6">
            <button className="text-sm text-[#c4f82a]">
              {t('tradingPassword.forgot')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}