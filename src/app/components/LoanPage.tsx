import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Temporary fallback loan translations
const loanFallback: Record<string, any> = {
  en: {
    title: 'Loan', hot: 'HOT', creditLimit: 'Credit Limit', score: 'Score',
    totalLimit: 'Total Limit', used: 'Used', available: 'Available',
    applyLoan: 'Apply Loan', myLoans: 'My Loans', loanAmount: 'Loan Amount',
    range: 'Range', loanPeriod: 'Loan Period', days: ' days', applyNow: 'Apply Now',
    riskWarning: 'Risk Warning', 
    riskText: 'Loan function should be used carefully. Overdue fees will be incurred. Please repay on time to avoid affecting credit score',
    overdueRate: 'Overdue rate', perDay: '/day', noRecords: 'No loan records',
    loanNow: 'Loan Now', status: 'Status', active: 'Active', overdue: 'Overdue',
    settled: 'Settled', dueDate: 'Due Date',
  },
  ja: {
    title: 'ローン', hot: 'HOT', creditLimit: '信用限度', score: 'スコア',
    totalLimit: '総額', used: '使用済み', available: '利用可能',
    applyLoan: 'ローン申請', myLoans: 'マイローン', loanAmount: 'ローン金額',
    range: '範囲', loanPeriod: 'ローン期間', days: '日', applyNow: '今すぐ申し込む',
    riskWarning: 'リスク警告',
    riskText: 'ローン機能は慎重に使用してください。延滞料金が発生します。信用スコアに影響を与えないよう、期日通りに返済してください',
    overdueRate: '延滞利率', perDay: '/日', noRecords: 'ローン記録なし',
    loanNow: '今すぐローン', status: 'ステータス', active: '進行中', overdue: '延滞',
    settled: '返済済み', dueDate: '返済期日',
  },
  'zh-CN': {
    title: '借贷', hot: 'HOT', creditLimit: '信用额度', score: '评分',
    totalLimit: '总额度', used: '已使用', available: '可用',
    applyLoan: '申请借款', myLoans: '我的借款', loanAmount: '借款金额',
    range: '范围', loanPeriod: '借款期限', days: '天', applyNow: '立即申请',
    riskWarning: '风险提示',
    riskText: '借贷功能请谨慎，逾期将产生费用，请按期还款，避免逾期影响信用评分',
    overdueRate: '逾期日至', perDay: '/天', noRecords: '暂无借款记录',
    loanNow: '立即借款', status: '状态', active: '进行中', overdue: '已逾期',
    settled: '已还清', dueDate: '到期日',
  },
  th: {
    title: 'เงินกู้', hot: 'HOT', creditLimit: 'วงเงินสินเชื่อ', score: 'คะแนน',
    totalLimit: 'วงเงินรวม', used: 'ใช้ไปแล้ว', available: 'ที่ใช้ได้',
    applyLoan: 'สมัครกู้ยืม', myLoans: 'เงินกู้ของฉัน', loanAmount: 'จำนวนเงินกู้',
    range: 'ช่วง', loanPeriod: 'ระยะเวลากู้', days: ' วัน', applyNow: 'สมัครเลย',
    riskWarning: 'คำเตือนความเสี่ยง',
    riskText: 'ฟังก์ชันสินเชื่อควรใช้ด้วยความระมัดระวัง ค่าปรับเกินกำหนดจะถูกเรียกเก็บ กรุณาชำระคืนตรงเวลาเพื่อหลีกเลี่ยงผลกระทบต่อคะแนนเครดิต',
    overdueRate: 'อัตราเกินกำหนด', perDay: '/วัน', noRecords: 'ไม่มีบันทึกเงินกู้',
    loanNow: 'กู้เงินตอนนี้', status: 'สถานะ', active: 'ดำเนินการอยู่', overdue: 'เกินกำหนด',
    settled: 'ชำระแล้ว', dueDate: 'วันครบกำหนด',
  },
};

