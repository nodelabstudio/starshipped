'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import type { FormState } from '@/lib/actions';
import type { Job } from '@/db/schema';
import { PLANETS, MAX_CONTAINERS } from '@/lib/planets';
import { FormError } from './form-error';
import { CargoManifest } from './cargo-manifest';

export function JobForm({ action, job, submitLabel }: { action: (previous: FormState, data: FormData) => Promise<FormState>; job?: Job; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [name, setName] = useState(job?.name ?? '');
  const [description, setDescription] = useState(job?.description ?? '');
  const [origin, setOrigin] = useState(job?.origin ?? '');
  const [destination, setDestination] = useState(job?.destination ?? '');
  const [cost, setCost] = useState(job?.cost.toString() ?? '');
  const [containers, setContainers] = useState(job?.containers.toString() ?? '');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // Keep the selected worlds and draft values when validation rejects a save.
    startTransition(() => formAction(data));
  }
  return <form action={formAction} onSubmit={submit} className="port-form-layout">
    <div className="port-form-fields"><FormError error={state?.error} /><div className="form-section-title"><span>The consignment</span><small>Contract details</small></div>
      <div><label htmlFor="name" className="field-label">Run name</label><input id="name" name="name" type="text" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="field-input" placeholder="What is this cargo run called?" /></div>
      <div><label htmlFor="description" className="field-label">Cargo details</label><textarea id="description" name="description" rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className="field-input" placeholder="What you’re hauling, and anything the captain should know." /></div>
      <div className="form-section-title"><span>The journey</span><small>Two worlds, one manifest</small></div>
      <div className="form-field-pair"><div><label htmlFor="origin" className="field-label">Origin</label><select id="origin" name="origin" required value={origin} onChange={(event) => setOrigin(event.target.value)} className="field-input"><option value="" disabled>Choose a world</option>{PLANETS.map((planet) => <option key={planet} value={planet}>{planet}</option>)}</select></div><div><label htmlFor="destination" className="field-label">Destination</label><select id="destination" name="destination" required value={destination} onChange={(event) => setDestination(event.target.value)} className="field-input"><option value="" disabled>Choose a world</option>{PLANETS.map((planet) => <option key={planet} value={planet}>{planet}</option>)}</select></div></div>
      <div className="form-field-pair"><div><label htmlFor="cost" className="field-label">Pay in credits</label><input id="cost" name="cost" type="number" required min={0} value={cost} onChange={(event) => setCost(event.target.value)} className="field-input" placeholder="0" /></div><div><label htmlFor="containers" className="field-label">Containers needed</label><input id="containers" name="containers" type="number" required min={1} max={MAX_CONTAINERS} value={containers} onChange={(event) => setContainers(event.target.value)} className="field-input" placeholder={`1–${MAX_CONTAINERS}`} /></div></div>
      <div className="port-form-submit"><button type="submit" disabled={pending} className="btn-primary">{pending ? 'Recording manifest…' : submitLabel}<span aria-hidden="true">↗</span></button><p>{job ? 'Save the changes to this contract.' : 'Your manifest will appear on the cargo board.'}</p></div>
    </div>
    <aside className="manifest-form-preview" aria-label="Live cargo manifest preview"><CargoManifest preview job={{ name, origin, destination, containers, cost: Number(cost) || 0, description }} /></aside>
  </form>;
}
