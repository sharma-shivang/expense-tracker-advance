import { Router } from "express";
import auth from "../middleware/auth.js";
import Budget from "../models/Budget.js";
import Expense from "../models/Expense.js";

const router = Router();

router.get("/", auth, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "month param required (YYYY-MM)" });

    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const budgets = await Budget.find({ user: req.userId, month })
      .populate("category", "name color icon")
      .lean();

    const expenses = await Expense.find({
      user: req.userId,
      type: "expense",
      date: { $gte: start, $lte: end },
    }).lean();

    const user = req.user;
    const base = user.baseCurrency;
    const rates = user.exchangeRates || {};
    const toBase = (amount, currency) =>
      currency === base ? amount : amount / (rates[currency] || 1);

    const spentByCategory = {};
    for (const e of expenses) {
      const catId = e.category.toString();
      spentByCategory[catId] = (spentByCategory[catId] || 0) + toBase(e.amount, e.currency);
    }

    const result = budgets.map((b) => {
      const catId = b.category?._id?.toString() || b.category.toString();
      return {
        ...b,
        spent: Math.round((spentByCategory[catId] || 0) * 100) / 100,
      };
    });

    res.json({ budgets: result, currency: base });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const budget = await Budget.create({ ...req.body, user: req.userId });
    res.status(201).json({ budget });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Budget already exists for this category/month" });
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!budget) return res.status(404).json({ message: "Not found" });
    res.json({ budget });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!budget) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;