import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["cash", "wallet", "savings", "credit_card", "other"],
    default: "other",
  },
  icon: { type: String, default: "🏦" },
  color: { type: String, default: "#6366f1" },
  openingBalance: { type: Number, default: 0 },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

accountSchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model("Account", accountSchema);