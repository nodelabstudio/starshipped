import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { getAssignments, getShips, getJobs, settleArrivals } from '@/lib/queries';
import { deleteAssignment } from '@/lib/actions';
import { RunProgress } from '@/components/run-progress';
import { AssignForm } from '@/components/assign-form';
import { ShipPortrait } from '@/components/ship-portrait';
import { registry } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AssignmentsPage() {
  await settleArrivals();
  const [assignments, ships, jobs, { userId }] = await Promise.all([getAssignments(), getShips(), getJobs(), auth()]);
  const dockedShips = ships.filter((ship) => !ship.assignments.some((assignment) => assignment.completedAt === null));
  const openJobs = jobs.filter((job) => !job.assignments.length);
  const active = assignments.filter((assignment) => assignment.completedAt === null);
  const completed = assignments.filter((assignment) => assignment.completedAt !== null);
  const canDispatch = dockedShips.length > 0 && openJobs.length > 0;
  return <div className="port-page">
    <div className="port-page-heading"><div><p className="port-kicker">Flight operations</p><h1>Clear for departure.</h1><p>{active.length ? `${active.length} ${active.length === 1 ? 'vessel is' : 'vessels are'} carrying cargo across the galaxy.` : 'A quiet dock. A galaxy of work ahead.'}</p></div><div className="dispatch-summary"><strong>{dockedShips.length}</strong><span>in dock</span><strong>{active.length.toString().padStart(2, '0')}</strong><span>underway</span></div></div>
    {userId && canDispatch ? <AssignForm ships={dockedShips.map((ship) => ({ id: ship.id, name: ship.name, containers: ship.containers, imageUrl: ship.imageUrl, location: ship.location }))} jobs={openJobs.map((job) => ({ id: job.id, name: job.name, containers: job.containers, origin: job.origin, destination: job.destination }))} /> : <div className="dispatch-welcome"><div><p className="port-kicker">The departure desk</p><h2>{!userId ? 'Your fleet has places to be.' : !dockedShips.length ? 'Every vessel is occupied.' : 'Ready when the next contract is.'}</h2><p>{!userId ? 'Sign in to match a vessel with its next cargo run.' : !dockedShips.length ? 'A docked vessel is needed before another departure.' : 'Post a cargo run to prepare the next departure.'}</p><Link href={!userId ? '/sign-in?redirect_url=%2Fassignments' : !dockedShips.length ? '/ships' : '/jobs/new'} className="btn-primary">{!userId ? 'Sign in to dispatch' : !dockedShips.length ? 'View the fleet' : 'Post a cargo run'}</Link></div><div className="dispatch-welcome-art" aria-hidden="true"><span className="dock-outline" /><span>Flight operations / Starshipped</span></div></div>}
    {active.length ? <section className="active-flights"><div className="port-section-heading"><h2>Currently underway</h2><span>{active.length} active journeys</span></div>{active.map((assignment) => <article className="flight-row" key={assignment.id}><Link href={`/ships/${assignment.ship.id}`} className="flight-vessel"><ShipPortrait name={assignment.ship.name} src={assignment.ship.imageUrl} /><span><small>{registry(assignment.ship.id)}</small><strong>{assignment.ship.name}</strong></span></Link><div><Link href={`/jobs/${assignment.job.id}`} className="flight-contract">{assignment.job.name}</Link><p>{assignment.job.origin} <span aria-hidden="true">→</span> {assignment.job.destination}</p><RunProgress departsAt={assignment.departsAt.getTime()} arrivesAt={assignment.arrivesAt.getTime()} /></div>{userId === assignment.ship.userId ? <form action={deleteAssignment.bind(null, assignment.id)}><button type="submit" className="btn-danger">Release</button></form> : null}</article>)}</section> : null}
    <section className="dispatch-log"><div className="port-section-heading"><div><p className="port-kicker">The captain’s log</p><h2>Cargo carried. Word kept.</h2></div><span>{completed.length} completed journeys</span></div>{completed.length ? <div className="archive-table">{completed.map((assignment) => <div className="dispatch-log-row" key={assignment.id}><span><Link href={`/ships/${assignment.ship.id}`}><strong>{assignment.ship.name}</strong></Link><Link href={`/jobs/${assignment.job.id}`}><small>{assignment.job.name}</small></Link></span><span className="log-route">{assignment.job.origin}<span aria-hidden="true">→</span>{assignment.job.destination}</span><span className="archive-status">Delivered</span>{userId === assignment.ship.userId ? <form action={deleteAssignment.bind(null, assignment.id)}><button type="submit" className="log-release">Release</button></form> : null}</div>)}</div> : <p className="port-log-empty">Completed journeys will appear here after your first delivery.</p>}</section>
  </div>;
}
