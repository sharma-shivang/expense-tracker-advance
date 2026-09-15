import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import Tilt from "../components/Tilt";
import { formatMoney } from "../lib/format";
import type { Bill } from "../types";
import {
  Plus,
  Check,
  Edit,
  Trash2,
  CreditCard,
} from "lucide-react";

function BillForm({
  editing,
  onCancel,
  onSave,
}: {
  editing?: Bill | null;
  onCancel: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [issuer, setIssuer] = useState(editing?.issuer ?? "");
  const [dueDate, setDueDate] = useState(
    editing ? (editing.dueDate as string).slice(0, 10) : new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );
  const [outstanding, setOutstanding] = useState(editing ? String(editing.outstanding) : "");
  const [minDue, setMinDue] = useState(editing ? String(editing.minDue) : "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !dueDate || !outstanding) return;
    setSaving(true);
    try {
      await onSave({
        name,
        issuer,
        dueDate,
        outstanding: Number(outstanding),
        minDue: Number(minDue || 0),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Bill / card name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Credit Card" required />
        </div>
        <div className="form-group">
          <label>Issuer</label>
          <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. HDFC Bank" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Outstanding amount</label>
          <input type="number" step="0.01" min="0" value={outstanding} onChange={(e) => setOutstanding(e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label>Minimum due (optional)</label>
        <input type="number" step="0.01" min="0" value={minDue} onChange={(e) => setMinDue(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Add bill</>}
        </button>
      </div>
    </form>
  );
}

export default function Bills() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);

  const currency = user?.baseCurrency ?? "INR";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { bills: list } = await api.get<{ bills: Bill[] }>("/bills");
      setBills(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { upcoming, paid, totalDue } = useMemo(() => {
    const upcoming = bills.filter((b) => !b.paid).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    const paid = bills.filter((b) => b.paid);
    const totalDue = upcoming.reduce((s, b) => s + b.outstanding, 0);
    return { upcoming, paid, totalDue };
  }, [bills]);

  const handleSave = async (data: any) => {
    if (editing) await api.put(`/bills/${editing._id}`, data);
    else await api.post("/bills", data);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bill?")) return;
    await api.delete(`/bills/${id}`);
    await load();
  };

  const markPaid = async (b: Bill) => {
    await api.put(`/bills/${b._id}`, { paid: true, paidAmount: b.outstanding });
    await load();
  };

  const dueLabel = (b: Bill) => {
    if (b.daysLeft === null || b.daysLeft === undefined) return "";
    if (b.overdue) return "Overdue";
    if (b.daysLeft === 0) return "Due today";
    if (b.daysLeft === 1) return "Due tomorrow";
    return `${b.daysLeft}d left`;
  };

  const renderBill = (b: Bill) => (
    <Tilt className="rec-card" key={b._id}>
      <div className="rec-head">
        <div>
          <div className="rec-desc">
            <CreditCard className="lucide-icon inline" /> {b.name}
            {b.issuer ? <span className="rec-freq">{b.issuer}</span> : null}
          </div>
          <div className="rec-freq">
            due {new Date(b.dueDate).toLocaleDateString("en-US", { day: "numeric", month: "short" })} · {b.paid ? "paid" : dueLabel(b)}
          </div>
        </div>
        <span className={`status-chip ${b.paid ? "chip-active" : b.overdue ? "chip-overdue" : "chip-warn"}`}>
          {b.paid ? "Paid" : b.overdue ? "Overdue" : "Open"}
        </span>
      </div>
      <div className={`rec-amount ${b.paid ? "amount-income" : "amount-expense"}`}>
        {formatMoney(b.outstanding, currency)}
        {b.minDue > 0 && !b.paid ? <div className="rec-freq">min due {formatMoney(b.minDue, currency)}</div> : null}
      </div>
      <div className="rec-meta">
        <span className={`type-badge type-${b.paid ? "income" : "expense"}`}>
          {b.paid ? "PAID" : "DUE"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {!b.paid && (
            <button className="action-btn" title="Mark paid" onClick={() => markPaid(b)}>
              <Check className="lucide-icon" />
            </button>
          )}
          <button className="action-btn" title="Edit" onClick={() => { setEditing(b); setModalOpen(true); }}>
            <Edit className="lucide-icon" />
          </button>
          <button className="action-btn danger" title="Delete" onClick={() => handleDelete(b._id)}>
            <Trash2 className="lucide-icon" />
          </button>
        </div>
      </div>
    </Tilt>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Bills & credit cards</h1>
          <p className="subtitle">
            {upcoming.length} upcoming · {formatMoney(totalDue, currency)} due
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus className="lucide-icon inline" /> Add bill</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          {upcoming.length === 0 && paid.length === 0 ? (
            <div className="card card-pad">
              <div className="empty">No bills yet. Track credit card dues, rent, or subscriptions.</div>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && <h3 className="section-title">Upcoming</h3>}
              <div className="rec-grid stagger">{upcoming.map(renderBill)}</div>
              {paid.length > 0 && <h3 className="section-title">Paid</h3>}
              {paid.length > 0 && <div className="rec-grid stagger">{paid.map(renderBill)}</div>}
            </>
          )}
        </>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit bill" : "Add bill"}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        >
          <BillForm
            editing={editing}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            onSave={handleSave}
          />
        </Modal>
      )}
    </>
  );
}