import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { getJobs, settleArrivals } from "@/lib/queries";
import { JobCard } from "@/components/job-card";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  await settleArrivals();
  const jobs = await getJobs();

  return (
    <div className="pt-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Cargo board</p>
          <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
            Cargo runs
          </h1>
        </div>
        <Show when="signed-in">
          <Link href="/jobs/new" className="btn-primary">
            Post a run
          </Link>
        </Show>
      </div>

      {jobs.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="text-dim">The board is empty.</p>
          <Link href="/jobs/new" className="btn-primary">
            Post the first run
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
