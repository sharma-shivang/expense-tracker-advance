import { useEffect } from "react";
import { prefersReducedMotion } from "../lib/useInView";

export default function GlobalReveal() {
  useEffect(() => {
    if (prefersReducedMotion) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("reveal-in"));
      document.querySelectorAll(".stagger").forEach((el) => el.classList.add("stagger-in"));
      return;
    }

    const scheduled = new WeakSet<Element>();

    function applyNow(el: Element) {
      if (el.classList.contains("reveal")) el.classList.add("reveal-in");
      if (el.classList.contains("stagger")) el.classList.add("stagger-in");
    }

    // Double-rAF: the first frame paints the opacity:0 state,
    // the second frame applies reveal-in → guaranteed visible transition.
    function scheduleReveal(el: Element) {
      if (scheduled.has(el)) return;
      scheduled.add(el);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (el.isConnected) applyNow(el);
          scheduled.delete(el);
        })
      );
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          applyNow(entry.target);
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -24px 0px" }
    );

    function scan() {
      const vh = window.innerHeight;

      document.querySelectorAll(".reveal:not(.reveal-in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh - 24) scheduleReveal(el);
        else io.observe(el);
      });

      document.querySelectorAll(".stagger:not(.stagger-in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh - 16) scheduleReveal(el);
        else io.observe(el);
      });
    }

    // 1. Initial scan (mount)
    scan();

    // 2. MutationObserver — re-scan when DOM changes under .main
    let rafQueued = false;
    const scheduleScan = () => {
      if (rafQueued) return;
      rafQueued = true;
      requestAnimationFrame(() => {
        rafQueued = false;
        scan();
      });
    };
    const main = document.querySelector(".main");
    const mutObs = new MutationObserver(scheduleScan);
    if (main) mutObs.observe(main, { childList: true, subtree: true });

    // 3. Periodic safety scan — catches elements missed by IO / late renders
    const interval = setInterval(scan, 800);

    return () => {
      clearInterval(interval);
      io.disconnect();
      mutObs.disconnect();
    };
  }, []);

  return null;
}