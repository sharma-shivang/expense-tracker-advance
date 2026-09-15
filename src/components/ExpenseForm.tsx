import { useState, useRef, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Category, Expense, Account } from "../types";
import { todayInput } from "../lib/format";
import { iconLabel } from "../lib/icons";
import { parseQuickAdd } from "../lib/quickadd";

interface Props {
  categories: Category[];
  currencies: string[];
  accounts: Account[];
  editing?: Expense | null;
  preset?: { amount?: string; description?: string; date?: string; type?: "expense" | "income" };
  onCancel: () => void;
  onSave: (data: {
    amount: number;
    currency: string;
    description: string;
    category: string;
    type: "expense" | "income";
    date: string;
    account?: string | null;
  }) => Promise<void>;
}

const voiceSupported = () =>
  typeof window !== "undefined" &&
  ((window as Window).SpeechRecognition || (window as Window).webkitSpeechRecognition) != null;

export default function ExpenseForm({
  categories,
  currencies,
  accounts,
  editing,
  preset,
  onCancel,
  onSave,
}: Props) {
  const [description, setDescription] = useState(editing?.description ?? preset?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : preset?.amount ?? "");
  const [currency, setCurrency] = useState(editing?.currency ?? "INR");
  const [type, setType] = useState<"expense" | "income">(
    editing?.type ?? preset?.type ?? "expense"
  );
  const [category, setCategory] = useState(
    typeof editing?.category === "object" && editing.category
      ? (editing.category as Category)._id
      : "",
  );
  const [date, setDate] = useState(
    editing ? (editing.date as string).slice(0, 10) : preset?.date ?? todayInput()
  );
  const [account, setAccount] = useState(
    editing?.account && typeof editing.account === "object" ? (editing.account as Account)._id : ((editing?.account as string) ?? "")
  );
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceErr, setVoiceErr] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);

  const filteredCats = categories.filter((c) => c.type === type);
  const suggestedCat = filteredCats[0]?._id ?? "";
  const effectiveCategory = category || suggestedCat;

  const startVoice = () => {
    setVoiceErr("");
    const Ctor = (window as Window).SpeechRecognition || (window as Window).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      const parsed = parseQuickAdd(transcript);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.description) setDescription(parsed.description);
      setType(parsed.type);
      setDate(todayInput());
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListening(false);
      if (e.error !== "no-speech" && e.error !== "aborted" && e.error !== "not-allowed")
        setVoiceErr("Could not hear that. Try again.");
      if (e.error === "not-allowed") setVoiceErr("Microphone access was denied.");
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setVoiceErr("Could not start the microphone.");
      setListening(false);
    }
  };

  const stopVoice = () => {
    recRef.current?.abort();
    setListening(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveCategory || !amount) return;
    setSaving(true);
    try {
      await onSave({
        amount: Number(amount),
        currency,
        description: description || "Untitled",
        category: effectiveCategory,
        type,
        date,
        account: account || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {voiceSupported() && (
        <div className="voice-row">
          <button
            type="button"
            className={`voice-btn ${listening ? "listening" : ""}`}
            onClick={listening ? stopVoice : startVoice}
          >
            {listening ? "⬤ Listening…" : "🎤 Speak a transaction"}
          </button>
          {voiceErr && <span className="voice-err">{voiceErr}</span>}
        </div>
      )}

      <div className="form-group">
        <label>Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Groceries at Walmart"
          required
        />
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
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
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
          <select value={effectiveCategory} onChange={(e) => setCategory(e.target.value)}>
            {filteredCats.length === 0 && <option value="">No categories</option>}
            {filteredCats.map((c) => (
              <option key={c._id} value={c._id}>
                {iconLabel(c.icon)}{c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="form-group">
          <label>Account</label>
          <select value={account ?? ""} onChange={(e) => setAccount(e.target.value)}>
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {iconLabel(a.icon)}{a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : <><Plus className="lucide-icon inline" /> Add</>}
        </button>
      </div>
    </form>
  );
}