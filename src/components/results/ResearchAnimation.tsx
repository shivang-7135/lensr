import { useEffect, useState } from "react";

interface Blob {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const COLORS = [
  "oklch(0.7 0.25 270)", // Purple / Indigo
  "oklch(0.75 0.2 200)", // Cyan
  "oklch(0.7 0.22 320)", // Magenta / Pink
  "oklch(0.75 0.18 165)", // Teal
];

function generateBlobs(count: number): Blob[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 15 + Math.random() * 70,
    y: 10 + Math.random() * 80,
    size: 180 + Math.random() * 220,
    color: COLORS[i % COLORS.length],
    delay: i * 0.5 + Math.random() * 1.5,
    duration: 4 + Math.random() * 4,
  }));
}

export function ResearchAnimation({ active }: { active: boolean }) {
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setBlobs(generateBlobs(4));
      setVisible(true);
    } else {
      // Fade out smoothly
      const t = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!visible && !active) return null;

  return (
    <div className={`research-animation-container ${active ? "active" : "fading"} hidden lg:block`}>
      {/* Animated color blobs — reduced to 4 for performance */}
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className="research-blob"
          style={{
            left: `${blob.x}%`,
            top: `${blob.y}%`,
            width: blob.size,
            height: blob.size,
            background: `radial-gradient(circle, ${blob.color}, transparent 70%)`,
            animationDelay: `${blob.delay}s`,
            animationDuration: `${blob.duration}s`,
          }}
        />
      ))}

      {/* Central pulsing glow */}
      <div className="research-pulse" />

      {/* Shimmer overlay */}
      <div className="research-shimmer" />
    </div>
  );
}
