import { useEffect } from "react";
import { api } from "../lib/api";
import { currentMonth } from "../lib/format";
import type { Bill, Budget } from "../types";

export const notifySupported = () => "Notification" in window;

export function notificationsEnabled() {
  try {
    return notifySupported() && Notification.permission === "granted" && localStorage.getItem("notifyEnabled") === "1";
  } catch {
    return false;
  }
}

interface Alert {
  title: string;
  body: string;
  tag: string;
}

function billAlerts(bills: Bill[]): Alert[] {
  const out: Alert[] = [];
  for (const b of bills) {
    if (b.paid) continue;
    if (b.overdue) {
      out.push({ title: `Bill overdue: ${b.name}`, body: `${b.name} (${b.issuer}) is overdue.`, tag: `bill-${b._id}` });
    } else if (b.daysLeft !== null && b.daysLeft !== undefined && b.daysLeft <= 3) {
      out.push({
        title: `Bill due soon: ${b.name}`,
        body: `${b.name} (${b.issuer}) is due ${b.daysLeft === 0 ? "today" : `in ${b.daysLeft} day${b.daysLeft === 1 ? "" : "s"}`}.`,
        tag: `bill-${b._id}`,
      });
    }
  }
  return out;
}

function budgetAlerts(budgets: Budget[]): Alert[] {
  const out: Alert[] = [];
  for (const b of budgets) {
    const cat = typeof b.category === "object" && b.category ? b.category : null;
    const name = cat?.name ?? "category";
    if ((b.spent ?? 0) > b.amount) {
      out.push({ title: `Over budget: ${name}`, body: `${name} is over its budget.`, tag: `budget-${b._id}` });
    } else if ((b.spent ?? 0) > b.amount * 0.8) {
      out.push({ title: `Near budget limit: ${name}`, body: `${name} is at ${Math.round(((b.spent ?? 0) / b.amount) * 100)}% of its budget.`, tag: `budget-${b._id}` });
    }
  }
  return out;
}

export async function collectAlerts(): Promise<Alert[]> {
  if (!notificationsEnabled()) return [];
  const month = currentMonth();
  try {
    const [bills, budgets] = await Promise.all([
      api.get<{ bills: Bill[] }>("/bills").catch(() => ({ bills: [] })),
      api.get<{ budgets: Budget[] }>(`/budgets?month=${month}`).catch(() => ({ budgets: [] })),
    ]);
    return [...billAlerts(bills.bills), ...budgetAlerts(budgets.budgets)];
  } catch {
    return [];
  }
}

export function fireNotifications(alerts: Alert[]) {
  if (!notificationsEnabled() || alerts.length === 0) return;
  const signature = alerts.map((a) => a.tag).sort().join(",");
  const seen = localStorage.getItem("notifySeen") ?? "";
  if (seen === signature) return;
  localStorage.setItem("notifySeen", signature);
  // one combined notification keeps it unobtrusive
  const first = alerts[0];
  const more = alerts.length - 1;
  const n = new Notification(`${alerts.length === 1 ? "Expense alert" : `${alerts.length} reminders`}`, {
    body: `${first.body}${more > 0 ? ` · and ${more} more` : ""}`,
    tag: "expense-alerts",
    silent: false,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

/** Standalone component that runs alert checks on mount + every 30 min while the app is open. */
export default function Notifier() {
  useEffect(() => {
    if (!notificationsEnabled()) return;
    let stop = false;
    const run = async () => {
      const alerts = await collectAlerts();
      if (!stop) fireNotifications(alerts);
    };
    run();
    const iv = setInterval(run, 30 * 60 * 1000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);
  return null;
}