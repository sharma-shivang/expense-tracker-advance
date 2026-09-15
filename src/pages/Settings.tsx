import { useState, type FormEvent, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import Modal from "../components/Modal";
import MobilitySettings from "../components/MobilitySettings";
import { formatMoney, formatDate } from "../lib/format";
import { EntityIcon, iconLabel, ICON_OPTIONS, EMOJI_OPTIONS } from "../lib/icons";
import type { Category } from "../types";
import {
  Plus,
  User,
  RefreshCw,
  Tag,
  FileText,
  Trash2,
  Edit,
  Link as LinkIcon,
  Mail,
  Database,
} from "lucide-react";

const CURRENCY_CODES = [
  "USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "CHF",
  "CNY", "BRL", "MXN", "KRW", "SGD", "AED", "NZD", "SEK",
];

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
];

function CategoryManager() {
  const { categories, reload } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[7]);
  const [icon, setIcon] = useState("ShoppingCart");
  const [type, setType] = useState<"expense" | "income">("expense");

  const openAdd = () => {
    setEditing(null);
    setName("");
    setColor(PRESET_COLORS[7]);
    setIcon("ShoppingCart");
    setType("expense");
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setColor(c.color || PRESET_COLORS[7]);
    setIcon(c.icon || "ShoppingCart");
    setType(c.type);
    setModalOpen(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const body = { name: name.trim(), color, icon, type };
    if (editing) await api.put(`/categories/${editing._id}`, body);
    else await api.post("/categories", body);
    setModalOpen(false);
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category? Existing transactions keep their category reference.")) return;
    await api.delete(`/categories/${id}`);
    await reload();
  };

  return (
    <>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <button className="btn btn-sm btn-outline" onClick={openAdd}>
          <Plus className="lucide-icon inline" /> Add category
        </button>
      </div>
      <div className="table-wrap responsive-table reveal reveal-plain">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c._id}>
                <td data-label="Category">
                  <span
                    className="cat-pill"
                    style={{ background: `${c.color}20`, color: c.color }}
                  >
                    {c.icon && <EntityIcon icon={c.icon} />}{c.name}
                  </span>
                </td>
                <td data-label="Type">
                  <span className={`type-badge type-${c.type}`}>{c.type}</span>
                </td>
                <td data-label="Actions" className="no-label" style={{ textAlign: "right" }}>
                  <button className="action-btn" title="Edit" onClick={() => openEdit(c)}>
                    <Edit className="lucide-icon" />
                  </button>
                  <button
                    className="action-btn danger"
                    title="Delete"
                    onClick={() => remove(c._id)}
                  >
                    <Trash2 className="lucide-icon" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? "Edit category" : "Add category"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={save}>
            <div className="form-group">
              <label>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Travel"
                required
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-group">
              <label>Icon</label>
              <div className="icon-picker">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={`e-${e}`}
                    type="button"
                    className={`icon-option${icon === e ? " selected" : ""}`}
                    title={e}
                    aria-pressed={icon === e}
                    onClick={() => setIcon(e)}
                  >
                    {e}
                  </button>
                ))}
                {ICON_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      className={`icon-option${icon === opt.name ? " selected" : ""}`}
                      title={opt.name}
                      aria-pressed={icon === opt.name}
                      onClick={() => setIcon(opt.name)}
                    >
                      <IconComp className="lucide-icon" />
                    </button>
                  );
                })}
              </div>
              <small style={{ color: "var(--text-muted)" }}>
                Picked icon is shown next to the category name everywhere.
              </small>
            </div>
            <div className="form-group">
              <label>Color</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: c,
                      border: color === c ? "3px solid var(--text)" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Add category</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

interface EmailStatus {
  linked: boolean;
  email: string | null;
  lastSyncedAt: string | null;
}

