import Image from "next/image";

// Targeting-bracket viewport: the one signature element. Corner brackets,
// scanline sweep, faint grid on hover. `scan` controls when the sweep runs.
export function HoloViewport({
  src,
  alt,
  scan = "hover",
  priority = false,
  sizes,
  className = "",
}: {
  src: string | null;
  alt: string;
  scan?: "load" | "hover";
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <div
      className={`holo-viewport ${scan === "load" ? "scan-load" : "scan-hover"} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="eyebrow">No visual feed</span>
        </div>
      )}
      <div className="holo-grid" aria-hidden />
      <div className="holo-scan" aria-hidden />
      <span aria-hidden className="holo-c holo-c-tl" />
      <span aria-hidden className="holo-c holo-c-tr" />
      <span aria-hidden className="holo-c holo-c-bl" />
      <span aria-hidden className="holo-c holo-c-br" />
    </div>
  );
}
