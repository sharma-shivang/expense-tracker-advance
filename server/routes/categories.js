import { Router } from "express";
import auth from "../middleware/auth.js";
import Category from "../models/Category.js";

const router = Router();

router.get("/", auth, async (req, res) => {
  try {
    const categories = await Category.find({ user: req.userId }).sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const category = await Category.create({ ...req.body, user: req.userId });
    res.status(201).json({ category });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Category already exists" });
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!category) return res.status(404).json({ message: "Not found" });
    res.json({ category });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!category) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;