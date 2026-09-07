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
      className={`sound-toggle font-mono text-xs tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
        enabled ? "text-holo" : "text-dim hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M11 4 5 9H2v6h3l6 5V4Z" strokeLinejoin="round" />
        {enabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" strokeLinecap="round" /> : <path d="m16 9 6 6m0-6-6 6" strokeLinecap="round" />}
      </svg>
      <span className="sound-toggle-copy">Sound {enabled ? "on" : "off"}</span>
    </button>
  );
}
