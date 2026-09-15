import { api } from "./api";
import { formatMoney, currentMonth, monthLabel } from "./format";
import type { Expense, Bill, Budget, Category } from "../types";

export interface DigestSection {
  title: string;
  lines: string[];
}

export interface Digest {
  title: string;
  markdown: string;
  sections: DigestSection[];
}

function catName(c: Category | string | null | undefined): string {
  if (!c) return "Uncategorised";
  return typeof c === "object" ? c.name : c;
}

function money(n: number): string {
  return formatMoney(n, "INR");
}

/** Build a concise plain-text + markdown digest of the current month. */
export async function buildDigest(): Promise<Digest> {
  const month = currentMonth(); // YYYY-MM
  const label = monthLabel(month);
  const today = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const sections: DigestSection[] = [];
  const lines: string[] = [];

  let spent = 0;
  let earned = 0;
  const byCat = new Map<string, number>();

  try {
    const { expenses } = await api.get<{ expenses: Expense[] }>(
      `/expenses?start=${month}-01&end=${month}-31&limit=1000`
    );
    for (const e of expenses) {
      if (e.type === "income") earned += e.amount;
      else {
        spent += e.amount;
        const k = catName(e.category);
        byCat.set(k, (byCat.get(k) ?? 0) + e.amount);
      }
    }
  } catch {
    /* non-fatal */
  }

  lines.push(`Spent **${money(spent)}** and earned **${money(earned)}** in ${label} (as of ${today}).`);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (top.length) {
    lines.push(`Top categories: ${top.map(([c, a]) => `${c} (${money(a)})`).join(", ")}.`);
  }
  if (earned >= spent) {
    lines.push(`Net positive: you kept **${money(earned - spent)}** of what you earned.`);
  } else {
    lines.push(`Net spend: **${money(spent - earned)}** more than you earned.`);
  }

  try {
    const { bills } = await api.get<{ bills: Bill[] }>("/bills");
    const due = bills
      .filter((b) => !b.paid && (b.daysLeft ?? 99) <= 30)
      .map((b) => `- ${b.name} — due ${b.daysLeft === 0 ? "today" : b.daysLeft == null ? `on ${b.dueDate}` : `in ${b.daysLeft}d`} (${money(b.outstanding)})`);
    if (due.length) {
      sections.push({ title: "Bills due soon", lines: due });
    }
  } catch {
    /* non-fatal */
  }

  try {
    const { budgets } = await api.get<{ budgets: Budget[] }>(`/budgets?month=${month}`);
    const over = budgets
      .map((b) => ({
        cat: catName(b.category),
        spent: b.spent ?? 0,
        amount: b.amount,
        pct: b.amount > 0 ? (b.spent ?? 0) / b.amount : 0,
      }))
      .filter((b) => b.pct >= 0.8);
    if (over.length) {
      sections.push({
        title: over.some((b) => b.pct > 1) ? "Over budget" : "Near budget limit",
        lines: over.map((b) =>
          b.pct > 1
            ? `- ${b.cat}: ${Math.round((b.pct - 1) * 100)}% over (${money(b.spent)} of ${money(b.amount)})`
            : `- ${b.cat}: at ${Math.round(b.pct * 100)}% (${money(b.spent)} of ${money(b.amount)})`
        ),
      });
    }
  } catch {
    /* non-fatal */
  }

  const markdown = [
    `# Monthly digest · ${label}`,
    `_Generated ${today}_`,
    "",
    ...lines,
    ...sections.flatMap((s) => ["", `## ${s.title}`, ...s.lines]),
  ].join("\n");

  return { title: `Digest · ${label}`, markdown, sections };
}

export function downloadDigest(markdown: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `digest-${currentMonth().slice(0, 7)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyArbitraryText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
