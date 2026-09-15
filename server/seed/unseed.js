import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Expense from "../models/Expense.js";
import Budget from "../models/Budget.js";
import RecurringExpense from "../models/RecurringExpense.js";
import Split from "../models/Split.js";
import Goal from "../models/Goal.js";
import Account from "../models/Account.js";
import Bill from "../models/Bill.js";
import Loan from "../models/Loan.js";

async function main() {
  const target = process.argv[2] || process.env.SEED_EMAIL || "sample@expense.demo";
  await connectDB();

  const user = await User.findOne({ $or: [{ email: target }, { username: target }] });
  if (!user) {
    console.log(`No user found for "${target}" — nothing to unseed.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const results = {};
  const where = { user: user._id, seeded: true };

  results.expenses = await Expense.deleteMany(where);
  results.budgets = await Budget.deleteMany(where);
  results.recurringExpenses = await RecurringExpense.deleteMany(where);
  results.splits = await Split.deleteMany(where);
  results.goals = await Goal.deleteMany(where);
  results.accounts = await Account.deleteMany(where);
  results.bills = await Bill.deleteMany(where);
  results.loans = await Loan.deleteMany(where);
  results.categories = await Category.deleteMany(where);

  let deletedUser = false;
  if (user.seeded) {
    await User.deleteOne({ _id: user._id });
    deletedUser = true;
  }

  console.log(`\nUnseeded data for ${user.email}:`);
  for (const [key, res] of Object.entries(results)) {
    console.log(`  ${key.padEnd(18)}: ${res.deletedCount}`);
  }
  if (deletedUser) {
    console.log("  demo user        : removed");
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Unseed failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});