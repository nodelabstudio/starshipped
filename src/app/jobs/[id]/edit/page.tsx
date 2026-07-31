import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getJob } from "@/lib/queries";
import { updateJob } from "@/lib/actions";
import { JobForm } from "@/components/job-form";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId)) notFound();

  const [job, { userId }] = await Promise.all([getJob(jobId), auth()]);
  if (!job) notFound();
  if (job.userId !== userId) {
    return (
      <div className="pt-10 max-w-xl">
        <p className="eyebrow mb-2">Access denied</p>
        <p className="text-dim">Only the captain who posted this run can edit it.</p>
      </div>
    );
  }

  return (
    <div className="pt-10 max-w-xl space-y-8">
      <div>
        <p className="eyebrow mb-2">Cargo board</p>
        <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
          Edit {job.name}
        </h1>
      </div>
      <JobForm
        action={updateJob.bind(null, job.id)}
        job={job}
        submitLabel="Save changes"
      />
    </div>
  );
}
