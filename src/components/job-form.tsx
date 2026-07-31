"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import type { Job } from "@/db/schema";
import { PLANETS, MAX_CONTAINERS } from "@/lib/planets";
import { FormError } from "./form-error";

function PlanetSelect({
  id,
  label,
  defaultValue,
}: {
  id: "origin" | "destination";
  label: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex-1 min-w-40">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        name={id}
        required
        defaultValue={defaultValue ?? ""}
        className="field-input"
      >
        <option value="" disabled>
          Pick a planet
        </option>
        {PLANETS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}

export function JobForm({
  action,
  job,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  job?: Job;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      <FormError error={state?.error} />
      <div>
        <label htmlFor="name" className="field-label">
          Run name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={job?.name}
          className="field-input"
          placeholder="Tibanna Gas Haul"
        />
      </div>
      <div>
        <label htmlFor="description" className="field-label">
          Cargo details
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={job?.description ?? ""}
          className="field-input"
          placeholder="What's being hauled, and anything a captain should know."
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <PlanetSelect id="origin" label="Origin" defaultValue={job?.origin} />
        <PlanetSelect
          id="destination"
          label="Destination"
          defaultValue={job?.destination}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-40">
          <label htmlFor="cost" className="field-label">
            Pay (credits)
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            required
            min={0}
            defaultValue={job?.cost}
            className="field-input"
          />
        </div>
        <div className="flex-1 min-w-40">
          <label htmlFor="containers" className="field-label">
            Containers needed (1&ndash;{MAX_CONTAINERS})
          </label>
          <input
            id="containers"
            name="containers"
            type="number"
            required
            min={1}
            max={MAX_CONTAINERS}
            defaultValue={job?.containers}
            className="field-input"
          />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
        {pending ? "Transmitting…" : submitLabel}
      </button>
    </form>
  );
}
