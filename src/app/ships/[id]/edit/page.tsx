import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getShip } from "@/lib/queries";
import { updateShip } from "@/lib/actions";
import { registry } from "@/lib/format";
import { ShipForm } from "@/components/ship-form";

export default async function EditShipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipId = Number(id);
  if (!Number.isInteger(shipId)) notFound();

  const [ship, { userId }] = await Promise.all([getShip(shipId), auth()]);
  if (!ship) notFound();
  if (ship.userId !== userId) {
    return (
      <div className="pt-10 max-w-xl">
        <p className="eyebrow mb-2">Access denied</p>
        <p className="text-dim">Only this ship&apos;s captain can edit it.</p>
      </div>
    );
  }

  return (
    <div className="port-form-page">
      <div className="port-page-heading"><div>
        <p className="port-kicker mb-2">
          Fleet registry &middot; {registry(ship.id)}
        </p>
        <h1 className="port-form-title">
          Edit {ship.name}
        </h1>
      </div></div>
      <ShipForm
        action={updateShip.bind(null, ship.id)}
        ship={ship}
        submitLabel="Save changes"
      />
    </div>
  );
}
