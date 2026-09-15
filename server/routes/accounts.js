import { Router } from "express";
import auth from "../middleware/auth.js";
import Account from "../models/Account.js";
import Expense from "../models/Expense.js";

const router = Router();

function period(month) {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999) };
}

router.get("/", auth, async (req, res) => {
  try {
    const { month } = req.query;
    const accounts = await Account.find({ user: req.userId }).sort({ createdAt: 1 }).lean();

    let monthIn = {};
    let monthOut = {};
    let totalIn = {};
    let totalOut = {};
    if (month) {
      const { start, end } = period(month);
      const exps = await Expense.find({
        user: req.userId,
        date: { $gte: start, $lte: end },
      }).lean();
      const all = await Expense.find({ user: req.userId }).lean();
      for (const e of exps) {
        if (e.account) {
          const k = e.account.toString();
          if (e.type === "income") monthIn[k] = (monthIn[k] || 0) + e.amount;
          else monthOut[k] = (monthOut[k] || 0) + e.amount;
        }
      }
      for (const e of all) {
        if (e.account) {
          const k = e.account.toString();
          if (e.type === "income") totalIn[k] = (totalIn[k] || 0) + e.amount;
          else totalOut[k] = (totalOut[k] || 0) + e.amount;
        }
      }
    }

    const enriched = accounts.map((a) => {
      const k = a._id.toString();
      const inMonth = Math.round((monthIn[k] || 0) * 100) / 100;
      const outMonth = Math.round((monthOut[k] || 0) * 100) / 100;
      const balance =
        a.openingBalance +
        Math.round(((totalIn[k] || 0) - (totalOut[k] || 0)) * 100) / 100;
      return { ...a, monthIn: inMonth, monthOut: outMonth, balance };
    });

    const unassigned = await Expense.find({ user: req.userId, account: null }).countDocuments();
    res.json({ accounts: enriched, unassigned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const account = await Account.create({ ...req.body, user: req.userId });
    res.status(201).json({ account });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Account with this name already exists" });
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!account) return res.status(404).json({ message: "Not found" });
    res.json({ account });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ message: "Not found" });
    await Expense.updateMany({ user: req.userId, account: account._id }, { $set: { account: null } });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;