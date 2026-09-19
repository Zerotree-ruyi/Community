/**
 * AboutPage — About the Company
 *  - Top: back arrow + "About the Company"
 *  - Content: company introduction copy
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Top navigation */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/profile" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">About Us</h1>
      </div>

      {/* Content area */}
      <div className="px-5 py-6">
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-6">
          <div className="text-center mb-5">
            <div className="text-xs text-gray-400">Crypto Investment Platform</div>
          </div>

          <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
{`This platform is a global crypto investment app, dedicated to making crypto accessible in a simple way. Established in 2008, our platform has served users worldwide with solutions around crypto investing, crypto trading & crypto literacy.`}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-gray-900/60 rounded-lg p-3 text-center border border-gray-700/40">
              <div className="text-xs text-gray-400 mb-1">Established</div>
              <div className="text-lg text-[#c4f82a] font-semibold">2008</div>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 text-center border border-gray-700/40">
              <div className="text-xs text-gray-400 mb-1">Service Region</div>
              <div className="text-lg text-[#c4f82a] font-semibold">Global</div>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-[#c4f82a]">✓</span>
              <span className="text-gray-300">Crypto Investing</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#c4f82a]">✓</span>
              <span className="text-gray-300">Crypto Trading</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#c4f82a]">✓</span>
              <span className="text-gray-300">Crypto Literacy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;