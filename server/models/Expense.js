import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: "INR" },
  description: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  type: { type: String, enum: ["expense", "income"], default: "expense" },
  date: { type: Date, default: Date.now },
  recurringId: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringExpense", default: null },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  source: { type: String, default: "manual" },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, description: "text" });

export default mongoose.model("Expense", expenseSchema);