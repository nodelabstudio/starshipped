import type { PLANETS } from "@/lib/planets";

// Static starmap coordinates in a 1000x600 viewBox. Positions are approximate
// flavor — loosely echoing canon galaxy placement (Coruscant at the core,
// Outer Rim worlds toward the edges), spread so labels and arcs stay readable.
export const STARMAP: Record<(typeof PLANETS)[number], { x: number; y: number }> = {
  Coruscant: { x: 500, y: 280 },
  Corellia: { x: 385, y: 200 },
  Kamino: { x: 350, y: 390 },
  Naboo: { x: 610, y: 400 },
  Tatooine: { x: 810, y: 320 },
  Jakku: { x: 880, y: 160 },
  Bespin: { x: 700, y: 520 },
  Hoth: { x: 480, y: 530 },
  Endor: { x: 160, y: 130 },
  Kashyyyk: { x: 220, y: 300 },
};

const MIN_TRAVEL_MS = 2 * 60_000;
const MAX_TRAVEL_MS = 10 * 60_000;
// Max separation on the 1000x600 starmap: the viewBox diagonal.
const MAX_DIST = Math.hypot(1000, 600);

// Travel time for a run, scaled linearly with starmap distance and clamped
// to [2, 10] minutes. Same or unknown planets fall back to the floor.
export function travelMs(origin: string, destination: string): number {
  const a = STARMAP[origin as keyof typeof STARMAP];
  const b = STARMAP[destination as keyof typeof STARMAP];
  if (!a || !b) return MIN_TRAVEL_MS;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const ms = MIN_TRAVEL_MS + (dist / MAX_DIST) * (MAX_TRAVEL_MS - MIN_TRAVEL_MS);
  return Math.min(Math.max(ms, MIN_TRAVEL_MS), MAX_TRAVEL_MS);
}
