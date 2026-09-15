import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Expense from "../models/Expense.js";
import Budget from "../models/Budget.js";
import RecurringExpense from "../models/RecurringExpense.js";
import Split from "../models/Split.js";
import Goal from "../models/Goal.js";
import Account from "../models/Account.js";
import Bill from "../models/Bill.js";
import Loan from "../models/Loan.js";

const DEMO_EMAIL = "sample@expense.demo";
const DEMO_PASSWORD = "demo123";

const DEFAULT_RATES = {
  INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0094, JPY: 1.82, CAD: 0.0164,
  AUD: 0.0183, CNY: 0.087, CHF: 0.0105, BRL: 0.06, MXN: 0.204, KRW: 16.05,
};

const BASE_CATEGORIES = [
  { name: "UPI", color: "#22d3ee", icon: "🪙", type: "expense" },
  { name: "Food & Dining", color: "#ef4444", icon: "🍽️", type: "expense" },
  { name: "Transport", color: "#f97316", icon: "🚗", type: "expense" },
  { name: "Housing", color: "#eab308", icon: "🏠", type: "expense" },
  { name: "Utilities", color: "#22c55e", icon: "💡", type: "expense" },
  { name: "Entertainment", color: "#3b82f6", icon: "🎬", type: "expense" },
  { name: "Shopping", color: "#8b5cf6", icon: "🛍️", type: "expense" },
  { name: "Healthcare", color: "#ec4899", icon: "🏥", type: "expense" },
  { name: "Education", color: "#06b6d4", icon: "📚", type: "expense" },
  { name: "Salary", color: "#10b981", icon: "💰", type: "income" },
  { name: "Freelance", color: "#14b8a6", icon: "💻", type: "income" },
  { name: "Investment", color: "#6366f1", icon: "📈", type: "income" },
  { name: "Coffee", color: "#a16207", icon: "☕", type: "expense" },
  { name: "Groceries", color: "#84cc16", icon: "🧺", type: "expense" },
  { name: "Travel", color: "#0ea5e9", icon: "✈️", type: "expense" },
];

function nthMonth(n) {
  return new Date(new Date().getFullYear(), new Date().getMonth() - n, 1);
}

