import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface Order {
  id: number;
  member_id: number;
  symbol: string;
  direction: '涨' | '跌';
  amount: number;
  open_price: number;
  close_price: number | null;
  profit: number | null;
  status: '持仓中' | '已平仓' | '已取消';
  open_time: string;
  close_time: string | null;
  period: string;
  return_rate: number;
  scale: number;
  billing_time: string | null;
  settle_amount: number | null;
}

function fmtTime(s: string | null | undefined): string {
  if (!s) return '--';
  const d = new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtNum(n: number | null | undefined, digits = 4): string {
  if (n === null || n === undefined) return '--';
  return Number(n).toFixed(digits);
}

function fmtAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '--';
  return Number(n).toFixed(2);
}

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    fetch(`/api/orders/${id}?member_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.order) setOrder(data.order);
        else setError(data.message || 'not_found');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { /* noop */ }
  };

  // 状态颜色 — 走主题色:
  //   持仓中 → 黄(待定感)
  //   已平仓 → 灰(关闭感)
  //   已取消 → 红(取消感)
  // 盈利 → 绿,亏损 → 红,平 → 白
  const statusColor = (s: Order['status']) => {
    if (s === '持仓中') return 'text-amber-400';
    if (s === '已平仓') return 'text-gray-300';
    if (s === '已取消') return 'text-red-400';
    return 'text-white';
  };
  const directionColor = (d: Order['direction']) => d === '涨' ? 'text-[#c4f82a]' : 'text-red-400';
  const profitColor = (p: number | null) => {
    if (p === null || p === undefined) return 'text-white';
    if (p > 0) return 'text-red-400';
    if (p < 0) return 'text-white';
    return 'text-white';
  };
  const profitSign = (p: number | null) => {
    if (p === null || p === undefined) return '';
    if (p > 0) return '+';
    return '';
  };

  const baseCoin = order ? order.symbol.replace(/USDT$/, '') : '';
  const resultText = order
    ? (order.status === '持仓中' ? t('orders.status.pending')
        : order.status === '已平仓' ? t('orders.win')
        : t('orders.lossResult'))
    : '--';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0f1419] text-white">
        <div className="flex items-center p-4">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg ml-3">{t('orders.detail.title')}</h1>
        </div>
        <div className="px-6 py-20 text-center text-gray-500">
          {error === 'not_found' ? 'Order not found' : (error || 'Failed to load')}
        </div>
      </div>
    );
  }

  // 键值对列表 — 左 label(定宽 96px)、右 value(右对齐)
  const Row = ({ label, value, copyable, copyText, valueClass = '' }: {
    label: string;
    value: React.ReactNode;
    copyable?: boolean;
    copyText?: string;
    valueClass?: string;
  }) => (
    <div className="flex items-start justify-between py-3.5 border-b border-gray-800 last:border-0">
      <div className="text-gray-400 text-sm shrink-0 w-24">{label}</div>
      <div className={`flex-1 flex items-center justify-end gap-2 text-sm text-white ${valueClass}`}>
        <span className="text-right break-all">{value}</span>
        {copyable && (
          <button
            onClick={() => copy(copyText ?? String(value), label)}
            className="shrink-0 text-[#c4f82a] active:scale-95 transition-transform"
          >
            {copiedField === label
              ? <Check className="w-3.5 h-3.5" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1419] text-white pb-10">
      {/* Header */}
      <div className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg ml-3">{t('orders.detail.title')}</h1>
      </div>

      {/* 订单卡片 — 深色圆角(和持仓页背景协调) */}
      <div className="mx-4 bg-[#1a1a1a] text-white rounded-2xl p-5 border border-gray-800/60">
        <Row
          label={t('orders.detail.orderId')}
          value={`B1000000${String(Math.abs(order.id)).padStart(9, '0').slice(-9)}`}
          copyable
          copyText={`B1000000${String(Math.abs(order.id)).padStart(9, '0').slice(-9)}`}
          valueClass="font-mono"
        />
        <Row
          label={t('orders.detail.currency')}
          value={baseCoin}
          valueClass="font-medium"
        />
        <Row
          label={t('orders.detail.buyPrice')}
          value={fmtNum(order.open_price, 4)}
          valueClass="font-mono"
        />
        <Row
          label={t('orders.detail.settlePrice')}
          value={fmtNum(order.close_price ?? order.open_price, 4)}
          valueClass="font-mono"
        />
        <Row
          label={t('orders.detail.openTime')}
          value={fmtTime(order.open_time)}
          valueClass="font-mono text-xs"
        />
        <Row
          label={t('orders.detail.billingTime')}
          value={fmtTime(order.billing_time)}
          valueClass="font-mono text-xs"
        />
        <Row
          label={t('orders.detail.amount')}
          value={fmtAmount(order.amount)}
          valueClass="font-mono font-medium"
        />
        <Row
          label={t('orders.detail.status')}
          value={order.status === '持仓中' ? t('orders.status.pending')
                : order.status === '已平仓' ? t('orders.status.closed')
                : t('orders.status.cancelled')}
          valueClass={`font-medium ${statusColor(order.status)}`}
        />
        <Row
          label={t('orders.detail.profit')}
          value={`${profitSign(order.profit)}${fmtAmount(order.profit ?? 0)}`}
          valueClass={`font-mono font-medium ${profitColor(order.profit)}`}
        />
        <Row
          label={t('orders.detail.direction')}
          value={order.direction === '涨' ? t('orders.call') : t('orders.put')}
          valueClass={`font-medium ${directionColor(order.direction)}`}
        />
        <Row
          label={t('orders.detail.orderTime')}
          value={fmtTime(order.open_time)}
          valueClass="font-mono text-xs"
        />
        <Row
          label={t('orders.detail.period')}
          value={order.period}
          valueClass="font-mono"
        />
        <Row
          label={t('orders.detail.returnRate')}
          value={`${Number(order.return_rate).toFixed(0)}%`}
          valueClass="font-mono text-[#c4f82a] font-medium"
        />
      </div>

      {/* 底部状态栏 */}
      <div className="mt-4 mx-4 text-center text-xs text-gray-500">
        {copiedField
          ? `${t('orders.detail.copied')}: ${copiedField}`
          : t('orders.detail.copy')}
      </div>
    </div>
  );
}

export default OrderDetailPage;
