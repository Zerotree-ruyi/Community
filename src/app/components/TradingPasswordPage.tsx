/**
 * TradingPasswordPage — 修改资金密码
 *
 * 重要:虽文件/路由名仍是 trading-password(避免改太多路由),
 *      实际 UI / 接口已统一为 "资金密码" (fund password)
 *
 * 流程:
 *  1) 从 AuthContext 取 member_id
 *  2) 通过 /api/members/:id 拿 fund_password 是否已设置(后端 SELECT fund_password 不返回密码本身)
 *  3) 表单:
 *     - 已设置:旧资金密码 + 新密码 + 确认
 *     - 未设置:跳过旧密码,直接设置
 *  4) 校验:新密码必须 6 位数字,确认 = 新密码
 *  5) POST /api/auth/change-fund-password
 */

import { ArrowLeft, Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function TradingPasswordPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 当前资金密码是否已设置 — 决定是否显示"旧密码"输入框
  const [hasFundPassword, setHasFundPassword] = useState<boolean | null>(null);
  const [oldPwd, setOldPwd]   = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [showOld, setShowOld]         = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  // 进入页面时,查询当前会员是否已设置资金密码
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setStatus({ kind: 'error', message: '请先登录' });
        return;
      }
      try {
        const r = await fetch(`/api/members/${user.id}`);
        const data = await r.json().catch(() => ({} as any));
        if (cancelled) return;
        if (!r.ok) {
          setStatus({ kind: 'error', message: 'Failed to load account info' });
          return;
        }
        // 后端 SELECT SAFE_USER_COLS 不包含 fund_password 字段,
        // 这里用另一个语义字段 fund_password_set 替代 — 详见 schema 注释
        // 实际上 SAFE_USER_COLS 也没暴露任何密码字段,统一约定:
        //   拿到 has_fund_password: true  → 已设置
        //   没拿到或 false               → 未设置
        const set = data?.has_fund_password === true || data?.member?.has_fund_password === true;
        setHasFundPassword(set);
        setStatus({ kind: 'idle' });
      } catch (e: any) {
        if (!cancelled) setStatus({ kind: 'error', message: e?.message || 'Network error' });
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 实时校验
  const validation = useMemo(() => {
    if (hasFundPassword && !oldPwd) return { ok: false, msg: 'Please enter your current fund password' };
    if (newPwd && !/^\d{6}$/.test(newPwd))
      return { ok: false, msg: 'Fund password must be exactly 6 digits' };
    if (hasFundPassword && oldPwd && newPwd && oldPwd === newPwd)
      return { ok: false, msg: 'New fund password cannot be the same as the old one' };
    if (confirmPwd && newPwd !== confirmPwd)
      return { ok: false, msg: 'The two fund passwords do not match' };
    return { ok: true, msg: '' };
  }, [hasFundPassword, oldPwd, newPwd, confirmPwd]);

  const canSubmit =
    user?.id &&
    hasFundPassword !== null &&
    (!hasFundPassword || oldPwd) &&
    /^\d{6}$/.test(newPwd) &&
    newPwd === confirmPwd &&
    (!hasFundPassword || oldPwd !== newPwd) &&
    status.kind !== 'submitting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user?.id) return;
    setStatus({ kind: 'submitting' });
    try {
      const r = await fetch('/api/auth/change-fund-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: user.id,
          old_fund_password: hasFundPassword ? oldPwd : undefined,
          new_fund_password: newPwd,
        }),
      });
      const data = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        const msg =
          data?.error === 'wrong_old_password'    ? 'Current fund password is incorrect' :
          data?.error === 'invalid_fund_password' ? 'Fund password must be 6 digits' :
          data?.error === 'same_password'         ? 'New fund password cannot be the same as the old one' :
          data?.error === 'account_disabled'      ? 'This account has been disabled' :
          data?.error === 'not_found'             ? 'Member does not exist' :
          data?.message || `Update failed (${r.status})`;
        setStatus({ kind: 'error', message: msg });
        return;
      }
      setStatus({
        kind: 'success',
        message: data.wasSet ? 'Fund password updated successfully' : 'Fund password set successfully',
      });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      setHasFundPassword(true);
      setTimeout(() => navigate('/security'), 1800);
    } catch (err: any) {
      setStatus({ kind: 'error', message: err?.message || 'Network error. Please try again.' });
    }
  };

  const pageTitle =
    hasFundPassword ? t('tradingPassword.title') : t('tradingPassword.setTitle');
  const submitLabel =
    hasFundPassword ? t('tradingPassword.confirmChange') : t('tradingPassword.confirmSet');

  if (status.kind === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/security" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">{pageTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-6">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-[#3a4a2a] to-[#2a3a2a] rounded-xl p-4 border border-[#c4f82a]/30 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-[#c4f82a]" />
            <span className="text-sm">About Fund Password</span>
          </div>
          <div className="text-xs text-gray-400">
            The fund password (formerly "trading password") is used for withdrawals and important operation verification. Please keep it safe.
          </div>
        </div>

        <div className="space-y-4">
          {/* Current Password (only if has fund password) */}
          {hasFundPassword && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Current Fund Password</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPwd}
                  onChange={(e) => { setOldPwd(e.target.value); setStatus({ kind: 'idle' }); }}
                  placeholder="Enter your current 6-digit fund password"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="current-password"
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a] tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              {hasFundPassword ? 'New Fund Password' : 'Set Fund Password'}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => { setNewPwd(e.target.value.replace(/\D/g, '').slice(0, 6)); setStatus({ kind: 'idle' }); }}
                placeholder="Enter a 6-digit fund password"
                inputMode="numeric"
                maxLength={6}
                autoComplete="new-password"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a] tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">Fund password must be exactly 6 digits</div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Confirm Fund Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => { setConfirmPwd(e.target.value.replace(/\D/g, '').slice(0, 6)); setStatus({ kind: 'idle' }); }}
                placeholder="Re-enter the fund password"
                inputMode="numeric"
                maxLength={6}
                autoComplete="new-password"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a] tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 实时校验提示 */}
          {((hasFundPassword && oldPwd) || newPwd || confirmPwd) && validation.msg && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4" />
              {validation.msg}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-4 rounded-xl mt-8 transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-[#c4f82a] to-green-500 text-black'
              : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
          }`}
        >
          {status.kind === 'submitting' ? 'Submitting…' : submitLabel}
        </button>

        {/* 状态提示 */}
        {status.kind === 'success' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {status.message}
          </div>
        )}
        {status.kind === 'error' && status.message !== 'Please log in first' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {status.message}
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">Security Tips:</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• The fund password must be exactly 6 digits.</li>
            <li>• Avoid simple passwords such as 123456.</li>
            <li>• The fund password cannot be the same as your login password.</li>
            <li>• Used for withdrawals, transfers, and other important operations.</li>
            <li>• If you forget it, please contact customer support to reset.</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
