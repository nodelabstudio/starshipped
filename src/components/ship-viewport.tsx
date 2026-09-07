'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { shipModelForName, type ShipModel } from '@/lib/ship-model';
import type { mountShip } from '@/lib/three/ship-scene';
import { HoloViewport } from './holo-viewport';

type ShipMode = 'photo' | 'hull' | 'hologram';
const MODE_LABELS = { photo: 'Photo', hull: 'Hull', hologram: 'Hologram' };

type Props = {
  src: string | null;
  name: string;
  containers?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  presentation?: 'instrument' | 'hangar';
  modeOrder?: 'photo-first' | 'hull-first';
};

export function ShipViewport(props: Props) {
  const model = shipModelForName(props.name);
  return model ? <ShipStudy {...props} model={model} /> : <HoloViewport
    src={props.src} alt={props.name} scan="load" priority={props.priority} sizes={props.sizes} className={`${props.className ?? ''} ${props.presentation === 'hangar' ? 'hangar-photograph' : ''}`}
  />;
}

function subscribeFullscreen(listener: () => void) {
  document.addEventListener('fullscreenchange', listener);
  return () => document.removeEventListener('fullscreenchange', listener);
}

function supportsFullscreen() { return document.fullscreenEnabled; }
function serverFullscreen() { return false; }

function ShipStudy({ src, name, model, containers, priority, sizes, className = '', presentation = 'instrument', modeOrder = 'photo-first' }: Props & { model: ShipModel }) {
  const [mode, setMode] = useState<ShipMode>('hull');
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [cargo, setCargo] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const canExpand = useSyncExternalStore(subscribeFullscreen, supportsFullscreen, serverFullscreen);
  const controller = useRef<Awaited<ReturnType<typeof mountShip>> | null>(null);
  const currentMode = useRef(mode);
  const enabled = mode !== 'photo' && status !== 'unavailable';
  const modes: Array<ShipMode> = modeOrder === 'hull-first' ? ['hull', 'hologram', 'photo'] : ['photo', 'hull', 'hologram'];

  useEffect(() => {
    currentMode.current = mode;
    controller.current?.setMode(mode === 'hologram');
  }, [mode]);

  useEffect(() => {
    const element = host.current;
    if (!element || !enabled) return;
    let cancelled = false;
    const abort = new AbortController();
    let scene: Awaited<ReturnType<typeof mountShip>> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      import('@/lib/three/ship-scene').then(async ({ mountShip }) => {
        if (cancelled) return;
        scene = await mountShip(element, model, currentMode.current === 'hologram', () => { if (!cancelled) setStatus('unavailable'); }, abort.signal);
        if (cancelled) { scene.dispose(); return; }
        scene.setMode(currentMode.current === 'hologram');
        controller.current = scene;
        setStatus('ready');
      }).catch(() => { if (!cancelled) setStatus('unavailable'); });
    });
    observer.observe(element);
    return () => {
      cancelled = true;
      abort.abort();
      observer.disconnect();
      scene?.dispose();
      controller.current = null;
    };
  }, [model, enabled]);

  async function toggleFullscreen() {
    const element = viewer.current;
    if (!element) return;
    try {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {
      // The browser may deny fullscreen; the embedded controls remain usable.
    }
  }

  function changeMode(next: typeof mode) {
    if (mode === 'photo' && next !== 'photo') setStatus('loading');
    setMode(next);
    setCargo(false);
  }

  return (
    <div ref={viewer} className={`ship-study ${presentation === 'hangar' ? 'ship-study--hangar' : ''}`}>
      <div className="scene-toolbar ship-toolbar">
        <span className="scene-signal"><span />Ship viewer</span>
        <div className="scene-segment" aria-label="Ship presentation">
          {modes.map((view) => <button
            key={view}
            type="button"
            disabled={view !== 'photo' && status === 'unavailable'}
            aria-pressed={view === 'photo' ? !enabled : mode === view && enabled}
            onClick={() => changeMode(view)}
          >{MODE_LABELS[view]}</button>)}
        </div>
      </div>
      <div className={`ship-stage ${className}`}>
        {!enabled || status !== 'ready' ? <HoloViewport src={src} alt={name} priority={priority} sizes={sizes} className="ship-photograph absolute! inset-0" /> : null}
        {enabled ? <div ref={host} className="three-host" role="img" aria-label={`Interactive 3D model of ${name}. Drag to rotate, or use the viewer buttons.`} /> : null}
        <span className="holo-c holo-c-tl" aria-hidden="true" /><span className="holo-c holo-c-tr" aria-hidden="true" />
        <span className="holo-c holo-c-bl" aria-hidden="true" /><span className="holo-c holo-c-br" aria-hidden="true" />
        {enabled && status === 'loading' ? <p className="scene-loading" role="status">Preparing ship view…</p> : null}
        {enabled && status === 'ready' ? <>
          <span className="ship-study-caption">{mode === 'hologram' ? 'Holographic projection' : 'Hull inspection'}<span>Drag to inspect</span></span>
          {containers !== undefined ? <div className="ship-cargo">
            <button type="button" aria-expanded={cargo} onClick={() => setCargo(!cargo)}><span aria-hidden="true">◇</span> Cargo bay</button>
            {cargo ? <p><strong>{containers} CTU</strong><span>Registered cargo capacity</span></p> : null}
          </div> : null}
          <div className="scene-navigation">
            {canExpand ? <button type="button" aria-label="Toggle fullscreen ship view" title="Fullscreen · Esc to exit" onClick={toggleFullscreen}>⛶</button> : null}
            <button type="button" aria-label="Rotate ship" onClick={() => controller.current?.rotate()}>↻</button>
            <button type="button" aria-label="Zoom in on ship" onClick={() => controller.current?.zoom(0.85)}>+</button>
            <button type="button" aria-label="Zoom out from ship" onClick={() => controller.current?.zoom(1.18)}>−</button>
            <button type="button" onClick={() => controller.current?.reset()}>Reset</button>
          </div>
        </> : null}
        {status === 'unavailable' ? <p className="scene-fallback-note" role="status">3D is unavailable. Showing the ship photo.</p> : null}
      </div>
      <div className="ship-attribution">
        <span>3D model by <a href={model === 'falcon' ? 'https://sketchfab.com/3d-models/millennium-falcon-bd3e54ac20ff4ade8ddd8043db75c1d1' : 'https://sketchfab.com/3d-models/star-destroyer-aaa18e14129a461c839877389bd28504'} target="_blank" rel="noreferrer">{model === 'falcon' ? 'Johnson Martin' : 'rubaun'}</a></span>
        <a href="/models/credits.txt" target="_blank" rel="noreferrer">CC BY 4.0 · adapted</a>
      </div>
    </div>
  );
}
