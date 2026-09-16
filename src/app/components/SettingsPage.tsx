import { ArrowLeft, Globe, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export function SettingsPage() {
  const { t, language } = useLanguage();

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
        {/* Language Selection */}
        <div className="mb-6">
          <Link
            to="/language"
            className="w-full bg-[#1a1a1a] rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-[#3a4a2a] rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-[#c4f82a]" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm">{t('settings.language')}</div>
              <div className="text-xs text-gray-400">{getLanguageName()}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>
        </div>
      </div>
    </div>
  );
}