import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import ExpenseForm from "../components/ExpenseForm";
import Modal from "../components/Modal";
import { formatMoney, formatDate } from "../lib/format";
import { expensesToCSV, downloadCSV } from "../lib/csv";
import { EntityIcon, iconLabel } from "../lib/icons";
import type { Expense, Account } from "../types";
import {
  Download,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "description", label: "Description" },
];

export default function Expenses() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const location = useLocation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [account, setAccount] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sort, setSort] = useState("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [preset, setPreset] = useState<
    | { amount?: string; description?: string; date?: string; type?: "expense" | "income" }
    | undefined
  >(undefined);

  const currencies = Object.keys(user?.exchangeRates ?? { INR: 1 });
  const baseCurrency = user?.baseCurrency ?? "INR";
  const rates = user?.exchangeRates ?? {};

  useEffect(() => {
    api.get<{ accounts: Account[] }>("/accounts").then((r) => setAccounts(r.accounts)).catch(() => {});
  }, []);

  const convert = useCallback(
    (amount: number, currency: string) =>
      currency === baseCurrency ? amount : amount / (rates[currency] || 1),
    [baseCurrency, rates]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ sort, order });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (account) params.set("account", account);
    if (start) params.set("start", start);
    if (end) params.set("end", end);

    try {
      const { expenses: list } = await api.get<{ expenses: Expense[] }>(`/expenses?${params}`);
      setExpenses(list);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, category, type, account, start, end, sort, order]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const totalExpense = expenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + convert(e.amount, e.currency), 0);
  const totalIncome = expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + convert(e.amount, e.currency), 0);

  const handleSave = async (data: {
    amount: number;
    currency: string;
    description: string;
    category: string;
    type: "expense" | "income";
    date: string;
  }) => {
    if (editing) {
      await api.put(`/expenses/${editing._id}`, data);
    } else {
      await api.post("/expenses", data);
    }
    setModalOpen(false);
    setEditing(null);
    setPreset(undefined);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    await api.delete(`/expenses/${id}`);
    await load();
  };

  const handleExport = () => {
    downloadCSV(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, expensesToCSV(expenses));
  };

  const openAdd = () => {
    setPreset(undefined);
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setModalOpen(true);
  };

  // Quick-add via shared text (?text= / ?qa= / ?new=...) or Web Share Target
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") !== "1") return;
    const preset = {
      amount: params.get("amount") ?? undefined,
      description: params.get("desc") ?? undefined,
      date: params.get("date") ?? undefined,
      type: (params.get("type") === "income" ? "income" : undefined) as "expense" | "income" | undefined,
    };
    setPreset(preset);
    setEditing(null);
    setModalOpen(true);
    // clear the URL so it isn't re-triggered on back/refresh
    window.history.replaceState({}, "", "/expenses");
  }, [location.search]);

  useEffect(() => {
    if (preset) setModalOpen(true);
  }, [preset]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Expenses</h1>
          <p className="subtitle">
            {expenses.length} transaction{expenses.length === 1 ? "" : "s"} ·{" "}
            {formatMoney(totalExpense, baseCurrency)} spent · {formatMoney(totalIncome, baseCurrency)}{" "}
            earned
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={handleExport}>
            <Download className="lucide-icon inline" /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus className="lucide-icon inline" /> Add transaction
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {iconLabel(c.icon)}{c.name}
            </option>
          ))}
        </select>
        {accounts.length > 0 && (
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {iconLabel(a.icon)}{a.name}
              </option>
            ))}
          </select>
        )}
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <span style={{ color: "var(--text-muted)" }}>–</span>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              Sort: {s.label}
            </option>
          ))}
        </select>
        <button
          className="icon-btn"
          onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
          title="Toggle direction"
        >
          {order === "desc" ? "↓" : "↑"}
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : expenses.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            No transactions match your filters.
            <br />
            <br />
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus className="lucide-icon inline" /> Add transaction
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrap responsive-table reveal reveal-plain">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Account</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const cat =
                  typeof exp.category === "object" && exp.category ? exp.category : null;
                return (
                  <tr key={exp._id}>
                    <td data-label="Date">{formatDate(exp.date)}</td>
                    <td data-label="Description">{exp.description}</td>
                    <td data-label="Category">
                      {cat && (
                        <span
                          className="cat-pill"
                          style={{ background: `${cat.color}20`, color: cat.color }}
                        >
                          <EntityIcon icon={cat.icon} />
                          {cat.name}
                        </span>
                      )}
                    </td>
                    <td data-label="Type">
                      <span className={`type-badge type-${exp.type}`}>{exp.type}</span>
                    </td>
                    <td data-label="Account">
                      {exp.account && typeof exp.account === "object" && (
                        <span className="cat-pill" style={{ background: "var(--bg-elev)", color: "var(--text)" }}>
                          <EntityIcon icon={exp.account.icon} />
                          {exp.account.name}
                        </span>
                      )}
                    </td>
                    <td
                      data-label="Amount"
                      style={{ textAlign: "right" }}
                      className={exp.type === "income" ? "amount-income" : "amount-expense"}
                    >
                      {formatMoney(convert(exp.amount, exp.currency), baseCurrency)}
                    </td>
                    <td data-label="Actions" className="no-label" style={{ textAlign: "right" }}>
                      <button
                        className="action-btn"
                        title="Edit"
                        onClick={() => openEdit(exp)}
                      >
                        <Edit className="lucide-icon" />
                      </button>
                      <button
                        className="action-btn danger"
                        title="Delete"
                        onClick={() => handleDelete(exp._id)}
                      >
                        <Trash2 className="lucide-icon" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit transaction" : "Add transaction"}
          onClose={() => {
            setModalOpen(false);
            setPreset(undefined);
          }}
        >
          <ExpenseForm
            categories={categories}
            currencies={currencies.length ? currencies : ["INR"]}
            accounts={accounts}
            editing={editing}
            preset={preset}
            onCancel={() => {
              setModalOpen(false);
              setPreset(undefined);
            }}
            onSave={handleSave}
          />
        </Modal>
      )}
    </>
  );
}