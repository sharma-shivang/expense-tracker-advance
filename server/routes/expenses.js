import { Router } from "express";
import auth from "../middleware/auth.js";
import Expense from "../models/Expense.js";
import Category from "../models/Category.js";
import RecurringExpense from "../models/RecurringExpense.js";

const router = Router();

function toBaseFn(user) {
  const base = user.baseCurrency;
  const rates = user.exchangeRates || {};
  return (amount, currency) => (currency === base ? amount : amount / (rates[currency] || 1));
}

function advanceDate(date, frequency, interval = 1) {
  const d = new Date(date);
  switch (frequency) {
    case "daily":   d.setDate(d.getDate() + interval); break;
    case "weekly":  d.setDate(d.getDate() + 7 * interval); break;
    case "monthly": d.setMonth(d.getMonth() + interval); break;
    case "yearly":  d.setFullYear(d.getFullYear() + interval); break;
  }
  return d;
}

async function syncRecurring(userId) {
  const recurring = await RecurringExpense.find({ user: userId, active: true });
  const now = new Date();
  const toCreate = [];

  for (const rec of recurring) {
    let next = new Date(rec.nextRunDate);
    while (next <= now) {
      toCreate.push({
        user: userId,
        amount: rec.amount,
        currency: rec.currency,
        description: rec.description,
        category: rec.category,
        type: rec.type,
        date: new Date(next),
        recurringId: rec._id,
      });
      next = advanceDate(next, rec.frequency, rec.interval);
    }
    if (next.getTime() !== rec.nextRunDate.getTime()) {
      rec.nextRunDate = next;
      await rec.save();
    }
  }

  if (toCreate.length > 0) {
    await Expense.insertMany(toCreate);
  }
}

router.get("/", auth, async (req, res) => {
  try {
    await syncRecurring(req.userId);
    const { search, category, start, end, type, sort = "date", order = "desc", account } = req.query;

    const filter = { user: req.userId };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (account) filter.account = account;
    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = new Date(start);
      if (end) filter.date.$lte = new Date(end + "T23:59:59.999Z");
    }
    if (search) filter.description = { $regex: search, $options: "i" };

    const expenses = await Expense.find(filter)
      .sort({ [sort]: order === "asc" ? 1 : -1 })
      .populate("category", "name color icon")
      .lean();

    res.json({ expenses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/summary", auth, async (req, res) => {
  try {
    await syncRecurring(req.userId);
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "month param required (YYYY-MM)" });

    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      user: req.userId,
      date: { $gte: start, $lte: end },
    }).populate("category", "name color").lean();

    const user = req.user;
    const base = user.baseCurrency;
    const rates = user.exchangeRates || {};
    const toBase = (amount, currency) => {
      if (currency === base) return amount;
      const rate = rates[currency] || 1;
      return amount / rate;
    };

    let totalExpense = 0;
    let totalIncome = 0;
    const byCategory = {};

    for (const exp of expenses) {
      const converted = toBase(exp.amount, exp.currency);
      if (exp.type === "expense") {
        totalExpense += converted;
        const catId = exp.category?._id?.toString() || "uncategorized";
        if (!byCategory[catId])
          byCategory[catId] = { name: exp.category?.name || "Uncategorized", color: exp.category?.color || "#888", total: 0 };
        byCategory[catId].total += converted;
      } else {
        totalIncome += converted;
      }
    }

    res.json({
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      balance: Math.round((totalIncome - totalExpense) * 100) / 100,
      byCategory: Object.values(byCategory),
      currency: base,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/trends", auth, async (req, res) => {
  try {
    await syncRecurring(req.userId);
    const { months = 6 } = req.query;
    const user = req.user;
    const base = user.baseCurrency;
    const rates = user.exchangeRates || {};
    const toBase = (amount, currency) =>
      currency === base ? amount : amount / (rates[currency] || 1);

    const results = [];
    const now = new Date();
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const expenses = await Expense.find({
        user: req.userId,
        date: { $gte: start, $lte: end },
      }).lean();

      let inc = 0, exp = 0;
      for (const e of expenses) {
        const c = toBase(e.amount, e.currency);
        if (e.type === "income") inc += c; else exp += c;
      }
      results.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        income: Math.round(inc * 100) / 100,
        expense: Math.round(exp * 100) / 100,
      });
    }
    res.json({ trends: results, currency: base });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/merchants", auth, async (req, res) => {
  try {
    const { start, end, limit = 6 } = req.query;
    if (!start || !end) return res.status(400).json({ message: "start and end required" });

    const toBase = toBaseFn(req.user);
    const expenses = await Expense.find({
      user: req.userId,
      type: "expense",
      date: { $gte: new Date(start), $lte: new Date(end + "T23:59:59.999Z") },
    }).lean();

    const byMerchant = {};
    for (const e of expenses) {
      const key = (e.description || "Unknown").trim();
      if (!key) continue;
      if (!byMerchant[key]) byMerchant[key] = { name: key, total: 0, count: 0 };
      byMerchant[key].total += toBase(e.amount, e.currency);
      byMerchant[key].count++;
    }

    const merchants = Object.values(byMerchant)
      .sort((a, b) => b.total - a.total)
      .slice(0, parseInt(limit) || 6)
      .map((m) => ({
        ...m,
        total: Math.round(m.total * 100) / 100,
      }));

    const grand = Math.round(merchants.reduce((s, m) => s + m.total, 0) * 100) / 100;
    res.json({ merchants, total: grand });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, user: req.userId });
    res.status(201).json({ expense });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: "Not found" });
    res.json({ expense });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!expense) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;