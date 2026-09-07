'use client';

import { useEffect, useRef, useState } from 'react';
import type { mountPlanetPortrait } from '@/lib/three/planets';

export function PlanetPortrait({ name }: { name: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element || unavailable) return;
    let cancelled = false;
    let scene: ReturnType<typeof mountPlanetPortrait> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      import('@/lib/three/planets').then(({ mountPlanetPortrait }) => {
        if (!cancelled) scene = mountPlanetPortrait(element, name, () => setUnavailable(true));
      }).catch(() => { if (!cancelled) setUnavailable(true); });
    });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); scene?.dispose(); };
  }, [name, unavailable]);
  return unavailable ? null : <div className="planet-portrait" ref={host} aria-hidden="true" />;
}
