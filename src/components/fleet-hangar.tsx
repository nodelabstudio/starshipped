'use client';

import { useEffect, useRef, useState, ViewTransition } from 'react';
import Link from 'next/link';
import { matchingVessels, type FleetVessel } from '@/lib/fleet-view';
import { registry } from '@/lib/format';
import { ShipViewport } from './ship-viewport';
import { ShipPortrait } from './ship-portrait';
import { HangarBackdrop } from './hangar-backdrop';

export function FleetHangar({ ships }: { ships: Array<FleetVessel> }) {
  const [selectedId, setSelectedId] = useState(ships.find((ship) => ship.name === 'Millennium Falcon')?.id ?? ships[0]?.id);
  const [view, setView] = useState<'hangar' | 'gallery'>('hangar');
  const [query, setQuery] = useState('');
  const [availability, setAvailability] = useState<'all' | 'docked' | 'transit'>('all');
  const visible = matchingVessels(ships, query, availability);
  const selected = visible.find((ship) => ship.id === selectedId) ?? visible[0];
  const roster = useRef<HTMLUListElement>(null);
  useEffect(function revealSelectedVessel() {
    const list = roster.current;
    const vessel = list?.querySelector('[aria-pressed="true"]');
    if (!list || !vessel) return;
    const bounds = list.getBoundingClientRect();
    const item = vessel.getBoundingClientRect();
    if (item.bottom > bounds.bottom) list.scrollTop += item.bottom - bounds.bottom;
    else if (item.top < bounds.top) list.scrollTop -= bounds.top - item.top;
  }, [selected?.id, view]);
  return <section className="fleet-explorer" aria-label="Fleet hangar">
    <div className="fleet-tools">
      <label className="fleet-search"><span>Find a vessel</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ships or worlds" /></label>
      <label className="fleet-availability"><span>Availability</span><select value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)}><option value="all">All vessels</option><option value="docked">In dock</option><option value="transit">In transit</option></select></label>
      <div className="spaceport-switch" aria-label="Fleet presentation"><button type="button" aria-pressed={view === 'hangar'} onClick={() => setView('hangar')}>Hangar</button><button type="button" aria-pressed={view === 'gallery'} onClick={() => setView('gallery')}>Gallery</button></div>
    </div>
    {!selected ? <div className="port-empty"><h2>No vessels in this view.</h2><p>Try another name, world, or availability.</p><button className="btn-ghost" type="button" onClick={() => { setQuery(''); setAvailability('all'); }}>Show the fleet</button></div> : view === 'hangar' ? <div className="hangar-layout">
      <div className="hangar-presentation">
        <div className="hangar-scene">
          <HangarBackdrop />
          <span className="hangar-bay">{registry(selected.id)}<span>{selected.destination ? 'Vessel underway' : `In dock / ${selected.location}`}</span></span>
          <ViewTransition key={selected.id} name={`ship-${selected.id}`} share="auto" default="none">
            <ShipViewport key={selected.id} src={selected.imageUrl} name={selected.name} containers={selected.containers} presentation="hangar" className="aspect-[16/10]" priority />
          </ViewTransition>
        </div>
        <div className="hangar-identity" aria-live="polite">
          <div><p className="port-kicker">{selected.destination ? `Bound for ${selected.destination}` : 'Ready for the next run'}</p><h2>{selected.name}</h2></div>
          <div className="hangar-capacity"><strong>{selected.containers}</strong><span>CTU capacity</span></div>
          <Link className="btn-primary" href={`/ships/${selected.id}`} transitionTypes={['warp']}>Inspect vessel <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <div className="hangar-roster"><div className="roster-heading"><span>Fleet registry</span><span>{visible.length} vessels</span></div>
        <ul ref={roster}>{visible.map((ship) => <li key={ship.id}><button type="button" className="roster-vessel" aria-pressed={selected.id === ship.id} onClick={() => setSelectedId(ship.id)}>
          <ShipPortrait name={ship.name} src={ship.imageUrl} /><span className="roster-vessel-copy"><strong>{ship.name}</strong><span>{ship.destination ? `To ${ship.destination}` : ship.location}</span></span><span className={`vessel-status ${ship.destination ? 'is-transit' : ''}`} aria-label={ship.destination ? 'In transit' : 'Docked'} />
        </button></li>)}</ul>
      </div>
    </div> : <div className="fleet-gallery">{visible.map((ship) => <Link key={ship.id} href={`/ships/${ship.id}`} transitionTypes={['warp']} className="gallery-vessel">
      <ViewTransition name={`ship-${ship.id}`} share="auto" default="none"><ShipPortrait name={ship.name} src={ship.imageUrl} /></ViewTransition>
      <div className="gallery-vessel-heading"><h2>{ship.name}</h2><span>{registry(ship.id)}</span></div><p>{ship.destination ? `In transit to ${ship.destination}` : `Docked at ${ship.location}`}<span>{ship.containers} CTU</span></p>
    </Link>)}</div>}
  </section>;
}
