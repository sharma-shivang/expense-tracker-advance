import { Router } from "express";
import express from "express";
import { PDFParse } from "pdf-parse";
import crypto from "crypto";
import auth from "../middleware/auth.js";
import Expense from "../models/Expense.js";
import Category from "../models/Category.js";

const router = Router();
router.use(express.raw({ type: "application/pdf", limit: "15mb" }));

const CAT_MAP = {
  food: "Food & Dining", dining: "Food & Dining", restaurant: "Food & Dining", grocer: "Food & Dining", swiggy: "Food & Dining", zomato: "Food & Dining", bigbasket: "Food & Dining", blinkit: "Food & Dining", zepto: "Food & Dining",
  transport: "Transport", uber: "Transport", ola: "Transport", fuel: "Transport", metro: "Transport", parking: "Transport",
  electric: "Utilities", water: "Utilities", broadband: "Utilities", airtel: "Utilities", jio: "Utilities", bsnl: "Utilities",
  amazon: "Shopping", flipkart: "Shopping", meesho: "Shopping", myntra: "Shopping",
  movie: "Entertainment", netflix: "Entertainment", spotify: "Entertainment", prime: "Entertainment",
  hospital: "Healthcare", clinic: "Healthcare", pharmacy: "Healthcare", medical: "Healthcare",
  school: "Education", college: "Education", university: "Education",
  salary: "Salary", freelance: "Freelance",
};

const CATEGORY_KW = Object.entries(CAT_MAP);

function inferCategory(description) {
  const lower = description.toLowerCase();
  for (const [kw, cat] of CATEGORY_KW) {
    if (lower.includes(kw)) return cat;
  }
  return null;
}

router.post("/", auth, async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body))
      return res.status(400).json({ message: "Send PDF as body" });

    const parser = new PDFParse({ data: req.body });
    const parsed = await parser.getText();
    const text = parsed.text;
    if (!text?.trim()) return res.status(400).json({ message: "No text in PDF" });

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
const DATE_RE = /\b(\d{2}[\/-]\d{2}[\/-]\d{2,4})\b/;
const AMT_RE = /(?<![\d.,])(\d[\d,]*\.\d{2})/g;

    const cats = await Category.find({ user: req.userId }).lean();
    const catByName = {};
    for (const c of cats) catByName[c.name.toLowerCase()] = c._id;

    const rows = [];
    for (const line of lines) {
      const dateM = line.match(DATE_RE);
      if (!dateM) continue;

      const amounts = [];
      let amtMatch;
      while ((amtMatch = AMT_RE.exec(line)) !== null) amounts.push(amtMatch[1]);
      if (amounts.length === 0) continue;

      const narration = line.replace(DATE_RE, "").replace(AMT_RE, "").replace(/\s+/g, " ").trim();

      let type = "expense";
      const upper = line.toUpperCase();
      if (/\bCr\b|\bCR\b|\+|credit|deposit/i.test(line) && !/Dr\b|DBT|debit/i.test(line)) {
        type = "income";
      } else if (amounts.length >= 2) {
        type = "income";
      }

      const amount = parseFloat(amounts.length >= 2 ? amounts[amounts.length - 2].replace(/,/g, "") : amounts[0].replace(/,/g, ""));
      if (isNaN(amount) || amount <= 0) continue;

      const catName = inferCategory(narration);
      const catId = catName ? catByName[catName.toLowerCase()] : null;
      const extId = crypto.createHash("md5").update(`${dateM[1]}|${narration}|${amount}|${type}`).digest("hex");

      const existing = await Expense.findOne({ user: req.userId, externalId: extId }).lean();
      if (existing) continue;

      rows.push({
        description: narration.slice(0, 120) || "Statement transaction",
        amount,
        currency: "INR",
        type,
        date: new Date(dateM[1].split("/").reverse().join("-")),
        source: "statement",
        externalId: extId,
        category: catId || cats.find((c) => c.name === "UPI")?._id || cats[0]?._id,
      });
    }

    res.json({ count: rows.length, rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/confirm", auth, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows?.length) return res.status(400).json({ message: "No rows to import" });

    let added = 0;
    for (const row of rows) {
      const ext = await Expense.findOne({ user: req.userId, externalId: row.externalId }).lean();
      if (ext) continue;
      await Expense.create({ ...row, user: req.userId, source: "statement" });
      added++;
    }
    res.json({ added });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;