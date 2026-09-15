import mongoose from "mongoose";

const splitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  currency: { type: String, default: "INR" },
  note: { type: String, default: "" },
  participants: [
    {
      name: { type: String, required: true, trim: true },
      amount: { type: Number, required: true, min: 0 },
      isMe: { type: Boolean, default: false },
    },
  ],
  payments: [
    {
      name: { type: String, required: true, trim: true },
      amount: { type: Number, required: true, min: 0 },
      isMe: { type: Boolean, default: false },
    },
  ],
  settled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  seeded: { type: Boolean, default: false },
});

export default mongoose.model("Split", splitSchema);