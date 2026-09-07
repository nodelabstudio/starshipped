'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { createAssignment, type FormState } from '@/lib/actions';
import { travelMs } from '@/lib/starmap';
import { FormError } from './form-error';
import { ShipPortrait } from './ship-portrait';
import { WorldMark } from './world-mark';

type DispatchShip = { id: number; name: string; containers: number; imageUrl?: string | null; location?: string };
type DispatchJob = { id: number; name: string; containers: number; origin: string; destination: string };

export function AssignForm({ ships, jobs, fixedJobId }: { ships: Array<DispatchShip>; jobs: Array<DispatchJob>; fixedJobId?: number }) {
  const [shipId, setShipId] = useState('');
  const [jobId, setJobId] = useState(fixedJobId?.toString() ?? '');
  const ship = ships.find((item) => item.id === Number(shipId));
  const job = jobs.find((item) => item.id === Number(jobId));
  const tooSmall = Boolean(ship && job && ship.containers < job.containers);
  const [state, formAction, pending] = useActionState<FormState, FormData>(async function dispatch(previous, data) {
    const departingShip = ships.find((item) => item.id === Number(data.get('shipId')));
    const departingJob = jobs.find((item) => item.id === Number(data.get('jobId')));
    const result = await createAssignment(previous, data);
    if (!result && departingShip && departingJob) {
      window.dispatchEvent(new CustomEvent('starshipped:departed', { detail: { ship: departingShip.name, destination: departingJob.destination, jobId: departingJob.id } }));
      setShipId('');
      if (!fixedJobId) setJobId('');
    }
    return result;
  }, null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // Only a confirmed departure clears the user's selections.
    startTransition(() => formAction(data));
  }
  return <form action={formAction} onSubmit={submit} className="dispatch-composer">
    <div className="dispatch-inputs"><p className="port-kicker">Prepare a departure</p><h2>A vessel. A route.<br />A reason to go.</h2><FormError error={state?.error} />
      <div><label htmlFor="shipId" className="field-label">Choose a vessel</label><select id="shipId" name="shipId" required value={shipId} onChange={(event) => setShipId(event.target.value)} className="field-input"><option value="" disabled>Select a docked ship</option>{ships.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.containers} CTU</option>)}</select></div>
      {fixedJobId ? <input type="hidden" name="jobId" value={fixedJobId} /> : <div><label htmlFor="jobId" className="field-label">Choose a cargo contract</label><select id="jobId" name="jobId" required value={jobId} onChange={(event) => setJobId(event.target.value)} className="field-input"><option value="" disabled>Select an open contract</option>{jobs.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.containers} CTU</option>)}</select></div>}
      <div className="dispatch-fit" aria-live="polite">{ship && job ? <><span>{tooSmall ? 'A larger vessel is needed' : 'Cargo fits aboard'}</span><strong>{job.containers} / {ship.containers} CTU</strong><meter min={0} max={Math.max(ship.containers, job.containers)} value={job.containers} aria-label="Cargo requirement against selected vessel capacity" /><small>{tooSmall ? `Choose a vessel with at least ${job.containers} CTU.` : `${ship.containers - job.containers} CTU remains available aboard.`}</small></> : <p>Select a vessel and contract to check capacity and preview the journey.</p>}</div>
      <button type="submit" disabled={pending || !ship || !job || tooSmall} className="btn-primary">{pending ? 'Confirming departure…' : 'Confirm dispatch'}<span aria-hidden="true">↗</span></button>
    </div>
    <div className="dispatch-preview" aria-label="Departure preview">
      {ship ? <ShipPortrait name={ship.name} src={ship.imageUrl ?? null} /> : <div className="dispatch-preview-empty"><span className="dock-outline" aria-hidden="true" /><p>Your vessel will appear here.</p></div>}
      <div className="dispatch-preview-name"><small>{ship ? 'Selected vessel' : 'Awaiting a vessel'}</small><strong>{ship?.name ?? 'The next departure'}</strong></div>
      <div className="dispatch-preview-route"><div><WorldMark name={job?.origin ?? ''} /><small>Origin</small><strong>{job?.origin ?? '—'}</strong></div><span className="departure-path" key={job?.id} aria-hidden="true">→</span><div><WorldMark name={job?.destination ?? ''} /><small>Destination</small><strong>{job?.destination ?? '—'}</strong></div></div>
      <p className="dispatch-preview-time">{job ? `Estimated flight / ${Math.round(travelMs(job.origin, job.destination) / 60_000)} minutes` : 'Choose cargo to preview its route.'}</p>
    </div>
  </form>;
}
