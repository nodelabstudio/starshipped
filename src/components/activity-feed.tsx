import Link from "next/link";
import { getRecentActivity } from "@/lib/queries";
import { credits } from "@/lib/format";

function ago(at: number) {
  const s = Math.max(Math.floor((Date.now() - at) / 1000), 0);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Latest departures and deliveries across the fleet.
export async function ActivityFeed() {
  const events = await getRecentActivity();
  if (events.length === 0) return null;

  return (
    <section className="panel divide-y divide-line">
      <p className="eyebrow p-4 pb-3">Fleet activity</p>
      {events.map((e) => (
        <p
          key={`${e.kind}-${e.shipId}-${e.jobId}-${e.at}`}
          className="px-4 py-2.5 font-mono text-xs uppercase tracking-[0.1em] text-dim"
        >
          <Link
            href={`/ships/${e.shipId}`}
            className="text-ink hover:text-holo transition-colors"
          >
            {e.shipName}
          </Link>{" "}
          {e.kind === "departed" ? (
            <>
              departed {e.origin} <span className="text-holo">&rarr;</span>{" "}
              {e.destination}
            </>
          ) : (
            <>
              delivered{" "}
              <Link
                href={`/jobs/${e.jobId}`}
                className="text-amber hover:underline"
              >
                {e.jobName}
              </Link>{" "}
              at {e.destination} &middot;{" "}
              <span className="text-amber">+{credits(e.cost)}</span>
            </>
          )}{" "}
          &middot; {ago(e.at)}
        </p>
      ))}
    </section>
  );
}
