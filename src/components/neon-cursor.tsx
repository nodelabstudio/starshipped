"use client";

import { useEffect } from "react";

// threejs-toys' neonCursor renders an opaque black canvas; the .neon-cursor-canvas
// class screen-blends it over the page so only the glow shows. Events bind to
// document.body (the library binds to `el`), so the overlay never blocks clicks.
export function NeonCursor() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let canvas: HTMLCanvasElement | null = null;
    let cancelled = false;

    import("threejs-toys").then(({ neonCursor }) => {
      if (cancelled) return;
      try {
        neonCursor({ el: document.body, resize: "window" });
        canvas = document.querySelector("body > canvas");
        canvas?.classList.add("neon-cursor-canvas");
      } catch {
        // No WebGL: the library appends its canvas before the renderer
        // throws. Remove the orphan and skip the effect.
        document.querySelector("body > canvas")?.remove();
      }
    });

    return () => {
      cancelled = true;
      if (canvas) {
        // The library has no destroy API; losing the context stops GPU work.
        // Its animation frame loop keeps ticking as a no-op until page reload.
        const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
      }
    };
  }, []);

  return null;
}
