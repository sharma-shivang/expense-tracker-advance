import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { buildDigest, downloadDigest } from "../lib/digest";
import {
  notifySupported,
  fireNotifications,
  collectAlerts,
} from "./Notifier";
import {
  Smartphone,
  Download,
  Monitor,
  Link,
  Copy,
  Share2,
  Calendar,
  Sparkles,
} from "lucide-react";

type FontScale = "sm" | "md" | "lg";

export default function MobilitySettings() {
  const { fontScale, setFontScale } = useTheme();
  const [canInstall, setCanInstall] = useState(false);
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    notifySupported() ? Notification.permission : "unsupported"
  );
  const [notifyOn, setNotifyOn] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem("notifyEnabled") === "1"
  );
  const [digest, setDigest] = useState<string>("");
  const [copied, setCopied] = useState("");
  const qaLinks = useRef({ amount: "", qa: "" });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
      setCanInstall(true);
    };
    window.addEventListener?.("beforeinstallprompt", handler, { once: true });
    if ((window as any).deferredPrompt) {
      setInstallEvt((window as any).deferredPrompt);
      setCanInstall(true);
    }
    if (window.matchMedia?.("(display-mode: standalone)").matches) setCanInstall(false);
    return () => window.removeEventListener?.("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    qaLinks.current = {
      amount: `${window.location.origin}/expenses?new=1`,
      qa: `${window.location.origin}/?qa=${encodeURIComponent("120 groceries at amazon")}`,
    };
  }, []);

  const toggleNotifications = async () => {
    if (!notifySupported()) return;
    if (Notification.permission === "default" && notifyOn) {
      setPermission(await Notification.requestPermission());
    }
    const on = !notifyOn;
    try {
      localStorage.setItem("notifyEnabled", on ? "1" : "0");
      setNotifyOn(on);
      if (on && Notification.permission === "granted") {
        const alerts = await collectAlerts();
        fireNotifications([
          ...alerts,
          {
            title: "Notifications on",
            body: "You'll get bill & budget reminders here.",
            tag: "notify-enabled",
          },
        ]);
      }
    } catch {
      /* no-op */
    }
  };

  const sendTest = () => {
    if (!notifySupported() || Notification.permission !== "granted") {
      Notification.requestPermission().then((p) => {
        setPermission(p);
        if (p === "granted") {
          new Notification("Test notification", { body: "Notifications are working." });
        }
      });
      return;
    }
    new Notification("Test notification", { body: "Notifications are working." });
  };

  const installApp = async () => {
    const evt = installEvt || (window as any).deferredPrompt;
    if (!evt) return;
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") setCanInstall(false);
    } finally {
      setInstallEvt(null);
    }
  };

  const runDigest = async () => {
    const { markdown } = await buildDigest();
    setDigest(markdown);
    setCopied("");
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* no-op */
    }
  };

  const share = async (value: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Quick add expense", text: value, url: "/expenses?new=1" });
      } else {
        await copy("share", value);
      }
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="card card-pad settings-section">
      <h3>
        <Smartphone className="lucide-icon inline" /> Mobility & UX
      </h3>
      <div className="form-row" style={{ maxWidth: 640 }}>
        <div className="form-group">
          <label>Font scale</label>
          <div className="seg" style={{ marginTop: 4 }}>
            {(["sm", "md", "lg"] as FontScale[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`seg-btn${fontScale === s ? " active" : ""}`}
                onClick={() => setFontScale(s)}
              >
                {s === "sm" ? "A" : s === "md" ? "A" : "A"}
                <span className="seg-label">{s === "sm" ? "Small" : s === "md" ? "Medium" : "Large"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-row" style={{ marginTop: 16 }}>
        <button
          type="button"
          className={`btn ${canInstall ? "btn-primary" : "btn-outline"}`}
          onClick={installApp}
          disabled={!canInstall}
        >
          {canInstall ? (
            <>
              <Monitor className="lucide-icon inline" /> Install app
            </>
          ) : (
            <>
              <Smartphone className="lucide-icon inline" /> Add to home screen
            </>
          )}
        </button>
        <span className="muted" style={{ fontSize: 13 }}>
          {canInstall
            ? "Install to get offline access & quick-add from your home screen."
            : window.matchMedia?.("(display-mode: standalone)").matches
            ? "Already installed."
            : "Open the browser menu → “Install app” or “Add to Home Screen”."}
        </span>
      </div>

      <div className="settings-row" style={{ marginTop: 16 }}>
        <label className="switch">
          <input type="checkbox" checked={notifyOn} onChange={toggleNotifications} />
          <span className="switch-slider" />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <strong>Desktop notifications</strong>
          <span className="muted" style={{ fontSize: 13 }}>
            Reminders for bills due and budgets at/near limit.
          </span>
        </div>
        <button type="button" className="btn btn-outline" onClick={sendTest} style={{ marginLeft: "auto" }}>
          Send test
        </button>
      </div>
      {permission !== "granted" && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Permission: {permission === "default" ? "allowed" : permission === "unsupported" ? "unsupported" : "blocked"}.
        </p>
      )}

      <div className="quickadd-links" style={{ marginTop: 18 }}>
        <strong>
          <Link className="lucide-icon inline" /> Quick-add link
        </strong>
        <p className="muted" style={{ fontSize: 13 }}>
          Send any text (amount + description) straight to the add form.
        </p>
        <div className="link-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => copy("qa1", qaLinks.current.amount)}
          >
            {copied === "qa1" ? (
              <>
                <Copy className="lucide-icon inline" style={{ color: "var(--success)" }} /> Copied
              </>
            ) : (
              <>
                <Copy className="lucide-icon inline" /> Copy bare link
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => copy("qa2", qaLinks.current.qa)}
          >
            {copied === "qa2" ? (
              <>
                <Copy className="lucide-icon inline" style={{ color: "var(--success)" }} /> Copied
              </>
            ) : (
              <>
                <Copy className="lucide-icon inline" /> Copy sample link
              </>
            )}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => share("120 groceries at amazon")}>
            {copied === "share" ? (
              <>
                <Copy className="lucide-icon inline" style={{ color: "var(--success)" }} /> Copied
              </>
            ) : (
              <>
                <Share2 className="lucide-icon inline" /> Share
              </>
            )}
          </button>
        </div>
      </div>

      <div className="digest-box" style={{ marginTop: 18 }}>
        <strong>
          <Calendar className="lucide-icon inline" /> Monthly digest
        </strong>
        <p className="muted" style={{ fontSize: 13 }}>
          One-line summary of this month's spending, income, bills & budgets.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <button type="button" className="btn btn-primary" onClick={runDigest}>
            <Sparkles className="lucide-icon inline" /> Generate digest
          </button>
          {digest && (
            <>
              <button type="button" className="btn btn-outline" onClick={() => copy("digest", digest)}>
                {copied === "digest" ? (
                  <>
                    <Copy className="lucide-icon inline" style={{ color: "var(--success)" }} /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="lucide-icon inline" /> Copy
                  </>
                )}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => downloadDigest(digest)}>
                <Download className="lucide-icon inline" /> Download .md
              </button>
            </>
          )}
        </div>
        {digest && (
          <pre
            style={{
              marginTop: 10,
              whiteSpace: "pre-wrap",
              background: "var(--bg-elev)",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {digest}
          </pre>
        )}
      </div>
    </div>
  );
}
