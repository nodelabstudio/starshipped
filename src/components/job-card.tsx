import Link from "next/link";
import { credits } from "@/lib/format";
import { RouteLine } from "./route-line";
import type { Assignment, Job, Ship } from "@/db/schema";

type JobWithShips = Job & { assignments: (Assignment & { ship: Ship })[] };

export function JobCard({ job }: { job: JobWithShips }) {
  const inTransit = job.assignments
    .filter((a) => a.completedAt === null)
    .map((a) => a.ship.name);
  const delivered = job.assignments
    .filter((a) => a.completedAt !== null)
    .map((a) => a.ship.name);
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
        <span className="eyebrow text-right">
          {inTransit.length === 0 && delivered.length === 0 ? (
            "Unassigned"
          ) : (
            <>
              {inTransit.length > 0 && (
                <>
                  In transit: <span className="text-holo">{inTransit.join(", ")}</span>
                </>
              )}
              {inTransit.length > 0 && delivered.length > 0 && " · "}
              {delivered.length > 0 && (
                <>
                  Delivered: <span className="text-amber">{delivered.join(", ")}</span>
                </>
              )}
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
