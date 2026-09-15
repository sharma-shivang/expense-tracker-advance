import mongoose from "mongoose";

const recurringExpenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: "USD" },
  description: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  type: { type: String, enum: ["expense", "income"], default: "expense" },
  frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly"], required: true },
  interval: { type: Number, default: 1 },
  nextRunDate: { type: Date, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

recurringExpenseSchema.index({ user: 1, active: 1 });

export default mongoose.model("RecurringExpense", recurringExpenseSchema);