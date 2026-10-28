/**
 * 标签页记忆(Tab State Memory)
 *
 * 后台是「多标签页」结构:侧栏点一个页面就开一个标签,标签栏上可以 × 掉。
 * 页面组件在切换标签时会卸载 → 组件里的 useState 全部丢失,
 * 所以管理员在「会员列表」搜了账号,切到「数字钱包」再切回来,
 * 搜索框里的字就没了 —— 每次都要重敲一遍。
 *
 * 这里把每个页面的搜索条件存在标签页级别的 store 里:
 *   - 切走再切回来 → 搜索条件自动恢复(列表也按上次的条件重新查)
 *   - 点了标签上的 × 关掉这个标签 → 这个标签的记忆全部清空
 *
 * store 放在 AdminShell 里(它一直挂载),用 ref 存,不触发重渲染,
 * 页面只在挂载时读一次初始值。
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type TabStore = {
  /** 读取某个键记住的值,没有则 undefined */
  get: <T>(key: string) => T | undefined;
  /** 记住一个值 */
  set: (key: string, value: unknown) => void;
  /** 清掉某个页面的全部记忆(关掉标签时调用) */
  clearPage: (page: string) => void;
};

const TabStateCtx = createContext<TabStore | null>(null);

// 记忆同时存 sessionStorage —— 刷新浏览器(F5)也不丢,
// 换一个新标签页/新开会话就是干净的。
const STORE_KEY = "admin:tabstate";

function readStore(): Map<string, unknown> {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return new Map();
    return new Map(Object.entries(obj));
  } catch { return new Map(); }
}

function writeStore(m: Map<string, unknown>) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(m)));
  } catch { /* 存不了就算了,内存里的还在 */ }
}

export function TabStateProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<Map<string, unknown>>(readStore());

  const store = useMemo<TabStore>(() => ({
    get: <T,>(key: string) => storeRef.current.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      storeRef.current.set(key, value);
      writeStore(storeRef.current);
    },
    clearPage: (page: string) => {
      const prefix = `${page}:`;
      for (const k of Array.from(storeRef.current.keys())) {
        if (k.startsWith(prefix)) storeRef.current.delete(k);
      }
      writeStore(storeRef.current);
    },
  }), []);

  return <TabStateCtx.Provider value={store}>{children}</TabStateCtx.Provider>;
}

export function useTabStore(): TabStore {
  const ctx = useContext(TabStateCtx);
  if (!ctx) throw new Error("useTabStore 必须在 <TabStateProvider> 内使用");
  return ctx;
}

/**
 * 页面级搜索条件记忆 —— 用法跟 useState 一样:
 *   const [keyword, setKeyword] = useTabFilter("members", "keyword", "");
 *
 * @param page  页面 id(和 Page 类型一致,用于关标签时整页清空)
 * @param name  这一页里的字段名
 * @param initial 初始值
 */
export function useTabFilter<T>(
  page: string,
  name: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const store = useTabStore();
  const key = `${page}:${name}`;

  // 首次挂载时从记忆里恢复(切走再切回来就是这里生效)
  const [value, setValue] = useState<T>(() => store.get<T>(key) ?? initial);

  // 值变了就写回记忆
  useEffect(() => { store.set(key, value); }, [store, key, value]);

  return [value, setValue];
}
