export type MapPlanet = { name: string; x: number; y: number; ships: Array<string> };
export type MapRoute = {
  id: number;
  jobName: string;
  origin: string;
  destination: string;
  active: boolean;
  containers?: number;
  completed?: boolean;
  vessels?: Array<{ id: number; name: string; progress: { departsAt: number; arrivesAt: number } }>;
  progress?: { departsAt: number; arrivesAt: number };
};

export type RouteFilter = 'all' | 'active' | 'selected';

export function routeIsVisible(route: MapRoute, filter: RouteFilter, selected: string | null) {
  if (filter === 'active') return route.active;
  if (filter === 'selected') return Boolean(selected && (route.origin === selected || route.destination === selected));
  return true;
}

export function arrivalLabel(arrivesAt: number, now: number) {
  if (!now) return 'Calculating arrival…';
  const seconds = Math.max(0, Math.ceil((arrivesAt - now) / 1000));
  if (!seconds) return 'Arriving';
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s remaining`;
}

export function routeProgress(progress: MapRoute['progress'], now: number) {
  if (!progress) return 0;
  return Math.min(Math.max((now - progress.departsAt) / Math.max(progress.arrivesAt - progress.departsAt, 1), 0), 1);
}
