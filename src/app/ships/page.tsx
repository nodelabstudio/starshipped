import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { getShips, settleArrivals } from "@/lib/queries";
import { ShipCard } from "@/components/ship-card";

export const dynamic = "force-dynamic";

export default async function ShipsPage() {
  await settleArrivals();
  const ships = await getShips();

  return (
    <div className="pt-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Fleet registry</p>
          <h1 className="font-display text-2xl tracking-[0.06em] uppercase">Ships</h1>
        </div>
        <Show when="signed-in">
          <Link href="/ships/new" className="btn-primary">
            Commission a ship
          </Link>
        </Show>
      </div>

      {ships.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="text-dim">No ships in dock.</p>
          <Link href="/ships/new" className="btn-primary">
            Commission the first one
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ships.map((ship) => (
            <ShipCard key={ship.id} ship={ship} />
          ))}
        </div>
      )}
    </div>
  );
}
