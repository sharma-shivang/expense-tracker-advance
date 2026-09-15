import { Router } from "express";
import auth from "../middleware/auth.js";
import Bill from "../models/Bill.js";

const router = Router();

function enrich(bill, now = new Date()) {
  const due = bill.dueDate ? new Date(bill.dueDate) : null;
  let days = null;
  if (due && !bill.paid) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    days = Math.round((dueDay - today) / 86400000);
  }
  return { ...bill, daysLeft: days, overdue: days !== null && days < 0 };
}

router.get("/", auth, async (req, res) => {
  try {
    const bills = await Bill.find({ user: req.userId }).sort({ dueDate: 1 }).lean();
    const enriched = bills.map((b) => enrich(b));
    const totalDue = Math.round(
      enriched.filter((b) => !b.paid).reduce((s, b) => s + b.outstanding, 0) * 100
    ) / 100;
    res.json({ bills: enriched, totalDue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const bill = await Bill.create({ ...req.body, user: req.userId });
    res.status(201).json({ bill: enrich(bill.toObject()) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    ).lean();
    if (!bill) return res.status(404).json({ message: "Not found" });
    res.json({ bill: enrich(bill) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!bill) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;