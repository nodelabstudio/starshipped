"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

type MapPlanet = { name: string; x: number; y: number; ships: string[] };
type MapRoute = {
  id: number;
  jobName: string;
  origin: string;
  destination: string;
  active: boolean;
  progress?: { departsAt: number; arrivesAt: number };
};

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

// 1s ticking clock; 0 during SSR so blips render at the path start and snap
// to real progress on the client.
function useNow() {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 1000);
      return () => clearInterval(id);
    },
    () => Date.now(),
    () => 0,
  );
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
    const fraction = Math.min(
      Math.max(
        (now - progress.departsAt) /
          Math.max(progress.arrivesAt - progress.departsAt, 1),
        0,
      ),
      1,
    );
    point = path.getPointAtLength(path.getTotalLength() * fraction);
  }
  return (
    <g>
      <path
        ref={setPath}
        d={d}
        fill="none"
        stroke="var(--color-holo)"
        strokeWidth={1.5}
        opacity={0.5}
      />
      {point && (
        <circle
          cx={point.x}
          cy={point.y}
          r={3}
          fill="var(--color-amber)"
          style={{ filter: "drop-shadow(0 0 4px rgba(255,183,87,0.8))" }}
        />
      )}
    </g>
  );
}

export function GalaxyMap({
  planets,
  routes,
}: {
  planets: MapPlanet[];
  routes: MapRoute[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const now = useNow();
  const router = useRouter();
  const refreshed = useRef(false);

  // Refresh once when any active run arrives so settlement repaints the map;
  // the guard resets so later arrivals refresh too.
  const arrived = routes.some(
    (r) => r.active && r.progress && now >= r.progress.arrivesAt,
  );
  useEffect(() => {
    if (arrived && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
    if (!arrived) refreshed.current = false;
  }, [arrived, router]);

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

  const hoveredPlanet = hovered ? byName.get(hovered) : undefined;
  const outbound = hoveredPlanet
    ? routes.filter((r) => r.origin === hoveredPlanet.name)
    : [];

  return (
    <div className="panel relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block w-full h-auto"
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
        {routePaths.map(({ route, d }) =>
          route.active ? (
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
              opacity={0.35}
            />
          ),
        )}

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
              <circle cx={planet.x} cy={planet.y} r={r} fill="var(--color-holo)" />
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
                {planet.ships.length > 0 && (
                  <tspan fill="var(--color-amber)">
                    {" "}
                    {planet.ships.length}
                  </tspan>
                )}
              </text>
              {/* Generous invisible hit target; focusable for keyboard users */}
              <circle
                cx={planet.x}
                cy={planet.y}
                r={26}
                fill="transparent"
                tabIndex={0}
                aria-label={`${planet.name}: ${planet.ships.length} ships docked`}
                className="outline-holo focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(planet.name)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(planet.name)}
                onBlur={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Hover readout */}
      {hoveredPlanet && (
        <div
          className="panel absolute z-10 p-4 space-y-3 w-56 pointer-events-none"
          style={{
            left: `${(hoveredPlanet.x / VIEW_W) * 100}%`,
            top: `${(hoveredPlanet.y / VIEW_H) * 100}%`,
            transform:
              hoveredPlanet.x > VIEW_W * 0.65
                ? "translate(calc(-100% - 20px), -50%)"
                : "translate(20px, -50%)",
          }}
        >
          <p className="eyebrow">{hoveredPlanet.name}</p>
          <div className="space-y-1">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-holo">
              Docked ships
            </p>
            {hoveredPlanet.ships.length === 0 ? (
              <p className="text-dim text-sm">None in dock</p>
            ) : (
              hoveredPlanet.ships.map((name) => (
                <p key={name} className="text-ink text-sm">
                  {name}
                </p>
              ))
            )}
          </div>
          <div className="space-y-1">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-amber">
              Outbound runs
            </p>
            {outbound.length === 0 ? (
              <p className="text-dim text-sm">No outbound runs</p>
            ) : (
              outbound.map((r) => (
                <p key={r.id} className="text-ink text-sm">
                  {r.jobName}{" "}
                  <span className="text-dim">&rarr; {r.destination}</span>
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
