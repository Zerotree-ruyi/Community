/**
 * AboutPage — 关于公司
 *  - 顶部:返回箭头 + "关于公司"
 *  - 内容:公司介绍文案
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* 顶部导航 */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/profile" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">关于公司</h1>
      </div>

      {/* 内容区 */}
      <div className="px-5 py-6">
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-6">
          <div className="text-center mb-5">
            <div className="text-xs text-gray-400">Crypto Investment Platform</div>
          </div>

          <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
{`This platform is India's most valuable crypto investment app, is dedicated to make crypto accessible in a simple way. Established in 2008, Our platform has solved numerous problems faced by the Indian crypto community with solutions around crypto investing, crypto trading & crypto literacy.`}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-gray-900/60 rounded-lg p-3 text-center border border-gray-700/40">
              <div className="text-xs text-gray-400 mb-1">成立年份</div>
              <div className="text-lg text-[#c4f82a] font-semibold">2008</div>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 text-center border border-gray-700/40">
              <div className="text-xs text-gray-400 mb-1">服务地区</div>
              <div className="text-lg text-[#c4f82a] font-semibold">India</div>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-[#c4f82a]">✓</span>
              <span className="text-gray-300">Crypto Investing 加密货币投资</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#c4f82a]">✓</span>
              <span className="text-gray-300">Crypto Trading 加密货币交易</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#c4f82a]">✓</span>
              <span className="text-gray-300">Crypto Literacy 加密货币科普</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;