import type { Metadata } from "next";
import { getShips, getJobs, settleArrivals } from "@/lib/queries";
import { PLANETS } from "@/lib/planets";
import { STARMAP } from "@/lib/starmap";
import { GalaxyMap } from "@/components/galaxy-map";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Starmap" };

export default async function MapPage() {
  await settleArrivals();
  const [ships, jobs] = await Promise.all([getShips(), getJobs()]);

  const planets = PLANETS.map((name) => ({
    name,
    ...STARMAP[name],
    ships: ships.filter((s) => s.location === name && !s.assignments.some((a) => a.completedAt === null)).map((s) => s.name),
  }));

  const known = new Set<string>(PLANETS);
  const routes = jobs
    .filter((j) => known.has(j.origin) && known.has(j.destination))
    .map((j) => {
      const inTransit = j.assignments.find((a) => a.completedAt === null);
      return {
        id: j.id,
        jobName: j.name,
        origin: j.origin,
        destination: j.destination,
        active: inTransit !== undefined,
        containers: j.containers,
        completed: !inTransit && j.assignments.length > 0,
        vessels: j.assignments.filter((a) => a.completedAt === null).map((a) => ({
          id: a.ship.id,
          name: a.ship.name,
          progress: { departsAt: a.departsAt.getTime(), arrivesAt: a.arrivesAt.getTime() },
        })),
        progress: inTransit
          ? {
              departsAt: inTransit.departsAt.getTime(),
              arrivesAt: inTransit.arrivesAt.getTime(),
            }
          : undefined,
      };
    });

  return (
    <div className="port-page">
      <div className="port-page-heading map-heading">
        <div>
          <p className="port-kicker">Flight atlas</p>
          <h1>
            Starmap
          </h1>
        </div>
        <p className="text-dim text-sm max-w-xs">Ten worlds. Every connection.<br />Follow your fleet across the galaxy.</p>
      </div>
      <GalaxyMap planets={planets} routes={routes} />
    </div>
  );
}
