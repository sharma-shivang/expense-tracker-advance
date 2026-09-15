import type { Expense } from "../types";

export function expensesToCSV(expenses: Expense[]): string {
  const headers = ["Date", "Description", "Category", "Type", "Amount", "Currency"];
  const rows = expenses.map((e) => {
    const cat = typeof e.category === "object" && e.category ? e.category.name : "Uncategorized";
    return [
      new Date(e.date).toISOString().slice(0, 10),
      `"${(e.description || "").replace(/"/g, '""')}"`,
      `"${cat.replace(/"/g, '""')}"`,
      e.type,
      e.amount,
      e.currency,
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}