export function LoanPage() {
  const { t, language } = useLanguage();
  
  // Helper function with fallback
  const tLoan = (key: string) => {
    const translation = t(`loan.${key}`);
    // If translation not found (returns the key itself), use fallback
    if (translation === `loan.${key}`) {
      const langFallback = loanFallback[language] || loanFallback.en;
      return langFallback[key] || key;
    }
    return translation;
  };
  
  const [activeTab, setActiveTab] = useState('apply');
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const [amount, setAmount] = useState('100');

  // Mock loan records - set to empty array to show empty state
  const loanRecords: any[] = [];

  const quickAmounts = [100, 16733, 33367, 50000];
  const periods = [
    { value: '7', label: `7${tLoan('days')}` },
    { value: '14', label: `14${tLoan('days')}` },
    { value: '30', label: `30${tLoan('days')}` },
    { value: '60', label: `60${tLoan('days')}` },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Link to="/">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg">{tLoan('title')}</h1>
        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
          {tLoan('hot')}
        </span>
      </div>

      <div className="px-4">
        {/* Credit Card */}
        <div className="bg-gradient-to-br from-[#3a4a2a] to-[#2a3a1a] rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-300">{tLoan('creditLimit')}</span>
            <span className="text-sm text-[#c4f82a]">{tLoan('score')}: 100</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">{tLoan('totalLimit')}</div>
              <div className="text-2xl text-white">10000</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{tLoan('used')}</div>
              <div className="text-2xl text-[#c4f82a]">0</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{tLoan('available')}</div>
              <div className="text-2xl text-[#c4f82a]">10000</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveTab('apply')}
            className={`py-3 rounded-xl transition-all ${
              activeTab === 'apply'
                ? 'bg-[#c4f82a] text-black'
                : 'bg-[#1a1a1a] text-gray-400'
            }`}
          >
            {tLoan('applyLoan')}
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`py-3 rounded-xl transition-all ${
              activeTab === 'my'
                ? 'bg-[#c4f82a] text-black'
                : 'bg-[#1a1a1a] text-gray-400'
            }`}
          >
            {tLoan('myLoans')}
          </button>
        </div>

        {activeTab === 'apply' ? (
          <>
            {/* Loan Amount */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-300">{tLoan('loanAmount')}</h3>
                <span className="text-xs text-gray-500">{tLoan('range')}: 100 - 50,000 USDT</span>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[#c4f82a] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-sm text-gray-400">USDT</span>
                </div>
                <div className="text-3xl text-white">
                  {amount} - 50000
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    className="bg-[#1a1a1a] text-white py-3 rounded-xl text-sm hover:bg-[#2a2a2a] transition-colors"
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Period */}
            <div className="mb-6">
              <h3 className="text-sm text-gray-300 mb-3">{tLoan('loanPeriod')}</h3>
              <div className="grid grid-cols-4 gap-2">
                {periods.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`py-3 rounded-xl transition-all ${
                      selectedPeriod === period.value
                        ? 'bg-[#c4f82a] text-black border-2 border-[#c4f82a]'
                        : 'bg-[#1a1a1a] text-gray-400 border-2 border-transparent'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button className="w-full bg-[#c4f82a] text-black py-4 rounded-2xl mb-4 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center">
                <TrendingUp className="w-3 h-3" />
              </div>
              <span className="text-base">{tLoan('applyLoan')}</span>
            </button>

            {/* Warning */}
            <div className="bg-red-900/20 rounded-xl p-4 flex items-start gap-3 border border-red-900/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-300 leading-relaxed">
                <p className="mb-1">
                  {tLoan('riskWarning')}: {tLoan('riskText')}
                </p>
                <p className="text-red-400">
                  {tLoan('overdueRate')}: 0.20%{tLoan('perDay')}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* My Loans Tab */}
            {loanRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-gray-500 mb-6">{tLoan('noRecords')}</p>
                <button 
                  onClick={() => setActiveTab('apply')}
                  className="bg-[#c4f82a] text-black px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  {tLoan('loanNow')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {loanRecords.map((loan: any, idx: number) => (
                  <div key={idx} className="bg-[#1a1a1a] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">{tLoan('loanAmount')}</span>
                      <span className="text-lg text-white">{loan.amount} USDT</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">{tLoan('loanPeriod')}</span>
                      <span className="text-sm text-gray-300">{loan.period}{tLoan('days')}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">{tLoan('status')}</span>
                      <span className={`text-sm ${
                        loan.status === 'active' ? 'text-[#c4f82a]' : 
                        loan.status === 'overdue' ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {loan.status === 'active' ? tLoan('active') : 
                         loan.status === 'overdue' ? tLoan('overdue') : 
                         tLoan('settled')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{tLoan('dueDate')}</span>
                      <span className="text-sm text-gray-300">{loan.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}