import { MAX_CONTAINERS } from "@/lib/planets";

// Segmented readout of container capacity, out of the fleet max of 100.
export function CapacityGauge({ containers }: { containers: number }) {
  const filled = Math.round((containers / MAX_CONTAINERS) * 10);
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-1.5 ${
              i < filled
                ? "bg-holo shadow-[0_0_6px_rgba(92,200,255,0.5)]"
                : "bg-line"
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-dim">{containers} CTU</span>
    </div>
  );
}
