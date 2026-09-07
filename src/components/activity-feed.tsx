import Link from 'next/link';
import { getRecentActivity } from '@/lib/queries';
import { credits } from '@/lib/format';

function ago(at: number) {
  const seconds = Math.max(Math.floor((Date.now() - at) / 1000), 0);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export async function ActivityFeed() {
  const events = await getRecentActivity();
  return <section className="port-activity"><div className="port-section-heading"><div><p className="port-kicker">The captain’s log</p><h2>Recent movements.</h2></div></div>
    {events.length ? <ol>{events.slice(0, 5).map((event) => <li key={`${event.kind}-${event.shipId}-${event.jobId}-${event.at}`}>
      <span className={`activity-symbol ${event.kind}`} aria-hidden="true">{event.kind === 'departed' ? '↗' : '↓'}</span><div><Link href={`/ships/${event.shipId}`}>{event.shipName}</Link><p>{event.kind === 'departed' ? `Departed ${event.origin} for ${event.destination}` : <>Delivered <Link href={`/jobs/${event.jobId}`}>{event.jobName}</Link> at {event.destination}</>}</p><small>{ago(event.at)}{event.kind === 'delivered' ? ` / +${credits(event.cost)}` : ''}</small></div>
    </li>)}</ol> : <p className="port-log-empty">A quiet dock. The first departure will appear here.</p>}
    <Link href="/assignments" className="port-text-link">Open the dispatch log ↗</Link>
  </section>;
}
