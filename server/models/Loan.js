import mongoose from "mongoose";

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  counterparty: { type: String, required: true, trim: true },
  // "lent"   → I lent money to this person (they owe me)
  // "borrowed" → I borrowed money from this person (I owe them)
  direction: { type: String, enum: ["lent", "borrowed"], required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, default: null },
  note: { type: String, default: "" },
  repayments: [
    {
      amount: { type: Number, required: true, min: 0 },
      date: { type: Date, default: Date.now },
    },
  ],
  settled: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

export default mongoose.model("Loan", loanSchema);