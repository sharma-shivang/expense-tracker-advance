export interface User {
  id: string;
  username: string;
  email: string;
  baseCurrency: string;
  exchangeRates: Record<string, number>;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
  type: "expense" | "income";
}

export interface Expense {
  _id: string;
  amount: number;
  currency: string;
  description: string;
  category: Category | string;
  type: "expense" | "income";
  date: string;
  recurringId?: string | null;
  account?: Account | string | null;
  createdAt?: string;
}

export interface Budget {
  _id: string;
  category: Category | string;
  amount: number;
  month: string;
  spent?: number;
}

export interface RecurringExpense {
  _id: string;
  amount: number;
  currency: string;
  description: string;
  category: Category | string;
  type: "expense" | "income";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  nextRunDate: string;
  active: boolean;
  createdAt?: string;
}

export type ExpenseFilter = {
  search?: string;
  category?: string;
  start?: string;
  end?: string;
  type?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export interface Account {
  _id: string;
  name: string;
  type: "cash" | "wallet" | "savings" | "credit_card" | "other";
  icon: string;
  color: string;
  openingBalance: number;
  notes?: string;
  balance?: number;
  monthIn?: number;
  monthOut?: number;
}

export interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  icon: string;
  color: string;
  deadline?: string | null;
}

export interface Split {
  _id: string;
  title: string;
  date: string;
  currency: string;
  note?: string;
  participants: { name: string; amount: number; isMe: boolean }[];
  payments: { name: string; amount: number; isMe: boolean }[];
  settled: boolean;
  net?: number;
}

export interface Bill {
  _id: string;
  name: string;
  issuer?: string;
  dueDate: string;
  outstanding: number;
  minDue: number;
  paidAmount: number;
  paid: boolean;
  icon: string;
  color: string;
  daysLeft?: number | null;
  overdue?: boolean;
}

export interface Loan {
  _id: string;
  counterparty: string;
  direction: "lent" | "borrowed";
  amount: number;
  currency: string;
  date: string;
  dueDate?: string | null;
  note?: string;
  repayments: { amount: number; date: string }[];
  settled: boolean;
  outstanding?: number;
  repaid?: number;
}