'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useNow } from '@/lib/use-now';
import type { MapPlanet, MapRoute, RouteFilter } from '@/lib/map-types';
import { arrivalLabel, routeIsVisible, routeProgress } from '@/lib/map-types';
import { PLANET_APPEARANCE } from '@/lib/planet-appearance';
import { TacticalMap } from './tactical-map';
import { PlanetPortrait } from './planet-portrait';
import type { mountGalaxy } from '@/lib/three/galaxy-scene';

type GalaxyController = ReturnType<typeof mountGalaxy>;
function subscribeFullscreen(listener: () => void) {
  document.addEventListener('fullscreenchange', listener);
  return () => document.removeEventListener('fullscreenchange', listener);
}
function supportsFullscreen() { return document.fullscreenEnabled; }
function serverFullscreen() { return false; }

export function GalaxyMap({ planets, routes }: { planets: Array<MapPlanet>; routes: Array<MapRoute> }) {
  const [selection, setSelection] = useState<{ planet: string | null; route: number | null; filter: RouteFilter }>({ planet: null, route: null, filter: 'all' });
  const [view, setView] = useState<'3d' | 'tactical'>('3d');
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLElement>(null);
  const controller = useRef<GalaxyController | null>(null);
  const selectionRef = useRef(selection);
  const unavailable = status === 'unavailable';
  const now = useNow(0);
  const router = useRouter();
  const canExpand = useSyncExternalStore(subscribeFullscreen, supportsFullscreen, serverFullscreen);
  const refreshed = useRef(false);
  const arrived = routes.some((route) => route.active && (route.vessels?.length ? route.vessels.some((vessel) => now >= vessel.progress.arrivesAt) : route.progress && now >= route.progress.arrivesAt));

  const selectWorld = useCallback((name: string) => {
    setSelection((current) => ({ ...current, planet: name || null, route: null, filter: !name && current.filter === 'selected' ? 'all' : current.filter }));
  }, []);
  const selectRoute = useCallback((id: number) => {
    setSelection((current) => ({ ...current, route: id }));
  }, []);

  useEffect(() => {
    if (arrived && !refreshed.current) { refreshed.current = true; router.refresh(); }
    if (!arrived) refreshed.current = false;
  }, [arrived, router]);
  useEffect(() => {
    selectionRef.current = selection;
    controller.current?.select(selection.planet, selection.route, selection.filter);
  }, [selection]);
  useEffect(() => {
    const element = host.current;
    if (!element || view !== '3d' || unavailable) return;
    let cancelled = false;
    let scene: GalaxyController | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      import('@/lib/three/galaxy-scene').then(({ mountGalaxy }) => {
        if (cancelled) return;
        scene = mountGalaxy(element, planets, routes, selectWorld, selectRoute, () => setStatus('unavailable'));
        controller.current = scene;
        const current = selectionRef.current;
        scene.select(current.planet, current.route, current.filter);
        setStatus('ready');
      }).catch(() => { if (!cancelled) setStatus('unavailable'); });
    });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); scene?.dispose(); controller.current = null; };
  }, [planets, routes, view, unavailable, selectWorld, selectRoute]);

  const planet = planets.find((item) => item.name === selection.planet);
  const route = routes.find((item) => item.id === selection.route);
  const appearance = planet ? PLANET_APPEARANCE[planet.name] : undefined;
  const visibleRoutes = routes.filter((item) => routeIsVisible(item, selection.filter, selection.planet));
  const relatedRoutes = planet ? visibleRoutes.filter((item) => item.origin === planet.name || item.destination === planet.name) : visibleRoutes;
  const activeRoutes = routes.filter((item) => item.active);
  const showScene = view === '3d' && !unavailable;
  const title = route?.jobName ?? planet?.name ?? 'Across the galaxy';
  const dockedCount = planet ? planet.ships.length : planets.reduce((total, item) => total + item.ships.length, 0);

  function reset() {
    setSelection({ planet: null, route: null, filter: 'all' });
    setFocused(false);
    controller.current?.reset();
  }
  function fitFleet() { setFocused(false); controller.current?.reset(); }
  function focus() { setFocused(true); controller.current?.focus(); }
  function changeView(next: '3d' | 'tactical') {
    if (next === view && !unavailable) return;
    setView(next); setFocused(false);
    if (next === '3d') setStatus('loading');
  }
  function changeFilter(next: RouteFilter) {
    setSelection((current) => ({ ...current, filter: next, route: route && routeIsVisible(route, next, current.planet) ? route.id : null }));
  }
  async function toggleFullscreen() {
    const element = consoleRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch { /* The embedded view remains usable if the browser denies fullscreen. */ }
  }

  return (
    <section ref={consoleRef} className="galaxy-console" aria-label="Fleet galaxy explorer">
      <div className="scene-toolbar">
        <div className="scene-signal"><span />Fleet atlas<span className="scene-toolbar-count">{activeRoutes.length} in transit</span></div>
        <div className="galaxy-toolbar-actions">
          <div className="scene-segment" aria-label="Map view">
            <button type="button" aria-pressed={showScene} onClick={() => changeView('3d')}>3D galaxy</button>
            <button type="button" aria-pressed={!showScene} onClick={() => changeView('tactical')}>Tactical</button>
          </div>
          {canExpand ? <button type="button" className="map-expand" aria-label="Toggle fullscreen map" title="Fullscreen · Esc to exit" onClick={toggleFullscreen}>⛶</button> : null}
        </div>
      </div>
      <div className="galaxy-layout">
        <div className="galaxy-stage">
          <div className="galaxy-mapbar">
            <div className="galaxy-location"><span>{planets.length} connected worlds</span><small>{planet ? appearance?.region : 'Schematic navigation chart'}</small></div>
            <label className="galaxy-filter">Routes<select aria-label="Filter routes" value={selection.filter} onChange={(event) => changeFilter(event.target.value as RouteFilter)}>
              <option value="all">All routes</option><option value="active">In transit</option><option value="selected" disabled={!planet}>Selected world</option>
            </select></label>
          </div>
          {showScene ? <div ref={host} className="three-host" role="group" aria-label="Interactive 3D galaxy. Select worlds and routes. Drag to orbit, right-drag to pan." /> : null}
          {!showScene || status !== 'ready' ? <TacticalMap planets={planets} routes={visibleRoutes} selected={selection.planet} selectedRoute={selection.route} onSelect={selectWorld} onSelectRoute={selectRoute} /> : null}
          {showScene && status === 'loading' ? <p className="scene-loading" role="status">Opening galaxy view…</p> : null}
          <div className="scene-navigation">
            {showScene && status === 'ready' ? <>
              <button type="button" aria-label="Zoom in" onClick={() => controller.current?.zoom(0.8)}>+</button>
              <button type="button" aria-label="Zoom out" onClick={() => controller.current?.zoom(1.25)}>−</button>
              <button type="button" onClick={fitFleet}>{focused ? 'Back to galaxy' : 'Fit fleet'}</button>
            </> : <button type="button" onClick={reset}>Reset view</button>}
          </div>
          <div className="scene-legend"><span><i className="legend-active" />In transit</span><span><i className="legend-open" />Cargo route</span></div>
          {showScene && status === 'ready' ? <span className="scene-gesture">Drag to orbit · Right-drag to pan</span> : null}
          {selection.filter === 'active' && !visibleRoutes.length ? <p className="map-empty-filter" role="status">No ships in transit. Explore a world or show all routes.</p> : null}
          {status === 'unavailable' ? <p className="scene-fallback-note" role="status">3D is unavailable. Explore using the tactical map.</p> : null}
        </div>
        <aside className="galaxy-readout" aria-label="Planet and route details" data-open={detailsOpen}>
          <button type="button" className="map-sheet-toggle" aria-expanded={detailsOpen} aria-controls="map-details" onClick={() => setDetailsOpen(!detailsOpen)}>
            <span><small>{route ? 'Cargo run' : planet ? 'Selected world' : 'Fleet overview'}</small><strong>{title}</strong></span><span>{detailsOpen ? 'Close −' : 'Details +'}</span>
          </button>
          <div id="map-details" className="map-details">
            <label className="field-label" htmlFor="planet-select">Explore a world</label>
            <select id="planet-select" className="field-input planet-select" value={selection.planet ?? ''} onChange={(event) => selectWorld(event.target.value)}>
              <option value="">Galaxy overview</option>
              {planets.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
            <div className="planet-readout-heading" aria-live="polite">
              {planet && !route ? <PlanetPortrait key={planet.name} name={planet.name} /> : null}
              <p className="map-detail-kicker">{route ? route.active ? 'In transit' : route.completed ? 'Completed run' : 'Available cargo' : appearance?.region ?? 'Fleet overview'}</p>
              <h2>{title}</h2>
              <p className="text-dim text-sm">{route ? `${route.origin} → ${route.destination}` : appearance?.terrain ?? 'Inspect a world or follow a cargo route across the fleet.'}</p>
              {showScene && status === 'ready' && (planet || route) ? <button type="button" className="map-focus" onClick={focus}>{route ? 'Frame route' : 'Focus world'} <span aria-hidden="true">⌖</span></button> : null}
              {route ? <button type="button" className="map-back" onClick={() => setSelection((current) => ({ ...current, route: null }))}>Back to {planet ? planet.name : 'fleet overview'}</button> : null}
            </div>
            {route ? <>
              <div className="map-route-stops">
                <button type="button" onClick={() => selectWorld(route.origin)}><small>Origin</small>{route.origin}</button>
                <span aria-hidden="true">↓</span>
                <button type="button" onClick={() => selectWorld(route.destination)}><small>Destination</small>{route.destination}</button>
              </div>
              {route.containers != null ? <div className="map-cargo"><strong>{route.containers.toLocaleString()}</strong><span>cargo containers</span></div> : null}
              <div className="readout-section">
                <h3>Assigned vessels</h3>
                {route.vessels?.length ? <ul className="map-vessels">{route.vessels.map((vessel) => <li key={vessel.id}>
                  <Link href={`/ships/${vessel.id}`}>{vessel.name} <span aria-hidden="true">↗</span></Link>
                  <span className="map-arrival">{arrivalLabel(vessel.progress.arrivesAt, now)}</span>
                  <JourneyProgress progress={vessel.progress} now={now} label={vessel.name} />
                </li>)}</ul> : <p className="text-dim text-sm">{route.completed ? 'This cargo run has arrived.' : 'No vessel assigned yet.'}</p>}
              </div>
              <Link href={`/jobs/${route.id}`} className="readout-dispatch">Open cargo run <span aria-hidden="true">↗</span></Link>
            </> : <>
              <div className="readout-stats">
                <div><strong>{dockedCount}</strong><span>Ships docked</span></div>
                <div><strong>{relatedRoutes.length}</strong><span>{selection.filter === 'all' ? 'Cargo routes' : 'Matching routes'}</span></div>
              </div>
              {planet ? <div className="readout-section"><h3>In dock</h3>
                {planet.ships.length ? <ul className="docked-list">{planet.ships.map((name) => <li key={name}><span aria-hidden="true">◇</span>{name}</li>)}</ul> : <p className="text-dim text-sm">No ships docked here.</p>}
              </div> : null}
              <div className="readout-section">
                <h3>{planet ? 'Connected runs' : selection.filter === 'active' ? 'In transit' : 'Cargo connections'}</h3>
                {relatedRoutes.length ? <ul className="map-run-list">{relatedRoutes.map((item) => <li key={item.id}>
                  <button type="button" aria-label={`Inspect ${item.jobName}`} aria-pressed={selection.route === item.id} onClick={() => selectRoute(item.id)}>
                    <span className="map-run-name">{item.jobName}</span>
                    <span className="map-run-destination">{item.origin} → {item.destination}</span>
                    <span className={item.active ? 'text-amber' : 'text-dim'}>{item.active ? 'In transit' : item.completed ? 'Completed' : 'Available'}<span aria-hidden="true"> · Inspect route</span></span>
                    {item.active && item.progress ? <JourneyProgress progress={item.progress} now={now} label={item.jobName} /> : null}
                  </button>
                </li>)}</ul> : <p className="text-dim text-sm">{planet ? 'No matching cargo routes for this world.' : 'No routes match this view. Show all routes or open the dispatch board.'}</p>}
              </div>
              <Link href="/assignments" className="readout-dispatch">Open dispatch board <span aria-hidden="true">↗</span></Link>
            </>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function JourneyProgress({ progress, now, label }: { progress: NonNullable<MapRoute['progress']>; now: number; label: string }) {
  const percent = Math.round(routeProgress(progress, now) * 100);
  return <span className="map-run-progress" role="progressbar" aria-label={`${label} journey progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></span>;
}
