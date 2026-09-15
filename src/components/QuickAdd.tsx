import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { parseQuickAdd, dateFromQuickAdd } from "../lib/quickadd";

/**
 * Handles:
 *  - Web Share Target (GET):  /?text=...&title=...&url=...
 *  - Manual quick-add:        /?qa=<text>
 * Redirects to /expenses?new=1&amount=..&desc=..&type=..&dt=.. so the add form can pre-fill.
 */
export default function QuickAdd() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qa = params.get("qa");
    const text = params.get("text");
    const title = params.get("title");
    const url = params.get("url");

    const raw = qa ?? [text, title, url].filter(Boolean).join(" ").trim();
    if (!raw) {
      // clean up any stale quick-add params on expenses page
      if (params.get("new") && !params.get("amount") && !params.get("desc")) {
        navigate(location.pathname, { replace: true });
      }
      return;
    }

    const parsed = parseQuickAdd(raw);
    const next = new URLSearchParams({
      new: "1",
      type: parsed.type,
      ...(parsed.amount !== undefined ? { amount: String(parsed.amount) } : {}),
      ...(parsed.description ? { desc: parsed.description } : {}),
    });
    const dt = dateFromQuickAdd(raw);
    if (dt) next.set("dt", dt);

    navigate(`/expenses?${next.toString()}`, { replace: true });
  }, [location, navigate]);

  return null;
}