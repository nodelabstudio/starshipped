import { createShip } from "@/lib/actions";
import { ShipForm } from "@/components/ship-form";

export default function NewShipPage() {
  return (
    <div className="port-form-page">
      <div className="port-page-heading"><div>
        <p className="port-kicker mb-2">Fleet registry</p>
        <h1 className="port-form-title">
          Commission a ship
        </h1>
      </div></div>
      <ShipForm action={createShip} submitLabel="Commission ship" />
    </div>
  );
}
