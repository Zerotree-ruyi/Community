import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export function DepositPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      {/* 返回按钮 — 左上角 */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#262626] transition-colors"
        aria-label="返回"
      >
        <ArrowLeft className="w-5 h-5 text-gray-300" />
      </button>

      {/* 弹窗卡片 */}
      <div
        className="w-full max-w-sm bg-[#161616] border border-[#2a2a2a] rounded-2xl p-7 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* 头部:图标 + 标题 */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-[#c4f82a]/15 border border-[#c4f82a]/40 flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-[#c4f82a]" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">
            {t('deposit.noticeTitle') || '充值提示'}
          </h2>
          <div className="w-12 h-0.5 bg-[#c4f82a] rounded-full" />
        </div>

        {/* 文案 */}
        <p className="text-sm text-gray-300 leading-relaxed mb-6 text-center whitespace-pre-line">
          {t('deposit.noticeBody') ||
            `Hello, Please contact teacher to get the latest channels for recharging.
Thank you for your support and trust.
Please return to the previous page.`}
        </p>

        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-[#c4f82a] text-black py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('deposit.backToPrev') || '返回上一页'}</span>
        </button>
      </div>
    </div>
  );
}