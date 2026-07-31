"use client";

import { useActionState } from "react";
import Image from "next/image";
import type { FormState } from "@/lib/actions";
import type { Ship } from "@/db/schema";
import { PLANETS, MIN_CONTAINERS, MAX_CONTAINERS } from "@/lib/planets";
import { FormError } from "./form-error";

export function ShipForm({
  action,
  ship,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  ship?: Ship;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      <FormError error={state?.error} />
      <div>
        <label htmlFor="name" className="field-label">
          Ship name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={ship?.name}
          className="field-input"
          placeholder="Millennium Falcon"
        />
      </div>
      <div>
        <label htmlFor="containers" className="field-label">
          Container capacity ({MIN_CONTAINERS}&ndash;{MAX_CONTAINERS} CTU)
        </label>
        <input
          id="containers"
          name="containers"
          type="number"
          required
          min={MIN_CONTAINERS}
          max={MAX_CONTAINERS}
          defaultValue={ship?.containers}
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor="location" className="field-label">
          Current location
        </label>
        <select
          id="location"
          name="location"
          required
          defaultValue={ship?.location ?? ""}
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
      <div>
        <label htmlFor="image" className="field-label">
          Visual feed {ship?.imageUrl ? "(replaces current image)" : ""}
        </label>
        {ship?.imageUrl && (
          <div className="relative w-40 aspect-[16/10] mb-2 border border-line">
            <Image
              src={ship.imageUrl}
              alt={ship.name}
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>
        )}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          className="field-input file:mr-3 file:border-0 file:bg-transparent file:text-holo file:font-mono file:text-xs file:uppercase file:tracking-[0.15em]"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
        {pending ? "Transmitting…" : submitLabel}
      </button>
    </form>
  );
}
