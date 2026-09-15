import { Router } from "express";
import jwt from "jsonwebtoken";
import auth from "../middleware/auth.js";
import EmailLink from "../models/EmailLink.js";
import Expense from "../models/Expense.js";
import Category from "../models/Category.js";
import {
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  listMessages,
  getMessage,
  gmailProfile,
  parseTransactionEmail,
  SYNC_QUERY,
} from "../services/gmail.js";

const router = Router();
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";

router.get("/connect", auth, (req, res) => {
  try {
    const url = buildAuthUrl(jwt.sign({ id: req.userId }, process.env.JWT_SECRET, { expiresIn: "10m" }));
    res.json({ url });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  "/callback",
  wrap(async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.status(400).send("Missing code or state");

      const payload = jwt.verify(String(state), process.env.JWT_SECRET);
      const tokenData = await exchangeCode(String(code));
      const gmailEmail = await gmailProfile(tokenData.accessToken);

      await EmailLink.findOneAndUpdate(
        { user: payload.id },
        { user: payload.id, provider: "gmail", email: gmailEmail, refreshToken: tokenData.refreshToken, lastSyncedAt: null },
        { upsert: true, setDefaultsOnInsert: true }
      );

      res.redirect(`${APP_ORIGIN}/settings?email-connected=1`);
    } catch (err) {
      res.redirect(`${APP_ORIGIN}/settings?email-error=${encodeURIComponent(err.message)}`);
    }
  })
);

router.get(
  "/status",
  auth,
  wrap(async (req, res) => {
    const link = await EmailLink.findOne({ user: req.userId });
    res.json({ linked: !!link, email: link?.email ?? null, lastSyncedAt: link?.lastSyncedAt ?? null });
  })
);

router.post(
  "/sync",
  auth,
  wrap(async (req, res) => {
    const link = await EmailLink.findOne({ user: req.userId });
    if (!link) return res.status(400).json({ message: "No email account linked" });

    if (req.body?.rescan) link.lastSyncedAt = null;

    const accessToken = await refreshAccessToken(link.refreshToken);

    const days = link.lastSyncedAt
      ? Math.max(1, Math.ceil((Date.now() - Math.floor(link.lastSyncedAt.getTime())) / 86400000))
      : 90;
    const query = SYNC_QUERY.replace("90d", `${days}d`);

    const messages = await listMessages(accessToken, query, 500);
    const seen = new Set(link.syncedMessageIds || []);

    const category = await autoCategory(req.userId);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const m of messages) {
      if (seen.has(m.id)) continue;
      let imported = false;
      try {
        const full = await getMessage(accessToken, m.id);
        const parsed = parseTransactionEmail(full.subject, full.text);
        if (parsed.amount) {
          await Expense.create({
            user: req.userId,
            amount: parsed.amount,
            currency: "INR",
            description: parsed.description || full.subject.slice(0, 120) || "Imported expense",
            category: category?._id ?? undefined,
            type: parsed.type ?? "expense",
            date: new Date(full.dateMs),
            source: "email",
            externalId: full.id,
          });
          added++;
          imported = true;
        } else {
          skipped++;
          imported = false;
        }
      } catch {
        errors++;
        imported = false;
      }
      if (imported) seen.add(m.id);
    }

    link.syncedMessageIds = Array.from(seen).slice(-2000);
    link.lastSyncedAt = new Date();
    await link.save();

    res.json({ added, skipped, errors, total: messages.length });
  })
);

router.post(
  "/unlink",
  auth,
  wrap(async (req, res) => {
    await EmailLink.deleteOne({ user: req.userId });
    res.json({ ok: true });
  })
);

async function autoCategory(userId) {
  let cat = await Category.findOne({
    user: userId,
    name: { $regex: "^UPI$", $options: "i" },
    type: "expense",
  });
  if (!cat) {
    cat = await Category.create({ user: userId, name: "UPI", color: "#22d3ee", icon: "🪙", type: "expense" });
  }
  return cat;
}

export default router;