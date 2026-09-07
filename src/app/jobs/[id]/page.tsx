import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getJob, getShips, settleArrivals } from '@/lib/queries';
import { deleteJob, deleteAssignment } from '@/lib/actions';
import { cargoState } from '@/lib/fleet-view';
import { RunProgress } from '@/components/run-progress';
import { DeleteButton } from '@/components/delete-button';
import { AssignForm } from '@/components/assign-form';
import { ShipCard } from '@/components/ship-card';
import { CargoManifest } from '@/components/cargo-manifest';

export const dynamic = 'force-dynamic';

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId)) notFound();
  await settleArrivals();
  const [job, allShips, { userId }] = await Promise.all([getJob(jobId), getShips(), auth()]);
  if (!job) notFound();
  const status = cargoState(job.assignments);
  const dockedShips = allShips.filter((ship) => !ship.assignments.some((assignment) => assignment.completedAt === null));
  const assignedCapacity = job.assignments.reduce((total, assignment) => total + assignment.ship.containers, 0);
  return <div className="port-page">
    <div className="port-page-heading"><div><p className="port-kicker">Cargo board / Manifest {String(job.id).padStart(4, '0')}</p><h1>{job.name}</h1></div><div className="port-detail-actions"><Link href="/jobs" className="btn-ghost">Back to board</Link>{userId === job.userId ? <><Link href={`/jobs/${job.id}/edit`} className="btn-ghost">Edit contract</Link><DeleteButton action={deleteJob.bind(null, job.id)} label="Cancel run" confirmText={`Cancel ${job.name}? Dispatched ships will be released.`} /></> : null}</div></div>
    <div className="contract-detail-layout"><CargoManifest job={job} status={status} detail /><aside className="contract-dossier"><p className="port-kicker">Contract standing</p><h2>{status === 'available' ? 'Awaiting a captain.' : status === 'transit' ? 'Cargo on its way.' : 'Cargo delivered.'}</h2><p>{status === 'available' ? 'Choose a vessel with enough capacity to carry this consignment.' : status === 'transit' ? 'Assigned vessels are carrying this manifest to its destination.' : 'This manifest has reached its destination and is part of the fleet’s service record.'}</p><div className="contract-capacity"><strong>{assignedCapacity}<span> / {job.containers} CTU</span></strong><small>Assigned capacity / cargo requirement</small></div><Link href="/map" className="port-text-link">View the galactic routes ↗</Link></aside></div>
    {userId && status === 'available' && dockedShips.length > 0 ? <section className="contract-dispatch"><AssignForm ships={dockedShips.map((ship) => ({ id: ship.id, name: ship.name, containers: ship.containers, imageUrl: ship.imageUrl, location: ship.location }))} jobs={[{ id: job.id, name: job.name, containers: job.containers, origin: job.origin, destination: job.destination }]} fixedJobId={job.id} /></section> : null}
    <section className="contract-vessels"><div className="port-section-heading"><h2>Vessels on this manifest</h2><span>{job.assignments.length} assigned</span></div>{job.assignments.length ? <div className="fleet-gallery">{job.assignments.map((assignment) => <div key={assignment.id} className="contract-vessel"><ShipCard ship={{ ...assignment.ship, assignments: [{ ...assignment, job }] }} />{assignment.completedAt ? <span className="archive-status">Delivered</span> : <RunProgress departsAt={assignment.departsAt.getTime()} arrivesAt={assignment.arrivesAt.getTime()} />}{userId === assignment.ship.userId ? <form action={deleteAssignment.bind(null, assignment.id)}><button type="submit" className="log-release">Release</button></form> : null}</div>)}</div> : <p className="port-log-empty">No vessel assigned yet. {userId ? 'Prepare a departure above or visit the dispatch desk.' : <Link href="/sign-in" className="port-text-link">Sign in to prepare a departure.</Link>}</p>}</section>
  </div>;
}