function dayIn(n, day, hour = 10) {
  const d = nthMonth(n);
  d.setDate(day);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rnd(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function baseExpense(userId, category, amount, description, date) {
  return {
    user: userId,
    amount,
    currency: "INR",
    description,
    category,
    type: "expense",
    date,
    source: "manual",
    account: null,
    seeded: true,
  };
}

function baseIncome(userId, category, amount, description, date) {
  return {
    user: userId,
    amount,
    currency: "INR",
    description,
    category,
    type: "income",
    date,
    source: "manual",
    account: null,
    seeded: true,
  };
}

async function ensureCategories(user, catNames) {
  const existing = await Category.find({ user: user._id }).lean();
  const existingNames = new Set(existing.map((c) => c.name));
  const toAdd = [];
  for (const c of BASE_CATEGORIES) {
    const cat = {
      user: user._id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      type: c.type,
      seeded: true,
    };
    if (existingNames.has(c.name)) {
      catNames[c.name] = existing.find((e) => e.name === c.name)._id;
    } else {
      toAdd.push(cat);
    }
  }
  if (toAdd.length > 0) {
    const inserted = await Category.insertMany(toAdd);
    for (const c of inserted) catNames[c.name] = c._id;
  }
  return catNames;
}

function pickByType(catNames, type) {
  for (const name of Object.keys(catNames)) {
    const match = BASE_CATEGORIES.find((c) => c.name === name && c.type === type);
    if (match) return catNames[name];
  }
  return catNames[Object.keys(catNames)[0]];
}

function buildExpenses(userId, catNames, ccId) {
  const expenses = [];
  const rent = catNames["Housing"] || pickByType(catNames, "expense");
  const food = catNames["Food & Dining"] || pickByType(catNames, "expense");
  const transport = catNames["Transport"] || pickByType(catNames, "expense");
  const utilities = catNames["Utilities"] || pickByType(catNames, "expense");
  const shopping = catNames["Shopping"] || pickByType(catNames, "expense");
  const ent = catNames["Entertainment"] || pickByType(catNames, "expense");
  const heal = catNames["Healthcare"] || pickByType(catNames, "expense");
  const edu = catNames["Education"] || pickByType(catNames, "expense");
  const coffee = catNames["Coffee"] || pickByType(catNames, "expense");
  const groc = catNames["Groceries"] || pickByType(catNames, "expense");
  const travel = catNames["Travel"] || pickByType(catNames, "expense");

  const expensePlan = [
    [1, 85000, "Salary - ABC Tech", "Salary", "income"],
    [2, 1240, "BigBasket - Groceries", "Groceries", "expense"],
    [2, 540, "Petrol - Indian Oil", "Transport", "expense"],
    [4, 78, "Metro card top up", "Transport", "expense"],
    [5, 332, "Uber ride - office to home", "Transport", "expense"],
    [6, 485, "Swiggy - Dinner", "Food & Dining", "expense"],
    [7, 420, "Zomato - Lunch", "Food & Dining", "expense"],
    [8, 240, "Coffee - Blue Tokai", "Coffee", "expense"],
    [9, 1120, "Zepto - Groceries", "Groceries", "expense"],
    [10, 15999, "Rent - PG + electric", "Housing", "expense"],
    [11, 1899, "INR 1M recharged", "Entertainment", "expense"],
    [12, 900, "Bajaj finserv EMI - phone", "Shopping", "expense"],
    [13, 2280, "Electricity bill - BEST", "Utilities", "expense"],
    [15, 1899, "Netflix recharged", "Entertainment", "expense"],
    [16, 549, "Dettol / soap - med store", "Healthcare", "expense"],
    [17, 640, "Swiggy - Burgers with friends", "Food & Dining", "expense"],
    [19, 540, "Petrol - HP", "Transport", "expense"],
    [20, 460, "Chai + breakfast - Haldiram", "Food & Dining", "expense"],
    [21, 2600, "Hostel fee - course", "Education", "expense"],
    [22, 749, "Cloudy girl soda ice cream", "Food & Dining", "expense"],
    [23, 1599, "Ordered sneakers sale", "Shopping", "expense"],
    [24, 2599, "BEST Fastag top up", "Transport", "expense"],
    [25, 1199, "Milk + bread weekly", "Groceries", "expense"],
    [26, 3200, "Rent - PG", "Housing", "expense"],
    [27, 1850, "Zomato Gold - buffet", "Food & Dining", "expense"],
  ];

  const worklogs = [
    [2, 3500, "RoutesHealth - AFC", "Freelance", "income"],
    [16, 3500, "RoutesHealth - AFC", "Freelance", "income"],
    [18, 1050, "LULU leopards - supporter", "Investment", "income"],
    [20, 4000, "Dribbble project", "Freelance", "income"],
    [25, 900, "Fraction INR 5K - ELSS", "Investment", "income"],
  ];

  const trips = [
    [4, 2299, "Trip to Goa - ola", "Travel", "expense"],
    [11, 4499, "IRCTC ticket", "Travel", "expense"],
    [19, 2850, "Coorg trip - stay", "Travel", "expense"],
    [24, 1299, "Dubai visa - couldn't go", "Travel", "expense"],
  ];

  const savings = [
    [7, 20000, "Tribbe - tax saver", "Investment", "income"],
    [13, 20000, "Tribbe - tax saver", "Investment", "income"],
  ];

  const holidays = [
    [3, 2850, "Ganpati: sweets + puja", "Shopping", "expense"],
    [9, 3200, "Diwali: sweets + decor", "Shopping", "expense"],
    [21, 1500, "Christmas: gifts", "Shopping", "expense"],
  ];

  const plan = [...expensePlan, ...worklogs, ...trips, ...savings, ...holidays];

  for (const [day, amt, desc, cname, kind] of plan) {
    const raw = amt * (1 + (rnd(day * 13 + (desc.length % 7) * 101)() - 0.5) * 0.16);
    const a = Math.round(raw);
    const catNamesList = cname === "Food & Dining" ? food : cname === "Transport" ? transport : cname === "Utilities" ? utilities : cname === "Shopping" ? shopping : cname === "Entertainment" ? ent : cname === "Healthcare" ? heal : cname === "Education" ? edu : cname === "Coffee" ? coffee : cname === "Groceries" ? groc : cname === "Housing" ? rent : cname === "Travel" ? travel : null;
    const obj =
      kind === "income"
        ? baseIncome(userId, catNames[cname] || pickByType(catNames, "income"), a, desc, dayIn(0, day))
        : baseExpense(userId, catNamesList, a, desc, dayIn(0, day));
    if (cname === "Travel" || cname === "Shopping" || cname === "Entertainment") obj.account = ccId;
    expenses.push(obj);
  }

  function addPurchase(catId, desc, amt, date, opts = {}) {
    const raw = amt * (1 + (rnd(desc.length * 7 + 5)() - 0.5) * 0.16);
    expenses.push({ ...baseExpense(userId, catId, Math.round(raw), desc, date), ...opts });
  }

  addPurchase(food, "Swiggy - Family dinner", 640, dayIn(2, 4), { account: ccId });
  addPurchase(food, "Hex Tinder - night out", 640, dayIn(3, 6), { account: ccId });

  for (let month = 1; month <= 5; month++) {
    const f = 1 + (rnd(month * 97 + 3)() - 0.5) * 0.18;
    addPurchase(food, "Swiggy - Dinner", Math.round(640 * f), dayIn(month, 8));
    addPurchase(food, "Zomato - Lunch", Math.round(420 * f), dayIn(month, 10));
    addPurchase(groc, "BigBasket - Groceries", Math.round(1240 * f), dayIn(month, 12));
    addPurchase(transport, "Petrol - Indian Oil", Math.round(540 * f), dayIn(month, 12));
    addPurchase(transport, "Metro card top up", Math.round(78 * f), dayIn(month, 14));
    addPurchase(utilities, "Electricity bill - BEST", Math.round(2280 * f), dayIn(month, 9));
    addPurchase(utilities, "Internet - JioFiber", Math.round(849 * f), dayIn(month, 11));
    addPurchase(ent, "Movie - PVR", Math.round(1899 * f), dayIn(month, 15));
    addPurchase(coffee, "Coffee - Blue Tokai", Math.round(240 * f), dayIn(month, 17));
    addPurchase(shopping, "Amazon - headphones", Math.round(899 * f), dayIn(month, 18));
    addPurchase(groc, "Zepto - Groceries", Math.round(1120 * f), dayIn(month, 20));
    addPurchase(rent, "Rent - PG", Math.round(15999 * f), dayIn(month, 10));
    addPurchase(rent, "Rent - PG", Math.round(3200 * f), dayIn(month, 25));
    if (month % 2 === 1) {
      addPurchase(heal, "Dettol / soap - med store", Math.round(320 * f), dayIn(month, 22));
    }
    expenses.push(
      baseIncome(userId, catNames["Salary"] || pickByType(catNames, "income"), Math.round(85000 * f), "Salary - ABC Tech", dayIn(month, 1))
    );
    if (month === 1 || month === 4) {
      expenses.push(baseIncome(userId, catNames["Freelance"] || pickByType(catNames, "income"), Math.round(3500 * f), "Freelance - RoutesHealth", dayIn(month, 18)));
    }
    expenses.push(baseIncome(userId, catNames["Investment"] || pickByType(catNames, "income"), Math.round(900 * f), "Fraction INR 5K - ELSS", dayIn(month, 25)));
  }

  return expenses;
}

async function main() {
  const target = process.argv[2] || process.env.SEED_EMAIL;

  await connectDB();

  const lookup = target || DEMO_EMAIL;
  let user = await User.findOne({ $or: [{ email: lookup }, { username: lookup }] });
  const isDemo = !target;

  if (!user) {
    const email = lookup;
    const username = target ? target.split("@")[0] : "Sample";
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    user = await User.create({
      username,
      email,
      passwordHash,
      baseCurrency: "INR",
      exchangeRates: DEFAULT_RATES,
      seeded: isDemo,
    });
    console.log(`\nCreated demo user`);
    console.log(`  Email : ${email}`);
    console.log(`  Pass  : ${DEMO_PASSWORD}`);
  }

  const catNames = {};
  await ensureCategories(user, catNames);
  const savedIds = {};

  await Expense.deleteMany({ user: user._id, seeded: true });
  await Budget.deleteMany({ user: user._id, seeded: true });
  await RecurringExpense.deleteMany({ user: user._id, seeded: true });
  await Split.deleteMany({ user: user._id, seeded: true });
  await Goal.deleteMany({ user: user._id, seeded: true });
  await Account.deleteMany({ user: user._id, seeded: true });
  await Bill.deleteMany({ user: user._id, seeded: true });
  await Loan.deleteMany({ user: user._id, seeded: true });

  const accountData = [
    { name: "SBI Savings", type: "savings", icon: "🏦", color: "#f59e0b", openingBalance: 45000, notes: "Salary account", seeded: true },
    { name: "HDFC Credit Card", type: "credit_card", icon: "💳", color: "#3b82f6", openingBalance: 0, notes: "Card for purchases", seeded: true },
    { name: "Paytm Wallet", type: "wallet", icon: "📱", color: "#22d3ee", openingBalance: 2500, notes: "Everyday wallet", seeded: true },
    { name: "Cash", type: "cash", icon: "💵", color: "#22c55e", openingBalance: 8000, notes: "Petty cash", seeded: true },
  ];
  const accounts = await Account.insertMany(accountData.map((a) => ({ ...a, user: user._id })));
  for (const a of accounts) savedIds[a.name] = a._id;

  const ccId = savedIds["HDFC Credit Card"];
  const walletId = savedIds["Paytm Wallet"];
  const cashId = savedIds["Cash"];

  const expenses = buildExpenses(user._id, catNames, ccId);
  for (const e of expenses) {
    if (!e.account) {
      if (e.type === "income" && e.description.startsWith("Salary")) e.account = walletId;
      else if (e.description.startsWith("Petrol")) e.account = cashId;
      else if (e.type === "income") e.account = walletId;
    }
  }
  await Expense.insertMany(expenses);

  const recurringData = [
    { amount: 85, description: "Morning chai", category: catNames["Coffee"] || pickByType(catNames, "expense"), type: "expense", frequency: "daily", interval: 1, nextRunDate: addDays(new Date(), 1), active: true, seeded: true },
    { amount: 1240, description: "BigBasket weekly", category: catNames["Groceries"] || pickByType(catNames, "expense"), type: "expense", frequency: "weekly", interval: 1, nextRunDate: addDays(new Date(), 4), active: true, seeded: true },
    { amount: 15999, description: "Rent - PG", category: catNames["Housing"] || pickByType(catNames, "expense"), type: "expense", frequency: "monthly", interval: 1, nextRunDate: addDays(new Date(), 12), active: true, seeded: true },
    { amount: 1899, description: "Netflix subscription", category: catNames["Entertainment"] || pickByType(catNames, "expense"), type: "expense", frequency: "monthly", interval: 1, nextRunDate: addDays(new Date(), 18), active: true, seeded: true },
    { amount: 849, description: "JioFiber internet", category: catNames["Utilities"] || pickByType(catNames, "expense"), type: "expense", frequency: "monthly", interval: 1, nextRunDate: addDays(new Date(), 8), active: true, seeded: true },
    { amount: 3500, description: "RoutesHealth payment", category: catNames["Freelance"] || pickByType(catNames, "income"), type: "income", frequency: "monthly", interval: 1, nextRunDate: addDays(new Date(), 6), active: true, seeded: true },
  ];
  const recurring = await RecurringExpense.insertMany(
    recurringData.map((r) => ({ ...r, user: user._id }))
  );

  const goalData = [
    { name: "Emergency Fund", targetAmount: 200000, savedAmount: 45000, icon: "🛡️", color: "#22c55e", deadline: addDays(new Date(), 600), seeded: true },
    { name: "Honda Shine Bike", targetAmount: 95000, savedAmount: 82000, icon: "🏍️", color: "#f59e0b", deadline: addDays(new Date(), 90), seeded: true },
    { name: "Goa Trip", targetAmount: 40000, savedAmount: 31500, icon: "🏖️", color: "#0ea5e9", deadline: addDays(new Date(), 45), seeded: true },
  ];
  const goals = await Goal.insertMany(goalData.map((g) => ({ ...g, user: user._id })));

  const billData = [
    { name: "Electricity", issuer: "BEST", dueDate: addDays(new Date(), -5), outstanding: 2280, minDue: 2280, paidAmount: 0, paid: false, icon: "💡", color: "#22c55e", seeded: true },
    { name: "Internet", issuer: "JioFiber", dueDate: addDays(new Date(), 6), outstanding: 849, minDue: 849, paidAmount: 0, paid: false, icon: "🌐", color: "#0ea5e9", seeded: true },
    { name: "Phone", issuer: "Jio", dueDate: addDays(new Date(), 9), outstanding: 499, minDue: 499, paidAmount: 0, paid: false, icon: "📱", color: "#22d3ee", seeded: true },
    { name: "Credit Card", issuer: "HDFC Bank", dueDate: addDays(new Date(), 16), outstanding: 15240, minDue: 1500, paidAmount: 0, paid: false, icon: "💳", color: "#3b82f6", seeded: true },
    { name: "Rent", issuer: "Landlord", dueDate: addDays(new Date(), 12), outstanding: 15999, minDue: 15999, paidAmount: 0, paid: false, icon: "🏠", color: "#eab308", seeded: true },
    { name: "Groceries", issuer: "Dmart", dueDate: addDays(new Date(), -2), outstanding: 0, minDue: 0, paidAmount: 2470, paid: true, icon: "🧺", color: "#84cc16", seeded: true },
  ];
  const bills = await Bill.insertMany(billData.map((b) => ({ ...b, user: user._id })));

  const loanData = [
    { counterparty: "Arjun", direction: "lent", amount: 5000, currency: "INR", date: addDays(new Date(), -20), dueDate: addDays(new Date(), 12), note: "Lunch money", repayments: [], settled: false, seeded: true },
    { counterparty: "Paytm Postpaid", direction: "borrowed", amount: 7500, currency: "INR", date: addDays(new Date(), -15), dueDate: addDays(new Date(), 3), note: "EMI", repayments: [{ amount: 2500, date: addDays(new Date(), -5) }], settled: false, seeded: true },
    { counterparty: "Parents", direction: "borrowed", amount: 22000, currency: "INR", date: addDays(new Date(), -60), dueDate: addDays(new Date(), 30), note: "Phone", repayments: [{ amount: 5000, date: addDays(new Date(), -40) }, { amount: 7000, date: addDays(new Date(), -20) }], settled: false, seeded: true },
    { counterparty: "Cousin", direction: "lent", amount: 12000, currency: "INR", date: addDays(new Date(), -90), dueDate: addDays(new Date(), -10), note: "Trip share", repayments: [{ amount: 12000, date: addDays(new Date(), -10) }], settled: true, seeded: true },
  ];
  const loans = await Loan.insertMany(loanData.map((l) => ({ ...l, user: user._id })));

  const splitData = [
    {
      title: "Dinner at Social",
      date: addDays(new Date(), -4),
      currency: "INR",
      note: "4 people, I paid",
      participants: [
        { name: "Me", amount: 640, isMe: true },
        { name: "Arjun", amount: 640, isMe: false },
        { name: "Priya", amount: 640, isMe: false },
        { name: "Rahul", amount: 640, isMe: false },
      ],
      payments: [
        { name: "Me", amount: 2560, isMe: true },
        { name: "Arjun", amount: 640, isMe: false },
      ],
      settled: false,
      seeded: true,
    },
    {
      title: "Goa trip settlement",
      date: addDays(new Date(), -20),
      currency: "INR",
      note: "Shared travel + stay",
      participants: [
        { name: "Me", amount: 4800, isMe: true },
        { name: "Arjun", amount: 4800, isMe: false },
      ],
      payments: [
        { name: "Me", amount: 7200, isMe: true },
        { name: "Arjun", amount: 2400, isMe: false },
      ],
      settled: true,
      seeded: true,
    },
  ];
  const splits = await Split.insertMany(splitData.map((s) => ({ ...s, user: user._id })));

  const month = monthStr();
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
  const monthly = await Expense.find({
    user: user._id,
    type: "expense",
    date: { $gte: start, $lte: end },
  }).lean();

  const byCat = {};
  for (const e of monthly) {
    const k = String(e.category);
    byCat[k] = (byCat[k] || 0) + e.amount;
  }

  const budgetMults = {
    "Food & Dining": 0.72,
    "Shopping": 1.05,
    "Transport": 1.4,
    "Utilities": 1.4,
    "Entertainment": 1.45,
    "Groceries": 1.3,
  };

  const budgets = [];
  for (const [name, mult] of Object.entries(budgetMults)) {
    const catId = catNames[name];
    if (!catId) continue;
    const spent = byCat[catId] || 0;
    const amount = Math.max(500, Math.ceil((spent * mult) / 100) * 100);
    const exists = await Budget.findOne({ user: user._id, category: catId, month });
    if (!exists) {
      budgets.push({ user: user._id, category: catId, amount, month, seeded: true });
    }
  }
  await Budget.insertMany(budgets);

  console.log(`\nSeeded data for ${user.email}:`);
  console.log(`  Accounts     : ${accounts.length}`);
  console.log(`  Expenses     : ${expenses.length}`);
  console.log(`  Budgets      : ${budgets.length}`);
  console.log(`  Recurring    : ${recurring.length}`);
  console.log(`  Goals        : ${goals.length}`);
  console.log(`  Bills        : ${bills.length}`);
  console.log(`  Loans        : ${loans.length}`);
  console.log(`  Splits       : ${splits.length}`);
  if (isDemo) console.log(`  Login with   : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});