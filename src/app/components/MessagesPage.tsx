/**
 * MessagesPage — 前台站内信(H5)
 *  - 顶部:左 返回箭头 + 中 网站消息
 *  - 列表:手风琴卡片,信封 + 时间
 *  - 展开:居中标题 + 正文
 *  - 再次点击折叠
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  id:         number;
  member_id:  number | null;
  title:      string;
  content:    string;
  sender:     string;
  send_time:  string;
  read_time:  string | null;
}

function fmtTime(iso: string): string {
  // 形如 2026-09-07 18:30:27
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function MessagesPage() {
  const { user } = useAuth();
  const [items, setItems]     = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);
  const [openId, setOpenId]   = useState<number | null>(null);

  const load = async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/messages/mine?member_id=${user.id}&limit=100`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || `HTTP ${r.status}`);
      setItems(d.data || []);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const toggle = (id: number) => {
    setOpenId(prev => prev === id ? null : id);
    // 标记已读
    if (openId !== id && user?.id) {
      fetch(`/api/messages/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: user.id }),
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1419] to-[#1a1f2e] text-white pb-20">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-center p-4 relative border-b border-gray-800">
        <Link to="/profile" className="absolute left-4">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <h1 className="text-lg">Site Messages</h1>
      </div>

      {/* 列表区 */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading…
          </div>
        ) : err ? (
          <div className="text-center py-12 text-red-400">{err}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Mail className="w-12 h-12 mb-3 opacity-30" />
            <div>No messages yet</div>
          </div>
        ) : (
          items.map(m => {
            const isOpen = openId === m.id;
            const isUnread = !m.read_time;
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`w-full text-left rounded-xl border transition-colors overflow-hidden ${
                  isUnread
                    ? "bg-gray-800/80 border-[#c4f82a]/40 hover:bg-gray-800"
                    : "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80"
                }`}
              >
                {/* 卡片头:信封 + 标题 + 时间 + 未读小红点 */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative ${
                      isOpen ? "bg-[#c4f82a]/20" : isUnread ? "bg-[#c4f82a]/10" : "bg-gray-700/60"
                    }`}>
                      <Mail className={`w-5 h-5 ${
                        isOpen || isUnread ? "text-[#c4f82a]" : "text-gray-300"
                      }`} />
                      {isUnread && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#0f1419]"
                          aria-label="Unread"
                        />
                      )}
                    </div>
                    <div className={`truncate ${isUnread ? "text-white font-semibold" : "text-gray-300 font-normal"}`}>
                      {m.title || "(No title)"}
                    </div>
                  </div>
                  <div className={`shrink-0 ml-3 text-xs ${isUnread ? "text-[#c4f82a]" : "text-gray-500"}`}>
                    {fmtTime(m.send_time)}
                  </div>
                </div>

                {/* 展开区:居中标题 + 正文 */}
                {isOpen && (
                  <div className="border-t border-gray-700/50 px-5 py-5">
                    <div className="text-center text-base font-semibold text-white mb-3">
                      {m.title || "(No title)"}
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                    <div className="text-right text-xs text-gray-500 mt-3">
                      —— {m.sender}
                    </div>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MessagesPage;