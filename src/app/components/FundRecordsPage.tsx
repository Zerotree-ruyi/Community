/**
 * FundRecordsPage — 前台用户资金记录
 *
 * 设计:
 *  - 调用 /api/funds/mine?member_id=xxx 拉当前登录用户的资金明细
 *  - 顶部展示 当前余额 / 总入账 / 总出账
 *  - 四个 tab:
 *      全部   - 所有类型
 *      充值   - 后台充值 / 下推盈利(收入类)
 *      提现   - 会员提现(支出类)
 *      下单   - 下单扣款(单独一类,不再混在提现里)
 *  - 后台扣款 / 订单结算 单独只在 全部 tab 出现(管理员操作/结算记录)
 */

import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Clock, RefreshCw, ChevronRight, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';

interface FundRecord {
  id:         number;
  member_id:  number;
  type:       string;        // 后台充值 / 后台扣款 / 会员提现 / 下单 / 订单结算
  before:     string | number;
  amount:     string | number;
  after:      string | number;
  notes:      string;
  time:       string;
}

type Tab = 'all' | 'in' | 'withdraw' | 'order';

function classify(type: string): 'in' | 'withdraw' | 'order' | 'other' {
  if (type === '后台充值' || type === '下推盈利') return 'in';
  if (type === '会员提现')                        return 'withdraw';
  if (type === '下单' || type === '会员下单')      return 'order';  // 兼容旧数据
  return 'other';  // 后台扣款 / 订单结算 等只在"全部"显示
}

function fmt(n: number | string): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// DB type string → i18n key
function typeKey(type: string): string {
  switch (type) {
    case '后台充值':   return 'recharge';
    case '后台扣款':   return 'deduct';
    case '会员提现':   return 'withdraw';
    case '下单':       return 'order';
    case '会员下单':   return 'order';   // 兼容旧数据
    case '订单结算':   return 'settle';
    case '下推盈利':   return 'profit';
    default:           return type;  // 未知类型直接显示原值
  }
}

