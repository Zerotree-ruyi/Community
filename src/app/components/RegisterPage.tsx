import { Mail, Lock, Eye, EyeOff, User, Gift, Wallet, AlertCircle, Loader2, CheckCircle2, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSelector } from './LanguageSelector';
import registerDecoration from 'figma:asset/a79a50fec1d78cc9ef81aef367ae50acbe40700d.png';

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { register, loading, error, clearError, user } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [account, setAccount] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fundPassword, setFundPassword] = useState('');
  const [fundPasswordConfirm, setFundPasswordConfirm] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => () => clearError(), [clearError]);

  // 客户端即时校验(只做格式,不做唯一性)
  const accountOk = /^[A-Za-z0-9_一-龥]{4,20}$/.test(account);
  const passwordOk = password.length >= 6 && password.length <= 32;
  const fundPwdOk = /^\d{6}$/.test(fundPassword);
  const fundPwdMatch = fundPwdOk && fundPassword === fundPasswordConfirm;
  const inviteOk = inviteCode.length >= 1 && inviteCode.length <= 32;
  const allOk = accountOk && passwordOk && fundPwdOk && fundPwdMatch && inviteOk;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allOk || loading) return;
    const ok = await register({
      account, email, password,
      fundPassword, fundPasswordConfirm, inviteCode,
    });
    if (ok) navigate('/');
  };

  const errorMsg = (() => {
    if (!error) return null;
    if (error === 'account_taken') return t('auth.errors.accountTaken');
    if (error === 'invalid_account') return t('auth.errors.invalidAccount');
    if (error === 'invalid_password') return t('auth.errors.invalidPassword');
    if (error === 'invalid_fund_password') return t('auth.errors.invalidFundPassword');
    if (error === 'fund_password_mismatch') return t('auth.fundPasswordMismatch');
    if (error === 'invalid_invite_code') return t('auth.inviteCodeRequired');
    if (error === 'account_disabled') return t('auth.errors.accountDisabled');
    if (error === 'invalid_input') return t('auth.errors.invalidInput');
    return t('auth.errors.network');
  })();

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Header — 注册页无返回键 */}
      <div className="flex items-center justify-center p-4 relative">
        <h1 className="text-lg font-medium">{t('register.title')}</h1>
        <button
          onClick={() => setShowLanguageSelector(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
          aria-label="Change language"
        >
          <Globe className="w-4 h-4" />
        </button>
      </div>

      {/* Welcome */}
      <div className="relative px-6 pt-4 pb-6">
        <img
          src={registerDecoration}
          alt="Welcome decoration"
          className="absolute right-0 top-0 w-64 h-40 object-contain opacity-90"
        />
        <div className="relative z-10">
          <h2 className="text-2xl font-medium mb-1">{t('register.welcome')}</h2>
          <p className="text-gray-400">{t('register.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-6">
        <button
          onClick={() => navigate('/login')}
          className="flex-1 pb-3 relative text-gray-500"
        >
          <span className="font-medium">{t('login.login')}</span>
        </button>
        <button className="flex-1 pb-3 relative text-white">
          <span className="font-medium">{t('login.register')}</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c4f82a]" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-6 overflow-y-auto pb-6">
        <form onSubmit={handleRegister}>
          {/* Account */}
          <Field
            label={t('register.username')}
            required
            icon={<User className="w-5 h-5 text-gray-500" />}
          >
            <input
              type="text"
              value={account}
              onChange={(e) => { setAccount(e.target.value); if (error) clearError(); }}
              placeholder={t('register.usernamePlaceholder')}
              autoComplete="username"
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60"
            />
            {account.length > 0 && (
              <StatusIcon ok={accountOk} />
            )}
          </Field>
          {account.length > 0 && !accountOk && (
            <FieldHint>{t('auth.accountHint')}</FieldHint>
          )}

          {/* Email (UI 保留,后端忽略) */}
          <Field
            label={t('register.email')}
            icon={<Mail className="w-5 h-5 text-gray-500" />}
          >
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('register.emailPlaceholder')}
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60"
            />
          </Field>

          {/* Login Password */}
          <Field
            label={t('register.password')}
            required
            icon={<Lock className="w-5 h-5 text-gray-500" />}
          >
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) clearError(); }}
              placeholder={t('register.passwordPlaceholder')}
              autoComplete="new-password"
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
            </button>
          </Field>
          {password.length > 0 && !passwordOk && (
            <FieldHint>{t('auth.passwordHint')}</FieldHint>
          )}

          {/* Fund Password */}
          <Field
            label={t('auth.fundPassword')}
            required
            icon={<Wallet className="w-5 h-5 text-gray-500" />}
          >
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={fundPassword}
              onChange={(e) => setFundPassword(e.target.value.replace(/\D/g, ''))}
              placeholder={t('auth.fundPasswordPlaceholder')}
              autoComplete="new-password"
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60 tracking-widest"
            />
            {fundPassword.length > 0 && <StatusIcon ok={fundPwdOk} />}
          </Field>
          {fundPassword.length > 0 && !fundPwdOk && (
            <FieldHint>{t('auth.fundPasswordInvalid')}</FieldHint>
          )}

          {/* Confirm Fund Password */}
          <Field
            label={t('auth.fundPasswordConfirm')}
            required
            icon={<Lock className="w-5 h-5 text-gray-500" />}
          >
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={fundPasswordConfirm}
              onChange={(e) => setFundPasswordConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder={t('auth.fundPasswordConfirmPlaceholder')}
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60 tracking-widest"
            />
            {fundPasswordConfirm.length > 0 && <StatusIcon ok={fundPwdMatch} />}
          </Field>
          {fundPasswordConfirm.length > 0 && !fundPwdMatch && (
            <FieldHint>{t('auth.fundPasswordMismatch')}</FieldHint>
          )}

          {/* Invite Code (现在必填) */}
          <Field
            label={t('register.invitation')}
            required
            icon={<Gift className="w-5 h-5 text-gray-500" />}
          >
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value); if (error) clearError(); }}
              placeholder={t('register.invitationPlaceholder')}
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600 disabled:opacity-60"
            />
            {inviteCode.length > 0 && <StatusIcon ok={inviteOk} />}
          </Field>

          {/* Error banner */}
          {errorMsg && (
            <div
              role="alert"
              className="mt-4 mb-2 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!allOk || loading}
            className="w-full mt-5 bg-[#c4f82a] text-black py-3.5 rounded-lg font-semibold hover:bg-[#b5e625] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('register.registerButton')}
          </button>

          {/* Terms */}
          <p className="text-center text-xs text-gray-500 mt-4">
            {t('register.terms')}{' '}
            <Link to="/regulatory" className="text-blue-400">
              {t('register.termsOfService')}
            </Link>
          </p>
        </form>
      </div>

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <LanguageSelector onClose={() => setShowLanguageSelector(false)} />
      )}
    </div>
  );
}

// ─── 小工具组件 ──────────────────────────────────────────────────────────────
function Field({
  label, required, icon, children,
}: {
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-400 mb-2">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="flex items-center border-b border-gray-700 focus-within:border-[#c4f82a] py-3 transition-colors">
        {icon}
        <div className="flex-1 flex items-center">{children}</div>
      </div>
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-amber-400 mb-3 -mt-2 ml-1">{children}</p>;
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="w-4 h-4 text-[#c4f82a] ml-2" />
    : <AlertCircle className="w-4 h-4 text-red-400 ml-2" />;
}
