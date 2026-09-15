import { Router } from "express";
import auth from "../middleware/auth.js";
import Loan from "../models/Loan.js";

const router = Router();

function round2(n) {
  return Math.round(n * 100) / 100;
}

function outstandingFor(loan) {
  const repaid = (loan.repayments ?? []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  return round2(Math.max(0, (Number(loan.amount) || 0) - repaid));
}

function summarize(loans) {
  const open = loans.filter((l) => !l.settled);
  const totalOwedToMe = round2(
    open.filter((l) => l.direction === "lent").reduce((sum, l) => sum + outstandingFor(l), 0)
  );
  const totalIOwe = round2(
    open.filter((l) => l.direction === "borrowed").reduce((sum, l) => sum + outstandingFor(l), 0)
  );
  return { totalOwedToMe, totalIOwe, net: round2(totalOwedToMe - totalIOwe) };
}

router.get("/", auth, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.userId }).sort({ date: -1 }).lean();
    res.json({
      loans: loans.map((l) => ({ ...l, outstanding: outstandingFor(l), repaid: round2((l.amount || 0) - outstandingFor(l)) })),
      ...summarize(loans),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, user: req.userId });
    res.status(201).json({ loan });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!loan) return res.status(404).json({ message: "Not found" });
    res.json({
      loan: {
        ...loan,
        outstanding: outstandingFor(loan),
        repaid: round2((loan.amount || 0) - outstandingFor(loan)),
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!loan) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/repay", auth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const date = req.body.date ?? new Date();
    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Enter a repayment amount greater than 0" });

    const loan = await Loan.findOne({ _id: req.params.id, user: req.userId });
    if (!loan) return res.status(404).json({ message: "Not found" });

    const outstanding = outstandingFor(loan);
    if (amount > outstanding + 0.01)
      return res.status(400).json({
        message: `Repayment exceeds the outstanding amount of ${outstanding.toFixed(2)}`,
      });

    loan.repayments.push({ amount, date });
    if (Math.abs(outstandingFor(loan)) <= 0.01) loan.settled = true;
    await loan.save();
    const saved = loan.toObject();
    res.json({
      loan: {
        ...saved,
        outstanding: outstandingFor(saved),
        repaid: round2((saved.amount || 0) - outstandingFor(saved)),
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;