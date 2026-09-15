import { Router } from "express";
import auth from "../middleware/auth.js";
import Goal from "../models/Goal.js";

const router = Router();

router.get("/", auth, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.userId }).sort({ createdAt: 1 }).lean();
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.userId });
    res.status(201).json({ goal });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const { deposit } = req.body;
    const patch = { ...req.body };
    delete patch.deposit;
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: patch, $inc: deposit ? { savedAmount: Number(deposit) } : undefined },
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Not found" });
    res.json({ goal });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;