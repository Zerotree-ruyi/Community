/**
 * LoginPasswordPage — 修改登录密码
 *
 * 流程:
 *  1) 从 AuthContext 拿当前登录用户(member_id)
 *  2) 三段校验:
 *     - 旧密码非空
 *     - 新密码 6-32 位
 *     - 新密码 = 旧密码 → 拒绝
 *     - 确认密码 = 新密码
 *  3) POST /api/auth/change-password
 *  4) 成功后提示用户重新登录(后端没强制踢下线,这里只提示)
 */

import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function LoginPasswordPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // 客户端兜底校验 — 即时反馈,不浪费一次 API 调用
  const validation = useMemo(() => {
    if (!oldPwd) return { ok: false, msg: '' };
    if (newPwd && (newPwd.length < 6 || newPwd.length > 32))
      return { ok: false, msg: 'Password must be 6–32 characters' };
    if (newPwd && oldPwd === newPwd)
      return { ok: false, msg: 'New password cannot be the same as the old one' };
    if (confirmPwd && newPwd !== confirmPwd)
      return { ok: false, msg: 'The two new passwords do not match' };
    return { ok: true, msg: '' };
  }, [oldPwd, newPwd, confirmPwd]);

  const canSubmit =
    user?.id &&
    oldPwd &&
    newPwd.length >= 6 &&
    newPwd.length <= 32 &&
    oldPwd !== newPwd &&
    newPwd === confirmPwd &&
    status.kind !== 'submitting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!user?.id) {
      setStatus({ kind: 'error', message: 'Please log in first' });
      return;
    }

    setStatus({ kind: 'submitting' });
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: user.id,
          old_password: oldPwd,
          new_password: newPwd,
        }),
      });
      const data = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        // Map backend error codes to user-facing messages
        const msg =
          data?.error === 'wrong_old_password' ? 'Old password is incorrect' :
          data?.error === 'invalid_password'    ? 'New password must be 6–32 characters' :
          data?.error === 'same_password'       ? 'New password cannot be the same as the old one' :
          data?.error === 'account_disabled'    ? 'This account has been disabled' :
          data?.error === 'not_found'           ? 'Member does not exist' :
          data?.message || `Update failed (${r.status})`;
        setStatus({ kind: 'error', message: msg });
        return;
      }
      setStatus({ kind: 'success', message: 'Login password updated. Please use the new password next time.' });
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
      // 2 秒后自动返回安全中心
      setTimeout(() => navigate('/security'), 1800);
    } catch (err: any) {
      setStatus({ kind: 'error', message: err?.message || 'Network error. Please try again.' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/security" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">{t('loginPassword.title')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-6">
        <div className="space-y-4">
          {/* Old Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('loginPassword.oldPassword')}</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPwd}
                onChange={(e) => { setOldPwd(e.target.value); setStatus({ kind: 'idle' }); }}
                placeholder={t('loginPassword.oldPasswordPlaceholder')}
                autoComplete="current-password"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
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

          {/* New Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('loginPassword.newPassword')}</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => { setNewPwd(e.target.value); setStatus({ kind: 'idle' }); }}
                placeholder={t('loginPassword.newPasswordPlaceholder')}
                autoComplete="new-password"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
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
            <div className="text-xs text-gray-500 mt-2">{t('loginPassword.passwordRule')}</div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">{t('loginPassword.confirmPassword')}</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => { setConfirmPwd(e.target.value); setStatus({ kind: 'idle' }); }}
                placeholder={t('loginPassword.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4f82a]"
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

          {/* 实时校验提示(只在用户已经输入新密码之后才显示) */}
          {newPwd && validation.msg && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4" />
              {validation.msg}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-4 rounded-xl mt-8 transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-[#c4f82a] to-green-500 text-black'
              : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
          }`}
        >
          {status.kind === 'submitting' ? 'Submitting…' : t('loginPassword.confirmChange')}
        </button>

        {/* 状态提示 */}
        {status.kind === 'success' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {status.message}
          </div>
        )}
        {status.kind === 'error' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {status.message}
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-2">{t('loginPassword.tips')}</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• {t('loginPassword.tip1')}</li>
            <li>• {t('loginPassword.tip2')}</li>
            <li>• {t('loginPassword.tip3')}</li>
            <li>• {t('loginPassword.tip4')}</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
