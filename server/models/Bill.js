import mongoose from "mongoose";

const billSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  issuer: { type: String, default: "" },
  dueDate: { type: Date, required: true },
  outstanding: { type: Number, required: true, min: 0 },
  minDue: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  paid: { type: Boolean, default: false },
  icon: { type: String, default: "💳" },
  color: { type: String, default: "#3b82f6" },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

export default mongoose.model("Bill", billSchema);