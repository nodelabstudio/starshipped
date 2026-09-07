import Link from 'next/link';
import { credits } from '@/lib/format';
import type { Assignment, Job, Ship } from '@/db/schema';
import { cargoState } from '@/lib/fleet-view';
import { RunProgress } from './run-progress';

type JobWithShips = Job & { assignments: Array<Assignment & { ship: Ship }> };

export function JobCard({ job }: { job: JobWithShips }) {
  const status = cargoState(job.assignments);
  const journeys = job.assignments.filter((assignment) => assignment.completedAt === null);
  return <article className="port-job-row"><div><Link href={`/jobs/${job.id}`} className="flight-contract">{job.name}</Link><p>{job.origin} <span aria-hidden="true">→</span> {job.destination}</p><small>{job.containers} CTU required</small></div><div>{journeys.length ? journeys.map((assignment) => <div className="job-vessel-progress" key={assignment.id}><Link href={`/ships/${assignment.ship.id}`}>{assignment.ship.name}</Link><RunProgress departsAt={assignment.departsAt.getTime()} arrivesAt={assignment.arrivesAt.getTime()} /></div>) : <span className="archive-status">{status === 'completed' ? 'Delivered' : 'Available'}</span>}</div><strong>{credits(job.cost)}</strong></article>;
}