function EmailImporter() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string>("");
  const [err, setErr] = useState("");
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      const s = await api.get<EmailStatus>("/email/status");
      setStatus(s);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get("email-connected") === "1") {
      setAction("Gmail connected. Click “Sync now” to import your transactions.");
      params.delete("email-connected");
      setParams(params, { replace: true });
      load();
    }
    const e = params.get("email-error");
    if (e) {
      setErr(decodeURIComponent(e));
      params.delete("email-error");
      setParams(params, { replace: true });
    }
  }, [params, setParams, load]);

  const connect = async () => {
    setErr("");
    try {
      const { url } = await api.get<{ url: string }>("/email/connect");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const sync = async () => {
    setAction("");
    setErr("");
    setLoading(true);
    try {
      const r = await api.post<{ added: number; skipped: number; errors: number; total: number }>("/email/sync");
      setAction(
        `Sync complete: ${r.added} imported, ${r.skipped} skipped, ${r.errors} failed (${r.total} emails scanned).`
      );
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    if (!confirm("Disconnect your bank-alert email from Expense Tracker? Already imported transactions stay.")) return;
    await api.post("/email/unlink");
    setStatus({ linked: false, email: null, lastSyncedAt: null });
    setAction("");
  };

return (
    <div className="card card-pad settings-section reveal reveal-plain">
      <h3>
        <Mail className="lucide-icon inline" /> Email import (UPI / bank alerts)
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: -6 }}>
        Connect your Gmail account. The app reads <em>only</em> your bank / UPI transaction-alert emails
        (keywords like "UPI", "debited", "credited", "paid") and turns them into expenses. Nothing else is
        stored.
      </p>

      {err && <div className="error-banner">{err}</div>}
      {action && <div className="success-banner">{action}</div>}

      {loading && !status ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : status?.linked ? (
        <div className="email-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LinkIcon className="lucide-icon" style={{ fontSize: 20 }} />
            <div>
              <strong>{status.email}</strong>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Last sync: {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "never"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={sync} disabled={loading}>
              {loading ? "Syncing..." : "Sync now"}
            </button>
            <button className="btn btn-outline" onClick={unlink} disabled={loading}>
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={connect} disabled={loading}>
            Connect Gmail
          </button>
        </div>
      )}

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>
          First time? Set up Google Cloud access (2 minutes)
        </summary>
        <ol style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-muted)", marginTop: 10, paddingLeft: 20 }}>
          <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console → Credentials</a> and create a project.</li>
          <li>Enable the <strong>Gmail API</strong> (APIs &amp; Services → Library → search “Gmail API” → Enable).</li>
          <li>Open <strong>OAuth consent screen</strong>, choose <em>External</em>, add your own email as a test user (more below).</li>
          <li>In <strong>Credentials → Create credentials → OAuth client ID</strong>, type <em>Web application</em> and add this exact Redirect URI: <code>http://localhost:5001/api/email/callback</code>.</li>
          <li>Copy the client ID and secret into <code>server/.env</code> as <code>GMAIL_CLIENT_ID</code> and <code>GMAIL_CLIENT_SECRET</code>, then restart the server.</li>
          <li>On the consent screen, add the Gmail address you’ll use as a <strong>test user</strong> (otherwise Google blocks the login).</li>
        </ol>
      </details>
    </div>
  );
}