export function FundRecordsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [records, setRecords] = useState<FundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  const load = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await fetch(`/api/funds/mine?member_id=${user.id}&limit=200`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setRecords(data.data || []);
    } catch (e: any) {
      setErrMsg(e.message || t('fundRecords.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 总入账 / 总出账(只看实际金额符号,不含 后台扣款 / 订单结算 — 它们只在"全部"出现)
  const { totalIn, totalOut, totalOrder } = useMemo(() => {
    let ti = 0, to = 0, tord = 0;
    for (const r of records) {
      const c = classify(r.type);
      const amt = Math.abs(Number(r.amount) || 0);
      if (c === 'in')      ti += amt;
      else if (c === 'withdraw') to += amt;
      else if (c === 'order')   tord += amt;
    }
    return { totalIn: ti, totalOut: to, totalOrder: tord };
  }, [records]);

  const filtered = useMemo(() => {
    if (tab === 'all') return records;
    return records.filter(r => classify(r.type) === tab);
  }, [records, tab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/profile" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">{t('fundRecords.title')}</h1>
        <button
          onClick={load}
          className="absolute right-4 hover:bg-gray-800 p-1 rounded"
          aria-label="refresh"
        >
          <RefreshCw className={`w-5 h-5 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 余额摘要卡 */}
      <div className="px-4 pt-4">
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-1">{t('fundRecords.currentBalance')}</div>
          <div className="text-3xl font-bold text-[#c4f82a] mb-3">
            {fmt(Number(user?.balance ?? 0))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/30">
              <div className="text-[11px] text-gray-400">{t('fundRecords.totalIn')}</div>
              <div className="text-base text-green-400 font-semibold">+{fmt(totalIn)}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/30">
              <div className="text-[11px] text-gray-400">{t('fundRecords.totalOut')}</div>
              <div className="text-base text-red-400 font-semibold">-{fmt(totalOut)}</div>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-2 border border-amber-500/30">
              <div className="text-[11px] text-gray-400">{t('fundRecords.totalOrder')}</div>
              <div className="text-base text-amber-400 font-semibold">-{fmt(totalOrder)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs — 4 个 */}
      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === 'all' ? 'bg-[#c4f82a] text-black font-semibold' : 'bg-gray-800 text-white'
            }`}
          >{t('fundRecords.all')}</button>
          <button
            onClick={() => setTab('in')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === 'in' ? 'bg-[#c4f82a] text-black font-semibold' : 'bg-gray-800 text-white'
            }`}
          >{t('fundRecords.deposit')}</button>
          <button
            onClick={() => setTab('withdraw')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === 'withdraw' ? 'bg-[#c4f82a] text-black font-semibold' : 'bg-gray-800 text-white'
            }`}
          >{t('fundRecords.withdraw')}</button>
          <button
            onClick={() => setTab('order')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === 'order' ? 'bg-[#c4f82a] text-black font-semibold' : 'bg-gray-800 text-white'
            }`}
          >{t('fundRecords.orderTab') || '下单记录'}</button>
        </div>
      </div>

      {/* Records List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">{t('fundRecords.loading')}</div>
        ) : errMsg ? (
          <div className="text-center py-12 text-red-400">
            {t('fundRecords.loadError')}: {errMsg}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <div className="text-5xl mb-4">📋</div>
            <div className="text-base">{t('fundRecords.noRecords')}</div>
            <div className="text-sm mt-2">{t('fundRecords.recordsWillShow')}</div>
          </div>
        ) : (
          filtered.map((r) => {
            const c = classify(r.type);
            // 显示色:入=绿;出(提现)=红;下单=琥珀;结算赢=绿;结算输=红;其它=灰
            const accent = c === 'in' ? 'green'
                         : c === 'withdraw' ? 'red'
                         : c === 'order' ? 'amber'
                         : r.type === '订单结算' ? (Number(r.amount) >= 0 ? 'green' : 'red')
                         : 'gray';
            const sign = c === 'in' ? '+'
                       : (c === 'withdraw' || c === 'order') ? '-'
                       : r.type === '订单结算' ? (Number(r.amount) >= 0 ? '+' : '-')
                       : '';
            const textColor = accent === 'green' ? 'text-green-400'
                            : accent === 'red'   ? 'text-red-400'
                            : accent === 'amber' ? 'text-amber-400'
                            : 'text-gray-300';
            const iconBg = accent === 'green' ? 'bg-green-500/20'
                         : accent === 'red'   ? 'bg-red-500/20'
                         : accent === 'amber' ? 'bg-amber-500/20'
                         : 'bg-gray-500/20';
            const Icon = (c === 'in' || r.type === '订单结算') ? ArrowDownLeft : ArrowUpRight;
            const iconColor = accent === 'green' ? 'text-green-400'
                            : accent === 'red'   ? 'text-red-400'
                            : accent === 'amber' ? 'text-amber-400'
                            : 'text-gray-400';
            const typeLabel = t(`fundRecords.types.${typeKey(r.type)}`);
            return (
              <div
                key={r.id}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div>
                      <div className="text-sm mb-1 font-medium">{typeLabel}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-base mb-1 font-semibold ${textColor}`}>
                      {sign}{fmt(Math.abs(Number(r.amount)))}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {t('fundRecords.balanceAfter')} {fmt(r.after)}
                    </div>
                  </div>
                </div>
                {r.notes && (
                  <div className="text-xs text-gray-500 border-t border-gray-700 pt-2 mt-2">
                    {t('fundRecords.notes')}: {r.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 我的钱包入口 */}
      <div className="px-4 mt-6">
        <Link to="/my-wallets">
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-xl p-4 border border-amber-500/30 flex items-center justify-between hover:from-amber-500/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium">我的钱包</div>
                <div className="text-xs text-gray-500 mt-0.5">管理银行卡和数字币钱包</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </div>
        </Link>
      </div>
    </div>
  );
}