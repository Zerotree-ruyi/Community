/**
 * My Wallets — Bank cards + crypto wallets in two tabs. Card list + add/edit/delete + set default.
 *
 * Route: /my-wallets  (RequireAuth)
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError, BankWallet, DigitalWallet } from "../api";

type Tab = "bank" | "digital";
type BankDraft = Omit<BankWallet, "id" | "member_id" | "created_at">;
type DigitalDraft = Omit<DigitalWallet, "id" | "member_id" | "created_at">;

export function MyWalletsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("bank");

  const [banks, setBanks] = useState<BankWallet[]>([]);
  const [digitals, setDigitals] = useState<DigitalWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ kind: Tab; id: number | null } | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [b, d] = await Promise.all([
        api.listBankWallets(user.id),
        api.listDigitalWallets(user.id),
      ]);
      setBanks(b.data);
      setDigitals(d.data);
    } catch (e) {
      showToast("err", e instanceof ApiError ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // 打开新增/编辑模态框
  const openAdd = () => { setEditing({ kind: tab, id: null }); setModalOpen(true); };
  const openEdit = (id: number) => { setEditing({ kind: tab, id }); setModalOpen(true); };

  const onDelete = async (id: number) => {
    if (!user) return;
    if (!window.confirm("Delete this wallet? This cannot be undone.")) return;
    try {
      if (tab === "bank") {
        await api.deleteBankWallet(user.id, id);
      } else {
        await api.deleteDigitalWallet(user.id, id);
      }
      showToast("ok", "Deleted");
      reload();
    } catch (e) {
      showToast("err", e instanceof ApiError ? e.message : "Delete failed");
    }
  };

  const onSetDefault = async (id: number) => {
    if (!user) return;
    try {
      if (tab === "bank") {
        await api.updateBankWallet(user.id, id, { is_default: 1 });
      } else {
        await api.updateDigitalWallet(user.id, id, { is_default: 1 });
      }
      showToast("ok", "Set as default");
      reload();
    } catch (e) {
      showToast("err", e instanceof ApiError ? e.message : "Operation failed");
    }
  };

  if (!user) return null;

  const list = tab === "bank" ? banks : digitals;

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-6 text-white">
      {/* Header — 居中标题 + 左上角返回 */}
      <div className="relative mb-6 flex items-center justify-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-0 p-2 -ml-2 text-white/80 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">My Wallets</h1>
      </div>
      <p className="mb-6 text-sm text-white/60 text-center">
        Add a wallet before withdrawing. Withdrawals can only be sent to wallets on file.
      </p>

      {/* Tab 切换 */}
      <div className="mb-4 flex gap-2 rounded-lg bg-white/5 p-1">
        <button
          onClick={() => setTab("bank")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "bank" ? "bg-amber-500 text-black" : "text-white/70 hover:text-white"
          }`}
        >
          Bank Cards ({banks.length})
        </button>
        <button
          onClick={() => setTab("digital")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "digital" ? "bg-amber-500 text-black" : "text-white/70 hover:text-white"
          }`}
        >
          Crypto Wallets ({digitals.length})
        </button>
      </div>

      {/* 添加按钮 */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={openAdd}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          + Add {tab === "bank" ? "Bank Card" : "Crypto Wallet"}
        </button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="py-12 text-center text-white/60">Loading...</div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 py-16 text-center">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-white/60">No wallets yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "bank"
            ? banks.map((w) => (
                <BankCard
                  key={w.id}
                  w={w}
                  onEdit={() => openEdit(w.id)}
                  onDelete={() => onDelete(w.id)}
                  onSetDefault={() => onSetDefault(w.id)}
                />
              ))
            : digitals.map((w) => (
                <DigitalCard
                  key={w.id}
                  w={w}
                  onEdit={() => openEdit(w.id)}
                  onDelete={() => onDelete(w.id)}
                  onSetDefault={() => onSetDefault(w.id)}
                />
              ))}
        </div>
      )}

      {/* 模态框 */}
      {modalOpen && editing && (
        <WalletEditModal
          kind={editing.kind}
          id={editing.id}
          userId={user.id}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); reload(); }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] rounded-lg px-6 py-3 text-base shadow-2xl ${
            toast.type === "ok" ? "bg-emerald-500 text-white" : "bg-red-500 text-white font-medium"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── 银行卡卡片 ──────────────────────────────────────────────────────────────
function BankCard({
  w, onEdit, onDelete, onSetDefault,
}: { w: BankWallet; onEdit: () => void; onDelete: () => void; onSetDefault: () => void; }) {
  return (
    <div className="rounded-lg bg-white/5 p-4 hover:bg-white/10">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-semibold">{w.bank_name}</span>
            {w.is_default === 1 && (
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">Default</span>
            )}
          </div>
          <div className="text-sm text-white/70 space-y-0.5">
            <div>A/C No: <span className="text-white">{maskCard(w.card_no)}</span></div>
            <div>Holder: {w.holder}</div>
            {w.id_number && <div>ID Number: {maskIdNumber(w.id_number)}</div>}
            <div>Branch: {w.branch || "-"}</div>
            <div>IFSC: {w.ifsc || "-"}</div>
            {w.contact && <div>Contact: {w.contact}</div>}
            {w.notes && <div className="text-white/50">Remark: {w.notes}</div>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 ml-3">
          {w.is_default !== 1 && (
            <button onClick={onSetDefault} className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Set Default</button>
          )}
          <button onClick={onEdit} className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Edit</button>
          <button onClick={onDelete} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── 数字币卡片 ──────────────────────────────────────────────────────────────
function DigitalCard({
  w, onEdit, onDelete, onSetDefault,
}: { w: DigitalWallet; onEdit: () => void; onDelete: () => void; onSetDefault: () => void; }) {
  return (
    <div className="rounded-lg bg-white/5 p-4 hover:bg-white/10">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-semibold">{w.type1}</span>
            <span className="text-xs text-white/60">({w.type2})</span>
            {w.is_default === 1 && (
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">Default</span>
            )}
          </div>
          <div className="text-sm text-white/70 space-y-0.5">
            <div className="break-all">Address: <span className="text-white font-mono text-xs">{maskAddress(w.address)}</span></div>
            {w.notes && <div className="text-white/50">Remark: {w.notes}</div>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 ml-3">
          {w.is_default !== 1 && (
            <button onClick={onSetDefault} className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Set Default</button>
          )}
          <button onClick={onEdit} className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Edit</button>
          <button onClick={onDelete} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── 模态框 ──────────────────────────────────────────────────────────────────
function WalletEditModal({
  kind, id, userId, onClose, onSaved, showToast,
}: {
  kind: Tab; id: number | null; userId: number;
  onClose: () => void; onSaved: () => void;
  showToast: (t: "ok" | "err", m: string) => void;
}) {
  const isEdit = id !== null;
  const [busy, setBusy] = useState(false);
  const [initial, setInitial] = useState<BankDraft | DigitalDraft | null>(null);

  // 表单状态(银行)
  const [bankName, setBankName]   = useState("");
  const [holder, setHolder]       = useState("");
  const [cardNo, setCardNo]       = useState("");
  const [ifsc, setIfsc]           = useState("");
  const [branch, setBranch]       = useState("");
  const [idNumber, setIdNumber]   = useState("");
  const [bankNotes, setBankNotes] = useState("");
  const [bankDefault, setBankDefault] = useState(false);

  // 表单状态(数字币)
  const [coinType, setCoinType]   = useState<"USDT" | "BTC" | "ETH">("USDT");
  const [network, setNetwork]     = useState("TRC20");
  const [address, setAddress]     = useState("");
  const [digNotes, setDigNotes]   = useState("");
  const [digDefault, setDigDefault] = useState(false);

  // 加载编辑数据
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        if (kind === "bank") {
          const { data } = await api.listBankWallets(userId);
          const w = data.find((x) => x.id === id);
          if (!w) return;
          setBankName(w.bank_name); setHolder(w.holder); setCardNo(w.card_no);
          setIfsc(w.ifsc); setBranch(w.branch);
          setIdNumber(w.id_number ?? ""); setBankNotes(w.notes); setBankDefault(w.is_default === 1);
          setInitial(w);
        } else {
          const { data } = await api.listDigitalWallets(userId);
          const w = data.find((x) => x.id === id);
          if (!w) return;
          setCoinType(w.type1); setNetwork(w.type2); setAddress(w.address);
          setDigNotes(w.notes); setDigDefault(w.is_default === 1);
          setInitial(w);
        }
      } catch (e) {
        showToast("err", e instanceof ApiError ? e.message : "Load failed");
      }
    })();
  }, [kind, id, isEdit, userId, showToast]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === "bank") {
        if (!bankName.trim() || !holder.trim() || !cardNo.trim() || !ifsc.trim() ||
            !branch.trim() || !idNumber.trim() || !bankNotes.trim()) {
          throw new Error("All fields are required");
        }
        const payload: BankDraft = {
          bank_name: bankName.trim(),
          card_no:   cardNo.trim(),
          holder:    holder.trim(),
          id_number: idNumber.trim(),
          branch:    branch.trim(),
          ifsc:      ifsc.trim(),
          contact:   "",
          notes:     bankNotes.trim(),
          is_default: bankDefault ? 1 : 0,
        };
        if (isEdit) {
          await api.updateBankWallet(userId, id!, payload);
        } else {
          await api.createBankWallet(userId, payload);
        }
      } else {
        if (!address.trim()) throw new Error("Wallet address is required");
        const payload: DigitalDraft = {
          type1:      coinType,
          type2:      network.trim() || "TRC20",
          address:    address.trim(),
          notes:      digNotes.trim(),
          is_default: digDefault ? 1 : 0,
        };
        if (isEdit) {
          await api.updateDigitalWallet(userId, id!, payload);
        } else {
          await api.createDigitalWallet(userId, payload);
        }
      }
      showToast("ok", isEdit ? "Saved" : "Added");
      onSaved();
    } catch (e) {
      console.error("[MyWallets] onSubmit failed:", e);
      const msg = e instanceof Error ? e.message : "Operation failed";
      showToast("err", `Failed: ${msg}`);
      if (e instanceof ApiError) console.error("[MyWallets] ApiError code:", e.code, "status:", e.status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-900 p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">
          {isEdit ? "Edit" : "Add"}{kind === "bank" ? " Bank Card" : " Crypto Wallet"}
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          {kind === "bank" ? (
            <>
              <Field label="Bank Name *"        value={bankName}  onChange={setBankName}  placeholder="e.g. ICBC" />
              <Field label="Holder's Name *"    value={holder}    onChange={setHolder}    placeholder="Full name on card" />
              <Field label="A/C No *"           value={cardNo}    onChange={setCardNo}    placeholder="Bank card number" noPaste />
              <Field label="IFSC Code *"        value={ifsc}      onChange={setIfsc}      placeholder="e.g. ICBKCNBJ" noPaste />
              <Field label="Bank Branch *"      value={branch}    onChange={setBranch}    placeholder="Branch name" />
              <Field label="ID Number *"        value={idNumber}  onChange={setIdNumber}  placeholder="National ID / Tax ID" />
              <Field label="Remark *"           value={bankNotes} onChange={setBankNotes} placeholder="Notes (required)" textarea />
              <Checkbox label="Set as default"   checked={bankDefault} onChange={setBankDefault} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Coin *" value={coinType} onChange={(v) => setCoinType(v as any)}
                  options={[{ v: "USDT", l: "USDT" }, { v: "BTC", l: "BTC" }, { v: "ETH", l: "ETH" }]} />
                <Field label="Network *" value={network} onChange={setNetwork} placeholder="TRC20 / ERC20 / BTC" />
              </div>
              <Field label="Wallet Address *" value={address} onChange={setAddress} placeholder="On-chain wallet address" />
              <Field label="Remark" value={digNotes} onChange={setDigNotes} placeholder="(optional)" textarea />
              <Checkbox label="Set as default" checked={digDefault} onChange={setDigDefault} />
            </>
          )}

          <div className="mt-6 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-md border border-white/20 py-2 text-sm hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={busy}
              className="flex-1 rounded-md bg-amber-500 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
              {busy ? "Saving..." : isEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 表单原子 ────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, textarea = false, maxLength, noPaste = false,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; maxLength?: number; noPaste?: boolean; }) {
  // noPaste:阻止用户粘贴(常用于 A/C No / IFSC — 必须手输避免脚本批量灌数据)
  const blockPaste = (e: React.ClipboardEvent) => {
    if (noPaste) {
      e.preventDefault();
    }
  };
  return (
    <div>
      <label className="mb-1 block text-xs text-white/60">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} onPaste={blockPaste} placeholder={placeholder} maxLength={maxLength}
          rows={2} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500 focus:outline-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} onPaste={blockPaste} placeholder={placeholder} maxLength={maxLength}
          className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500 focus:outline-none" />
      )}
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-white/60">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void; }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-black/30 text-amber-500 focus:ring-amber-500" />
      <span className="text-sm text-white/80">{label}</span>
    </label>
  );
}

// ─── 工具 ────────────────────────────────────────────────────────────────────
function maskCard(no: string) {
  if (no.length <= 8) return no;
  return no.slice(0, 4) + " **** **** " + no.slice(-4);
}
function maskIdNumber(id: string) {
  if (id.length < 8) return id;
  return id.slice(0, 4) + "**********" + id.slice(-4);
}
function maskAddress(addr: string) {
  if (addr.length <= 16) return addr;
  return addr.slice(0, 8) + "..." + addr.slice(-8);
}
