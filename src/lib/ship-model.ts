export type ShipModel = 'destroyer' | 'falcon';

export function shipModelForName(name: string): ShipModel | null {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'imperial star destroyer' || normalized === 'star destroyer') return 'destroyer';
  if (normalized === 'millennium falcon') return 'falcon';
  return null;
}
