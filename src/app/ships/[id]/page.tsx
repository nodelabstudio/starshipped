import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getShip, settleArrivals } from "@/lib/queries";
import { deleteShip } from "@/lib/actions";
import { registry, credits } from "@/lib/format";
import { HoloViewport } from "@/components/holo-viewport";
import { CapacityGauge } from "@/components/capacity-gauge";
import { RouteLine } from "@/components/route-line";
import { RunProgress } from "@/components/run-progress";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

export default async function ShipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipId = Number(id);
  if (!Number.isInteger(shipId)) notFound();

  await settleArrivals();
  const [ship, { userId }] = await Promise.all([getShip(shipId), auth()]);
  if (!ship) notFound();
  const isOwner = userId === ship.userId;
  const inTransit = ship.assignments.find((a) => a.completedAt === null);

  return (
    <div className="pt-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">
            Fleet registry &middot; {registry(ship.id)}
          </p>
          <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
            {ship.name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href="/ships" className="btn-ghost">
            Back to fleet
          </Link>
          {isOwner && (
            <>
              <Link href={`/ships/${ship.id}/edit`} className="btn-ghost">
                Edit
              </Link>
              <DeleteButton
                action={deleteShip.bind(null, ship.id)}
                label="Decommission"
                confirmText={`Decommission ${ship.name}? This removes it from the registry and all runs.`}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
        <div className="group">
          <HoloViewport
            src={ship.imageUrl}
            alt={ship.name}
            scan="load"
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="aspect-[16/10]"
          />
        </div>
        <div className="space-y-6">
          <div className="panel p-5 space-y-4">
            <div>
              <p className="eyebrow mb-2">Capacity</p>
              <CapacityGauge containers={ship.containers} />
            </div>
            {inTransit ? (
              <div>
                <p className="eyebrow mb-1">In transit</p>
                <p className="font-mono text-amber uppercase tracking-[0.1em]">
                  &rarr; {inTransit.job.destination}
                </p>
              </div>
            ) : (
              <div>
                <p className="eyebrow mb-1">Docked at</p>
                <p className="font-mono text-holo uppercase tracking-[0.1em]">
                  {ship.location}
                </p>
              </div>
            )}
            <div>
              <p className="eyebrow mb-1">Registered</p>
              <p className="font-mono text-sm text-dim">
                {ship.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="eyebrow">Dispatched to</p>
            {ship.assignments.length === 0 ? (
              <p className="text-dim text-sm">
                No runs yet. Send it out from the{" "}
                <Link href="/assignments" className="text-holo hover:underline">
                  dispatch board
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-3">
                {ship.assignments.map((a) => (
                  <li key={a.id} className="panel p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/jobs/${a.job.id}`}
                        className="font-display text-xs tracking-[0.08em] uppercase hover:text-holo transition-colors"
                      >
                        {a.job.name}
                      </Link>
                      <span className="font-mono text-sm text-amber">
                        {credits(a.job.cost)}
                      </span>
                    </div>
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
