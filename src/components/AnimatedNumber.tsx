import { useEffect, useRef, useState } from "react";
import { useInView, prefersReducedMotion } from "../lib/useInView";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}

export default function AnimatedNumber({
  value,
  format,
  duration = 800,
  delay = 0,
  className,
}: AnimatedNumberProps) {
  const { ref, inView } = useInView();
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);
  const fromRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    fromRef.current = display;
    startRef.current = performance.now() + delay;

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(Math.max(elapsed / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}