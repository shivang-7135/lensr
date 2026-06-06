import { useState } from "react";

export function SafeImage({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return fallbackClassName ? (
      <div className={`bg-gradient-to-br from-accent/20 to-secondary ${fallbackClassName}`} aria-hidden />
    ) : null;
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
