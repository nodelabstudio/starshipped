import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getAssignments, getShips, getJobs, settleArrivals } from "@/lib/queries";
import { deleteAssignment } from "@/lib/actions";
import { RouteLine } from "@/components/route-line";
import { RunProgress } from "@/components/run-progress";
import { AssignForm } from "@/components/assign-form";
import { registry } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  await settleArrivals();
  const [assignments, ships, jobs, { userId }] = await Promise.all([
    getAssignments(),
    getShips(),
    getJobs(),
    auth(),
  ]);

  // Only docked ships and open contracts are dispatchable; the server action
  // re-validates, this just keeps the dropdowns honest.
  const dockedShips = ships.filter(
    (s) => !s.assignments.some((a) => a.completedAt === null),
  );
  const openJobs = jobs.filter(
    (j) =>
      !j.assignments.some((a) => a.completedAt === null) &&
      !j.assignments.some((a) => a.completedAt !== null),
  );
  const canDispatch = dockedShips.length > 0 && openJobs.length > 0;

  // In-transit runs first, then delivered; both newest-first (query order).
  const ordered = [
    ...assignments.filter((a) => a.completedAt === null),
    ...assignments.filter((a) => a.completedAt !== null),
  ];

  return (
    <div className="pt-10 space-y-8">
      <div>
        <p className="eyebrow aurebesh mb-2">Dispatch board</p>
        <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
          Assignments
        </h1>
      </div>

      {userId && canDispatch && (
        <div className="panel p-5">
          <p className="eyebrow mb-4">Dispatch a ship</p>
          <AssignForm
            ships={dockedShips.map((s) => ({
              id: s.id,
              name: s.name,
              containers: s.containers,
            }))}
            jobs={openJobs.map((j) => ({
              id: j.id,
              name: j.name,
              containers: j.containers,
            }))}
          />
        </div>
      )}
      {userId && !canDispatch && ships.length > 0 && jobs.length > 0 && (
        <p className="font-mono text-xs text-dim tracking-[0.1em]">
          Nothing eligible to dispatch — every ship is flying or every contract is
          taken.
        </p>
      )}

      {assignments.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-dim">
            Nothing dispatched. Every ship is sitting in dock.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {ordered.map((a) => (
            <li
              key={a.id}
              className={`panel p-5 grid gap-4 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center ${
                a.completedAt ? "opacity-60" : ""
              }`}
            >
              <div>
                <Link
                  href={`/ships/${a.ship.id}`}
                  className="font-display text-sm tracking-[0.08em] uppercase hover:text-holo transition-colors"
                >
                  {a.ship.name}
                </Link>
                <p className="font-mono text-xs text-dim mt-1">
                  {registry(a.ship.id)} &middot; {a.ship.containers} CTU
                </p>
              </div>
              <div className="space-y-2">
                <Link
                  href={`/jobs/${a.job.id}`}
                  className="font-mono text-xs text-holo uppercase tracking-[0.15em] hover:underline"
                >
                  {a.job.name}
                </Link>
                <RouteLine origin={a.job.origin} destination={a.job.destination} />
                {a.completedAt ? (
                  <p className="font-mono text-xs text-amber tracking-[0.15em]">
                    DELIVERED
                  </p>
                ) : (
                  <RunProgress
                    departsAt={a.departsAt.getTime()}
                    arrivesAt={a.arrivesAt.getTime()}
                  />
                )}
              </div>
              {userId === a.ship.userId && (
                <form action={deleteAssignment.bind(null, a.id)}>
                  <button type="submit" className="btn-danger !py-1.5 !px-3 !text-xs">
                    Release
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
