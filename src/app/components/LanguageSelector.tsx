import { X, Check, Globe } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
  onClose: () => void;
}

export function LanguageSelector({ onClose }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'ja', name: '日本語', nativeName: 'Japanese', flag: '🇯🇵' },
    { code: 'zh-CN', name: '简体中文', nativeName: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'th', name: 'ไทย', nativeName: 'Thai', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', nativeName: 'Vietnamese', flag: '🇻🇳' },
    { code: 'id', name: 'Bahasa Indonesia', nativeName: 'Indonesian', flag: '🇮🇩' },
    { code: 'es', name: 'Español', nativeName: 'Spanish', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', nativeName: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', nativeName: 'Russian', flag: '🇷🇺' },
    { code: 'ar', name: 'العربية', nativeName: 'Arabic', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', nativeName: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', nativeName: 'German', flag: '🇩🇪' },
    { code: 'zh-TW', name: '繁體中文', nativeName: 'Chinese (Traditional)', flag: '🇹🇼' },
  ];

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    // Close the modal after a brief delay to show the selection
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3a4a2a] rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-[#c4f82a]" />
            </div>
            <div>
              <h2 className="text-lg text-white">语言</h2>
              <p className="text-xs text-gray-500">13 Languages Available</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center hover:bg-[#3a3a3a] transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Language List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full flex items-center gap-3 p-4 transition-colors ${
                language === lang.code 
                  ? 'bg-[#3a4a2a]' 
                  : 'bg-transparent hover:bg-[#252525]'
              }`}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-2xl bg-[#2a2a2a]">
                {lang.flag}
              </div>
              <div className="flex-1 text-left">
                <div className="text-white">{lang.name}</div>
                <div className="text-xs text-gray-500">{lang.nativeName}</div>
              </div>
              {language === lang.code && (
                <Check className="w-5 h-5 text-[#c4f82a]" />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-600">
            更多语言即将到来中 · More languages coming soon
          </p>
        </div>
      </div>
    </div>
  );
}