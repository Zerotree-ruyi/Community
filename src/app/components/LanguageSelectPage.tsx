import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, Language } from '../contexts/LanguageContext';

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh-CN', name: 'Chinese Simplified', nativeName: '简体中文' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh-TW', name: 'Chinese Traditional', nativeName: '繁體中文' },
];

export function LanguageSelectPage() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setTimeout(() => navigate(-1), 300);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header */}
      <div className="bg-[#1a1f2e] p-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-medium">{t('language.title')}</h1>
      </div>

      {/* Language List */}
      <div className="p-4">
        <div className="space-y-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full bg-[#1a1f2e] rounded-xl p-4 flex items-center justify-between hover:bg-[#252a3a] transition-colors ${
                language === lang.code ? 'border-2 border-[#c4f82a]' : 'border border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-sm text-gray-400">{lang.name}</div>
                </div>
              </div>
              {language === lang.code && (
                <Check className="w-5 h-5 text-[#c4f82a]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
