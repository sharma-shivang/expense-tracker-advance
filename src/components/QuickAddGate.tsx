import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Handles quick-add entry via URL params (share target ?text=/?title=/?url=,
 * our own ?qa= shortcut, and ?amount=&desc= presets). Routing is explicit so
 * the SPA can receive the same URL both from the browser share-sheet and from
 * a "Quick add" home-screen shortcut.
 */
function buildExpenseQuery(text: string): URLSearchParams {
  const q = new URLSearchParams();
  const preset = parseQuickAddFromText(text);
  q.set("new", "1");
  if (preset.amount) q.set("amount", String(preset.amount));
  if (preset.description) q.set("desc", preset.description);
  if (preset.type) q.set("type", preset.type);
  if (preset.date) q.set("date", preset.date);
  return q;
}

function parseQuickAddFromText(raw: string) {
  const text = raw.trim();
  const amountMatch = text.match(/(?:₹|rs\.?|inr|rupees)\s*([\d][\d,]*(?:\.\d{1,2})?)|([\d][\d,]*(?:\.\d{1,2})?)\s*(?:rupees|rs\.?|inr)/i);
  const amount = amountMatch ? parseFloat((amountMatch[1] ?? amountMatch[2]).replace(/,/g, "")) : undefined;
  const desc = text
    .replace(/(?:₹|rs\.?|inr|rupees|\d[\d,]*\.?\d{0,2})/gi, " ")
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const isIncome = /salary|credited|received|refund|deposit/i.test(text) && !/spent|paid|at|debit/i.test(text);
  const dateMatch = text.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
  let date: string | undefined;
  if (dateMatch) {
    const now = new Date();
    const y = dateMatch[3] ? (dateMatch[3].length === 2 ? "20" + dateMatch[3] : dateMatch[3]) : String(now.getFullYear());
    date = `${y}-${dateMatch[1].padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`;
  }
  return { amount, description: desc || undefined, type: isIncome ? "income" : "expense", date };
}

export default function QuickAddGate() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== "/") return;
    const params = new URLSearchParams(location.search);
    const qa = params.get("qa");
    const text = params.get("text");
    const title = params.get("title");
    const raw = qa ?? text ?? title ?? params.get("url") ?? "";

    // Web Share Target sends `?text=...&title=...&url=...` (Chrome/Edge),
    // plus our own `?qa=` shortcut. Build a clean quick-add link.
    if (raw.trim() && (qa || text || title || params.get("url"))) {
      const q = buildExpenseQuery(raw);
      navigate(`/expenses?${q}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}