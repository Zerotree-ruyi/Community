import { ArrowLeft, ExternalLink, Shield, FileCheck, Scale, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export function RegulatoryPage() {
  const { t } = useLanguage();
  
  const regulatoryInfo = [
    {
      icon: Shield,
      title: t('regulatory.license'),
      description: t('regulatory.licenseDesc'),
      details: [
        t('regulatory.detail1'),
        t('regulatory.detail2'),
        t('regulatory.detail3'),
      ]
    },
    {
      icon: FileCheck,
      title: t('regulatory.compliance'),
      description: t('regulatory.complianceDesc'),
      details: [
        t('regulatory.detail4'),
        t('regulatory.detail5'),
        t('regulatory.detail6'),
      ]
    },
    {
      icon: Scale,
      title: t('regulatory.fundSafety'),
      description: t('regulatory.fundSafetyDesc'),
      details: [
        t('regulatory.detail7'),
        t('regulatory.detail8'),
        t('regulatory.detail9'),
      ]
    },
    {
      icon: Award,
      title: t('regulatory.industryHonor'),
      description: t('regulatory.industryHonorDesc'),
      details: [
        t('regulatory.detail10'),
        t('regulatory.detail11'),
        t('regulatory.detail12'),
      ]
    }
  ];

  const newsItems = [
    {
      date: '2024-01-15',
      title: t('regulatory.newsTitle1'),
      summary: t('regulatory.newsSummary1')
    },
    {
      date: '2024-01-08',
      title: t('regulatory.newsTitle2'),
      summary: t('regulatory.newsSummary2')
    },
    {
      date: '2023-12-20',
      title: t('regulatory.newsTitle3'),
      summary: t('regulatory.newsSummary3')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a1f2e]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Link to="/">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg">{t('regulatory.title')}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl p-6 mb-6 border border-blue-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl mb-1">{t('regulatory.heroTitle')}</h2>
              <p className="text-xs text-gray-400">{t('regulatory.subtitle')}</p>
            </div>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {t('regulatory.heroDescription')}
          </p>
        </div>

        {/* Regulatory Info Cards */}
        <div className="mb-6">
          <h3 className="text-base mb-4 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#c4f82a]" />
            {t('regulatory.regulatoryInfo')}
          </h3>
          <div className="space-y-4">
            {regulatoryInfo.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-4 border border-gray-700/40"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="pl-13 space-y-1.5">
                    {item.details.map((detail, detailIdx) => (
                      <div 
                        key={detailIdx}
                        className="flex items-center gap-2 text-xs text-gray-300"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#c4f82a]"></div>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* News Section */}
        <div className="mb-6">
          <h3 className="text-base mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-[#c4f82a]" />
            {t('regulatory.latestNews')}
          </h3>
          <div className="space-y-3">
            {newsItems.map((news, idx) => (
              <div 
                key={idx}
                className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-4 border border-gray-700/40 hover:border-[#c4f82a]/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">{news.date}</span>
                  <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                  <span className="text-xs text-blue-400">{t('regulatory.news')}</span>
                </div>
                <h4 className="text-sm mb-2">{news.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {news.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Customer Service */}
        <div className="bg-gradient-to-br from-[#c4f82a]/10 to-yellow-600/10 rounded-xl p-4 border border-[#c4f82a]/30">
          <h3 className="text-sm mb-2">{t('regulatory.needHelp')}</h3>
          <p className="text-xs text-gray-400 mb-4">
            {t('regulatory.helpDesc')}
          </p>
          <a 
            href="https://google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-[#c4f82a] to-yellow-500 text-black py-3 rounded-xl flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-yellow-500 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">{t('regulatory.contactSupport')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}