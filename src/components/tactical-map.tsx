"use client";

import { useMemo, useState } from "react";
import type { MapPlanet, MapRoute } from "@/lib/map-types";
import { routeProgress } from "@/lib/map-types";
import { useNow } from "@/lib/use-now";

const VIEW_W = 1000;
const VIEW_H = 600;
const GRID_STEP = 100;

// Deterministic background star dots (no Math.random — keeps SSR and client
// renders identical).
const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: ((i * 337 + 71) % VIEW_W) + 0.5,
  y: ((i * 191 + 43) % VIEW_H) + 0.5,
  r: i % 3 === 0 ? 1.2 : 0.7,
}));

function nodeRadius(shipCount: number) {
  return Math.min(4 + shipCount * 1.5, 12);
}

// Quadratic bezier from origin to destination, bowed perpendicular to the
// chord so arcs read as lanes instead of straight wires. `bow` is signed:
// routes sharing a planet pair get alternating/growing bows so they don't
// overlap. A zero-length chord (origin === destination) gets a small loop.
function arcPath(a: { x: number; y: number }, b: { x: number; y: number }, pairIndex: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) {
    // Degenerate: loop out to the side of the planet.
    const r = 18 + pairIndex * 8;
    return `M ${a.x} ${a.y} C ${a.x + r} ${a.y - r * 1.6}, ${a.x + r * 1.8} ${a.y + r * 0.4}, ${a.x} ${a.y}`;
  }
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Unit perpendicular to the chord.
  const px = -dy / dist;
  const py = dx / dist;
  const magnitude =
    Math.min(Math.max(dist * 0.18, 24), 80) * (1 + Math.floor(pairIndex / 2) * 0.6);
  const bow = magnitude * (pairIndex % 2 === 0 ? 1 : -1);
  return `M ${a.x} ${a.y} Q ${mx + px * bow} ${my + py * bow} ${b.x} ${b.y}`;
}

// Active arc with a blip at the run's real progress along the path. The path
// element lands in state via callback ref (not useRef — the lint rules forbid
// ref reads during render) so getPointAtLength can run while rendering.
function ActiveRoute({
  d,
  progress,
  now,
}: {
  d: string;
  progress?: { departsAt: number; arrivesAt: number };
  now: number;
}) {
  const [path, setPath] = useState<SVGPathElement | null>(null);
  let point: DOMPoint | null = null;
  if (path && progress) {
    const fraction = routeProgress(progress, now);
    point = path.getPointAtLength(path.getTotalLength() * fraction);
  }
  return (
    <g>
      <path
        ref={setPath}
        d={d}
        fill="none"
        stroke="var(--color-amber)"
        strokeWidth={1.5}
        opacity={0.5}
      />
      {point ? (
        <circle
          cx={point.x}
          cy={point.y}
          r={3}
          fill="var(--color-amber)"
          style={{ filter: "drop-shadow(0 0 4px rgba(255,183,87,0.8))" }}
        />
      ) : null}
    </g>
  );
}

export function TacticalMap({ planets, routes, selected, selectedRoute, onSelect, onSelectRoute }: {
  planets: Array<MapPlanet>;
  routes: Array<MapRoute>;
  selected: string | null;
  selectedRoute: number | null;
  onSelect: (name: string) => void;
  onSelectRoute: (id: number) => void;
}) {
  const now = useNow(0);

  const byName = useMemo(
    () => new Map(planets.map((p) => [p.name, p])),
    [planets],
  );

  // Precompute each route's path, tracking how many routes already share the
  // same planet pair so overlapping arcs bow apart.
  const routePaths = useMemo(() => {
    const pairCounts = new Map<string, number>();
    return routes.flatMap((route) => {
      const a = byName.get(route.origin);
      const b = byName.get(route.destination);
      if (!a || !b) return [];
      const key = [route.origin, route.destination].sort().join("|");
      const pairIndex = pairCounts.get(key) ?? 0;
      pairCounts.set(key, pairIndex + 1);
      return [{ route, d: arcPath(a, b, pairIndex) }];
    });
  }, [routes, byName]);

  return (
    <div className="tactical-map">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block w-full h-full" role="group" aria-label="Tactical galaxy map"
      >
        {/* Backdrop grid, echoing .holo-grid */}
        {Array.from({ length: VIEW_W / GRID_STEP - 1 }, (_, i) => (
          <line
            key={`gv${i}`}
            x1={(i + 1) * GRID_STEP}
            y1={0}
            x2={(i + 1) * GRID_STEP}
            y2={VIEW_H}
            stroke="rgba(92,200,255,0.06)"
          />
        ))}
        {Array.from({ length: VIEW_H / GRID_STEP - 1 }, (_, i) => (
          <line
            key={`gh${i}`}
            x1={0}
            y1={(i + 1) * GRID_STEP}
            x2={VIEW_W}
            y2={(i + 1) * GRID_STEP}
            stroke="rgba(92,200,255,0.06)"
          />
        ))}

        {/* Background stars */}
        {STARS.map((s, i) => (
          <circle
            key={`s${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="rgba(233,239,248,0.25)"
          />
        ))}

        {/* Route arcs */}
        {routePaths.map(({ route, d }) => <g key={route.id} opacity={selectedRoute != null && selectedRoute !== route.id ? 0.15 : 1}>
          {route.active ? (
            <ActiveRoute
              key={route.id}
              d={d}
              progress={route.progress}
              now={now}
            />
          ) : (
            <path
              key={route.id}
              d={d}
              fill="none"
              stroke="rgba(138,160,194,0.7)"
              strokeWidth={1}
              strokeDasharray="4 6"
              opacity={selectedRoute === route.id ? 1 : 0.5}
            />
          )}
          <path d={d} fill="none" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke"
            role="button" tabIndex={0} aria-label={`Inspect ${route.jobName}`} aria-pressed={selectedRoute === route.id}
            className="tactical-route-hit" onClick={() => onSelectRoute(route.id)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectRoute(route.id); } }}>
            <title>{`${route.jobName}: ${route.origin} → ${route.destination}`}</title>
          </path>
        </g>)}

        {/* Planet nodes */}
        {planets.map((planet) => {
          const r = nodeRadius(planet.ships.length);
          const labelY = planet.y - r - 10;
          return (
            <g key={planet.name}>
              {/* Soft glow halo */}
              <circle
                cx={planet.x}
                cy={planet.y}
                r={r * 2.2}
                fill="var(--color-holo)"
                opacity={0.12}
              />
              <circle cx={planet.x} cy={planet.y} r={r} fill={selected === planet.name ? "var(--color-amber)" : "var(--color-holo)"} />
              <text
                x={planet.x}
                y={labelY}
                textAnchor="middle"
                fill="var(--color-dim)"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {planet.name}
                {planet.ships.length > 0 ? (
                  <tspan fill="var(--color-amber)">
                    {" "}
                    {planet.ships.length}
                  </tspan>
                ) : null}
              </text>
              {/* Generous invisible hit target; focusable for keyboard users */}
              <circle
                cx={planet.x}
                cy={planet.y}
                r={26}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-pressed={selected === planet.name}
                aria-label={`${planet.name}: ${planet.ships.length} ships docked`}
                className="outline-holo focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(planet.name)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(planet.name);
                  }
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
