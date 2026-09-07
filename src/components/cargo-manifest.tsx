import Link from 'next/link';
import { credits } from '@/lib/format';
import { WorldMark } from './world-mark';
import { PortMark } from './port-mark';

type Manifest = { id?: number; name: string; origin: string; destination: string; containers: number | string; cost: number; description?: string | null };

export function CargoManifest({ job, preview = false, status = 'available', detail = false }: { job: Manifest; preview?: boolean; status?: 'available' | 'transit' | 'completed'; detail?: boolean }) {
  return <article className={`cargo-manifest ${preview ? 'cargo-manifest--preview' : ''}`}>
    <div className="manifest-masthead"><span><PortMark />Starshipped freight</span><span>{preview ? 'Draft manifest' : `Manifest ${String(job.id).padStart(4, '0')}`}</span></div>
    <div className="manifest-heading"><p>{preview ? 'Your cargo record' : status === 'completed' ? 'Contract fulfilled' : status === 'transit' ? 'Cargo in transit' : 'Open for dispatch'}</p><h2>{job.name || 'Untitled cargo run'}</h2></div>
    <div className="manifest-route">
      <div><WorldMark name={job.origin} /><small>Port of origin</small><strong>{job.origin || 'Select origin'}</strong></div>
      <span className="manifest-route-path" aria-hidden="true"><i /><span>→</span><i /></span>
      <div><WorldMark name={job.destination} /><small>Destination</small><strong>{job.destination || 'Select destination'}</strong></div>
    </div>
    {job.description ? <p className="manifest-description">{job.description}</p> : null}
    <div className="manifest-measures"><div><small>Cargo requirement</small><strong>{job.containers || '—'} <span>CTU</span></strong></div><div><small>Contract value</small><strong>{credits(job.cost)}</strong></div></div>
    <div className="manifest-foot"><span className="manifest-barcode" aria-hidden="true" /><span>{preview ? 'Preview · saved when submitted' : 'Independent fleet logistics'}</span>{!preview && !detail ? <Link href={`/jobs/${job.id}`} className="manifest-action">View contract <span aria-hidden="true">↗</span></Link> : null}</div>
  </article>;
}
