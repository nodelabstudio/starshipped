import Link from "next/link";
import type { Ship } from "@/db/schema";
import { registry } from "@/lib/format";
import { HoloViewport } from "./holo-viewport";
import { CapacityGauge } from "./capacity-gauge";

export function ShipCard({ ship }: { ship: Ship }) {
  return (
    <Link href={`/ships/${ship.id}`} className="group block panel hover:border-holo/40 transition-colors">
      <HoloViewport
        src={ship.imageUrl}
        alt={ship.name}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="aspect-[16/10]"
      />
      <div className="p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-sm tracking-[0.08em] uppercase">
            {ship.name}
          </h3>
          <span className="font-mono text-xs text-dim whitespace-nowrap shrink-0">
            {registry(ship.id)}
          </span>
        </div>
        <CapacityGauge containers={ship.containers} />
        <p className="eyebrow">
          Docked &middot; <span className="text-holo">{ship.location}</span>
        </p>
      </div>
    </Link>
  );
}
