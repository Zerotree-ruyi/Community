import { ArrowLeft, UserCheck, Upload, Camera, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function KYCPage() {
  const { t } = useLanguage();
  const [idType, setIdType] = useState('idcard');

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/security" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">{t('kyc.title')}</h1>
      </div>

      {/* Status Card */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 rounded-xl p-4 border border-yellow-600/50 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="text-sm mb-1">{t('kyc.status')}</div>
              <div className="text-xs text-gray-400">
                {t('kyc.statusDescription')}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-5 h-5 text-[#c4f82a]" />
            <span className="text-sm">{t('kyc.benefits')}</span>
          </div>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c4f82a]"></div>
              <span>{t('kyc.benefit1')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c4f82a]"></div>
              <span>{t('kyc.benefit2')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c4f82a]"></div>
              <span>{t('kyc.benefit3')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c4f82a]"></div>
              <span>{t('kyc.benefit4')}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* ID Type Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('kyc.idType')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIdType('idcard')}
                className={`py-3 rounded-xl border transition-all ${
                  idType === 'idcard'
                    ? 'bg-[#c4f82a]/10 border-[#c4f82a] text-[#c4f82a]'
                    : 'bg-[#1a1a1a] border-gray-700 text-gray-400'
                }`}
              >
                {t('kyc.idCard')}
              </button>
              <button
                onClick={() => setIdType('passport')}
                className={`py-3 rounded-xl border transition-all ${
                  idType === 'passport'
                    ? 'bg-[#c4f82a]/10 border-[#c4f82a] text-[#c4f82a]'
                    : 'bg-[#1a1a1a] border-gray-700 text-gray-400'
                }`}
              >
                {t('kyc.passport')}
              </button>
            </div>
          </div>

          {/* Real Name */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('kyc.realName')}</label>
            <input
              type="text"
              placeholder={t('kyc.realNamePlaceholder')}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
            />
          </div>

          {/* ID Number */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              {idType === 'idcard' ? t('kyc.idNumber') : t('kyc.passportNumber')}
            </label>
            <input
              type="text"
              placeholder={idType === 'idcard' ? t('kyc.idNumberPlaceholder') : t('kyc.passportNumberPlaceholder')}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
            />
          </div>

          {/* Upload ID Front */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              {idType === 'idcard' ? t('kyc.idFront') : t('kyc.passportPage')}
            </label>
            <div className="bg-[#1a1a1a] border border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-[#c4f82a] transition-colors">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <div className="text-sm text-gray-400 mb-1">{t('kyc.uploadImage')}</div>
              <div className="text-xs text-gray-600">{t('kyc.imageFormat')}</div>
            </div>
          </div>

          {/* Upload ID Back (only for ID card) */}
          {idType === 'idcard' && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">{t('kyc.idBack')}</label>
              <div className="bg-[#1a1a1a] border border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-[#c4f82a] transition-colors">
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <div className="text-sm text-gray-400 mb-1">{t('kyc.uploadImage')}</div>
                <div className="text-xs text-gray-600">{t('kyc.imageFormat')}</div>
              </div>
            </div>
          )}

          {/* Selfie with ID */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('kyc.selfie')}</label>
            <div className="bg-[#1a1a1a] border border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-[#c4f82a] transition-colors">
              <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <div className="text-sm text-gray-400 mb-1">{t('kyc.takePhoto')}</div>
              <div className="text-xs text-gray-600">{t('kyc.selfieDescription')}</div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button className="w-full bg-gradient-to-r from-[#c4f82a] to-green-500 text-black py-4 rounded-xl mt-6">
          {t('kyc.submit')}
        </button>

        {/* Notice */}
        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">{t('kyc.notice')}</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• {t('kyc.notice1')}</li>
            <li>• {t('kyc.notice2')}</li>
            <li>• {t('kyc.notice3')}</li>
            <li>• {t('kyc.notice4')}</li>
            <li>• {t('kyc.notice5')}</li>
            <li>• {t('kyc.notice6')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}