import { X, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Fallback translations for order dialog
const orderDialogFallback: Record<string, any> = {
  en: {
    orderInProgress: 'Order In Progress',
    waitingForResult: 'Waiting for Result',
    predictDirection: 'Predict Direction',
    betAmount: 'Bet Amount',
    timeRemaining: 'Time Remaining',
    openPrice: 'Open Price',
    currentPrice: 'Current Price',
    predictedPL: 'Predicted P/L',
    amountIn: 'Amount In',
    wrongPrediction: 'Wrong Prediction X',
    maxAmount: 'Max Amount',
    waitingPayment: 'Waiting for settlement...',
    viewMyOrders: 'View My Orders',
  },
  ja: {
    orderInProgress: '注文進行中',
    waitingForResult: '結果待ち',
    predictDirection: '予測方向',
    betAmount: 'ベット金額',
    timeRemaining: '残り時間',
    openPrice: '始値',
    currentPrice: '現在価格',
    predictedPL: '予想損益',
    amountIn: '投入金額',
    wrongPrediction: '予測失敗 X',
    maxAmount: '最大金額',
    waitingPayment: '決済待ち...',
    viewMyOrders: 'マイオーダーを見る',
  },
  'zh-CN': {
    orderInProgress: '订单进行中',
    waitingForResult: '等待结果',
    predictDirection: '预测方向',
    betAmount: '投注金额',
    timeRemaining: '剩余时间',
    openPrice: '开仓价',
    currentPrice: '当前价',
    predictedPL: '预计盈亏',
    amountIn: '已进金额',
    wrongPrediction: '预测错误 X',
    maxAmount: '最多金额',
    waitingPayment: '等待价格支付...',
    viewMyOrders: '查看我的订单',
  },
  th: {
    orderInProgress: 'คำสั่งซื้อดำเนินการอยู่',
    waitingForResult: 'รอผลลัพธ์',
    predictDirection: 'ทิศทางการคาดการณ์',
    betAmount: 'จำนวนเดิมพัน',
    timeRemaining: 'เวลาที่เหลือ',
    openPrice: 'ราคาเปิด',
    currentPrice: 'ราคาปัจจุบัน',
    predictedPL: 'กำไร/ขาดทุนโดยประมาณ',
    amountIn: 'จำนวนเงินที่ใส่',
    wrongPrediction: 'คาดการณ์ผิด X',
    maxAmount: 'จำนวนสูงสุด',
    waitingPayment: 'รอการชำระเงิน...',
    viewMyOrders: 'ดูคำสั่งซื้อของฉัน',
  },
};

interface OrderInProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  direction: 'up' | 'down';
  amount: number;
  duration: number;
  openPrice: number;
  currentPrice: number;
}

export function OrderInProgressDialog({
  isOpen,
  onClose,
  direction,
  amount,
  duration,
  openPrice,
  currentPrice
}: OrderInProgressDialogProps) {
  const { t, language } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(duration);
  
  // Helper to get order dialog text with fallback
  const getOrderText = (key: string) => {
    const translation = t(`orderDialog.${key}`);
    if (translation.startsWith('orderDialog.')) {
      return (orderDialogFallback[language] || orderDialogFallback.en)[key] || key;
    }
    return translation;
  };
  
  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isOpen, timeLeft]);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(duration);
    }
  }, [isOpen, duration]);

  if (!isOpen) return null;

  const progress = ((duration - timeLeft) / duration) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const predictedLoss = -amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-3xl p-6 relative border border-gray-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-700/50 rounded-full flex items-center justify-center hover:bg-gray-600/50 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-xl mb-1">
            <span className="text-[#c4f82a]">⚡</span>
            <span>{getOrderText('orderInProgress')}</span>
          </div>
          <p className="text-sm text-gray-400">{getOrderText('waitingForResult')}</p>
        </div>

        {/* Direction and Amount Card */}
        <div className={`rounded-2xl p-4 mb-4 ${
          direction === 'up' 
            ? 'bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50' 
            : 'bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {direction === 'up' ? (
                <TrendingUp className="w-6 h-6 text-green-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-400" />
              )}
              <div>
                <div className="text-xs text-gray-400">{getOrderText('predictDirection')}</div>
                <div className={`text-xl ${direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  {direction === 'up' ? t('orders.call') : t('orders.put')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">{getOrderText('betAmount')}</div>
              <div className="text-xl">${amount.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-black/40 rounded-2xl p-4 mb-4 border border-gray-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Clock className="w-4 h-4 text-[#c4f82a]" />
            <span>{getOrderText('timeRemaining')}</span>
          </div>
          <div className="text-5xl text-center mb-3 tracking-wider" style={{ color: '#c4f82a' }}>
            {timeDisplay}
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#c4f82a] transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/40 rounded-xl p-3 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">{getOrderText('openPrice')}</div>
            <div className="text-base">${openPrice.toFixed(2)}</div>
          </div>
          <div className="bg-black/40 rounded-xl p-3 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">{getOrderText('currentPrice')}</div>
            <div className="text-base">${currentPrice.toFixed(2)}</div>
          </div>
        </div>

        {/* Predicted Loss */}
        <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 rounded-2xl p-4 mb-4 border border-red-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{getOrderText('predictedPL')}</span>
              </div>
              <div className="text-2xl text-red-400">${predictedLoss.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-1">{getOrderText('amountIn')}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-red-400 mb-1">{getOrderText('wrongPrediction')}</div>
              <div className="text-xl text-gray-500">$0.00</div>
              <div className="text-xs text-gray-400 mt-1">{getOrderText('maxAmount')}</div>
            </div>
          </div>
        </div>

        {/* Wait Button (Disabled) */}
        <button 
          disabled
          className="w-full bg-gradient-to-r from-[#3a2a1a] to-[#2a1a0a] text-gray-500 py-4 rounded-xl mb-3 border border-gray-700/50 flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Clock className="w-5 h-5" />
          <span>{getOrderText('waitingPayment')}</span>
        </button>

        {/* View Orders Button */}
        <button 
          onClick={onClose}
          className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-4 rounded-xl border border-gray-700/50 hover:from-gray-700 hover:to-gray-800 transition-all"
        >
          {getOrderText('viewMyOrders')}
        </button>
      </div>
    </div>
  );
}