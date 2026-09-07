import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeObject } from '../src/lib/three/scene';
import { arrivalLabel, routeIsVisible, routeProgress } from '../src/lib/map-types';
import { shipModelForName } from '../src/lib/ship-model';
import { createRouteCurve, distanceToSegment, planetPosition } from '../src/lib/three/galaxy-scene';
import { terrainNoise } from '../src/lib/three/planet-surfaces';
import { createShip } from '../src/lib/three/ship-geometry';

test('route markers use the departure clock and clamp before departure and after arrival', () => {
  const trip = { departsAt: 1000, arrivesAt: 2000 };
  assert.equal(routeProgress(trip, 500), 0);
  assert.equal(routeProgress(trip, 1500), 0.5);
  assert.equal(routeProgress(trip, 2500), 1);
  assert.equal(routeProgress(undefined, 1500), 0);
  assert.equal(routeProgress({ departsAt: 1000, arrivesAt: 1000 }, 1000), 0);
  assert.equal(routeProgress({ departsAt: 1000, arrivesAt: 1000 }, 1001), 1);
});

test('3D routes preserve map endpoints and separate connections sharing a planet pair', () => {
  const start = planetPosition({ x: 500, y: 280 });
  const end = planetPosition({ x: 810, y: 320 });
  const first = createRouteCurve(start, end, 0);
  const second = createRouteCurve(start, end, 1);
  const third = createRouteCurve(start, end, 2);
  assert.ok(first.getPoint(0).equals(start));
  assert.ok(first.getPoint(1).equals(end));
  assert.ok(first.getPoint(0.5).y > start.y);
  assert.ok(first.getPoint(0.5).distanceTo(second.getPoint(0.5)) > 1);
  assert.ok(first.getPoint(0.5).distanceTo(third.getPoint(0.5)) > 1);
});

test('a run returning to its origin has a finite loop and direction at both ends', () => {
  const origin = planetPosition({ x: 350, y: 390 });
  const curve = createRouteCurve(origin, origin, 0);
  assert.ok(curve.getLength() > 1);
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    assert.ok(curve.getPointAt(fraction).toArray().every(Number.isFinite));
    assert.ok(curve.getTangentAt(fraction).toArray().every(Number.isFinite));
  }
});

test('route filters retain both incoming and outgoing connections without inventing traffic', () => {
  const route = { id: 1, jobName: 'Ice shipment', origin: 'Hoth', destination: 'Naboo', active: false };
  assert.equal(routeIsVisible(route, 'all', null), true);
  assert.equal(routeIsVisible(route, 'active', 'Hoth'), false);
  assert.equal(routeIsVisible({ ...route, active: true }, 'active', null), true);
  assert.equal(routeIsVisible(route, 'selected', 'Hoth'), true);
  assert.equal(routeIsVisible(route, 'selected', 'Naboo'), true);
  assert.equal(routeIsVisible(route, 'selected', 'Jakku'), false);
  assert.equal(routeIsVisible(route, 'selected', null), false);
  assert.equal(arrivalLabel(121_500, 1000), '2m 01s remaining');
  assert.equal(arrivalLabel(1000, 2000), 'Arriving');
  assert.equal(arrivalLabel(1000, 0), 'Calculating arrival…');
});

test('route picking measures screen pixels and handles endpoints and collapsed segments', () => {
  assert.equal(distanceToSegment(50, 8, { x: 0, y: 0 }, { x: 100, y: 0 }), 8);
  assert.equal(distanceToSegment(-3, 4, { x: 0, y: 0 }, { x: 100, y: 0 }), 5);
  assert.equal(distanceToSegment(103, 4, { x: 0, y: 0 }, { x: 100, y: 0 }), 5);
  assert.equal(distanceToSegment(3, 4, { x: 0, y: 0 }, { x: 0, y: 0 }), 5);
});

test('terrain remains bounded and continuous across the longitude seam and noise lattice', () => {
  for (const longitude of [0, 0.5, 1, 2, Math.PI, Math.PI * 2]) {
    const sample = terrainNoise(Math.cos(longitude) * 3 + 17, 0.4, Math.sin(longitude) * 3);
    assert.ok(sample >= 0 && sample <= 1);
  }
  assert.ok(Math.abs(terrainNoise(20, 0.4, 0) - terrainNoise(20, 0.4, Math.sin(Math.PI * 2) * 3)) < 1e-10);
  assert.ok(Math.abs(terrainNoise(1 - 1e-6, 0.4, 0.7) - terrainNoise(1 + 1e-6, 0.4, 0.7)) < 1e-5);
});

test('unsupported ships keep their own photograph instead of receiving an unrelated model', () => {
  assert.equal(shipModelForName(' Millennium Falcon '), 'falcon');
  assert.equal(shipModelForName('Imperial Star Destroyer'), 'destroyer');
  assert.equal(shipModelForName('Ghost'), null);
  assert.equal(shipModelForName('My custom freighter'), null);
});

