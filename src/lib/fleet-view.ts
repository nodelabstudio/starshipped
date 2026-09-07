export type FleetVessel = {
  id: number;
  name: string;
  imageUrl: string | null;
  containers: number;
  location: string;
  destination: string | null;
};

export function matchingVessels(ships: Array<FleetVessel>, query: string, availability: 'all' | 'docked' | 'transit') {
  const search = query.trim().toLocaleLowerCase();
  return ships.filter((ship) => {
    const matches = `${ship.name} ${ship.location} ${ship.destination ?? ''}`.toLocaleLowerCase().includes(search);
    return matches && (availability === 'all' || (availability === 'transit' ? Boolean(ship.destination) : !ship.destination));
  });
}

export function cargoState(assignments: Array<{ completedAt: unknown }>): 'available' | 'transit' | 'completed' {
  if (assignments.some((assignment) => assignment.completedAt === null)) return 'transit';
  return assignments.length ? 'completed' : 'available';
}