function StatementImporter() {
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [account, setAccount] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    api.get<{ accounts: any[] }>("/accounts").then((r) => setAccounts(r.accounts)).catch(() => {});
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const buf = await file.arrayBuffer();
      const token = localStorage.getItem("token");
      const res = await fetch("/api/import/statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: buf,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Parse failed");
      setRows(data.rows ?? []);
      setExcluded(new Set());
    } catch (e) {
      setErr((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setImporting(true);
    setErr("");
    try {
      const selected = rows
        .filter((_, i) => !excluded.has(i))
        .map((r) => ({ ...r, ...(account ? { account } : {}) }));
      const data = await api.post<{ added: number }>("/import/statement/confirm", { rows: selected });
      setMsg(`Imported ${data.added} transaction${data.added === 1 ? "" : "s"}.`);
      setRows([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="card card-pad settings-section reveal reveal-plain">
      <h3>
        <Database className="lucide-icon inline" /> Import bank statement (PDF)
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: -6 }}>
        Upload a bank / credit-card statement PDF. Matching transactions are extracted and previewed — review
        below before importing. Already-imported rows are skipped automatically.
      </p>

      {err && <div className="error-banner">{err}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <label className="btn btn-primary" style={{ cursor: "pointer" }}>
          {loading ? "Parsing..." : (
            <>
              <FileText className="lucide-icon inline" /> Choose PDF
            </>
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        {accounts.length > 0 && (
          <select value={account} onChange={(e) => setAccount(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Account: None</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {iconLabel(a.icon)}{a.name}
              </option>
            ))}
          </select>
        )}
        {rows.length > 0 && (
          <button className="btn btn-outline" onClick={() => setExcluded(new Set())}>
            Select all
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="table-wrap responsive-table reveal reveal-plain">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const cat =
                    categories.find((c) => String(c._id) === String(row.category)) ?? null;
                  return (
                    <tr key={row.externalId || i}>
                      <td data-label="Import">
                        <input
                          type="checkbox"
                          checked={!excluded.has(i)}
                          onChange={() =>
                            setExcluded((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td data-label="Date">{formatDate(row.date)}</td>
                      <td data-label="Description">
                        {row.description}
                        {cat && (
                          <span
                            className="cat-pill"
                            style={{ background: `${cat.color}20`, color: cat.color, marginLeft: 8 }}
                          >
                            {cat.name}
                          </span>
                        )}
                      </td>
                      <td data-label="Type">
                        <span className={`type-badge type-${row.type}`}>{row.type}</span>
                      </td>
                      <td data-label="Amount" style={{ textAlign: "right" }}>
                        {formatMoney(row.amount, "INR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setRows([])}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={importing || rows.length - excluded.size === 0}
              onClick={confirm}
            >
              {importing ? "Importing…" : `Import ${rows.length - excluded.size} rows`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [baseCurrency, setBaseCurrency] = useState(user?.baseCurrency ?? "INR");
  const [rates, setRates] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState(user?.username ?? "");

  useEffect(() => {
    if (!user) return;
    setBaseCurrency(user.baseCurrency);
    setUsername(user.username);
    const ratesMap: Record<string, string> = {};
    const all = { ...(user.exchangeRates ?? {}) };
    for (const code of CURRENCY_CODES) {
      ratesMap[code] = all[code] !== undefined ? String(all[code]) : "";
    }
    setRates(ratesMap);
  }, [user]);

  const saveSettings = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setError("");
      setSaved(false);
      try {
        const exchangeRates: Record<string, number> = {};
        for (const [code, val] of Object.entries(rates)) {
          const n = Number(val);
          if (val && !isNaN(n) && n > 0) exchangeRates[code] = n;
        }
        await api.put("/auth/me", {
          baseCurrency,
          exchangeRates,
          username,
        });
        await updateUser();
        setSaved(true);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [baseCurrency, rates, username, updateUser]
  );

  if (!user) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Settings</h1>
          <p className="subtitle">Manage your profile, currency, and categories</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="success-banner">Settings saved</div>}

      <form onSubmit={saveSettings} className="card card-pad settings-section reveal reveal-plain">
        <h3>
          <User className="lucide-icon inline" /> Profile
        </h3>
        <div className="form-row" style={{ maxWidth: 640 }}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={user.email} disabled />
          </div>
        </div>
        <div className="form-row" style={{ maxWidth: 640 }}>
          <div className="form-group">
            <label>Base currency</label>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
            >
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      <form onSubmit={saveSettings} className="card card-pad settings-section reveal reveal-plain">
        <h3>
          <RefreshCw className="lucide-icon inline" /> Exchange rates
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: -8 }}>
          1 {baseCurrency} = value below. Rates are used to convert expenses to your base currency.
          Leave blank to use the rate when you signed up.
        </p>
        <div className="token-grid">
          {CURRENCY_CODES.map((code) => (
            <div className="token-item" key={code}>
              <label>{code}</label>
              <input
                type="number"
                step="any"
                min="0"
                value={rates[code] ?? ""}
                placeholder={code === baseCurrency ? "1" : "–"}
                disabled={code === baseCurrency}
                onChange={(e) => setRates((r) => ({ ...r, [code]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <div className="card card-pad settings-section reveal reveal-plain">
        <h3>
          <Tag className="lucide-icon inline" /> Categories
        </h3>
        <CategoryManager />
      </div>

      <MobilitySettings />

      <EmailImporter />

      <StatementImporter />
    </>
  );
}