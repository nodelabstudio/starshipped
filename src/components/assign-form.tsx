"use client";

import { useActionState } from "react";
import { createAssignment, type FormState } from "@/lib/actions";
import { FormError } from "./form-error";

export function AssignForm({
  ships,
  jobs,
  fixedJobId,
}: {
  ships: { id: number; name: string; containers: number }[];
  jobs: { id: number; name: string; containers: number }[];
  fixedJobId?: number;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createAssignment,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state?.error} />
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-44">
          <label htmlFor="shipId" className="field-label">
            Ship
          </label>
          <select id="shipId" name="shipId" required defaultValue="" className="field-input">
            <option value="" disabled>
              Pick a ship
            </option>
            {ships.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.containers} CTU
              </option>
            ))}
          </select>
        </div>
        {fixedJobId ? (
          <input type="hidden" name="jobId" value={fixedJobId} />
        ) : (
          <div className="flex-1 min-w-44">
            <label htmlFor="jobId" className="field-label">
              Cargo run
            </label>
            <select id="jobId" name="jobId" required defaultValue="" className="field-input">
              <option value="" disabled>
                Pick a run
              </option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} — {j.containers} CTU
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Dispatching…" : "Dispatch"}
        </button>
      </div>
    </form>
  );
}
