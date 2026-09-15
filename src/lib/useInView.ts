import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let sharedObserver: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, () => void>();

function getSharedObserver() {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const cb = callbacks.get(entry.target);
          if (cb) cb();
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
  );
  return sharedObserver;
}

export function useInView(opts?: { once?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(prefersReducedMotion);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;

    const once = opts?.once !== false;
    const obs = getSharedObserver();

    const handleIntersect = () => {
      setInView(true);
      if (once) obs.unobserve(el);
    };

    callbacks.set(el, handleIntersect);
    obs.observe(el);

    return () => {
      obs.unobserve(el);
      callbacks.delete(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
