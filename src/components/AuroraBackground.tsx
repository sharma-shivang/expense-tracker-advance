import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/useInView';

interface BlobState {
  size: number;
  ax: number;
  ay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  targetScale: number;
  opacity: number;
  targetOpacity: number;
  rotation: number;
}

const BLOB_COLORS = [
  { core: 'rgba(99, 102, 241, 0.5)', edge: 'rgba(76, 29, 149, 0.3)' },
  { core: 'rgba(37, 99, 235, 0.44)', edge: 'rgba(8, 145, 178, 0.28)' },
  { core: 'rgba(124, 58, 237, 0.44)', edge: 'rgba(88, 28, 135, 0.28)' },
  { core: 'rgba(67, 56, 202, 0.4)', edge: 'rgba(37, 99, 235, 0.26)' },
];

const SIZES = [420, 400, 410, 420];

const ANCHORS: { ax: number; ay: number }[] = [
  { ax: -320, ay: -240 },
  { ax: 320, ay: -240 },
  { ax: -320, ay: 240 },
  { ax: 320, ay: 240 },
];

const MOBILE_SCALE = 0.42;

export function AuroraBackground() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const scale = isMobile ? MOBILE_SCALE : 1;
  const blobsRef = useRef<BlobState[]>(
    ANCHORS.map((anchor, i) => ({
      size: SIZES[i] * scale,
      ax: anchor.ax * scale,
      ay: anchor.ay * scale,
      x: anchor.ax * scale + (Math.random() * 2 - 1) * 16,
      y: anchor.ay * scale + (Math.random() * 2 - 1) * 16,
      vx: (Math.random() * 2 - 1) * (isMobile ? 0.9 : 1.7),
      vy: (Math.random() * 2 - 1) * (isMobile ? 0.7 : 1.4),
      scale: 1,
      targetScale: isMobile ? 1.05 : 1.1 + Math.random() * 0.3,
      opacity: isMobile ? 0.55 : 0.8,
      targetOpacity: isMobile ? 0.55 : 0.8 + Math.random() * 0.2,
      rotation: 0,
    }))
  );
  const elementsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    let raf = 0;
    let last = performance.now();
    const dtScale = isMobile ? 0.35 : 1;

    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      blobsRef.current.forEach((blob, index) => {
        if (Math.random() < 0.005) {
          blob.vx = (Math.random() * 2 - 1) * (isMobile ? 0.9 : 1.7);
          blob.vy = (Math.random() * 2 - 1) * (isMobile ? 0.7 : 1.4);
        }
        if (Math.random() < 0.005) {
          blob.targetScale = isMobile ? 1.05 : 1.1 + Math.random() * 0.3;
        }
        if (Math.random() < 0.005) {
          blob.targetOpacity = isMobile ? 0.55 : 0.8 + Math.random() * 0.2;
        }

        const pushX = (blob.x - blob.ax) * 0.001;
        const pushY = (blob.y - blob.ay) * 0.001;
        blob.vx -= pushX;
        blob.vy -= pushY;

        blob.x += blob.vx * dt * 40 * dtScale;
        blob.y += blob.vy * dt * 40 * dtScale;

        blob.scale += (blob.targetScale - blob.scale) * 0.008;
        blob.opacity += (blob.targetOpacity - blob.opacity) * 0.008;
        blob.rotation += (Math.random() * 2 - 1) * 0.15 * dt;

        const element = elementsRef.current[index];
        if (element) {
          element.style.transform = `translate3d(${blob.x}px, ${blob.y}px, 0) scale(${blob.scale}) rotate(${blob.rotation}deg)`;
          element.style.opacity = String(blob.opacity);
        }
      });

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="aurora" aria-hidden="true">
      <div className="bg-grid" />
      {BLOB_COLORS.map((color, index) => (
        <div
          key={index}
          ref={(el) => {
            elementsRef.current[index] = el;
          }}
          className="orb"
          style={{
            width: SIZES[index] * scale,
            height: SIZES[index] * scale,
            background: `radial-gradient(circle at 35% 35%, ${color.core}, ${color.edge} 48%, transparent 72%)`,
          }}
        />
      ))}
    </div>
  );
}