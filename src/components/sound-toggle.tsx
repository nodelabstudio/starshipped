"use client";

import { toggleSound, useSoundEnabled } from "@/lib/sound";

export function SoundToggle() {
  const enabled = useSoundEnabled();
  return (
    <button
      type="button"
      onClick={toggleSound}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      className={`font-mono text-xs tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
        enabled ? "text-holo" : "text-dim hover:text-ink"
      }`}
    >
      Sound {enabled ? "on" : "off"}
    </button>
  );
}
