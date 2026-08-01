import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getJob, getShips, settleArrivals } from "@/lib/queries";
import { deleteJob, deleteAssignment } from "@/lib/actions";
import { credits } from "@/lib/format";
import { RouteLine } from "@/components/route-line";
import { RunProgress } from "@/components/run-progress";
import { DeleteButton } from "@/components/delete-button";
import { AssignForm } from "@/components/assign-form";
import { ShipCard } from "@/components/ship-card";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId)) notFound();

  await settleArrivals();
  const [job, allShips, { userId }] = await Promise.all([
    getJob(jobId),
    getShips(),
    auth(),
  ]);
  if (!job) notFound();
  const isOwner = userId === job.userId;

  // Open contract: nobody en route, nobody has delivered. Only docked ships
  // can be dispatched; the server action re-validates all of it.
  const jobIsOpen =
    !job.assignments.some((a) => a.completedAt === null) &&
    !job.assignments.some((a) => a.completedAt !== null);
  const dockedShips = allShips.filter(
    (s) => !s.assignments.some((a) => a.completedAt === null),
  );
  const assignedCapacity = job.assignments.reduce(
    (total, a) => total + a.ship.containers,
    0,
  );

  return (
    <div className="pt-10 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Cargo board</p>
          <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
            {job.name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href="/jobs" transitionTypes={["warp"]} data-sfx="warp" className="btn-ghost">
            Back to board
          </Link>
          {isOwner && (
            <>
              <Link
                href={`/jobs/${job.id}/edit`}
                transitionTypes={["warp"]}
                data-sfx="warp"
                className="btn-ghost"
              >
                Edit
              </Link>
              <DeleteButton
                action={deleteJob.bind(null, job.id)}
                label="Cancel run"
                confirmText={`Cancel ${job.name}? Dispatched ships will be released.`}
              />
            </>
          )}
        </div>
      </div>

      <div className="panel p-6 space-y-5 max-w-2xl">
        <RouteLine origin={job.origin} destination={job.destination} />
        {job.description && <p className="text-dim">{job.description}</p>}
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <p className="eyebrow mb-1">Pay</p>
            <p className="font-mono text-xl text-amber">{credits(job.cost)}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">Containers needed</p>
            <p className="font-mono text-xl">
              <span
                className={assignedCapacity >= job.containers ? "text-holo" : "text-ink"}
              >
                {assignedCapacity}
              </span>
              <span className="text-dim"> / {job.containers} CTU</span>
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-5">
        <h2 className="eyebrow">Dispatched ships</h2>
        {job.assignments.length === 0 ? (
          <p className="text-dim text-sm">No ships on this run yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {job.assignments.map((a) => (
              <div key={a.id} className="space-y-2">
                {/* getJob loads bare ships; hand the card this run so its
                    docked/in-transit readout matches the progress bar below. */}
                <ShipCard ship={{ ...a.ship, assignments: [{ ...a, job }] }} />
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
                {userId === a.ship.userId && (
                  <form action={deleteAssignment.bind(null, a.id)}>
                    <button type="submit" className="btn-danger !py-1 !px-3 !text-xs">
                      Release
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
        {userId && jobIsOpen && dockedShips.length > 0 && (
          <div className="panel p-5 max-w-2xl">
            <p className="eyebrow mb-4">Dispatch a ship to this run</p>
            <AssignForm
              ships={dockedShips.map((s) => ({
                id: s.id,
                name: s.name,
                containers: s.containers,
              }))}
              jobs={[]}
              fixedJobId={job.id}
            />
          </div>
        )}
      </section>
    </div>
  );
}
