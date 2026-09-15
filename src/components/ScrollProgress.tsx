import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/useInView";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const update = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollable = docHeight > 200;
      setVisible(scrollable && window.scrollY > 0);
      if (barRef.current && scrollable) {
        barRef.current.style.transform = `scaleX(${Math.min(window.scrollY / docHeight, 1)})`;
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return visible ? <div className="scroll-progress" ref={barRef} /> : null;
}