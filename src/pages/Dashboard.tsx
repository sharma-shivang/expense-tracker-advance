import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Tilt from "../components/Tilt";
import AnimatedNumber from "../components/AnimatedNumber";
import { formatMoney, formatDate, currentMonth, monthLabel } from "../lib/format";
import { EntityIcon } from "../lib/icons";
import type { Expense, Budget, Bill, Goal } from "../types";
import {
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  PieChart as PieChartIcon,
  CreditCard,
  Target,
  ArrowDownRight,
  LifeBuoy,
  Plane,
  Home,
  Car,
  Gem,
  Smartphone,
  Laptop,
  GraduationCap,
  HeartPulse,
  Sun,
  Key,
  Clock as ClockIcon,
} from "lucide-react";

interface Summary {
  totalExpense: number;
  totalIncome: number;
  balance: number;
  byCategory: { name: string; color: string; total: number }[];
  currency: string;
}

interface Trend {
  month: string;
  label: string;
  income: number;
  expense: number;
}

interface Merchant {
  name: string;
  total: number;
  count: number;
}

function prevMonth(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(y, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color || p.payload?.color }}>
          {p.name}: {formatMoney(p.value, currency)}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailLinked, setEmailLinked] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pm = prevMonth(month);
      const y = new Date().getFullYear();
      const mo = new Date().getMonth();
      const mStart = new Date(y, mo, 2).toISOString().slice(0, 10);
      const mEnd = new Date(y, mo + 1, 0).toISOString().slice(0, 10);

      const [s, t, r, ps, b, m, bl, g] = await Promise.all([
        api.get<Summary>(`/expenses/summary?month=${month}`),
        api.get<{ trends: Trend[] }>("/expenses/trends?months=6"),
        api.get<{ expenses: Expense[] }>(
          `/expenses?${new URLSearchParams({ sort: "date", order: "desc" })}`
        ),
        api.get<Summary>(`/expenses/summary?month=${pm}`),
        api.get<{ budgets: Budget[] }>(`/budgets?month=${month}`).catch(() => ({ budgets: [] })),
        api
          .get<{ merchants: Merchant[] }>(`/expenses/merchants?start=${mStart}&end=${mEnd}&limit=5`)
          .catch(() => ({ merchants: [] })),
        api.get<{ bills: Bill[] }>("/bills").catch(() => ({ bills: [] })),
        api.get<{ goals: Goal[] }>("/goals").catch(() => ({ goals: [] })),
      ]);
      setSummary(s);
      setTrends(t.trends);
      setRecent(r.expenses.slice(0, 8));
      setPrevSummary(ps);
      setBudgets(b.budgets);
      setMerchants(m.merchants);
      setBills(bl.bills.filter((x) => !x.paid).slice(0, 3));
      setGoals(g.goals);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get<{ linked: boolean }>("/email/status")
      .then((s) => setEmailLinked(s.linked))
      .catch(() => {});
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await api.post<{ added: number; skipped: number; errors: number }>("/email/sync");
      setSyncMsg({
        ok: true,
        text: `Email sync done: ${r.added} imported` + (r.errors ? `, ${r.errors} failed` : ""),
      });
      await load();
    } catch (e) {
      setSyncMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const currency = user?.baseCurrency ?? "INR";
  const rates = (user?.exchangeRates ?? {}) as Record<string, number>;
  const toBase = (amount: number, expCurrency: string) =>
    expCurrency === currency ? amount : amount / (rates[expCurrency] || 1);

  const delta = (prev: number | undefined, curr: number | undefined) => {
    if (!prev || !curr || prev === 0) return null;
    const pct = Math.round(((curr - prev) / prev) * 100);
    if (pct === 0) return null;
    return (
      <span className={`delta ${pct > 0 ? "delta-up" : "delta-down"}`}>
        {pct > 0 ? (
          <>
            <TrendingUp className="lucide-icon inline" style={{ fontSize: 10 }} /> {pct}%
          </>
        ) : (
          <>
            <ArrowDownRight className="lucide-icon inline" style={{ fontSize: 10 }} /> {Math.abs(pct)}%
          </>
        )}
      </span>
    );
  };

  if (loading) return <div className="spinner" />;

  const pieData = summary?.byCategory ?? [];
  const totalPie = pieData.reduce((sum, p) => sum + p.total, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Dashboard</h1>
          <p className="subtitle reveal" style={{ transitionDelay: "80ms" }}>
            {monthLabel(month)} overview
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {emailLinked && (
            <button
              className="btn btn-outline btn-sm"
              onClick={syncNow}
              disabled={syncing}
              title="Pull new UPI/bank transactions from your linked email"
            >
              {syncing ? "Syncing..." : (
                <>
                  <RotateCcw className="lucide-icon inline" /> Sync now
                </>
              )}
            </button>
          )}
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </div>
      </div>

      {syncMsg && (
        <div
          className={syncMsg.ok ? "success-banner" : "error-banner"}
          style={{ marginBottom: 16 }}
        >
          {syncMsg.text}
        </div>
      )}

      {budgets.length > 0 && (() => {
        const over = budgets.filter((b) => (b.spent ?? 0) > b.amount);
        const warn = budgets.filter((b) => (b.spent ?? 0) > b.amount * 0.8 && (b.spent ?? 0) <= b.amount);
        if (over.length === 0 && warn.length === 0) return null;
        const catName = (b: Budget) =>
          typeof b.category === "object" && b.category ? b.category.name : "category";
return (
            <Link
              to="/budgets"
              className={`alert-banner ${over.length ? "alert-over" : ""}`}
              style={{ display: "block", marginBottom: 16 }}
            >
              <AlertTriangle className="lucide-icon inline" />
              {warn.length > 0 &&
                `${warn.map((b) => catName(b)).join(", ")} ${warn.length === 1 ? "is" : "are"} near limit`}
              {warn.length > 0 && over.length > 0 && " · "}
              {over.length > 0 &&
                `Over budget: ${over.map((b) => catName(b)).join(", ")}`}
            </Link>
          );
      })()}

      <div className="stats-grid stagger">
        <Tilt className="stat-card income">
          <div className="label">Income</div>
          <div className="value">
            <AnimatedNumber
              value={summary?.totalIncome ?? 0}
              format={(v) => formatMoney(v, currency)}
            />
          </div>
          {delta(prevSummary?.totalIncome, summary?.totalIncome)}
        </Tilt>
        <Tilt className="stat-card expense">
          <div className="label">Expenses</div>
          <div className="value">
            <AnimatedNumber
              value={summary?.totalExpense ?? 0}
              format={(v) => formatMoney(v, currency)}
              delay={55}
            />
          </div>
          {delta(prevSummary?.totalExpense, summary?.totalExpense)}
        </Tilt>
        <Tilt className="stat-card balance">
          <div className="label">Net Balance</div>
          <div className={`value ${(summary?.balance ?? 0) < 0 ? "neg" : ""}`}>
            <AnimatedNumber
              value={summary?.balance ?? 0}
              format={(v) => formatMoney(v, currency)}
              delay={110}
            />
          </div>
        </Tilt>
      </div>

      <div className="dash-grid stagger">
        <Tilt className="card card-pad">
          <h3>
          <RotateCcw className="lucide-icon inline" /> 6-Month Trend
        </h3>
          {trends.length === 0 ? (
            <div className="empty-chart">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reduceMotion}
                  animationBegin={100}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reduceMotion}
                  animationBegin={100}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Tilt>

        <Tilt className="card card-pad">
          <h3>
          <PieChartIcon className="lucide-icon inline" /> Spending by Category
        </h3>
          {pieData.length === 0 ? (
            <div className="empty-chart">No expenses this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  isAnimationActive={!reduceMotion}
                  animationBegin={180}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          {totalPie > 0 && (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
              Total: {formatMoney(totalPie, currency)}
            </p>
          )}
        </Tilt>
      </div>

            <div className="dash-row stagger">
        <Tilt className="card card-pad dash-flex">
          <h3>
          <CreditCard className="lucide-icon inline" /> Top Merchants
        </h3>
          {merchants.length === 0 ? (
            <div className="empty-chart">No spending this month</div>
          ) : (
            <div className="merchant-list">
              {merchants.map((m) => (
                <div className="merchant-row" key={m.name}>
                  <div className="merchant-top">
                    <span className="merchant-name">{m.name}</span>
                    <span className="merchant-amt">{formatMoney(m.total, currency)}</span>
                  </div>
                  <div className="progress">
                    <div
                      style={{
                        width: `${(m.total / Math.max(merchants[0].total, 1)) * 100}%`,
                        background: "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tilt>

        <Tilt className="card card-pad dash-flex">
          <h3>
          <CreditCard className="lucide-icon inline" /> Upcoming Bills
        </h3>
          {bills.length === 0 ? (
            <div className="empty-chart">No open bills — nice!</div>
          ) : (
            <div className="insight-list">
              {bills.map((b) => (
                <div className="insight-row" key={b._id}>
                  <span>{b.icon} {b.name}</span>
                  <span className="rec-freq">
                    {b.daysLeft !== null && b.daysLeft !== undefined
                      ? b.overdue
                        ? "overdue"
                        : b.daysLeft === 0
                        ? "due today"
                        : `${b.daysLeft}d left`
                      : ""}
                  </span>
                  <span className="amount-expense">{formatMoney(b.outstanding, currency)}</span>
                </div>
              ))}
              <Link to="/bills" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
                Manage bills →
              </Link>
            </div>
          )}
        </Tilt>

        {goals.length > 0 && (
          <Tilt className="card card-pad dash-flex">
            <h3>
              <Target className="lucide-icon inline" /> Savings Goals
            </h3>
            <div className="insight-list">
              {goals.slice(0, 3).map((g) => {
                const pct = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0;
                return (
                  <div key={g._id}>
                    <div className="merchant-top">
                      <span className="merchant-name">
                        {(() => {
                          const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
                            Target: Target,
                            LifeBuoy: LifeBuoy,
                            Plane: Plane,
                            Home: Home,
                            Car: Car,
                            Ring: Gem,
                            Smartphone: Smartphone,
                            Laptop: Laptop,
                            GraduationCap: GraduationCap,
                            HeartPulse: HeartPulse,
                            Sun: Sun,
                            Key: Key,
                          };
                          const IconComp = iconMap[g.icon] || Target;
                          return <IconComp className="lucide-icon inline" style={{ marginRight: 4 }} />;
                        })()}
                        {g.name}
                      </span>
                      <span className="merchant-amt">{Math.round(pct)}%</span>
                    </div>
                    <div className="progress">
                      <div style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                  </div>
                );
              })}
              <Link to="/goals" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>
                Manage goals →
              </Link>
            </div>
          </Tilt>
        )}
      </div>

      <Tilt className="card card-pad reveal reveal-plain">
        <h3>
          <ClockIcon className="lucide-icon inline" /> Recent Transactions
        </h3>
        {recent.length === 0 ? (
          <div className="empty">
            No transactions yet. Head to <strong>Expenses</strong> to add your first one!
          </div>
        ) : (
          <div className="table-wrap responsive-table" style={{ boxShadow: "none", border: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((exp) => {
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
                        <td
                          data-label="Amount"
                          style={{ textAlign: "right" }}
                          className={exp.type === "income" ? "amount-income" : "amount-expense"}
                        >
                          {formatMoney(toBase(exp.amount, exp.currency), currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        )}
      </Tilt>
    </>
  );
}