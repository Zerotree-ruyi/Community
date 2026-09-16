import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError, Withdrawal } from '../api';

type Tab = 'all' | '已同意' | '申请中' | '已拒绝';

export function WithdrawHistoryPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [list, setList] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    setErrMsg(null);
    try {
      const { data } = await api.myWithdrawals(user.id);
      setList(data);
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = activeTab === 'all' ? list : list.filter((w) => w.status === activeTab);

  // 统计
  const stats = {
    total: list.length,
    success: list.filter((w) => w.status === '已同意').length,
    successAmount: list
      .filter((w) => w.status === '已同意')
      .reduce((s, w) => s + Number(w.amount), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1419]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center p-4 relative">
          <Link to="/withdraw" className="absolute left-2 p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="flex-1 text-center text-lg">{t('withdraw.history')}</h1>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {([
          { k: 'all',     l: '全部' },
          { k: '已同意',   l: '已同意' },
          { k: '申请中',   l: '申请中' },
          { k: '已拒绝',   l: '已拒绝' },
        ] as { k: Tab; l: string }[]).map((tab) => (
          <button
            key={tab.k}
            className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm transition-colors ${
              activeTab === tab.k ? 'bg-[#c4f82a] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab(tab.k)}
          >
            {tab.l}
          </button>
        ))}
      </div>

      {/* Error */}
      {errMsg && (
        <div className="mx-4 mb-3 rounded-md bg-red-500/10 border border-red-500/40 px-3 py-2 text-sm text-red-400">
          {errMsg}
        </div>
      )}

      {/* List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="text-center py-20 text-gray-500">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">📭</div>
            <div className="text-gray-400 mb-1">暂无记录</div>
            <div className="text-xs text-gray-500">还没有{activeTab === 'all' ? '任何' : activeTab}的提现记录</div>
            <Link to="/withdraw" className="inline-block mt-4 rounded-md bg-[#c4f82a] px-4 py-1.5 text-xs font-semibold text-black">
              前往提现
            </Link>
          </div>
        ) : (
          filtered.map((w) => <WithdrawalCard key={w.id} w={w} />)
        )}
      </div>

      {/* Stats */}
      {!loading && list.length > 0 && (
        <div className="px-4 mt-6">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-sm text-gray-400 mb-3">统计</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">总记录</div>
                <div className="text-lg">{stats.total}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">成功笔数</div>
                <div className="text-lg">{stats.success}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">提现总额</div>
                <div className="text-lg text-emerald-400">{stats.successAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 单条记录 ────────────────────────────────────────────────────────────────
function WithdrawalCard({ w }: { w: Withdrawal }) {
  const statusStyle: Record<string, string> = {
    申请中: 'text-yellow-400 bg-yellow-400/10',
    已同意: 'text-emerald-400 bg-emerald-400/10',
    已拒绝: 'text-red-400 bg-red-400/10',
    已退款: 'text-gray-400 bg-gray-400/10',
  };
  const amount = Number(w.amount);
  const fee = Number(w.fee);
  const actual = Number(w.actual_amount);

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      {/* 头部:金额 + 状态 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xl text-red-400 font-semibold">-{amount.toFixed(2)}</span>
            <span className="text-sm text-gray-400">USDT</span>
          </div>
          <div className="text-xs text-gray-500">{w.apply_time}</div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusStyle[w.status] || 'text-gray-400'}`}>
          {w.status}
        </span>
      </div>

      {/* 钱包信息 */}
      <div className="bg-black/30 rounded-lg p-3 mb-3 text-xs space-y-1.5">
        {w.wallet_type === 'bank' ? (
          <>
            <Row label="银行" value={w.snap_bank_name || '-'} />
            <Row label="卡号" value={w.snap_card_no ? maskCard(w.snap_card_no) : '-'} mono />
            <Row label="持卡人" value={w.snap_holder || '-'} />
            {w.snap_branch && <Row label="分行" value={w.snap_branch} />}
            {w.snap_ifsc && <Row label="IFSC" value={w.snap_ifsc} mono />}
            {w.snap_id_number && <Row label="身份证" value={maskIdNumber(w.snap_id_number)} />}
          </>
        ) : (
          <>
            <Row label="币种" value={`${w.snap_coin_type || '-'} (${w.snap_network || '-'})`} />
            <Row label="地址" value={w.snap_address ? maskAddress(w.snap_address) : '-'} mono />
          </>
        )}
      </div>

      {/* 金额明细 */}
      <div className="text-xs space-y-1.5">
        <Row label="手续费" value={`${fee.toFixed(2)} USDT`} />
        <Row label="实际到账" value={`${actual.toFixed(2)} USDT`} valueClass="text-emerald-400" />
      </div>

      {/* 审核信息 */}
      {w.status === '已同意' && (
        <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs space-y-1">
          {w.reviewer && <Row label="审核人" value={w.reviewer} />}
          {w.approve_time && <Row label="审核时间" value={w.approve_time} />}
          {w.admin_note && <Row label="备注" value={w.admin_note} />}
        </div>
      )}
      {w.status === '已拒绝' && (
        <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs space-y-1">
          {w.reviewer && <Row label="审核人" value={w.reviewer} />}
          {w.approve_time && <Row label="审核时间" value={w.approve_time} />}
          {w.reject_reason && (
            <div>
              <div className="text-gray-400 mb-0.5">拒绝原因</div>
              <div className="text-red-400 bg-red-500/10 rounded px-2 py-1.5">{w.reject_reason}</div>
            </div>
          )}
          {w.admin_note && <Row label="管理员备注" value={w.admin_note} />}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono = false, valueClass = '' }: { label: string; value: string; mono?: boolean; valueClass?: string; }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`text-gray-200 text-right break-all ${mono ? 'font-mono' : ''} ${valueClass}`}>{value}</span>
    </div>
  );
}

function maskCard(no: string) {
  if (!no || no.length <= 8) return no;
  return no.slice(0, 4) + ' **** **** ' + no.slice(-4);
}
function maskIdNumber(id: string) {
  if (!id || id.length < 8) return id;
  return id.slice(0, 4) + '**********' + id.slice(-4);
}
function maskAddress(addr: string) {
  if (!addr || addr.length <= 16) return addr;
  return addr.slice(0, 8) + '...' + addr.slice(-8);
}
