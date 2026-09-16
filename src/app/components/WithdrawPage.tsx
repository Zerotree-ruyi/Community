import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError, BankWallet, DigitalWallet } from '../api';

type WalletType = 'bank' | 'digital';

const MIN_AMOUNT = 10;

export function WithdrawPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [walletType, setWalletType] = useState<WalletType>('digital');
  const [banks, setBanks] = useState<BankWallet[]>([]);
  const [digitals, setDigitals] = useState<DigitalWallet[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [fundPwd, setFundPwd] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // 拉余额
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/members/${user.id}`);
        const data = await res.json();
        if (res.ok) setBalance(Number(data?.balance || 0));
      } catch { /* 静默 */ }
    })();
  }, [user?.id]);

  // 拉钱包列表
  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [b, d] = await Promise.all([
        api.listBankWallets(user.id),
        api.listDigitalWallets(user.id),
      ]);
      setBanks(b.data);
      setDigitals(d.data);
      // 自动选默认钱包
      const list = walletType === 'bank' ? b.data : d.data;
      const def = list.find((w) => w.is_default === 1);
      setSelectedId(def ? def.id : list[0]?.id ?? null);
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [user?.id, walletType]);

  useEffect(() => { reload(); }, [reload]);

  // 切换 wallet type 时清空选中
  useEffect(() => { setSelectedId(null); }, [walletType]);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const list = walletType === 'bank' ? banks : digitals;
  const selectedWallet = list.find((w) => w.id === selectedId) || null;

  const numAmount = parseFloat(amount) || 0;
  const receive = numAmount;

  const onAllAmount = () => setAmount(balance.toFixed(2));

  const onSubmit = async () => {
    setErrMsg(null);
    if (!user?.id) { setErrMsg('请先登录'); return; }
    if (!selectedWallet) { setErrMsg('请选择钱包'); return; }
    if (!amount || numAmount <= 0) { setErrMsg('请输入金额'); return; }
    if (numAmount < MIN_AMOUNT) { setErrMsg(`最低提现 ${MIN_AMOUNT}`); return; }
    if (numAmount > balance) { setErrMsg('余额不足'); return; }
    if (!/^\d{6}$/.test(fundPwd)) { setErrMsg('请输入 6 位数字资金密码'); return; }

    setSubmitting(true);
    try {
      await api.createWithdrawal({
        member_id: user.id,
        wallet_type: walletType,
        wallet_id: selectedWallet.id,
        amount: numAmount,
        fund_password: fundPwd,
      });
      showToast('ok', '提现申请已提交,等待审核');
      setTimeout(() => navigate('/withdraw/history'), 800);
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link to="/profile">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg">{t('withdraw.title')}</h1>
        </div>
        <Link to="/withdraw/history" className="text-sm text-[#c4f82a]">
          {t('withdraw.history')}
        </Link>
      </div>

      <div className="px-4">
        {/* Available Balance */}
        <div className="mb-5 bg-gradient-to-br from-[#3a4a3a] via-[#2a3a2a] to-[#1a2a1a] rounded-2xl p-5 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">{t('withdraw.available')}</div>
          <div className="text-3xl">{balance.toFixed(2)}</div>
        </div>

        {/* Wallet Type Toggle */}
        <div className="mb-5">
          <h3 className="text-sm text-gray-400 mb-3">提现方式</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setWalletType('digital')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                walletType === 'digital'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              数字币钱包
            </button>
            <button
              onClick={() => setWalletType('bank')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                walletType === 'bank'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              银行卡
            </button>
          </div>
        </div>

        {/* Wallet Selection */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-gray-400">选择钱包</h3>
            <Link to="/my-wallets" className="text-xs text-[#c4f82a]">
              + 管理钱包
            </Link>
          </div>

          {loading ? (
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center text-gray-500 text-sm">加载中...</div>
          ) : list.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-gray-500 text-sm mb-3">还没有{walletType === 'bank' ? '银行卡' : '数字币钱包'}</p>
              <Link to="/my-wallets" className="inline-block rounded-md bg-[#c4f82a] px-4 py-1.5 text-xs font-semibold text-black">
                立即添加
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((w) => (
                <label
                  key={w.id}
                  className={`block rounded-xl p-3 cursor-pointer transition-all border ${
                    selectedId === w.id
                      ? 'bg-[#c4f82a]/10 border-[#c4f82a]'
                      : 'bg-[#1a1a1a] border-transparent hover:border-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="wallet"
                    checked={selectedId === w.id}
                    onChange={() => setSelectedId(w.id)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {walletType === 'bank' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{(w as BankWallet).bank_name}</span>
                            {(w as BankWallet).is_default === 1 && (
                              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">默认</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 truncate">
                            {maskCard((w as BankWallet).card_no)} · {(w as BankWallet).holder}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{(w as DigitalWallet).type1}</span>
                            <span className="text-xs text-gray-400">({(w as DigitalWallet).type2})</span>
                            {(w as DigitalWallet).is_default === 1 && (
                              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">默认</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 truncate font-mono">
                            {maskAddress((w as DigitalWallet).address)}
                          </div>
                        </>
                      )}
                    </div>
                    <div className={`ml-3 h-5 w-5 rounded-full border-2 ${
                      selectedId === w.id ? 'border-[#c4f82a] bg-[#c4f82a]' : 'border-gray-600'
                    }`}>
                      {selectedId === w.id && (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-black" />
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-gray-400">{t('withdraw.amount')}</h3>
            <button
              onClick={onAllAmount}
              className="text-xs text-[#c4f82a]"
            >
              {t('withdraw.all')}
            </button>
          </div>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('withdraw.amountPlaceholder')}
            className="w-full bg-[#1a1a1a] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#c4f82a] transition-all placeholder-gray-600 text-white"
          />
        </div>

        {/* Fund Password */}
        <div className="mb-5">
          <h3 className="text-sm text-gray-400 mb-3">资金密码</h3>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={fundPwd}
            onChange={(e) => setFundPwd(e.target.value.replace(/\D/g, ''))}
            placeholder="6 位数字资金密码"
            className="w-full bg-[#1a1a1a] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#c4f82a] transition-all placeholder-gray-600 text-white tracking-widest"
          />
        </div>

        {/* Actual Receive */}
        <div className="mb-5 bg-[#1a1a1a] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{t('withdraw.receive')}</span>
            <span className="text-base text-[#c4f82a] font-semibold">
              {receive > 0 ? receive.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Error */}
        {errMsg && (
          <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/40 px-3 py-2 text-sm text-red-400">
            {errMsg}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={submitting || !selectedWallet || !amount}
          className="w-full bg-[#c4f82a] text-black py-4 rounded-xl mb-4 hover:opacity-90 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中...' : t('withdraw.submit')}
        </button>

        {/* Notice */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>提现申请提交后将冻结相应余额,审核通过后到账</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>如审核被拒绝,冻结金额将原路退回可用余额</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>提现前请确认钱包信息准确,提交后不可修改</span>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-sm shadow-lg ${
            toast.type === 'ok' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function maskCard(no: string) {
  if (!no || no.length <= 8) return no;
  return no.slice(0, 4) + ' **** **** ' + no.slice(-4);
}
function maskAddress(addr: string) {
  if (!addr || addr.length <= 16) return addr;
  return addr.slice(0, 8) + '...' + addr.slice(-8);
}
