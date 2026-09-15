import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    baseCurrency: { type: String, default: "INR" },
    exchangeRates: { type: Map, of: Number, default: {} },
    createdAt: { type: Date, default: Date.now },
    seeded: { type: Boolean, default: false },
  },
  { minimize: false }
);

export default mongoose.model("User", userSchema);