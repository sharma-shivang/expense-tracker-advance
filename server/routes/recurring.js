import { Router } from "express";
import auth from "../middleware/auth.js";
import RecurringExpense from "../models/RecurringExpense.js";
import Expense from "../models/Expense.js";
import Category from "../models/Category.js";

const router = Router();

function normalizeDesc(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferFrequency(medianGap) {
  if (medianGap <= 2) return "daily";
  if (medianGap >= 6 && medianGap <= 8) return "weekly";
  if (medianGap >= 26 && medianGap <= 34) return "monthly";
  if (medianGap >= 355 && medianGap <= 380) return "yearly";
  return null;
}

router.post("/detect", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.userId })
      .populate("category", "name icon")
      .lean();

    const groups = new Map();
    for (const e of expenses) {
      const key = `${normalizeDesc(e.description)}::${e.type}`;
      if (!groups.has(key)) {
        groups.set(key, { desc: e.description.trim(), type: e.type, items: [], catId: null, catIcon: "" });
      }
      const g = groups.get(key);
      g.items.push({ date: new Date(e.date), amount: e.amount, currency: e.currency });
      if (e.category) g.catId = e.category._id?.toString?.() ?? null;
      g.catIcon = e.category?.icon ?? "";
    }

    const candidates = [];
    for (const g of groups.values()) {
      const items = g.items.sort((a, b) => a.date - b.date);
      if (items.length < 2) continue;

      const uniqueDates = [];
      for (const it of items) {
        const d = new Date(it.date.getFullYear(), it.date.getMonth(), it.date.getDate()).getTime();
        if (uniqueDates[uniqueDates.length - 1] !== d) uniqueDates.push(d);
      }
      if (uniqueDates.length < 2) continue;

      const gaps = [];
      for (let i = 1; i < uniqueDates.length; i++) gaps.push((uniqueDates[i] - uniqueDates[i - 1]) / 86400000);
      const sorted = [...gaps].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      const frequency = inferFrequency(median);
      if (!frequency) continue;

      const stable = gaps.every((gap) => gap >= median * 0.75 && gap <= median * 1.35);
      if (!stable) continue;

      const avgAmount =
        Math.round((items.reduce((s, it) => s + it.amount, 0) / items.length) * 100) / 100;
      const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
      const nextRunDate = new Date(lastDate.getTime() + median * 86400000);

      candidates.push({
        description: g.desc,
        type: g.type,
        amount: avgAmount,
        currency: items[0].currency || "INR",
        frequency,
        interval: 1,
        occurrences: uniqueDates.length,
        category: g.catId,
        lastDate: lastDate.toISOString().slice(0, 10),
        nextRunDate: nextRunDate.toISOString().slice(0, 10),
      });
    }

    candidates.sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
    res.json({ candidates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const recurring = await RecurringExpense.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate("category", "name color icon");
    res.json({ recurring });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const recurring = await RecurringExpense.create({ ...req.body, user: req.userId });
    res.status(201).json({ recurring });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const recurring = await RecurringExpense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!recurring) return res.status(404).json({ message: "Not found" });
    res.json({ recurring });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const recurring = await RecurringExpense.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!recurring) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;