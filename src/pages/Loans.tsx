import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import Tilt from "../components/Tilt";
import AnimatedNumber from "../components/AnimatedNumber";
import { formatMoney, formatDate, todayInput } from "../lib/format";
import type { Loan } from "../types";
import {
  Plus,
  ArrowLeftRight,
  HandCoins,
  Wallet,
  Check,
  Edit,
  Trash2,
} from "lucide-react";

type Repayment = { amount: number; date: string };

function outstandingOf(l: Loan): number {
  return Math.max(0, (l.amount || 0) - (l.repayments ?? []).reduce((s, r) => s + (r.amount || 0), 0));
}

function LoanForm({
  editing,
  currencies,
  onCancel,
  onSave,
}: {
  editing?: Loan | null;
  currencies: string[];
  onCancel: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [counterparty, setCounterparty] = useState(editing?.counterparty ?? "");
  const [direction, setDirection] = useState<"lent" | "borrowed">(editing?.direction ?? "lent");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [currency, setCurrency] = useState(editing?.currency ?? "INR");
  const [date, setDate] = useState(editing ? (editing.date as string).slice(0, 10) : todayInput());
  const [dueDate, setDueDate] = useState(editing?.dueDate ? (editing.dueDate as string).slice(0, 10) : "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [repayments, setRepayments] = useState<Repayment[]>(
    editing?.repayments?.length
      ? editing.repayments.map((r) => ({
          amount: r.amount,
          date: (r.date as string).slice(0, 10),
        }))
      : []
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const repaidTotal = repayments.reduce((s, r) => s + (r.amount || 0), 0);
  const outstanding = Math.max(0, (Number(amount) || 0) - repaidTotal);

  const updateRepayment = (index: number, patch: Partial<Repayment>) =>
    setRepayments(repayments.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!counterparty.trim()) {
      setError("Enter the other person's name");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (repaidTotal > amt + 0.01) {
      setError("Repayments can't exceed the loan amount");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        counterparty: counterparty.trim(),
        direction,
        amount: amt,
        currency,
        date,
        dueDate: dueDate || null,
        note,
        repayments,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label>Person</label>
          <input
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            placeholder="e.g. Rahul"
            required
          />
        </div>
        <div className="form-group">
          <label>Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "lent" | "borrowed")}
          >
            <option value="lent">I lent money (owed to me)</option>
            <option value="borrowed">I borrowed money (I owe)</option>
          </select>
        </div>
      </div>

      <div className="form-row-3">
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
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Due date (optional)</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. For the phone" />
        </div>
      </div>

      <div className="form-group">
        <label>Repayments received/made</label>
        {repayments.length > 0 ? (
          <div className="split-rows">
            {repayments.map((r, i) => (
              <div className="split-row" key={i}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.amount || ""}
                  onChange={(e) => updateRepayment(i, { amount: Number(e.target.value) })}
                  placeholder="Amount"
                />
                <input
                  type="date"
                  value={r.date}
                  onChange={(e) => updateRepayment(i, { date: e.target.value })}
                />
                <button
                  type="button"
                  className="action-btn danger"
                  onClick={() => setRepayments(repayments.filter((_, x) => x !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rec-freq" style={{ margin: "4px 0 8px" }}>
            No repayments yet — add them below.
          </div>
        )}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() =>
            setRepayments([...repayments, { amount: 0, date: todayInput() }])
          }
        >
          <Plus className="lucide-icon inline" /> Add repayment
        </button>
        {repayments.length > 0 && (
          <div className="split-total" style={{ marginTop: 8 }}>
            Repaid {formatMoney(repaidTotal, currency)} · Outstanding{" "}
            <span className={outstanding > 0 ? "amount-expense" : "amount-income"}>
              {formatMoney(outstanding, currency)}
            </span>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Add loan</>}
        </button>
      </div>
    </form>
  );
}

function RepayForm({
  loan,
  onCancel,
  onSave,
}: {
  loan: Loan;
  onCancel: () => void;
  onSave: (data: { amount: number; date: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (amt > (loan.outstanding ?? outstandingOf(loan)) + 0.01) {
      setError("Repayment exceeds the outstanding amount");
      return;
    }
    setSaving(true);
    try {
      await onSave({ amount: amt, date });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
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
            autoFocus
            required
          />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>
      <div className="rec-freq" style={{ margin: "4px 0 12px" }}>
        Outstanding:{" "}
        {formatMoney(loan.outstanding ?? outstandingOf(loan), loan.currency)}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : <><Plus className="lucide-icon inline" /> Record repayment</>}
        </button>
      </div>
    </form>
  );
}

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState({ totalOwedToMe: 0, totalIOwe: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [repaying, setRepaying] = useState<Loan | null>(null);

  const currency = user?.baseCurrency ?? "INR";
  const currencies = Object.keys(user?.exchangeRates ?? { INR: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        loans: Loan[];
        totalOwedToMe: number;
        totalIOwe: number;
        net: number;
      }>("/loans");
      setLoans(res.loans);
      setSummary({
        totalOwedToMe: res.totalOwedToMe ?? 0,
        totalIOwe: res.totalIOwe ?? 0,
        net: res.net ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    if (editing) await api.put(`/loans/${editing._id}`, data);
    else await api.post("/loans", data);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleRepay = async (data: { amount: number; date: string }) => {
    if (!repaying) return;
    await api.post(`/loans/${repaying._id}/repay`, data);
    setRepaying(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this loan?")) return;
    await api.delete(`/loans/${id}`);
    await load();
  };

  const toggleSettled = async (l: Loan) => {
    await api.put(`/loans/${l._id}`, { settled: !l.settled });
    await load();
  };

  const open = loans.filter((l) => !l.settled);
  const closed = loans.filter((l) => l.settled);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Loans</h1>
          <p className="subtitle">
            Borrow / lend tracker ·{" "}
            <span className={summary.net >= 0 ? "amount-income" : "amount-expense"}>
              {summary.net >= 0
                ? `Net owed to you ${formatMoney(summary.net, currency)}`
                : `Net you owe ${formatMoney(-summary.net, currency)}`}
            </span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="lucide-icon inline" /> New loan
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : loans.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            No loans yet. Track money you lent to friends or borrowed from them.
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid stagger">
            <Tilt className="stat-card income">
              <div className="label">Owed to you</div>
              <div className="value">
                <AnimatedNumber
                  value={summary.totalOwedToMe}
                  format={(v) => formatMoney(v, currency)}
                />
              </div>
            </Tilt>
            <Tilt className="stat-card expense">
              <div className="label">You owe</div>
              <div className="value">
                <AnimatedNumber
                  value={summary.totalIOwe}
                  format={(v) => formatMoney(v, currency)}
                  delay={55}
                />
              </div>
            </Tilt>
            <Tilt className="stat-card balance">
              <div className="label">Net</div>
              <div className={`value ${summary.net < 0 ? "neg" : ""}`}>
                <AnimatedNumber
                  value={summary.net}
                  format={(v) => formatMoney(v, currency)}
                  delay={110}
                />
              </div>
            </Tilt>
          </div>

          {open.length > 0 && <h3 className="section-title">Open</h3>}
          {open.length > 0 && (
            <div className="budget-grid stagger">
              {open.map((l) => renderLoan(l))}
            </div>
          )}
          {closed.length > 0 && <h3 className="section-title">Settled</h3>}
          {closed.length > 0 && (
            <div className="budget-grid stagger">
              {closed.map((l) => renderLoan(l))}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit loan" : "New loan"}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        >
          <LoanForm
            editing={editing}
            currencies={currencies.length ? currencies : ["INR"]}
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        </Modal>
      )}

      {repaying && (
        <Modal title="Record repayment" onClose={() => setRepaying(null)}>
          <RepayForm loan={repaying} onCancel={() => setRepaying(null)} onSave={handleRepay} />
        </Modal>
      )}
    </>
  );

  function renderLoan(l: Loan) {
    const outstanding = l.outstanding ?? outstandingOf(l);
    const repaid = l.repaid ?? (l.amount || 0) - outstanding;
    const pct = l.amount ? Math.min(1, repaid / l.amount) : 0;
    const isLent = l.direction === "lent";
    const Icon = isLent ? HandCoins : Wallet;

    return (
      <Tilt className="budget-card" key={l._id}>
        <div className="budget-top">
          <div className="budget-cat">
            <span>
              <Icon className="lucide-icon inline" style={{ color: "var(--violet)" }} />
              {l.counterparty}
            </span>
            <span className="rec-freq">
              {formatDate(l.date)}
              {l.dueDate ? ` · due ${formatDate(l.dueDate)}` : ""}
            </span>
          </div>
          <div className="budget-actions">
            {!l.settled && (
              <button
                className="action-btn"
                title="Record repayment"
                onClick={() => setRepaying(l)}
              >
                <Plus className="lucide-icon" />
              </button>
            )}
            <button
              className="action-btn"
              title={l.settled ? "Reopen" : "Mark settled"}
              onClick={() => toggleSettled(l)}
            >
              <Check className="lucide-icon" />
            </button>
            <button
              className="action-btn"
              title="Edit"
              onClick={() => {
                setEditing(l);
                setModalOpen(true);
              }}
            >
              <Edit className="lucide-icon" />
            </button>
            <button className="action-btn danger" title="Delete" onClick={() => handleDelete(l._id)}>
              <Trash2 className="lucide-icon" />
            </button>
          </div>
        </div>
        <div
          className={`budget-amount ${outstanding > 0 ? (isLent ? "amount-income" : "amount-expense") : ""}`}
        >
          {isLent ? `Owed to you ${formatMoney(outstanding, l.currency)}` : `You owe ${formatMoney(outstanding, l.currency)}`}
        </div>
        <div className="split-total" style={{ marginTop: 8 }}>
          {formatMoney(l.amount, l.currency)}
          {repaid > 0 && (
            <>
              {" "}
              · <ArrowLeftRight className="lucide-icon inline" /> {formatMoney(repaid, l.currency)} repaid
            </>
          )}
        </div>
        <div className="progress">
          <div
            style={{
              width: `${Math.round(pct * 100)}%`,
              background: isLent ? "var(--success)" : "var(--primary)",
            }}
          />
        </div>
        <div className="rec-meta">
          <span className={`type-badge ${isLent ? "type-income" : "type-expense"}`}>
            {isLent ? "LENT" : "BORROWED"}
          </span>
          <span className={`type-badge ${l.settled ? "type-income" : ""}`}>
            {l.settled ? "SETTLED" : `${Math.round(pct * 100)}% repaid`}
          </span>
        </div>
        {l.note && <div className="rec-freq" style={{ marginTop: 8 }}>{l.note}</div>}
      </Tilt>
    );
  }
}