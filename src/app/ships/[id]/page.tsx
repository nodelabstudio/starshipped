import { ViewTransition } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getShip, settleArrivals } from '@/lib/queries';
import { deleteShip } from '@/lib/actions';
import { registry, credits } from '@/lib/format';
import { ShipViewport } from '@/components/ship-viewport';
import { WorldMark } from '@/components/world-mark';
import { RunProgress } from '@/components/run-progress';
import { DeleteButton } from '@/components/delete-button';
import { HangarBackdrop } from '@/components/hangar-backdrop';

export const dynamic = 'force-dynamic';

export default async function ShipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipId = Number(id);
  if (!Number.isInteger(shipId)) notFound();
  await settleArrivals();
  const [ship, { userId }] = await Promise.all([getShip(shipId), auth()]);
  if (!ship) notFound();
  const isOwner = userId === ship.userId;
  const inTransit = ship.assignments.find((assignment) => assignment.completedAt === null);
  return <div className="port-page">
    <div className="port-page-heading"><div><p className="port-kicker">Fleet registry / {registry(ship.id)}</p><h1>{ship.name}</h1></div><div className="port-detail-actions"><Link href="/ships" transitionTypes={['warp']} className="btn-ghost">Back to fleet</Link>{isOwner ? <><Link href={`/ships/${ship.id}/edit`} className="btn-ghost">Edit vessel</Link><DeleteButton action={deleteShip.bind(null, ship.id)} label="Decommission" confirmText={`Decommission ${ship.name}? This removes it from the registry and all runs.`} /></> : null}</div></div>
    <div className="vessel-detail-layout"><div className="hangar-scene"><HangarBackdrop /><ViewTransition name={`ship-${ship.id}`} share="auto" default="none"><ShipViewport src={ship.imageUrl} name={ship.name} containers={ship.containers} priority sizes="(max-width: 900px) 100vw, 65vw" className="aspect-[4/3]" presentation="hangar" /></ViewTransition></div>
      <aside className="vessel-dossier"><p className="port-kicker">The vessel record</p><div className="dossier-capacity"><strong>{ship.containers}</strong><span>CTU of cargo capacity</span></div><div className="dossier-location"><WorldMark name={inTransit?.job.destination ?? ship.location} /><div><small>{inTransit ? 'Bound for' : 'Currently docked'}</small><strong>{inTransit?.job.destination ?? ship.location}</strong></div></div>{inTransit ? <RunProgress departsAt={inTransit.departsAt.getTime()} arrivesAt={inTransit.arrivesAt.getTime()} /> : <Link href="/assignments" className="btn-primary">Find the next run ↗</Link>}<div className="dossier-registered"><small>Commissioned</small><span>{ship.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</span></div><Link href="/map" className="port-text-link">Explore the starmap ↗</Link></aside>
    </div>
    <section className="vessel-service-record"><div className="port-section-heading"><div><p className="port-kicker">Service record</p><h2>Where this vessel has been.</h2></div><span>{ship.assignments.length} cargo runs</span></div>{ship.assignments.length ? <div className="archive-table">{ship.assignments.map((assignment) => <div className="vessel-history-row" key={assignment.id}><Link href={`/jobs/${assignment.job.id}`}><strong>{assignment.job.name}</strong><small>{assignment.job.origin} → {assignment.job.destination}</small></Link><span>{credits(assignment.job.cost)}</span>{assignment.completedAt ? <span className="archive-status">Delivered</span> : <RunProgress departsAt={assignment.departsAt.getTime()} arrivesAt={assignment.arrivesAt.getTime()} />}</div>)}</div> : <p className="port-log-empty">A fresh registry. This vessel’s first journey begins at the <Link href="/assignments" className="port-text-link">dispatch desk</Link>.</p>}</section>
  </div>;
}
