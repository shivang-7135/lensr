import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

export function SafeImage({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
  zoomable = false,
}: {
  src?: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  zoomable?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  if (!src || failed) {
    return fallbackClassName ? (
      <div
        className={`bg-gradient-to-br from-accent/20 to-secondary ${fallbackClassName}`}
        aria-hidden
      />
    ) : null;
  }

  return (
    <>
      <div
        className={`relative overflow-hidden ${zoomable ? "cursor-zoom-in group" : ""}`}
        onClick={() => zoomable && setOpen(true)}
      >
        {!loaded && (
          <div
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-white/10 to-white/5"
            aria-hidden
          />
        )}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          className={`${className} transition-all duration-500 ${loaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"} ${zoomable ? "group-hover:scale-[1.04] transition-transform duration-500" : ""}`}
        />
        {zoomable && loaded && (
          <div className="absolute top-2 right-2 h-7 w-7 rounded-full glass-soft inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <ZoomIn className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full glass-strong inline-flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
