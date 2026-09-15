import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import Modal from "../components/Modal";
import Tilt from "../components/Tilt";
import { formatMoney, formatDate, todayInput } from "../lib/format";
import { iconLabel } from "../lib/icons";
import type { RecurringExpense } from "../types";
import {
  Plus,
  Search,
  Calendar,
  Edit,
  Trash2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

function RecurringForm({
  categories,
  currencies,
  editing,
  onCancel,
  onSave,
}: {
  categories: ReturnType<typeof useCategories>["categories"];
  currencies: string[];
  editing?: RecurringExpense | null;
  onCancel: () => void;
  onSave: (data: {
    amount: number;
    currency: string;
    description: string;
    category: string;
    type: "expense" | "income";
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    nextRunDate: string;
  }) => Promise<void>;
}) {
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [currency, setCurrency] = useState(editing?.currency ?? "INR");
  const [type, setType] = useState<"expense" | "income">(editing?.type ?? "expense");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">(
    editing?.frequency ?? "monthly"
  );
  const [interval, setInterval] = useState(editing?.interval ?? 1);
  const [nextRunDate, setNextRunDate] = useState(
    editing ? (editing.nextRunDate as string).slice(0, 10) : todayInput()
  );
  const [saving, setSaving] = useState(false);

  const filteredCats = categories.filter((c) => c.type === type);
  const [category, setCategory] = useState(
    typeof editing?.category === "object" && editing.category
      ? (editing.category as any)._id
      : filteredCats[0]?._id ?? ""
  );

  useEffect(() => {
    if (!category && filteredCats[0]) setCategory(filteredCats[0]._id);
  }, [type, categories]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    setSaving(true);
    try {
      await onSave({
        amount: Number(amount),
        currency,
        description: description || "Untitled",
        category,
        type,
        frequency,
        interval: Number(interval),
        nextRunDate,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Netflix subscription"
          required
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="form-group">
          <label>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as "expense" | "income");
              setCategory("");
            }}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {filteredCats.length === 0 && <option value="">No categories</option>}
            {filteredCats.map((c) => (
              <option key={c._id} value={c._id}>
                {iconLabel(c.icon)}{c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="form-group">
          <label>Every (interval)</label>
          <input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Start date</label>
        <input
          type="date"
          value={nextRunDate}
          onChange={(e) => setNextRunDate(e.target.value)}
          required
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Create recurring</>}
        </button>
      </div>
    </form>
  );
}

export default function Recurring() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [error, setError] = useState("");
  const [detectOpen, setDetectOpen] = useState(false);
  const [detectLoading, setDetectLoading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [detectMsg, setDetectMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const currencies = Object.keys(user?.exchangeRates ?? { INR: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { recurring: list } = await api.get<{ recurring: RecurringExpense[] }>("/recurring");
      setRecurring(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    if (editing) await api.put(`/recurring/${editing._id}`, data);
    else await api.post("/recurring", data);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleDetect = async () => {
    setDetectLoading(true);
    setDetectMsg(null);
    try {
      const res = await api.post<{ candidates: any[] }>("/recurring/detect", {});
      setCandidates(res.candidates ?? []);
      setDetectOpen(true);
    } catch (err) {
      setDetectMsg({ ok: false, text: "Detection failed: " + (err as Error).message });
      setDetectOpen(true);
    } finally {
      setDetectLoading(false);
    }
  };

  const saveCandidate = async (c: any) => {
    try {
      await api.post("/recurring", {
        amount: c.amount,
        currency: c.currency || "INR",
        description: c.description,
        category: c.category,
        type: c.type,
        frequency: c.frequency,
        interval: 1,
        nextRunDate: c.nextRunDate,
      });
      setCandidates((prev) => prev.filter((x) => !(x.description === c.description && x.type === c.type)));
      await load();
    } catch (err) {
      setDetectMsg({ ok: false, text: "Could not add: " + (err as Error).message });
    }
  };

  const addDate = (d: string, freq: string, times: number) => {
    const dt = new Date(d + "T00:00:00");
    if (freq === "daily") dt.setDate(dt.getDate() + times);
    else if (freq === "weekly") dt.setDate(dt.getDate() + 7 * times);
    else if (freq === "monthly") dt.setMonth(dt.getMonth() + times);
    else dt.setFullYear(dt.getFullYear() + times);
    return dt.toISOString().slice(0, 10);
  };

  const upcoming = (() => {
    const events: { date: string; description: string; amount: number; currency: string; type: string; freq: string }[] = [];
    for (const r of recurring.filter((x) => x.active)) {
      for (let i = 0; i < 4; i++) {
        events.push({
          date: addDate(String(r.nextRunDate as string).slice(0, 10), r.frequency, i * (r.interval || 1)),
          description: r.description,
          amount: r.amount,
          currency: r.currency,
          type: r.type,
          freq: r.frequency,
        });
      }
    }
    return events
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  })();

  const dueSoon = upcoming.filter(
    (u) => new Date(u.date + "T00:00:00") >= new Date() && new Date(u.date + "T00:00:00") <= new Date(Date.now() + 7 * 86400000)
  ).length;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring transaction? Past generated entries are kept.")) return;
    await api.delete(`/recurring/${id}`);
    await load();
  };

  const toggleActive = async (r: RecurringExpense) => {
    try {
      await api.put(`/recurring/${r._id}`, { active: !r.active });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const FREQ_LABEL: Record<string, string> = {
    daily: "daily",
    weekly: "weekly",
    monthly: "monthly",
    yearly: "yearly",
  };

  const monthlyTotal = recurring
    .filter((r) => r.active)
    .reduce((sum, r) => {
      const rate = user?.exchangeRates?.[r.currency] ?? 1;
      const base = user?.baseCurrency ?? "INR";
      const converted = r.currency === base ? r.amount : r.amount / rate;
      const perMonth =
        r.frequency === "daily"
          ? converted * 30
          : r.frequency === "weekly"
          ? converted * 4.33
          : r.frequency === "monthly"
          ? converted
          : converted / 12;
      return sum + perMonth * r.interval;
    }, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Recurring</h1>
          <p className="subtitle">
            {recurring.filter((r) => r.active).length} active · ~{" "}
            {formatMoney(monthlyTotal, user?.baseCurrency ?? "INR")}/month{dueSoon > 0 && ` · ${dueSoon} due within 7 days`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={handleDetect}
            disabled={detectLoading}
          >
            <Search className="lucide-icon inline" /> Auto-detect
          </button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="lucide-icon inline" /> Add recurring
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {detectMsg && (
        <div
          className={detectMsg.ok ? "success-banner" : "error-banner"}
          style={{ marginBottom: 16 }}
        >
          {detectMsg.text}
        </div>
      )}

      {recurring.some((r) => r.active) && (
        <div className="card card-pad timeline-card">
          <h3>
            <Calendar className="lucide-icon inline" /> Upcoming occurrences
          </h3>
          <div className="timeline">
            {upcoming.map((u, i) => {
              const soon =
                new Date(u.date + "T00:00:00") >= new Date() &&
                new Date(u.date + "T00:00:00") <= new Date(Date.now() + 7 * 86400000);
              return (
                <div className={`timeline-row ${i === upcoming.length - 1 ? "last" : ""}`} key={i}>
                  <div className={`timeline-dot ${soon ? "soon" : ""}`} />
                  <span className="timeline-date">{formatDate(u.date)}</span>
                  <span className="timeline-desc">{u.description}</span>
                  <span className={`timeline-amt ${u.type === "income" ? "amount-income" : "amount-expense"}`}>
                    {u.type === "income" ? "+" : "−"} {formatMoney(u.amount, u.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : recurring.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            No recurring transactions yet. Set up subscriptions, rent, or salary.
            <br />
            <br />
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus className="lucide-icon inline" /> Add recurring
            </button>
          </div>
        </div>
      ) : (
        <div className="rec-grid stagger">
          {recurring.map((r) => {
            return (
              <Tilt className="rec-card" key={r._id}>
                <div className="rec-head">
                  <div>
                    <div className="rec-desc">
                      <RotateCcw className="lucide-icon inline" style={{ marginRight: 4 }} /> {r.description}
                    </div>
                    <div className="rec-freq">
                      every {r.interval > 1 ? `${r.interval} ` : ""}
                      {FREQ_LABEL[r.frequency]} · next{" "}
                      {formatDate(r.nextRunDate)}
                    </div>
                  </div>
                  <span className={`status-chip ${r.active ? "chip-active" : "chip-paused"}`}>
                    {r.active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className={`rec-amount ${r.type === "income" ? "amount-income" : "amount-expense"}`}>
                  {r.type === "income" ? "+" : "−"} {formatMoney(r.amount, r.currency)}
                </div>
                <div className="rec-meta">
                  <span className={`type-badge type-${r.type}`}>{r.type}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="action-btn"
                      title={r.active ? "Pause" : "Resume"}
                      onClick={() => toggleActive(r)}
                    >
                      {r.active ? <Pause className="lucide-icon" /> : <Play className="lucide-icon" />}
                    </button>
                    <button
                      className="action-btn"
                      title="Edit"
                      onClick={() => {
                        setEditing(r);
                        setModalOpen(true);
                      }}
                    >
                      <Edit className="lucide-icon" />
                    </button>
                    <button
                      className="action-btn danger"
                      title="Delete"
                      onClick={() => handleDelete(r._id)}
                    >
                      <Trash2 className="lucide-icon" />
                    </button>
                  </div>
                </div>
              </Tilt>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit recurring" : "Add recurring"}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        >
          <RecurringForm
            categories={categories}
            currencies={currencies.length ? currencies : ["INR"]}
            editing={editing}
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        </Modal>
      )}

      {detectOpen && (
        <Modal title={<><Search className="lucide-icon inline" /> Detect recurring transactions</>} onClose={() => setDetectOpen(false)}>
          {candidates.length === 0 ? (
            <div className="empty">
              No recurring patterns detected in your transactions. Imports more expenses and try again.
            </div>
          ) : (
            <>
              <p className="subtitle" style={{ marginBottom: 12 }}>
                {candidates.length} pattern{candidates.length === 1 ? "" : "s"} found. Add any you want to track.
              </p>
              <div className="candidate-list">
                {candidates.map((c, i) => (
                  <div className="candidate-row" key={`${c.description}-${c.type}-${i}`}>
                    <div className="candidate-info">
                      <div className="candidate-desc">{c.description}</div>
                      <div className="candidate-meta">
                        {c.frequency} · ~{formatMoney(c.amount, c.currency)} · {c.occurrences} occurrences
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => saveCandidate(c)}>
                      <Plus className="lucide-icon inline" /> Add
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}