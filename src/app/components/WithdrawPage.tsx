import { ArrowLeft, ShieldOff, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError, BankWallet, DigitalWallet } from '../api';
import { safePwd } from '../utils/safePwd';
import { StrongPasswordField } from './StrongPasswordField';

type WalletType = 'bank' | 'digital';

const MIN_AMOUNT = 10;

export function WithdrawPage() {
  const { t } = useLanguage();
  const { user, refresh } = useAuth();
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
  const [bannedDialog, setBannedDialog] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  // 在途提现 — 同时只能有一笔,上一笔没处理完不能再提交
  const [pendingWithdrawal, setPendingWithdrawal] = useState<{ id: number; amount: number } | null>(null);
  // 在途提现弹窗 — 点提交时弹出来说明为什么不能继续
  const [pendingDialog, setPendingDialog] = useState(false);

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

  // 查在途提现 — 同一时间只允许一笔
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await api.myWithdrawals(user.id, '申请中');
        const p = data?.[0];
        setPendingWithdrawal(p ? { id: p.id, amount: Number(p.amount) } : null);
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
      setErrMsg(e instanceof ApiError ? e.message : t('withdraw.loadFailed'));
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

  const onSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrMsg(null);
    if (!user?.id) { setErrMsg(t('withdraw.pleaseLogin')); return; }
    if (pendingWithdrawal) {
      // 已有在途提现 — 弹窗说明,不提交
      setPendingDialog(true);
      setErrMsg(null);
      return;
    }
    if (!selectedWallet) { setErrMsg(t('withdraw.pleaseSelectWallet')); return; }
    if (!amount || numAmount <= 0) { setErrMsg(t('withdraw.pleaseEnterAmount')); return; }
    if (numAmount < MIN_AMOUNT) { setErrMsg(t('withdraw.minAmount', { min: MIN_AMOUNT })); return; }
    if (numAmount > balance) { setErrMsg(t('withdraw.insufficientBalance')); return; }
    if (!/^\d{6}$/.test(fundPwd)) { setErrMsg(t('withdraw.invalidFundPwd')); return; }

    setSubmitting(true);
    try {
      await api.createWithdrawal({
        member_id: user.id,
        wallet_type: walletType,
        wallet_id: selectedWallet.id,
        amount: numAmount,
        // 提交前用 safePwd 转成 14 位 base62 强密码,浏览器看到的是这个乱码,
        // 不会触发密码泄露警告;后端存的就是这个 14 位串的 bcrypt 哈希。
        fund_password: safePwd(fundPwd),
      });
      showToast('ok', t('withdraw.submitSuccess'));
      // 余额已扣 — 刷新用户信息,顺带把在途提现锁上
      refresh().catch(() => {});
      setPendingWithdrawal({ id: 0, amount: numAmount });
      setTimeout(() => navigate('/withdraw/history'), 800);
    } catch (e) {
      // 账号被禁提 — 弹独立对话框(更醒目,提示这是管理员操作)
      if (e instanceof ApiError && e.code === 'ban_withdraw') {
        setBannedDialog(true);
        setErrMsg(null);
      } else if (e instanceof ApiError && e.code === 'pending_withdrawal') {
        // 已有在途提现 — 弹窗说明(后端兜底,前端一般是先拦住的)
        setErrMsg(null);
        setPendingWithdrawal((prev) => prev ?? { id: 0, amount: 0 });
        setPendingDialog(true);
      } else {
        setErrMsg(e instanceof ApiError ? e.message : t('withdraw.submitFailed'));
      }
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

      <form onSubmit={onSubmit}>
      <div className="px-4">
        {/* Available Balance */}
        <div className="mb-5 bg-gradient-to-br from-[#3a4a3a] via-[#2a3a2a] to-[#1a2a1a] rounded-2xl p-5 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-2">{t('withdraw.available')}</div>
          <div className="text-3xl">{balance.toFixed(2)}</div>
        </div>

        {/* Wallet Type Toggle */}
        <div className="mb-5">
          <h3 className="text-sm text-gray-400 mb-3">Withdrawal Method</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setWalletType('digital')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                walletType === 'digital'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              Crypto Wallet
            </button>
            <button
              onClick={() => setWalletType('bank')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                walletType === 'bank'
                  ? 'bg-[#c4f82a] text-black'
                  : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              Bank Card
            </button>
          </div>
        </div>

        {/* Wallet Selection */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-gray-400">Select Wallet</h3>
            <Link to="/my-wallets" className="text-xs text-[#c4f82a]">
              + Manage Wallets
            </Link>
          </div>

          {loading ? (
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center text-gray-500 text-sm">Loading...</div>
          ) : list.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-gray-500 text-sm mb-3">No {walletType === 'bank' ? 'bank cards' : 'crypto wallets'} yet</p>
              <Link to="/my-wallets" className="inline-block rounded-md bg-[#c4f82a] px-4 py-1.5 text-xs font-semibold text-black">
                Add Now
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
                              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">DEFAULT</span>
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
                              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">DEFAULT</span>
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

        {/* Fund Password — 用 StrongPasswordField,Chrome 看到的是 safePwd 强密码 */}
        <div className="mb-5">
          <h3 className="text-sm text-gray-400 mb-3">Fund Password</h3>
          <StrongPasswordField
            value={fundPwd}
            onChange={setFundPwd}
            placeholder="6-digit fund password"
            maxLength={6}
            inputMode="numeric"
            autoComplete="new-password"
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
          type="submit"
          disabled={submitting || (!pendingWithdrawal && (!selectedWallet || !amount))}
          className="w-full bg-[#c4f82a] text-black py-4 rounded-xl mb-4 hover:opacity-90 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : (pendingWithdrawal ? 'Request in progress' : t('withdraw.submit'))}
        </button>

        {/* Notice */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>After a withdrawal request is submitted, the amount is deducted from your available balance and credited once approved.</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>If the review is rejected, the amount will be returned to your available balance.</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Only one withdrawal request can be in progress at a time. Please wait for the current one to be processed.</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Please verify your wallet details before submitting. Withdrawals cannot be modified after submission.</span>
            </div>
          </div>
        </div>
      </div>
      </form>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-sm shadow-lg ${
            toast.type === 'ok' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* 在途提现弹窗 — 同一时间只允许一笔,点提交时弹出说明 */}
      {pendingDialog && pendingWithdrawal && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 bg-black/70 z-40"
            onClick={() => setPendingDialog(false)}
          />
          {/* 弹窗 */}
          <div
            role="alertdialog"
            aria-modal="true"
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-sm bg-[#1a1a1a] border border-amber-500/40 rounded-2xl p-6 shadow-2xl shadow-black/60"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Withdrawal request in progress
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-5">
                {pendingWithdrawal.amount > 0 && (
                  <>Amount {pendingWithdrawal.amount.toFixed(2)} is awaiting review. </>
                )}{' '}
                You can submit a new request after this one is approved or rejected.
              </p>
              <div className="w-full space-y-2">
                <Link
                  to="/withdraw/history"
                  onClick={() => setPendingDialog(false)}
                  className="block w-full bg-[#c4f82a] text-black py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  View withdrawal history
                </Link>
                <button
                  onClick={() => setPendingDialog(false)}
                  className="w-full py-3 rounded-xl font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 禁提对话框 — 后端 ban_withdraw 拦截时弹出 */}
      {bannedDialog && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 bg-black/70 z-40"
            onClick={() => setBannedDialog(false)}
          />
          {/* 弹窗 */}
          <div
            role="alertdialog"
            aria-modal="true"
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-sm bg-[#1a1a1a] border border-red-500/40 rounded-2xl p-6 shadow-2xl shadow-black/60"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center mb-4">
                <ShieldOff className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                Withdrawal Banned
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-5">
                You have been banned from withdrawing funds.
              </p>
              <button
                onClick={() => setBannedDialog(false)}
                className="w-full bg-[#c4f82a] text-black py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                OK
              </button>
            </div>
          </div>
        </>
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
