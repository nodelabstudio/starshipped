"use client";

import { useEffect } from "react";
import { blip, whoosh } from "@/lib/sound";

// Delegated document listeners so every link/button gets the hover blip and
// every warp-tagged link (data-sfx="warp") gets the hyperspace whoosh without
// per-component wiring. Both cues no-op while sound is off.
export function SoundEffects() {
  useEffect(() => {
    function onPointerOver(e: PointerEvent) {
      const target = (e.target as Element | null)?.closest("a, button");
      if (!target) return;
      // Moving between children of the same element re-fires pointerover;
      // only blip when the pointer actually entered from outside it.
      if (e.relatedTarget instanceof Node && target.contains(e.relatedTarget)) {
        return;
      }
      blip();
    }
    function onClick(e: MouseEvent) {
      if ((e.target as Element | null)?.closest('[data-sfx="warp"]')) whoosh();
    }
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
