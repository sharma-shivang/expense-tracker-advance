import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Category from "../models/Category.js";
import auth from "../middleware/auth.js";

const router = Router();

const DEFAULT_RATES = {
  INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0094, JPY: 1.82, CAD: 0.0164,
  AUD: 0.0183, CNY: 0.087, CHF: 0.0105, BRL: 0.06, MXN: 0.204, KRW: 16.05,
};

const DEFAULT_CATEGORIES = [
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
];

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      passwordHash,
      baseCurrency: "INR",
      exchangeRates: DEFAULT_RATES,
    });

    await Category.insertMany(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, user: user._id }))
    );

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, username, email, baseCurrency: user.baseCurrency },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        baseCurrency: user.baseCurrency,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

router.put("/me", auth, async (req, res) => {
  try {
    const { baseCurrency, exchangeRates, username } = req.body;
    const update = {};
    if (baseCurrency) update.baseCurrency = baseCurrency;
    if (exchangeRates) update.exchangeRates = exchangeRates;
    if (username) update.username = username;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select("-passwordHash");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;