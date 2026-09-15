import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import Tilt from "../components/Tilt";
import { formatMoney, currentMonth, monthLabel } from "../lib/format";
import type { Account } from "../types";
import {
  Plus,
  Wallet,
  CreditCard,
  Banknote,
  Smartphone,
  Tag,
  Edit,
  Trash2,
} from "lucide-react";

const TYPES: { value: Account["type"]; label: string; icon: string }[] = [
  { value: "cash", label: "Cash", icon: "Banknote" },
  { value: "wallet", label: "Wallet", icon: "Smartphone" },
  { value: "savings", label: "Savings", icon: "Wallet" },
  { value: "credit_card", label: "Credit card", icon: "CreditCard" },
  { value: "other", label: "Other", icon: "Tag" },
];

function AccountForm({
  editing,
  onCancel,
  onSave,
}: {
  editing?: Account | null;
  onCancel: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<Account["type"]>(editing?.type ?? "savings");
  const [openingBalance, setOpeningBalance] = useState(editing ? String(editing.openingBalance ?? 0) : "0");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      await onSave({ name, type, openingBalance: Number(openingBalance || 0), notes });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Account name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Savings" required />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as Account["type"])}>
            {TYPES.map((t) => {
              const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
                Banknote: Banknote,
                Smartphone: Smartphone,
                Wallet: Wallet,
                CreditCard: CreditCard,
                Tag: Tag,
              };
              const IconComp = iconMap[t.icon] || Tag;
              return (
                <option key={t.value} value={t.value}>
                  <IconComp className="lucide-icon inline" style={{ marginRight: 6 }} /> {t.label}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Opening balance</label>
          <input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Add account</>}
        </button>
      </div>
    </form>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const currency = user?.baseCurrency ?? "INR";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ accounts: Account[]; unassigned: number }>(`/accounts?month=${month}`);
      setAccounts(res.accounts);
      setUnassigned(res.unassigned);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    if (editing) await api.put(`/accounts/${editing._id}`, data);
    else await api.post("/accounts", data);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    const account = accounts.find((a) => a._id === id);
    if (!confirm(`Delete ${account?.name}? Its expenses will become unassigned.`)) return;
    await api.delete(`/accounts/${id}`);
    await load();
  };

  const netWorth = accounts.reduce((s, a) => s + a.openingBalance, 0) + accounts.reduce((s, a) => s + (a.balance ?? 0) - a.openingBalance, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Accounts</h1>
          <p className="subtitle">
            Net {formatMoney(netWorth, currency)} · {accounts.length} accounts
            {unassigned > 0 ? ` · ${unassigned} unassigned expenses` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus className="lucide-icon inline" /> Add account</button>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : accounts.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            No accounts yet. Add your savings, wallet, cash, and credit cards to track money separately.
          </div>
        </div>
      ) : (
        <div className="acc-grid stagger">
          {accounts.map((a) => {
            const pct = (a.monthOut ?? 0) > 0 && (a.monthIn ?? 0) > 0 ? Math.min((a.monthIn ?? 0) / ((a.monthIn ?? 0) + (a.monthOut ?? 0)), 1) : 0;
            return (
              <Tilt className="budget-card" key={a._id}>
                <div className="budget-top">
                  <div className="budget-cat">
                    <span style={{ color: a.color }}>
                      {(() => {
                        const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
                          Banknote: Banknote,
                          Smartphone: Smartphone,
                          Wallet: Wallet,
                          CreditCard: CreditCard,
                          Tag: Tag,
                        };
                        const IconComp = iconMap[a.icon] || Tag;
                        return <IconComp className="lucide-icon inline" style={{ marginRight: 4 }} />;
                      })()}
                      {a.name}
                    </span>
                    <span className="rec-freq">{TYPES.find((t) => t.value === a.type)?.label ?? a.type.replace("_", " ")}</span>
                  </div>
                  <div className="budget-actions">
                    <button className="action-btn" title="Edit" onClick={() => { setEditing(a); setModalOpen(true); }}>
                      <Edit className="lucide-icon" />
                    </button>
                    <button className="action-btn danger" title="Delete" onClick={() => handleDelete(a._id)}>
                      <Trash2 className="lucide-icon" />
                    </button>
                  </div>
                </div>
                <div className="budget-amount">{formatMoney(a.balance ?? 0, currency)}</div>
                <div className="progress">
                  <div style={{ width: `${Math.round(pct * 100)}%`, background: a.color }} />
                </div>
                <div className="budget-meta">
                  In {formatMoney(a.monthIn ?? 0, currency)} · Out {formatMoney(a.monthOut ?? 0, currency)} · {monthLabel(month)}
                </div>
              </Tilt>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit account" : "Add account"}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        >
          <AccountForm
            editing={editing}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            onSave={handleSave}
          />
        </Modal>
      )}
    </>
  );
}