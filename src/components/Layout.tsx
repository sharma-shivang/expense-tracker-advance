import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Notifier from "./Notifier";
import QuickAdd from "./QuickAdd";
import QuickAddGate from "./QuickAddGate";
import GlobalReveal from "./GlobalReveal";
import ScrollProgress from "./ScrollProgress";
import {
  LayoutDashboard,
  Receipt,
  Target,
  RotateCcw,
  Users,
  PiggyBank,
  CreditCard,
  Settings,
  LogOut,
  User,
  Sun,
  Moon,
  DollarSign,
  Plus,
  MoreHorizontal,
  HandCoins,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/budgets", label: "Budgets", icon: Target },
  { to: "/recurring", label: "Recurring", icon: RotateCcw },
  { to: "/splits", label: "Splits", icon: Users },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/accounts", label: "Accounts", icon: PiggyBank },
  { to: "/loans", label: "Loans", icon: HandCoins },
  { to: "/bills", label: "Bills", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_PRIMARY = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/expenses", label: "Expenses", icon: Receipt },
];

const MOBILE_MORE = NAV.filter(
  (item) => !MOBILE_PRIMARY.some((p) => p.to === item.to) && item.to !== "/settings"
);

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  return (
    <div className="app-shell">
      <Notifier />
      <QuickAdd />
      <GlobalReveal />
      <ScrollProgress />
      <aside className="sidebar">
        <div className="brand">
          <DollarSign className="logo" />
          <span>Expense Tracker</span>
          <button className="theme-toggle sidebar-theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun className="lucide-icon" /> : <Moon className="lucide-icon" />}
          </button>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="nav-icon">
                <item.icon className="lucide-icon" />
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
          <button className="logout-btn logout-mobile" onClick={logout}>
            <span className="nav-icon">
              <LogOut className="lucide-icon" />
            </span>
            <span className="nav-label">Log out</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="name">
              <User className="lucide-icon inline" /> {user?.username}
            </div>
            <div className="email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <QuickAddGate />
      <div className="mobile-content">
        <header className="mobile-header">
          <div className="mobile-header-brand">
            <DollarSign className="lucide-icon" style={{ color: "var(--primary)" }} />
            <span className="mobile-header-title">Expense Tracker</span>
          </div>
          <div className="mobile-header-actions">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? <Sun className="lucide-icon" /> : <Moon className="lucide-icon" />}
            </button>
          </div>
        </header>
        <main className="main">
          <div className="page-enter" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
          <LayoutDashboard className="lucide-icon" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/expenses" className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
          <Receipt className="lucide-icon" />
          <span>Expenses</span>
        </NavLink>
        <NavLink
          to="/expenses?new=1"
          className="bottom-nav-item bottom-nav-add"
          onClick={() => setMoreOpen(false)}
        >
          <Plus className="lucide-icon" />
        </NavLink>
        <div className="bottom-nav-more" ref={moreRef}>
          <button
            className={`bottom-nav-item${moreOpen ? " active" : ""}`}
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            aria-label="More navigation options"
          >
            <MoreHorizontal className="lucide-icon" />
            <span>More</span>
          </button>
          {moreOpen && (
            <div className="more-menu">
              {MOBILE_MORE.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `more-menu-item${isActive ? " active" : ""}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <item.icon className="lucide-icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <NavLink
                to="/settings"
                className={({ isActive }) => `more-menu-item${isActive ? " active" : ""}`}
                onClick={() => setMoreOpen(false)}
              >
                <Settings className="lucide-icon" />
                <span>Settings</span>
              </NavLink>
              <button className="more-menu-item more-logout" onClick={() => { setMoreOpen(false); logout(); }}>
                <LogOut className="lucide-icon" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}