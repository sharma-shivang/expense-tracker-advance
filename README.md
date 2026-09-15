# Expense Tracker

Full-stack expense tracker built with the MERN stack. Tracks expenses, budgets, recurring payments, and can **auto-import UPI/bank transactions from your Gmail**.

## Stack

- **Frontend** — React 18 + TypeScript + Vite, react-router-dom, recharts
- **Backend** — Express + Mongoose (ESM modules)
- **Database** — MongoDB (local by default)
- **Auth** — JWT (bcrypt password hashing)

## Features

- Expense/income CRUD with categories, dates, search & sort
- Monthly summary + 6-month bar/pie trend charts
- Budgets per category/month with spent vs. remaining
- Recurring expenses (auto-syncs on page load; creates actual expense entries)
- Multi-currency with manual exchange rates
- **Email import** — links Gmail, reads only UPI/bank-alert emails, auto-creates expenses
- Dashboard "🔗 Sync now" button (visible only when email is linked)
- Dark/light theme with neo-3D glass UI
- Mobile responsive (bottom nav, card-style tables)

## Prerequisites

- Node.js 18+ (uses native `fetch` + ESM)
- MongoDB running locally on `127.0.0.1:27017`

## Setup

```bash
cd "Expence Tracker"
npm run setup        # installs root + server/node_modules
cp server/.env.example server/.env   # or copy the contents below
```

`server/.env` contents:

```
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/expense_tracker
JWT_SECRET=change-me-to-a-long-random-string

# Optional: Gmail email import (Google Cloud OAuth)
# GMAIL_CLIENT_ID=
# GMAIL_CLIENT_SECRET=
# APP_ORIGIN=http://localhost:5173
```

## Run

```bash
npm run dev          # starts server (port 5001) + Vite dev server (port 5173) concurrently
```

- App: http://localhost:5173
- API: http://localhost:5001/api

## Email import (Google Cloud setup)

This lets the app read your bank/UPI-alert emails and turn them into expenses.

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and create a project.
2. **Enable the Gmail API** (APIs & Services → Library → search "Gmail API" → Enable).
3. Open **OAuth consent screen**, choose *External*, add your own email as a **test user** (required while app is in "Testing" mode).
4. Go to **Credentials → Create credentials → OAuth client ID**, choose *Web application*, and add this redirect URI exactly:
   ```
   http://localhost:5001/api/email/callback
   ```
5. Copy the **client ID** and **client secret** into `server/.env` as `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`, then restart the server.
6. In the app, go to **⚙️ Settings → 📧 Email import** and click **Connect Gmail**. Approve the consent screen, and you're linked.

Only bank/UPI alert emails (keywords: debited, credited, paid, UPI, etc.) are read. No other emails are stored.

## Build

```bash
npm run build        # tsc --noEmit && vite build
```

## Project structure

```
/
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css              # Neo-3D glass theme, mobile responsive
│   ├── components/
│   │   ├── Layout.tsx         # Sidebar + Outlet shell
│   │   ├── Modal.tsx
│   │   └── Tilt.tsx           # 3D mouse-tilt wrapper
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   └── useCategories.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── format.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Expenses.tsx
│   │   ├── Budgets.tsx
│   │   ├── Recurring.tsx
│   │   ├── Settings.tsx       # Includes email-import section
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   └── types.ts
├── server/
│   ├── server.js
│   ├── .env
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Expense.js         # source: "email" | "manual"
│   │   ├── Category.js
│   │   ├── Budget.js
│   │   ├── RecurringExpense.js
│   │   └── EmailLink.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── expenses.js
│   │   ├── categories.js
│   │   ├── budgets.js
│   │   ├── recurring.js
│   │   └── email.js           # Gmail connect/callback/sync/unlink
│   └── services/
│       └── gmail.js           # OAuth, Gmail API, UPI email parser
└── landing.html               # Standalone landing page (neo-3D style)
```
