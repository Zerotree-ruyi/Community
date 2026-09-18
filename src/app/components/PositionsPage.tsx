import { RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { OrderCard } from './OrderCard';

interface Order {
  id: number;
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

const FILTERS = [
  { id: 'all', key: 'all' },
  { id: '持仓中', key: 'pending' },
  { id: '已平仓', key: 'closed' },
  { id: '已取消', key: 'cancelled' },
] as const;
type FilterId = typeof FILTERS[number]['id'];

function fmtTime(s: string | null | undefined): string {
  if (!s) return '--';
  const d = new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtAmount(n: number): string {
  return Number(n).toFixed(2);
}

export function PositionsPage() {
  const { t } = useLanguage();
  const { user, refresh } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'positions' | 'orders'>(
    () => (location.state as any)?.tab === 'positions' ? 'positions' : 'orders'
  );
  const [filterTab, setFilterTab] = useState<FilterId>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const url = `/api/orders/mine?member_id=${user.id}&limit=100`;
      const r = await fetch(url);
      const data = await r.json();
      setOrders(data.data ?? []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  // 懒结算:每 5 秒调一次 /api/orders/settle-due
  //   - 后端兜底是每 2 秒扫一次,前端这里只是更及时 + 触发后立刻 refetch
  //   - 有任何订单结算了 → 重拉订单列表 + 刷新用户余额(给 ProfilePage 用)
  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch('/api/orders/settle-due', { method: 'POST' });
        const d = await r.json();
        if (d?.settled?.length) {
          // 有订单结算了 → 重新拉订单 + 刷新当前用户余额
          await fetchOrders();
          if (user?.id) refresh().catch(() => {});
        }
      } catch { /* ignore */ }
    };
    const t = setInterval(tick, 5000);
    // 切到本页面时立刻触发一次(让刚下完单的用户马上能看见结算结果)
    tick();
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onCopy = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* noop */ }
  };

  const filtered = filterTab === 'all' ? orders : orders.filter(o => o.status === filterTab);
  const pendingCount  = orders.filter(o => o.status === '持仓中').length;
  const closedCount   = orders.filter(o => o.status === '已平仓').length;
  const cancelledCount = orders.filter(o => o.status === '已取消').length;

  // 持仓 tab 只看"持仓中";订单 tab 看所有
  const holdingOrders = orders.filter(o => o.status === '持仓中');
  const listToShow = activeTab === 'positions' ? holdingOrders : filtered;

  return (
    <div className="min-h-screen bg-[#0f1419] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl">{t('orders.title')}</h1>
        <button
          onClick={fetchOrders}
          className="hover:bg-gray-700/50 p-2 rounded transition-colors"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin text-[#c4f82a]' : 'text-gray-400'}`} />
        </button>
      </div>

      {/* Tabs — 持仓 / 订单 */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-3 bg-gray-800/30 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
              activeTab === 'positions'
                ? 'bg-[#c4f82a] text-black'
                : 'bg-transparent text-gray-400'
            }`}
          >
            {t('trading.positions')} ({holdingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
              activeTab === 'orders'
                ? 'bg-[#c4f82a] text-black'
                : 'bg-transparent text-gray-400'
            }`}
          >
            {t('orders.ordersTab')} ({orders.length})
          </button>
        </div>
      </div>

      {/* 筛选标签 — 只在"订单" tab 下显示 */}
      {activeTab === 'orders' && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <FilterPill active={filterTab === 'all'} onClick={() => setFilterTab('all')}>
              {t('orders.all')} ({orders.length})
            </FilterPill>
            <FilterPill active={filterTab === '持仓中'} onClick={() => setFilterTab('持仓中')}>
              {t('orders.status.pending')} ({pendingCount})
            </FilterPill>
            <FilterPill active={filterTab === '已平仓'} onClick={() => setFilterTab('已平仓')}>
              {t('orders.status.closed')} ({closedCount})
            </FilterPill>
            <FilterPill active={filterTab === '已取消'} onClick={() => setFilterTab('已取消')}>
              {t('orders.status.cancelled')} ({cancelledCount})
            </FilterPill>
          </div>
        </div>
      )}

      {/* 卡片列表 — 持仓 / 订单 tab 都用 OrderCard 渲染 */}
      <div className="px-4">
        {listToShow.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            {activeTab === 'positions'
              ? t('orders.noActivePositions')
              : t('orders.noOrders')}
          </div>
        ) : (
          listToShow.map(o => (
            <OrderCard
              key={o.id}
              order={o}
              onCopy={onCopy}
              copiedId={copiedId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
        active
          ? 'bg-[#c4f82a] text-black'
          : 'bg-gray-800/40 text-gray-400 border border-gray-700/30'
      }`}
    >
      {children}
    </button>
  );
}

export default PositionsPage;
