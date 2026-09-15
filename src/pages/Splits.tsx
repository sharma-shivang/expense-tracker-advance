import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import Tilt from "../components/Tilt";
import { formatMoney, todayInput } from "../lib/format";
import type { Split } from "../types";
import {
  Plus,
  Users,
  Check,
  Edit,
  Trash2,
} from "lucide-react";

type Person = { name: string; amount: number; isMe: boolean };

function SplitForm({
  editing,
  onCancel,
  onSave,
}: {
  editing?: Split | null;
  onCancel: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(editing ? (editing.date as string).slice(0, 10) : todayInput());
  const [note, setNote] = useState(editing?.note ?? "");
  const [participants, setParticipants] = useState<Person[]>(
    editing?.participants?.length ? editing.participants : [{ name: "You", amount: 0, isMe: true }]
  );
  const [payments, setPayments] = useState<Person[]>(
    editing?.payments?.length ? editing.payments : [{ name: "You", amount: 0, isMe: true }]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updatePerson = (list: Person[], setList: (p: Person[]) => void, index: number, patch: Partial<Person>) => {
    setList(list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const sharesTotal = participants.reduce((s, p) => s + (p.amount || 0), 0);
  const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (Math.abs(sharesTotal - paidTotal) > 0.01) {
      setError(`Payments (${paidTotal.toFixed(2)}) must equal shares (${sharesTotal.toFixed(2)})`);
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, date, note, participants, payments, currency: "INR" });
    } finally {
      setSaving(false);
    }
  };

  const renderPeople = (list: Person[], setList: (p: Person[]) => void) => (
    <div className="split-rows">
      {list.map((p, i) => (
        <div className="split-row" key={i}>
          <input
            className="split-name"
            value={p.name}
            onChange={(e) => updatePerson(list, setList, i, { name: e.target.value })}
            placeholder="Name"
          />
          <input
            className="split-amt"
            type="number"
            min="0"
            step="0.01"
            value={p.amount || ""}
            onChange={(e) => updatePerson(list, setList, i, { amount: Number(e.target.value) })}
            placeholder="0.00"
          />
          <label className="split-me">
            <input
              type="checkbox"
              checked={p.isMe}
              onChange={(e) => updatePerson(list, setList, i, { isMe: e.target.checked })}
            />
            Me
          </label>
          <button
            type="button"
            className="action-btn danger"
            onClick={() => setList(list.filter((_, x) => x !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setList([...list, { name: "", amount: 0, isMe: false }])}
      >
        <Plus className="lucide-icon inline" /> Add person
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Goa trip dinner" required />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label>Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Split between 4" />
      </div>
      <div className="form-group">
        <label>Who owes what — shares</label>
        {renderPeople(participants, setParticipants)}
        <div className="split-total">Total {formatMoney(sharesTotal, "INR")}</div>
      </div>
      <div className="form-group">
        <label>Who paid how much</label>
        {renderPeople(payments, setPayments)}
        <div className="split-total">Paid {formatMoney(paidTotal, "INR")}</div>
      </div>
      <div className={`split-balance ${Math.abs(sharesTotal - paidTotal) <= 0.01 ? "" : "balance-bad"}`}>
        {Math.abs(sharesTotal - paidTotal) <= 0.01
          ? "✓ Balanced"
          : `Off by ${formatMoney(Math.abs(sharesTotal - paidTotal), "INR")}`}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Create split</>}
        </button>
      </div>
    </form>
  );
}

export default function Splits() {
  const { user } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [netOwed, setNetOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Split | null>(null);

  const currency = user?.baseCurrency ?? "INR";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ splits: Split[]; netOwed: number }>("/splits");
      setSplits(res.splits);
      setNetOwed(res.netOwed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    if (editing) await api.put(`/splits/${editing._id}`, data);
    else await api.post("/splits", data);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this split?")) return;
    await api.delete(`/splits/${id}`);
    await load();
  };

  const toggleSettled = async (s: Split) => {
    await api.put(`/splits/${s._id}`, { settled: !s.settled });
    await load();
  };

  const openSplits = splits.filter((s) => !s.settled);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Splits</h1>
          <p className="subtitle">
            {splits.length} split{splits.length === 1 ? "" : "s"} ·{" "}
            <span className={netOwed > 0 ? "amount-income" : "amount-expense"}>
              {netOwed > 0 ? `You're owed ${formatMoney(netOwed, currency)}` : netOwed < 0 ? `You owe ${formatMoney(-netOwed, currency)}` : "All settled"}
            </span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus className="lucide-icon inline" /> New split</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : splits.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            No splits yet. Track group dinners, trips, and who owes whom.
          </div>
        </div>
      ) : (
        <>
          {openSplits.length > 0 && <h3 className="section-title">Open</h3>}
          <div className="budget-grid stagger">
            {openSplits.map((s) => renderSplit(s))}
          </div>
          {splits.some((s) => s.settled) && <h3 className="section-title">Settled</h3>}
          {splits.some((s) => s.settled) && (
            <div className="budget-grid stagger">
              {splits.filter((s) => s.settled).map((s) => renderSplit(s))}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit split" : "New split"}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        >
          <SplitForm
            editing={editing}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            onSave={handleSave}
          />
        </Modal>
      )}
    </>
  );

  function renderSplit(s: Split) {
    const myShare = s.participants.filter((p) => p.isMe).reduce((sum, p) => sum + p.amount, 0);
    const myPaid = s.payments.filter((p) => p.isMe).reduce((sum, p) => sum + p.amount, 0);
    const net = s.net ?? myPaid - myShare;
    return (
      <Tilt className="budget-card" key={s._id}>
        <div className="budget-top">
          <div className="budget-cat">
            <span>
              <Users className="lucide-icon inline" /> {s.title}
            </span>
            <span className="rec-freq">
              {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {s.participants.length} people
            </span>
          </div>
          <div className="budget-actions">
            <button className="action-btn" title={s.settled ? "Reopen" : "Mark settled"} onClick={() => toggleSettled(s)}>
              <Check className="lucide-icon" />
            </button>
            <button className="action-btn" title="Edit" onClick={() => { setEditing(s); setModalOpen(true); }}>
              <Edit className="lucide-icon" />
            </button>
            <button className="action-btn danger" title="Delete" onClick={() => handleDelete(s._id)}>
              <Trash2 className="lucide-icon" />
            </button>
          </div>
        </div>
        <div className={`budget-amount ${net > 0 ? "amount-income" : net < 0 ? "amount-expense" : ""}`}>
          {net > 0 ? `You're owed ${formatMoney(net, currency)}` : net < 0 ? `You owe ${formatMoney(-net, currency)}` : "Even"}
        </div>
        <div className="split-total" style={{ marginTop: 8 }}>
          Total {formatMoney(s.participants.reduce((sum, p) => sum + p.amount, 0), currency)}
        </div>
        <div className="split-chips">
          {s.participants.map((p, i) => (
            <span className="split-chip" key={i}>
              {p.isMe ? "You" : p.name} {formatMoney(p.amount, currency)}
            </span>
          ))}
        </div>
        {!s.settled && s.note && <div className="rec-freq">{s.note}</div>}
        <div className="rec-meta">
          <span className={`type-badge ${s.settled ? "type-income" : "type-expense"}`}>
            {s.settled ? "SETTLED" : "OPEN"}
          </span>
          <span className="rec-freq">
            paid {s.payments.filter((p) => p.name).map((p) => (p.isMe ? "you" : p.name)).join(", ")}
          </span>
        </div>
      </Tilt>
    );
  }
}