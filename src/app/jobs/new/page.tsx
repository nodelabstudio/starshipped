import { createJob } from "@/lib/actions";
import { JobForm } from "@/components/job-form";

export default function NewJobPage() {
  return (
    <div className="port-form-page">
      <div className="port-page-heading"><div>
        <p className="port-kicker mb-2">Cargo board</p>
        <h1 className="port-form-title">
          Post a cargo run
        </h1>
      </div></div>
      <JobForm action={createJob} submitLabel="Post run" />
    </div>
  );
}
