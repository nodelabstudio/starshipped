import Link from "next/link";
import { getDb } from "@/db";
import { getFleetStats } from "@/lib/queries";
import { registry, credits } from "@/lib/format";
import { HoloViewport } from "@/components/holo-viewport";
import { NeonCursor } from "@/components/neon-cursor";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, featured] = await Promise.all([
    getFleetStats(),
    getDb().query.ships.findFirst(),
  ]);

  return (
    <div className="pt-14 sm:pt-20 space-y-16">
      <NeonCursor />
      <section className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
        <div className="space-y-6">
          <p className="eyebrow">Outer Rim fleet logistics</p>
          <h1 className="font-display text-3xl sm:text-4xl leading-snug tracking-[0.06em] uppercase">
            Every ship.
            <br />
            Every run.
            <br />
            <span className="text-holo">One manifest.</span>
          </h1>
          <p className="text-dim max-w-md text-lg">
            Commission ships, post cargo runs, and dispatch your fleet across
            ten planets &mdash; from Tatooine to Kashyyyk.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/ships" className="btn-primary">
              Browse the fleet
            </Link>
            <Link href="/jobs" className="btn-ghost">
              See cargo runs
            </Link>
          </div>
        </div>
        <div className="group">
          <HoloViewport
            src={featured?.imageUrl ?? null}
            alt={featured?.name ?? "No ships in dock"}
            scan="load"
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="aspect-[16/10]"
          />
          {featured && (
            <div className="flex items-baseline justify-between mt-3">
              <span className="font-mono text-xs text-dim">
                {registry(featured.id)} &middot; {featured.name.toUpperCase()}
              </span>
              <span className="eyebrow">
                Docked &middot; <span className="text-holo">{featured.location}</span>
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="panel grid grid-cols-2 lg:grid-cols-4 divide-x divide-line border-line">
        {[
          { label: "Ships in fleet", value: stats.ships },
          { label: "Fleet capacity", value: `${stats.capacity} CTU` },
          { label: "Cargo runs", value: stats.jobs },
          { label: "Credits on the board", value: credits(stats.credits) },
        ].map((s) => (
          <div key={s.label} className="p-5 space-y-1">
            <p className="font-mono text-xl text-holo">{s.value}</p>
            <p className="eyebrow">{s.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
