import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true },
  savedAmount: { type: Number, default: 0 },
  icon: { type: String, default: "🎯" },
  color: { type: String, default: "#8b5cf6" },
  deadline: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

export default mongoose.model("Goal", goalSchema);