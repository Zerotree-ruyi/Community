/**
 * StrongPasswordField — 抗 Chrome 密码泄露警告的密码输入框
 *
 * 思路:
 *   1) 用户实际在 <input type="text"> 里输入 — Chrome 不会检查 type=text,
 *      所以不触发"密码数据泄露"警告。
 *   2) 视觉上用 `-webkit-text-security: disc` 让字符显示成 • 圆点,
 *      跟普通 type=password 看起来一样(支持眼睛图标切换明文/密文)。
 *   3) DOM 里再放一个隐藏的 <input type="password" readOnly> 给 Chrome 看,
 *      它的 value 是 safePwd(userInput) — 强密码。Chrome 看到的是这个,
 *      弹"保存密码"时存的就是这个 14 位乱码,而不是用户的弱密码。
 *   4) 调用方拿到的 onChange 是原始输入(明文),POST 时自己再 safePwd() 一次即可。
 *
 * 为什么不用 type="password" + value=safePwd(userInput) ?
 *   - safePwd 永远输出 14 字符;用户输入 1 位就会立刻变 14 位乱码,UX 灾难。
 *   - 这个组件让用户输入什么就显示什么(用 • 遮蔽),Chrome 看到的副本是强密码。
 *
 * 浏览器兼容性: -webkit-text-security 在 Chrome / Safari / Edge 都支持,
 *              Firefox 不支持 — 但 Firefox 不弹 Chrome 那种泄露警告,无所谓。
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { safePwd } from '../utils/safePwd';

interface Props {
  /** 原始用户输入(明文) */
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'numeric' | 'text' | 'decimal';
  maxLength?: number;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
  /** 主输入框的额外 class(用来调 py / 字距,配合外层下划线样式) */
  inputClassName?: string;
  /** 输入框左侧图标 */
  icon?: React.ReactNode;
  /** 输入字符过滤器(默认只允许数字) */
  filter?: (s: string) => string;
}

export function StrongPasswordField({
  value,
  onChange,
  placeholder = 'Enter password',
  inputMode = 'numeric',
  maxLength = 6,
  autoComplete = 'new-password',
  disabled = false,
  className = '',
  inputClassName = '',
  icon = null,
  filter = (s) => s.replace(/\D/g, ''),
}: Props) {
  const [show, setShow] = useState(false);
  // 给 Chrome 看的"假密码" = safePwd(用户输入) — 永远 14 位 base62 强密码
  const maskedForChrome = safePwd(value);

  return (
    <div
      className={`flex items-center bg-[#1a1a1a] rounded-xl border border-transparent focus-within:border-[#c4f82a] transition-colors px-4 ${className}`}
    >
      {/* 左侧图标(可选) */}
      {icon}

      {/* ── 主输入:用户在这里输入(视觉上像密码) ── */}
      <input
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(filter(e.target.value).slice(0, maxLength))}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-label="password input"
        // 关键:type="text" + -webkit-text-security → 视觉上是 • 但 Chrome 不管它
        style={{ WebkitTextSecurity: show ? 'none' : 'disc' }}
        className={`flex-1 bg-transparent outline-none py-4 text-white placeholder:text-gray-600 tracking-widest disabled:opacity-60 ${inputClassName}`}
      />

      {/* ── 隐藏的 password input:Chrome 看到的"密码" ── */}
      {/*   - 视觉不可见(屏幕外 1px 透明)
          - 仍然在 DOM 中,Chrome 的密码检查能扫到
          - value = safePwd(用户输入) = 14 位 base62 强密码
          - readOnly 防用户误触,Tab 键跳过
          - 表单 submit 时这个 input 也算,后端可以直接读它 */}
      <input
        type="password"
        value={maskedForChrome}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        data-strong-pwd="1"
        name="__strong_password__"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '0',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      <button
        type="button"
        onClick={() => setShow(!show)}
        className="ml-2 text-gray-500"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
}
