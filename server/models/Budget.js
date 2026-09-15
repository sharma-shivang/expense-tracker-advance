import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true }, // YYYY-MM
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);