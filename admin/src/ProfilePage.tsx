/**
 * ProfilePage — 管理员个人中心
 *
 * 三大区块:
 *  1. 个人资料 — 只读,显示账号 / 显示名 / 角色 / 创建时间 / 最后登录时间
 *  2. 修改密码 — 旧密码 / 新密码 / 确认密码
 *  3. 邀请码   — 当前邀请码 + "重新生成" 按钮(可复制)
 */

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useAuth } from './auth';

const ROLE_LABEL: Record<string, string> = {
  super: '超级管理员', admin: '管理员', operator: '运营人员',
};

export function ProfilePage() {
  const { user, changePassword, regenerateInvite } = useAuth();

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [copied, setCopied] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenMsg, setRegenMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (!user) return null;

  const newPwdTooShort = newPwd.length > 0 && newPwd.length < 6;
  const newPwdTooLong  = newPwd.length > 32;
  const pwdMismatch    = confirmPwd.length > 0 && newPwd !== confirmPwd;
  const canSubmitPwd   = oldPwd.length > 0 && newPwd.length >= 6 && newPwd.length <= 32 && newPwd === confirmPwd && !pwdBusy;

  const onSubmitPwd = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmitPwd) return;
    setPwdBusy(true); setPwdMsg(null);
    const res = await changePassword(user.id, oldPwd, newPwd);
    setPwdBusy(false);
    if (res.ok) {
      setPwdMsg({ kind: 'ok', text: '密码修改成功,请下次登录使用新密码' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } else {
      const txt = res.code === 'wrong_password' ? '旧密码错误'
        : res.code === 'invalid_password'   ? '新密码需 6-32 位'
        : res.message || '修改失败,请重试';
      setPwdMsg({ kind: 'err', text: txt });
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(user.invite_code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.getElementById('invite-code-text');
      if (el) {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  const onRegen = async () => {
    if (regenBusy) return;
    if (!confirm('确定要重新生成邀请码吗?旧邀请码将立即失效。')) return;
    setRegenBusy(true); setRegenMsg(null);
    const res = await regenerateInvite(user.id);
    setRegenBusy(false);
    if (res.ok) setRegenMsg({ kind: 'ok', text: '邀请码已更新' });
    else setRegenMsg({ kind: 'err', text: res.message || '生成失败' });
  };

  const fmt = (s: string | null) => s ? s.replace('T', ' ').replace(/\..*$/, '') : '—';

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      {/* 区块 1: 个人资料 */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span style={{ fontSize: 16 }}>👤</span>
          <span style={cardTitleStyle}>个人资料</span>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={gridStyle}>
            <Field label="账号" value={user.username} />
            <Field label="显示名" value={user.display_name || '—'} />
            <Field label="角色" value={ROLE_LABEL[user.role] ?? user.role} badge={user.role === 'super' ? 'red' : 'blue'} />
            <Field label="状态" value={user.status === 1 ? '正常' : '已禁用'} badge={user.status === 1 ? 'green' : 'gray'} />
            <Field label="注册时间" value={fmt(user.created_at)} />
            <Field label="最后登录" value={fmt(user.last_login_time)} />
          </div>
        </div>
      </div>

      {/* 区块 2: 修改密码 */}
      <div style={{ ...cardStyle, marginTop: 18 }}>
        <div style={cardHeaderStyle}>
          <span style={{ fontSize: 16 }}>🔑</span>
          <span style={cardTitleStyle}>修改密码</span>
        </div>
        <form onSubmit={onSubmitPwd} style={{ padding: '20px 24px' }}>
          <div style={gridStyle}>
            <PasswordField
              label="旧密码"
              value={oldPwd}
              onChange={setOldPwd}
              placeholder="请输入旧密码"
              disabled={pwdBusy}
            />
            <PasswordField
              label="新密码"
              value={newPwd}
              onChange={setNewPwd}
              placeholder="6-32 位"
              disabled={pwdBusy}
              error={newPwdTooShort || newPwdTooLong ? `长度需 6-32 位 (当前 ${newPwd.length})` : null}
            />
            <PasswordField
              label="确认密码"
              value={confirmPwd}
              onChange={setConfirmPwd}
              placeholder="再次输入新密码"
              disabled={pwdBusy}
              error={pwdMismatch ? '两次输入不一致' : null}
            />
          </div>

          {pwdMsg && (
            <div style={{
              ...msgBoxStyle,
              background: pwdMsg.kind === 'ok' ? '#f6ffed' : '#fff1f0',
              border: `1px solid ${pwdMsg.kind === 'ok' ? '#b7eb8f' : '#ffa39e'}`,
              color: pwdMsg.kind === 'ok' ? '#389e0d' : '#cf1322',
            }}>
              <span>{pwdMsg.kind === 'ok' ? '✓' : '⚠'}</span>
              {pwdMsg.text}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <button
              type="submit"
              disabled={!canSubmitPwd}
              style={{
                padding: '9px 24px',
                background: canSubmitPwd ? 'linear-gradient(135deg,#1890ff,#096dd9)' : '#d9d9d9',
                color: 'white', border: 'none', borderRadius: 5,
                fontSize: 14, fontWeight: 600,
                cursor: canSubmitPwd ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {pwdBusy && <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span>}
              {pwdBusy ? '提交中...' : '确认修改'}
            </button>
          </div>
        </form>
      </div>

      {/* 区块 3: 邀请码 */}
      <div style={{ ...cardStyle, marginTop: 18 }}>
        <div style={cardHeaderStyle}>
          <span style={{ fontSize: 16 }}>🎁</span>
          <span style={cardTitleStyle}>我的邀请码</span>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#666', lineHeight: 1.7 }}>
            分享此邀请码,新用户在前台注册时填写即可绑定为您推广的下线。
            重新生成后旧邀请码立即失效,请谨慎操作。
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px',
            background: 'linear-gradient(135deg,#fff7e6,#fff1f0)',
            border: '1px solid #ffd591',
            borderRadius: 8,
          }}>
            <span id="invite-code-text" style={{
              fontFamily: 'Consolas, Menlo, monospace',
              fontSize: 22, fontWeight: 700, color: '#d4380d',
              letterSpacing: 2,
              flex: 1,
            }}>{user.invite_code || '(尚未生成)'}</span>
            <button
              type="button"
              onClick={onCopy}
              style={{
                padding: '7px 14px',
                background: 'white', color: '#d4380d',
                border: '1px solid #ffbb96', borderRadius: 4,
                fontSize: 13, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              {copied ? '✓ 已复制' : '📋 复制'}
            </button>
            <button
              type="button"
              onClick={onRegen}
              disabled={regenBusy}
              style={{
                padding: '7px 14px',
                background: 'linear-gradient(135deg,#fa8c16,#d46b08)',
                color: 'white', border: 'none', borderRadius: 4,
                fontSize: 13, cursor: regenBusy ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                opacity: regenBusy ? 0.6 : 1,
              }}
            >
              {regenBusy ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span> : '↻'}
              重新生成
            </button>
          </div>
          {regenMsg && (
            <div style={{
              ...msgBoxStyle,
              marginTop: 12,
              background: regenMsg.kind === 'ok' ? '#f6ffed' : '#fff1f0',
              border: `1px solid ${regenMsg.kind === 'ok' ? '#b7eb8f' : '#ffa39e'}`,
              color: regenMsg.kind === 'ok' ? '#389e0d' : '#cf1322',
            }}>
              <span>{regenMsg.kind === 'ok' ? '✓' : '⚠'}</span>
              {regenMsg.text}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value: string; badge?: 'red' | 'blue' | 'green' | 'gray' }) {
  const badgeColor: Record<string, string> = {
    red: '#f5222d', blue: '#1890ff', green: '#52c41a', gray: '#999',
  };
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>
        {badge
          ? <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 4,
              background: `${badgeColor[badge]}15`,
              color: badgeColor[badge],
              fontSize: 12, fontWeight: 600,
            }}>{value}</span>
          : value}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, disabled, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; error?: string | null;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</div>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', padding: '8px 12px',
          border: `1px solid ${error ? '#ff7875' : '#d9d9d9'}`,
          borderRadius: 5, fontSize: 14, color: '#333',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      {error && (
        <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: 'white',
  borderRadius: 8,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  overflow: 'hidden',
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 24px',
  borderBottom: '1px solid #f0f0f0',
  background: '#fafafa',
};

const cardTitleStyle: CSSProperties = {
  fontSize: 14, fontWeight: 600, color: '#333',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '20px 28px',
};

const msgBoxStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 12px', marginTop: 14,
  borderRadius: 4, fontSize: 13,
};