for (const [model, filename, minimumTriangles] of [
  ['falcon', 'millennium-falcon', 500_000],
  ['destroyer', 'star-destroyer', 6_000],
] as const) {
  test(`${model} decodes its authored geometry and preserves solid surfaces in both modes`, async () => {
    const file = await readFile(new URL(`../public/models/${filename}-studio.glb`, import.meta.url));
    assert.ok(file.byteLength < 8 * 1024 * 1024, 'Compressed model exceeds the download budget');
    const jsonLength = file.readUInt32LE(12);
    const metadata = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
    assert.equal(metadata.asset.version, '2.0');
    assert.equal(metadata.asset.extras.studioBake.samples, 32);
    const original = await readFile(new URL(`../public/models/${filename}.glb`, import.meta.url));
    const originalBinary = original.subarray(28 + original.readUInt32LE(12));
    assert.ok(file.subarray(28 + jsonLength, 28 + jsonLength + originalBinary.length).equals(originalBinary), 'Baking must preserve the authored geometry and textures');
    assert.ok(metadata.asset.extras.license.includes('4.0'));
    for (const buffer of metadata.buffers) assert.equal(buffer.uri, undefined, 'Models must be self-contained');
    for (const image of metadata.images ?? []) assert.equal(image.uri, undefined);

    // Decode the real compressed geometry. Browser checks exercise the embedded
    // image textures; Node has no ImageBitmap implementation.
    metadata.materials = metadata.materials.map((material: { name: string }) => ({ name: material.name }));
    const json = Buffer.from(JSON.stringify(metadata));
    const paddedJson = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
    const binaryChunk = file.subarray(20 + jsonLength);
    const header = Buffer.alloc(20);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(20 + paddedJson.length + binaryChunk.length, 8);
    header.writeUInt32LE(paddedJson.length, 12);
    header.writeUInt32LE(0x4e4f534a, 16);
    const input = Uint8Array.from(Buffer.concat([header, paddedJson, binaryChunk]));
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(input.buffer, '');
    let minimumOcclusion = 1;
    let maximumOcclusion = 0;
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const occlusion = object.geometry.getAttribute('_occlusion');
      assert.ok(occlusion, 'Every authored mesh must carry the baked shading');
      assert.equal(occlusion.count, object.geometry.getAttribute('position').count);
      for (let i = 0; i < occlusion.count; i++) {
        const value = occlusion.getX(i);
        assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
        minimumOcclusion = Math.min(minimumOcclusion, value);
        maximumOcclusion = Math.max(maximumOcclusion, value);
      }
    });
    assert.ok(minimumOcclusion < 0.4 && maximumOcclusion > 0.95, 'Shading must distinguish recesses from exposed surfaces');
    const { ship, setHologram } = createShip(gltf.scene, model);
    const bounds = new THREE.Box3().setFromObject(ship);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.toArray().every(Number.isFinite));
    assert.ok(Math.abs(Math.max(size.x, size.y, size.z) - 8.2) < 0.001);
    assert.ok(size.y > 1, 'The ship must retain its hull thickness and superstructure');
    assert.ok(bounds.getCenter(new THREE.Vector3()).length() < 0.001);
    let triangles = 0;
    const materials = new Map<THREE.MeshStandardMaterial, number>();
    ship.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      triangles += object.geometry.index.count / 3;
      if (object.material instanceof THREE.MeshStandardMaterial) materials.set(object.material, object.material.color.getHex());
    });
    assert.ok(triangles >= minimumTriangles, 'Detailed authored geometry was replaced or lost');
    assert.ok(materials.size > 1);
    for (const enabled of [true, false, true, false]) {
      setHologram(enabled);
      for (const [material, color] of materials) {
        assert.equal(material.wireframe, false);
        assert.equal(material.depthWrite, true);
        assert.equal(material.color.getHex(), color);
        assert.equal(material.opacity, 1);
      }
    }
    disposeObject(ship);
  });
}

test('abandoned models release shared geometry, materials, and textures only once', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughnessMap: texture });
  const disposed = { geometry: 0, texture: 0, material: 0 };
  geometry.addEventListener('dispose', () => disposed.geometry++);
  texture.addEventListener('dispose', () => disposed.texture++);
  material.addEventListener('dispose', () => disposed.material++);
  root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  disposeObject(root);
  assert.deepEqual(disposed, { geometry: 1, texture: 1, material: 1 });
});

test('physical material upgrades preserve authored texture bindings and shared materials', () => {
  const source = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    map: new THREE.Texture(), normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture(),
    metalnessMap: new THREE.Texture(), emissiveMap: new THREE.Texture(), side: THREE.DoubleSide,
  });
  material.normalScale.set(0.6, 0.7);
  const first = new THREE.Mesh(new THREE.BoxGeometry(), material);
  const second = new THREE.Mesh(new THREE.BoxGeometry(), material);
  second.position.x = 2;
  source.add(first, second);
  const { ship } = createShip(source, 'destroyer');
  assert.ok(first.material instanceof THREE.MeshPhysicalMaterial);
  assert.equal(first.material, second.material);
  for (const slot of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'] as const) {
    assert.equal(first.material[slot], material[slot]);
  }
  assert.ok(first.material.normalScale.equals(material.normalScale));
  assert.equal(first.material.side, THREE.DoubleSide);
  disposeObject(ship);
});
