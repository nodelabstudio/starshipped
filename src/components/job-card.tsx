import Link from "next/link";
import { credits } from "@/lib/format";
import { RouteLine } from "./route-line";
import type { Job, Ship } from "@/db/schema";

type JobWithShips = Job & { assignments: { ship: Ship }[] };

export function JobCard({ job }: { job: JobWithShips }) {
  const shipNames = job.assignments.map((a) => a.ship.name);
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block panel p-5 space-y-4 hover:border-holo/40 transition-colors"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-sm tracking-[0.08em] uppercase">
          {job.name}
        </h3>
        <span className="font-mono text-amber whitespace-nowrap">
          {credits(job.cost)}
        </span>
      </div>
      <RouteLine origin={job.origin} destination={job.destination} />
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">{job.containers} CTU needed</span>
        <span className="eyebrow">
          {shipNames.length > 0 ? (
            <>
              Dispatched: <span className="text-holo">{shipNames.join(", ")}</span>
            </>
          ) : (
            "Unassigned"
          )}
        </span>
      </div>
    </Link>
  );
}
