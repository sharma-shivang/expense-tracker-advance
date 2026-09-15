import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import Tilt from "../components/Tilt";
import { formatMoney } from "../lib/format";
import type { Goal } from "../types";
import {
  Target,
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
  Plus,
  Edit,
  Trash2,
  PartyPopper,
} from "lucide-react";

function GoalForm({
  editing,
  onCancel,
  onSave,
}: {
  editing?: Goal | null;
  onCancel: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(editing ? String(editing.targetAmount) : "");
  const [savedAmount, setSavedAmount] = useState(editing ? String(editing.savedAmount) : "0");
  const [deadline, setDeadline] = useState(editing?.deadline ? (editing.deadline as string).slice(0, 10) : "");
  const [icon, setIcon] = useState(editing?.icon ?? "Target");

  const ICON_OPTIONS = [
    { name: "Target", component: Target },
    { name: "LifeBuoy", component: LifeBuoy },
    { name: "Plane", component: Plane },
    { name: "Home", component: Home },
    { name: "Car", component: Car },
    { name: "Ring", component: Gem },
    { name: "Smartphone", component: Smartphone },
    { name: "Laptop", component: Laptop },
    { name: "GraduationCap", component: GraduationCap },
    { name: "HeartPulse", component: HeartPulse },
    { name: "Sun", component: Sun },
    { name: "Key", component: Key },
  ] as const;
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    setSaving(true);
    try {
      await onSave({
        name,
        targetAmount: Number(targetAmount),
        savedAmount: Number(savedAmount || 0),
        deadline: deadline || null,
        icon,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Goal</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" required />
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label>Target amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Saved so far</label>
          <input type="number" step="0.01" min="0" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Icon</label>
        <select value={icon} onChange={(e) => setIcon(e.target.value)}>
          {ICON_OPTIONS.map(({ name, component: Icon }) => (
            <option key={name} value={name}>
              <Icon className="lucide-icon inline" /> {name}
            </option>
          ))}
        </select>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Create goal</>}
        </button>
      </div>
    </form>
  );
}

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deposit, setDeposit] = useState<Goal | null>(null);
  const [depositAmt, setDepositAmt] = useState("");

  const currency = user?.baseCurrency ?? "INR";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { goals: list } = await api.get<{ goals: Goal[] }>("/goals");
      setGoals(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data: any) => {
    if (editing) await api.put(`/goals/${editing._id}`, data);
    else await api.post("/goals", data);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await api.delete(`/goals/${id}`);
    await load();
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="reveal">Savings goals</h1>
          <p className="subtitle">
            {formatMoney(totalSaved, currency)} of {formatMoney(totalTarget, currency)} saved across {goals.length} goal
            {goals.length === 1 ? "" : "s"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus className="lucide-icon inline" /> Add goal</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : goals.length === 0 ? (
        <div className="card card-pad">
          <div className="empty">
            No savings goals yet. Set an emergency fund, vacation, or down payment target.
          </div>
        </div>
      ) : (
        <div className="budget-grid stagger">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(g.savedAmount / g.targetAmount, 1) : 0;
            const done = g.savedAmount >= g.targetAmount;
            const left = Math.max(g.targetAmount - g.savedAmount, 0);
            return (
              <Tilt className="budget-card" key={g._id}>
                <div className="budget-top">
                  <div className="budget-cat">
                    <span style={{ color: g.color }}>
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
                  </div>
                  <div className="budget-actions">
                    <button className="action-btn" title="Add money" onClick={() => { setDeposit(g); setDepositAmt(""); }}>
                      <Plus className="lucide-icon" />
                    </button>
                    <button
                      className="action-btn"
                      title="Edit"
                      onClick={() => { setEditing(g); setModalOpen(true); }}
                    >
                      <Edit className="lucide-icon" />
                    </button>
                    <button className="action-btn danger" title="Delete" onClick={() => handleDelete(g._id)}>
                      <Trash2 className="lucide-icon" />
                    </button>
                  </div>
                </div>
                <div className="budget-amount">
                  {done ? (
                    <>
                      <PartyPopper className="lucide-icon inline" /> Goal complete!
                    </>
                  ) : (
                    `${formatMoney(left, currency)} left`
                  )}
                </div>
                <div className="progress">
                  <div style={{ width: `${Math.round(pct * 100)}%`, background: g.color }} />
                </div>
                <div className="budget-meta">
                  {formatMoney(g.savedAmount, currency)} of {formatMoney(g.targetAmount, currency)} · {Math.round(pct * 100)}%
                  {g.deadline ? ` · by ${new Date(g.deadline).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
                </div>
              </Tilt>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit goal" : "Add goal"}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        >
          <GoalForm
            editing={editing}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            onSave={handleSave}
          />
        </Modal>
      )}

      {deposit && (
        <Modal title={`Add money to ${deposit.name}`} onClose={() => setDeposit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!depositAmt) return;
              await api.put(`/goals/${deposit._id}`, { deposit: Number(depositAmt) });
              setDeposit(null);
              await load();
            }}
          >
            <div className="form-group">
              <label>Amount to add</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setDeposit(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary"><Plus className="lucide-icon inline" /> Add</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}