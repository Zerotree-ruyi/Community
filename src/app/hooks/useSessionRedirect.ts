import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 登录页 / 注册页的「已经登了就回主页」守卫。
 *
 * ⚠️ 以前这两个页面只看 localStorage 里有没有 `exchange_user`,有就跳回主页。
 *    问题是那份数据可能是**脏的** —— 令牌早就失效了(在别的设备登录过、
 *    后台把他踢了、或者会话过期),但 localStorage 里的旧记录还在。
 *    客户实际看到的现象:
 *      · 想注册 → 一进 /register 被弹回主页,注册表单根本看不到
 *                 (客户原话:「注册的时候跳转到主页,无法注册」)
 *      · 想登录 → 一进 /login 也被弹回主页,于是「登录 → 跳主页 → 接口 403」
 *                 死循环,客户永远登不进去
 *
 * 现在改成先问服务器「这个令牌还有效吗」:
 *      valid   → 真登着 → 回主页
 *      invalid → 令牌已失效 → 清掉 localStorage 里那份脏数据,
 *                 留在当前页(能登录 / 能注册)
 *      unknown → 网络不通 / 后端没响应 → 先别动本地状态,留在当前页
 */
export function useSessionRedirect(): void {
  const { user, checkSession, logout } = useAuth();
  const navigate = useNavigate();

  // 只在挂载时判断一次。
  //   checkSession() 成功后会 persist(新用户对象) → user 引用变了 →
  //   如果把 user 放进依赖数组,effect 会重跑 → 又发一次请求 → 又改一次 user
  //   → 无限循环。所以这里用 ref 读最新值,依赖数组留空。
  const userRef = useRef(user);
  userRef.current = user;
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userRef.current) return;   // 本来就没登录 → 留在这一页
    if (checkedRef.current) return;
    checkedRef.current = true;

    let alive = true;
    checkSession()
      .then((state) => {
        if (!alive) return;
        if (state === 'valid') {
          try { navigate('/', { replace: true }); } catch { /* ignore */ }
        } else if (state === 'invalid') {
          // 令牌早失效了 —— localStorage 里那份是脏数据,清掉,
          // 客户才能安安心心在这页登录 / 注册
          logout();
        }
      })
      .catch(() => { /* ignore */ });

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
