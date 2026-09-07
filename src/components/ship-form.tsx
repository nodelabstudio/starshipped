'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import type { FormState } from '@/lib/actions';
import type { Ship } from '@/db/schema';
import { PLANETS, MIN_CONTAINERS, MAX_CONTAINERS } from '@/lib/planets';
import { registry } from '@/lib/format';
import { FormError } from './form-error';
import { PortMark } from './port-mark';
import { ShipPortrait } from './ship-portrait';
import { WorldMark } from './world-mark';

export function ShipForm({ action, ship, submitLabel }: { action: (previous: FormState, data: FormData) => Promise<FormState>; ship?: Ship; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [name, setName] = useState(ship?.name ?? '');
  const [capacity, setCapacity] = useState(ship?.containers.toString() ?? '');
  const [location, setLocation] = useState(ship?.location ?? '');
  const [preview, setPreview] = useState<string | null>(ship?.imageUrl ?? null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  function imageChanged(event: ChangeEvent<HTMLInputElement>) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const file = event.target.files?.[0];
    objectUrl.current = file ? URL.createObjectURL(file) : null;
    setPreview(objectUrl.current ?? ship?.imageUrl ?? null);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // A validation error must preserve the chosen file as well as its preview.
    // Dispatch outside React's automatic form reset; successful saves redirect.
    startTransition(() => formAction(data));
  }
  return <form action={formAction} onSubmit={submit} className="port-form-layout">
    <div className="port-form-fields"><FormError error={state?.error} /><div className="form-section-title"><span>Vessel identity</span><small>Fleet registration</small></div>
      <div><label htmlFor="name" className="field-label">Ship name</label><input id="name" name="name" type="text" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="field-input" placeholder="Give your vessel a name" /></div>
      <div><label htmlFor="image" className="field-label">Vessel photograph</label><div className="port-file-input"><input id="image" name="image" type="file" accept="image/*" className="field-input" onChange={imageChanged} /><p>{ship?.imageUrl ? 'Choose a new image to replace the current photograph.' : 'Your photograph becomes part of the fleet registry.'}</p></div></div>
      <div className="form-section-title"><span>Operating details</span><small>Ready for a cargo run</small></div>
      <div className="form-field-pair"><div><label htmlFor="containers" className="field-label">Capacity in CTU</label><input id="containers" name="containers" type="number" required min={MIN_CONTAINERS} max={MAX_CONTAINERS} value={capacity} onChange={(event) => setCapacity(event.target.value)} className="field-input" placeholder={`${MIN_CONTAINERS}–${MAX_CONTAINERS}`} /><p className="field-help">One CTU carries one cargo container.</p></div><div><label htmlFor="location" className="field-label">Current location</label><select id="location" name="location" required value={location} onChange={(event) => setLocation(event.target.value)} className="field-input"><option value="" disabled>Choose a world</option>{PLANETS.map((planet) => <option key={planet} value={planet}>{planet}</option>)}</select></div></div>
      <div className="port-form-submit"><button type="submit" disabled={pending} className="btn-primary">{pending ? 'Recording vessel…' : submitLabel}<span aria-hidden="true">↗</span></button><p>{ship ? 'Update this vessel’s registry record.' : 'Your vessel will be ready for its first contract.'}</p></div>
    </div>
    <aside className="registry-preview" aria-label="Live vessel registry preview"><div className="registry-preview-header"><PortMark /><span>Starshipped fleet registry</span><small>{ship ? registry(ship.id) : 'Registration pending'}</small></div>
      {preview ? <div className="registry-preview-photo"><Image src={preview} alt={name || 'Vessel photograph preview'} fill sizes="(max-width: 680px) 90vw, 45vw" unoptimized={preview.startsWith('blob:')} /></div> : <ShipPortrait name={name} src={null} />}
      <div className="registry-preview-body"><p className="port-kicker">Vessel record / Preview</p><h2>{name || 'Your next vessel'}</h2><div className="registry-preview-specs"><div><small>Cargo capacity</small><strong>{capacity || '—'} <span>CTU</span></strong></div><div><WorldMark name={location} /><span><small>Home port</small><strong>{location || 'Not selected'}</strong></span></div></div><div className="registry-preview-seal"><PortMark /><span>{ship ? 'Amendment pending' : 'Awaiting commission'}<small>Recorded when you submit</small></span></div></div>
    </aside>
  </form>;
}
