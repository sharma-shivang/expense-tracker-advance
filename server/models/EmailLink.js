import mongoose from "mongoose";

const emailLinkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  provider: { type: String, default: "gmail" },
  email: { type: String, required: true, lowercase: true, trim: true },
  refreshToken: { type: String, required: true },
  lastSyncedAt: { type: Date },
  syncedMessageIds: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("EmailLink", emailLinkSchema);