import assert from 'node:assert/strict';
import test from 'node:test';
import { cargoState, matchingVessels, type FleetVessel } from '../src/lib/fleet-view';

test('an active assignment takes precedence over completed journeys on the cargo board', () => {
  assert.equal(cargoState([]), 'available');
  assert.equal(cargoState([{ completedAt: new Date(0) }]), 'completed');
  assert.equal(cargoState([{ completedAt: new Date(0) }, { completedAt: null }]), 'transit');
});

test('fleet search combines route destinations and availability without changing registry order', () => {
  const vessels: Array<FleetVessel> = [
    { id: 1, name: 'Wayfarer', imageUrl: null, containers: 40, location: 'Hoth', destination: 'Naboo' },
    { id: 2, name: 'Northern Star', imageUrl: null, containers: 80, location: 'Naboo', destination: null },
  ];
  assert.deepEqual(matchingVessels(vessels, ' NABOO ', 'all').map((vessel) => vessel.id), [1, 2]);
  assert.deepEqual(matchingVessels(vessels, 'Naboo', 'transit').map((vessel) => vessel.id), [1]);
  assert.deepEqual(matchingVessels(vessels, 'Naboo', 'docked').map((vessel) => vessel.id), [2]);
  assert.deepEqual(matchingVessels(vessels, 'wayfarer', 'docked'), []);
  assert.deepEqual(vessels.map((vessel) => vessel.id), [1, 2]);
});
