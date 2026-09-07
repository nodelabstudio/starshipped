import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { getJobs, settleArrivals } from '@/lib/queries';
import { cargoState } from '@/lib/fleet-view';
import { credits } from '@/lib/format';
import { CargoManifest } from '@/components/cargo-manifest';
import { JobCard } from '@/components/job-card';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  await settleArrivals();
  const jobs = await getJobs();
  const open = jobs.filter((job) => cargoState(job.assignments) === 'available');
  const active = jobs.filter((job) => cargoState(job.assignments) === 'transit');
  const completed = jobs.filter((job) => cargoState(job.assignments) === 'completed');
  return <div className="port-page">
    <div className="port-page-heading"><div><p className="port-kicker">The cargo board</p><h1>Somewhere to be.</h1><p>Good cargo. Distant worlds. Your next contract.</p></div><Show when="signed-in"><Link href="/jobs/new" className="btn-primary">Post a cargo run <span aria-hidden="true">+</span></Link></Show></div>
    <div className="cargo-board-heading"><h2>Open manifests <span>{open.length.toString().padStart(2, '0')}</span></h2><p>{credits(open.reduce((sum, job) => sum + job.cost, 0))} on the open board</p></div>
    {open.length ? <div className="manifest-board">{open.map((job) => <CargoManifest key={job.id} job={job} />)}</div> : <div className="port-empty"><h2>Every contract has a captain.</h2><p>Post a new run to put your fleet to work.</p><Link href="/jobs/new" className="btn-ghost">Post a cargo run</Link></div>}
    {active.length ? <section className="port-active-cargo"><div className="port-section-heading"><h2>Across the galaxy now</h2><span>{active.length} in transit</span></div>{active.map((job) => <JobCard key={job.id} job={job} />)}</section> : null}
    {completed.length ? <details className="port-archive"><summary><span>Fulfilled contracts</span><span>{completed.length} manifests <i aria-hidden="true">+</i></span></summary><div className="archive-table">{completed.map((job) => <Link key={job.id} href={`/jobs/${job.id}`}><span><strong>{job.name}</strong><small>{job.origin} → {job.destination}</small></span><span>{job.containers} CTU</span><span>{credits(job.cost)}</span><span className="archive-status">Delivered</span></Link>)}</div></details> : null}
  </div>;
}
