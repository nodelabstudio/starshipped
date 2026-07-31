import { createJob } from "@/lib/actions";
import { JobForm } from "@/components/job-form";

export default function NewJobPage() {
  return (
    <div className="pt-10 max-w-xl space-y-8">
      <div>
        <p className="eyebrow mb-2">Cargo board</p>
        <h1 className="font-display text-2xl tracking-[0.06em] uppercase">
          Post a cargo run
        </h1>
      </div>
      <JobForm action={createJob} submitLabel="Post run" />
    </div>
  );
}
