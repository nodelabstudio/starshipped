import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipModel } from '../ship-model';

export function addShipDetails(ship: THREE.Group, model: ShipModel) {
  // Fittings use the viewer's normalized coordinates, independent of asset units.
  const details = new THREE.Group();
  details.name = 'Exterior fittings';
  details.scale.setScalar(1 / ship.scale.x);

  if (model === 'falcon') {
    const engine = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 0.085, 80, 1, true, -1.03, 2.06),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.65, 3.4, 5.5), side: THREE.DoubleSide }),
    );
    engine.name = 'Recessed aft engine core';
    engine.position.set(0, -0.15, 1.2);
    details.add(engine);
  } else {
    const hardware: Array<THREE.BufferGeometry> = [];
    const windows: Array<THREE.BufferGeometry> = [];
    const ray = new THREE.Raycaster();
    ship.updateMatrixWorld(true);
    // Seat each battery on the authored deck instead of assuming a flat plane.
    for (const x of [-1.08, 1.08]) {
      for (const z of [1.1, 1.55, 2, 2.45]) {
        ray.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
        const deck = ray.intersectObject(ship, true)[0];
        if (!deck) continue;
        const y = deck.point.y;
        hardware.push(new THREE.CylinderGeometry(0.09, 0.12, 0.07, 16).translate(x, y + 0.025, z));
        for (const offset of [-0.04, 0.04]) {
          hardware.push(new THREE.CylinderGeometry(0.012, 0.018, 0.25, 8)
            .rotateX(Math.PI / 2).translate(x + offset, y + 0.075, z - 0.14));
        }
      }
    }
    hardware.push(new THREE.CylinderGeometry(0.008, 0.018, 0.23, 8).translate(0, 1.01, 3.15));
    hardware.push(new THREE.BoxGeometry(0.16, 0.015, 0.025).translate(0, 1.075, 3.15));
    for (let i = 0; i < 19; i++) {
      windows.push(new THREE.BoxGeometry(0.044, 0.018, 0.009).translate(-0.567 + i * 0.063, 0.79, 2.936));
    }
    const fittings = new THREE.Mesh(mergeGeometries(hardware)!, new THREE.MeshStandardMaterial({ color: 0x949a9c }));
    fittings.name = 'Deck batteries and sensor mast';
    const glass = new THREE.MeshStandardMaterial({
      name: 'Bridge windows', color: 0x14212a, emissive: 0xb5dce8, emissiveIntensity: 0.65,
    });
    const bridge = new THREE.Mesh(mergeGeometries(windows)!, glass);
    bridge.name = 'Recessed bridge viewport band';
    details.add(fittings, bridge);
    for (const geometry of [...hardware, ...windows]) geometry.dispose();
  }

  ship.add(details);
}
