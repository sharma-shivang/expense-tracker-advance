export interface ParsedQuickAdd {
  amount?: number;
  description?: string;
  type: "expense" | "income";
}

const INCOME_HINTS = /\b(?:salary|credited|received|deposit(?:ed)?|refund(?:ed)?|credited by|recvd)\b/i;
const AMOUNT_RE = /(?:₹|rs\.?|inr)\s*([\d][\d,]*(?:\.\d{1,2})?)|([\d][\d,]*(?:\.\d{1,2})?)\s*(?:rupees|rs\.?|inr|rs)/gi;
const DATE_RE = /\b(\d{1,2})\s*(?:[-\/.])?\s*(\d{1,2})\b/;

function num(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

export function parseQuickAdd(raw: string): ParsedQuickAdd {
  let text = raw
    .replace(/[•·]\s*shared\s+from\s+.*$/i, "")
    .replace(/[•·].*$/i, "")
    .trim();

  const amounts: number[] = [];
  let m;
  AMOUNT_RE.lastIndex = 0;
  while ((m = AMOUNT_RE.exec(text)) !== null) {
    const val = m[1] ?? m[2];
    if (val) amounts.push(num(val));
  }

  const amount = amounts.length ? Math.max(...amounts) : undefined;

  const clean = text
    .replace(AMOUNT_RE, " ")
    .replace(/\b(?:rupees|rs\.?|inr|₹)\b/gi, " ")
    .replace(/\b(?:debited|credited|credited by|received|recvd|paid|spent|spend|at|for|to|on|towards|upi|via|payment|dinner|lunch)\b/gi, " ")
    .replace(/[•·,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const description = clean
    .split(" ")
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const type = INCOME_HINTS.test(raw) ? "income" : "expense";

  return { amount, description: description || undefined, type };
}

export function dateFromQuickAdd(raw: string): string | undefined {
  const m = raw.match(DATE_RE);
  if (!m) return undefined;
  const today = new Date();
  const thisYear = today.getFullYear();
  return `${thisYear}-${String(+m[1]).padStart(2, "0")}-${String(+m[2]).padStart(2, "0")}`;
}