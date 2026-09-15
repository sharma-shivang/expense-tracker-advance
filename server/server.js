import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import expenseRoutes from "./routes/expenses.js";
import categoryRoutes from "./routes/categories.js";
import budgetRoutes from "./routes/budgets.js";
import recurringRoutes from "./routes/recurring.js";
import emailRoutes from "./routes/email.js";
import splitRoutes from "./routes/splits.js";
import goalRoutes from "./routes/goals.js";
import accountRoutes from "./routes/accounts.js";
import billRoutes from "./routes/bills.js";
import importRoutes from "./routes/import.js";
import loanRoutes from "./routes/loans.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/splits", splitRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/import/statement", importRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});