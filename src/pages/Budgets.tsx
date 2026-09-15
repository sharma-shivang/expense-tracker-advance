import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import Modal from "../components/Modal";
import Tilt from "../components/Tilt";
import { formatMoney, currentMonth, monthLabel, monthOptions } from "../lib/format";
import type { Budget } from "../types";
import {
  Plus,
  Target,
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react";

function BudgetForm({
  categories,
  months,
  editing,
  onCancel,
  onSave,
}: {
  categories: ReturnType<typeof useCategories>["categories"];
  months: string[];
  editing?: Budget | null;
  onCancel: () => void;
  onSave: (data: { category: string; amount: number; month: string }) => Promise<void>;
}) {
  const initialCategory =
    typeof editing?.category === "object" && editing.category ? (editing.category as any)._id : "";
  const [category, setCategory] = useState(initialCategory);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [month, setMonth] = useState(editing?.month ?? months[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    setSaving(true);
    try {
      await onSave({ category, amount: Number(amount), month });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          <option value="">Select category</option>
          {categories
            .filter((c) => c.type === "expense")
            .map((c) => (
              <option key={c._id} value={c._id}>
                {c.icon} {c.name}
              </option>
            ))}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Budget amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500.00"
            required
          />
        </div>
        <div className="form-group">
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Create budget</>}
        </button>
      </div>
    </form>
  );
}

export default function Budgets() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const months = monthOptions(24);
  const currency = user?.baseCurrency ?? "INR";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { budgets: list } = await api.get<{ budgets: Budget[] }>(`/budgets?month=${month}`);
      setBudgets(list);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: { category: string; amount: number; month: string }) => {
    if (editing) await api.put(`/budgets/${editing._id}`, data);
    else await api.post("/budgets", data);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    await api.delete(`/budgets/${id}`);
    await load();
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Budgets</h1>
          <p className="subtitle">
            {formatMoney(totalSpent, currency)} / {formatMoney(totalBudget, currency)} across{" "}
            {budgets.length} categor{budgets.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="lucide-icon inline" /> Add budget
          </button>
        </div>
      </div>

      {budgets.filter((b) => (b.spent ?? 0) > b.amount * 0.8).length > 0 && (
        <div className="alert-banner alert-over" style={{ marginBottom: 16 }}>
          <AlertTriangle className="lucide-icon inline" />
          {budgets
            .filter((b) => (b.spent ?? 0) > b.amount * 0.8)
            .map((b) => {
              const cat = typeof b.category === "object" && b.category ? b.category : null;
              const over = (b.spent ?? 0) > b.amount;
              return `${cat?.name ?? "?"} ${over ? `over by ${formatMoney((b.spent ?? 0) - b.amount, currency)}` : "near its limit"}`;
            })
            .join(" · ")}
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : budgets.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            No budgets set for {monthLabel(month)}.
            <br />
            <br />
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus className="lucide-icon inline" /> Create your first budget
            </button>
          </div>
        </div>
      ) : (
        <div className="budget-grid stagger">
          {budgets.map((b) => {
            const cat = typeof b.category === "object" && b.category ? b.category : null;
            const pct = b.amount > 0 ? Math.min((b.spent ?? 0) / b.amount, 1) : 0;
            const status =
              b.spent !== undefined && b.spent > b.amount
                ? "budget-over"
                : b.spent !== undefined && b.spent > b.amount * 0.8
                ? "budget-warn"
                : "budget-ok";
            const remaining = (b.amount - (b.spent ?? 0)).toFixed(0);

            return (
              <Tilt className="budget-card" key={b._id}>
                <div className="budget-top">
                  <div className="budget-cat">
                    <span style={{ color: cat?.color }}>
                      <Target className="lucide-icon inline" style={{ marginRight: 4 }} />{cat?.name ?? "Uncategorized"}
                    </span>
                  </div>
                  <div className="budget-actions">
                    <button
                      className="action-btn"
                      title="Edit"
                      onClick={() => {
                        setEditing(b);
                        setModalOpen(true);
                      }}
                    >
                      <Edit className="lucide-icon" />
                    </button>
                    <button
                      className="action-btn danger"
                      title="Delete"
                      onClick={() => handleDelete(b._id)}
                    >
                      <Trash2 className="lucide-icon" />
                    </button>
                  </div>
                </div>
                <div className="budget-amount">{formatMoney(b.amount, currency)}</div>
                <div className="progress">
                  <div
                    style={{
                      width: `${Math.round(pct * 100)}%`,
                      background:
                        b.spent !== undefined && b.spent > b.amount
                          ? "var(--danger)"
                          : cat?.color ?? "var(--primary)",
                    }}
                  />
                </div>
                <div className="budget-meta">
                  Spent {formatMoney(b.spent ?? 0, currency)} ·{" "}
                  <span className={status}>
                    {b.spent !== undefined && b.spent > b.amount
                      ? `${formatMoney(b.spent - b.amount, currency)} over`
                      : `${remaining} left`}
                  </span>
                </div>
              </Tilt>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit budget" : "Add budget"}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        >
          <BudgetForm
            categories={categories}
            months={months}
            editing={editing}
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        </Modal>
      )}
    </>
  );
}