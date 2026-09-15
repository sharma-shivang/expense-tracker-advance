import { useRef, type ReactNode, type MouseEvent } from "react";

interface TiltProps {
  children: ReactNode;
  className?: string;
  max?: number;
}

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Wraps content in a subtle 3D tilt that follows the cursor.
 * Sets --tilt-x / --tilt-y custom props consumed by the .tilt CSS rule.
 */
export default function Tilt({ children, className = "", max = 7 }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--tilt-x", `${(-py * max).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(px * max).toFixed(2)}deg`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}