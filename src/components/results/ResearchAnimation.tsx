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
  "oklch(0.7 0.25 270)",  // Purple
  "oklch(0.75 0.2 200)",  // Cyan
  "oklch(0.7 0.22 320)",  // Magenta
  "oklch(0.75 0.18 165)", // Teal
  "oklch(0.7 0.2 248)",   // Blue
  "oklch(0.75 0.22 30)",  // Orange
];

function generateBlobs(count: number): Blob[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 150 + Math.random() * 200,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 4,
  }));
}

export function ResearchAnimation({ active }: { active: boolean }) {
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setBlobs(generateBlobs(6));
      setVisible(true);
    } else {
      // Fade out smoothly
      const t = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!visible && !active) return null;

  return (
    <div className={`research-animation-container ${active ? "active" : "fading"}`}>
      {/* Animated color blobs */}
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
