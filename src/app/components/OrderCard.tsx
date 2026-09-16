import { ChevronRight, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * 订单卡片数据接口 — 接收动态数据
 *
 * 字段命名与后端 `orders` 表 / `/api/orders/mine` 返回值保持一致,
 * 外部可以传入自己的 order 对象直接渲染。
 */
export interface OrderCardData {
  /** 数据库主键 */
  id: number;
  /** 交易对 — 例 "BTCUSDT",内部会自动拆成基础币 */
  symbol: string;
  /** 下单金额 */
  amount: number;
  /** 利润(已结算才有,持仓中为 null) */
  profit: number | null;
  /** 方向 — 中英都接受 */
  direction: '涨' | '跌' | 'buy' | 'sell' | 'up' | 'down';
  /** 收益率 % — 例 20 / 35 / 50 / 70 / 100(用户在下单抽屉选的) */
  return_rate?: number;
  /** 规模(预留,目前 UI 不再渲染) */
  scale?: number;
  /** 计费周期 — 例 "30s" / "60s" */
  period: string;
  /** 下单时间(订货时间) */
  open_time: string;
  /** 可选 — 自定义方向显示文字,默认 "购买" */
  directionLabel?: string;
  /** 可选 — 已格式化好的订单号;不传就用 id 生成 B1000000xxxxxxxxx */
  formattedOrderId?: string;
}

interface OrderCardProps {
  order: OrderCardData;
  /** 整张卡片点击 — 不传则默认 navigate 到 /order/:id */
  onClick?: (order: OrderCardData) => void;
  /** 复制回调 — 不传则在内部用 navigator.clipboard */
  onCopy?: (text: string, orderId: number) => void;
  /** 当前正在显示 "已复制" 状态的订单 id(由父组件统一管理) */
  copiedId?: number | null;
}

// ─── 工具函数 ──────────────────────────────────────────────────────────────

/** 时间格式:2026-09-10 16:21:34 */
function fmtTime(s: string | null | undefined): string {
  if (!s) return '--';
  const d = new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 金额格式:1000.00 */
function fmtAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0.00';
  return Number(n).toFixed(2);
}

/**
 * 生成订单号: B1000000 + 9 位数字
 * 例:id=1 → "B1000000000000001";id=12345 → "B1000000012345"
 * 超过 9 位时取后 9 位,保证总长度固定为 17 字符。
 */
export function formatOrderId(id: number): string {
  const s = String(Math.abs(id)).padStart(9, '0').slice(-9);
  return `B1000000${s}`;
}

/** 拆出基础币:BTCUSDT → BTC */
function splitBase(symbol: string): string {
  return symbol.replace(/USDT$/i, '').replace(/\/.*$/, '');
}

/** 收益率显示:取整 + % */
function fmtReturnRate(rate: number | null | undefined): string {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return '0%';
  return `${n.toFixed(0)}%`;
}

// ─── 组件 ──────────────────────────────────────────────────────────────────

export function OrderCard({ order, onClick, onCopy, copiedId = null }: OrderCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const baseCoin    = splitBase(order.symbol);
  const currency    = `${baseCoin}/USDT`;
  const orderId     = order.formattedOrderId ?? formatOrderId(order.id);
  const amount      = fmtAmount(order.amount);
  const profit      = fmtAmount(order.profit ?? 0);
  const profitColor =
    order.profit === null || order.profit === undefined ? 'text-white'
    : order.profit > 0 ? 'text-red-400'      // 盈利红色(主题要求)
    : order.profit < 0 ? 'text-white'        // 亏 = 白
    : 'text-white';
  const profitSign  = order.profit && order.profit > 0 ? '+' : '';
  const dirText     = order.directionLabel ?? '购买';
  const returnRateText = fmtReturnRate(order.return_rate ?? order.scale);  // 兼容老数据 scale
  const periodText  = order.period;
  const orderTime   = fmtTime(order.open_time);

  const handleCardClick = () => {
    if (onClick) onClick(order);
    else navigate(`/order/${order.id}`);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (onCopy) {
        onCopy(orderId, order.id);
      } else {
        await navigator.clipboard.writeText(orderId);
      }
    } catch {
      /* 浏览器拒绝授权时静默 */
    }
  };

  // 通用行:左 label / 右 value
  const Row = ({
    label, value, valueClass = '', valueNode,
  }: {
    label: string;
    value: React.ReactNode;
    valueClass?: string;
    valueNode?: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-1.5">
      <div className="text-xs text-gray-400 shrink-0 w-20">{label}</div>
      <div className={`flex-1 flex items-center justify-end gap-1 text-sm text-white text-right ${valueClass}`}>
        {valueNode ?? <span>{value}</span>}
      </div>
    </div>
  );

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(); }}
      className="relative w-full bg-[#1a1a1a] text-white rounded-xl p-4 mb-3 text-left cursor-pointer active:scale-[0.99] transition-transform border border-gray-800/60"
    >
      {/* 右侧箭头 — 整卡高度内绝对居中,不被任何字段挤掉 */}
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />

      {/* 字段列表(右侧留出箭头空间) */}
      <div className="pr-7">
        {/* 货币 */}
        <Row label={t('orders.card.currency') || '货币'} value={currency} />

        {/* 订单编号 — 带红色复制按钮 */}
        <Row
          label={t('orders.card.orderId') || '订单编号'}
          valueNode={
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{orderId}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-[#c4f82a] active:scale-95"
              >
                {copiedId === order.id
                  ? <><Check className="w-3 h-3" /><span>{t('orders.detail.copied') || '已复制'}</span></>
                  : <><Copy className="w-3 h-3" /><span>{t('orders.card.copy') || '复制'}</span></>}
              </button>
            </div>
          }
        />

        {/* 订单金额 */}
        <Row
          label={t('orders.card.amount') || '订单金额'}
          value={amount}
          valueClass="font-mono"
        />

        {/* 利润金额 */}
        <Row
          label={t('orders.card.profit') || '利润金额'}
          value={`${profitSign}${profit}`}
          valueClass={`font-mono ${profitColor}`}
        />

        {/* 购买方向 — 主题绿 */}
        <Row
          label={t('orders.card.direction') || '购买方向'}
          value={dirText}
          valueClass="text-[#c4f82a] font-medium"
        />

        {/* 收益率 */}
        <Row
          label={t('orders.card.returnRate') || '收益率'}
          value={returnRateText}
          valueClass="font-mono text-[#c4f82a] font-medium"
        />

        {/* 计费时间 */}
        <Row
          label={t('orders.card.billingTime') || '计费时间'}
          value={periodText}
          valueClass="font-mono"
        />

        {/* 订货时间 */}
        <Row
          label={t('orders.card.orderTime') || '订货时间'}
          value={orderTime}
          valueClass="font-mono text-xs text-gray-400"
        />
      </div>
    </div>
  );
}

export default OrderCard;