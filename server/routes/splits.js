import { Router } from "express";
import auth from "../middleware/auth.js";
import Split from "../models/Split.js";

const router = Router();

function netFor(split) {
  const myShare = split.participants
    .filter((p) => p.isMe)
    .reduce((s, p) => s + p.amount, 0);
  const myPaid = split.payments
    .filter((p) => p.isMe)
    .reduce((s, p) => s + p.amount, 0);
  return Math.round((myPaid - myShare) * 100) / 100;
}

router.get("/", auth, async (req, res) => {
  try {
    const splits = await Split.find({ user: req.userId })
      .sort({ date: -1 })
      .lean();
    const enriched = splits.map((s) => ({ ...s, net: netFor(s) }));
    const netOwed = Math.round(
      enriched.filter((s) => !s.settled).reduce((sum, s) => sum + s.net, 0) * 100
    ) / 100;
    res.json({ splits: enriched, netOwed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const total = req.body.participants.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const paid = req.body.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (Math.abs(total - paid) > 0.01)
      return res.status(400).json({ message: "Sum of payments must equal total split amount" });
    const split = await Split.create({ ...req.body, user: req.userId });
    res.status(201).json({ split });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (req.body.participants) {
      const total = req.body.participants.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const paid = req.body.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      if (Math.abs(total - paid) > 0.01)
        return res.status(400).json({ message: "Sum of payments must equal total split amount" });
    }
    const split = await Split.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    ).lean();
    if (!split) return res.status(404).json({ message: "Not found" });
    res.json({ split: { ...split, net: netFor(split) } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const split = await Split.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!split) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;