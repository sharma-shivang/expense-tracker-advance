import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: "#8b5cf6" },
  icon: { type: String, default: "" },
  type: { type: String, enum: ["expense", "income"], default: "expense" },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);