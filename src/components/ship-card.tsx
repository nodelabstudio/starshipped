import { ViewTransition } from 'react';
import Link from 'next/link';
import type { Assignment, Job, Ship } from '@/db/schema';
import { registry } from '@/lib/format';
import { ShipPortrait } from './ship-portrait';

type ShipWithRuns = Ship & { assignments?: Array<Assignment & { job: Job }> };

export function ShipCard({ ship }: { ship: ShipWithRuns }) {
  const inTransit = ship.assignments?.find((assignment) => assignment.completedAt === null);
  return <Link href={`/ships/${ship.id}`} transitionTypes={['warp']} className="gallery-vessel">
    <ViewTransition name={`ship-${ship.id}`} share="auto" default="none"><ShipPortrait name={ship.name} src={ship.imageUrl} /></ViewTransition>
    <div className="gallery-vessel-heading"><h2>{ship.name}</h2><span>{registry(ship.id)}</span></div><p>{inTransit ? `In transit to ${inTransit.job.destination}` : `Docked at ${ship.location}`}<span>{ship.containers} CTU</span></p>
  </Link>;
}
