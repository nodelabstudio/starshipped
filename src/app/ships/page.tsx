import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { getShips, settleArrivals } from '@/lib/queries';
import { FleetHangar } from '@/components/fleet-hangar';

export const dynamic = 'force-dynamic';

export default async function ShipsPage() {
  await settleArrivals();
  const ships = await getShips();
  return <div className="port-page">
    <div className="port-page-heading"><div><p className="port-kicker">The fleet registry</p><h1>A ship for every horizon.</h1><p>Find your vessel. Give it somewhere to go.</p></div><Show when="signed-in"><Link href="/ships/new" className="btn-primary">Commission a ship <span aria-hidden="true">+</span></Link></Show></div>
    {ships.length ? <FleetHangar ships={ships.map((ship) => ({ id: ship.id, name: ship.name, imageUrl: ship.imageUrl, containers: ship.containers, location: ship.location, destination: ship.assignments.find((assignment) => assignment.completedAt === null)?.job.destination ?? null }))} /> : <div className="port-empty"><h2>Your hangar is waiting.</h2><p>Register a vessel to begin building your fleet.</p><Link href="/ships/new" className="btn-primary">Commission the first ship</Link></div>}
  </div>;
}
