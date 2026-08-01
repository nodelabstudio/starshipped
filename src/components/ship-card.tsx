import { ViewTransition } from "react";
import Link from "next/link";
import type { Assignment, Job, Ship } from "@/db/schema";
import { registry } from "@/lib/format";
import { HoloViewport } from "./holo-viewport";
import { CapacityGauge } from "./capacity-gauge";

type ShipWithRuns = Ship & { assignments?: (Assignment & { job: Job })[] };

export function ShipCard({ ship }: { ship: ShipWithRuns }) {
  const inTransit = ship.assignments?.find((a) => a.completedAt === null);
  return (
    <Link
      href={`/ships/${ship.id}`}
      transitionTypes={["warp"]}
      className="group block panel hover:border-holo/40 transition-colors"
    >
      {/* Same name as the detail-page viewport so the image morphs across. */}
      <ViewTransition name={`ship-${ship.id}`} share="auto" default="none">
        <HoloViewport
          src={ship.imageUrl}
          alt={ship.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[16/10]"
        />
      </ViewTransition>
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
        {inTransit ? (
          <p className="eyebrow text-amber">
            In transit &rarr; {inTransit.job.destination}
          </p>
        ) : (
          <p className="eyebrow">
            Docked &middot; <span className="text-holo">{ship.location}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
