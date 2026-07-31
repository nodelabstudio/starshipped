import { createShip } from "@/lib/actions";
import { ShipForm } from "@/components/ship-form";

export default function NewShipPage() {
  return (
    <div className="pt-10 max-w-xl space-y-8">
      <div>
        <p className="eyebrow mb-2">Fleet registry</p>
        <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
          Commission a ship
        </h1>
      </div>
      <ShipForm action={createShip} submitLabel="Commission ship" />
    </div>
  );
}
