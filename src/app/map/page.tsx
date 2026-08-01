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
    ships: ships.filter((s) => s.location === name).map((s) => s.name),
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
        progress: inTransit
          ? {
              departsAt: inTransit.departsAt.getTime(),
              arrivesAt: inTransit.arrivesAt.getTime(),
            }
          : undefined,
      };
    });

  return (
    <div className="pt-10 space-y-8">
      <div>
        <p className="eyebrow aurebesh mb-2">Galaxy overview</p>
        <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
          Starmap
        </h1>
      </div>
      <GalaxyMap planets={planets} routes={routes} />
    </div>
  );
}
