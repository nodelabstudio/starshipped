import * as THREE from 'three';
import type { ShipModel } from '../ship-model';
import { applyShipSurface } from './ship-surface';
import { addShipDetails } from './ship-details';

// Both presentations share the authored geometry, including recesses and the
// underside. Holography changes the surface response, never the mesh topology.
export function createShip(source: THREE.Group, model: ShipModel) {
  const ship = new THREE.Group();
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 8.2 / Math.max(size.x, size.y, size.z);
  source.position.sub(bounds.getCenter(new THREE.Vector3()));
  ship.add(source);
  ship.scale.setScalar(scale);
  addShipDetails(ship, model);

  const hologram = { value: 0 };
  const scan = { value: -6 };
  const materials = new Set<THREE.MeshPhysicalMaterial>();
  const upgraded = new Map<THREE.MeshStandardMaterial, THREE.MeshPhysicalMaterial>();

  function physicalMaterial(original: THREE.Material) {
    if (!(original instanceof THREE.MeshStandardMaterial)) return original;
    const existing = upgraded.get(original);
    if (existing) return existing;
    const material = new THREE.MeshPhysicalMaterial();
    // Copy the full standard PBR state, including the authored texture maps.
    THREE.MeshStandardMaterial.prototype.copy.call(material, original);
    material.defines = { ...material.defines, PHYSICAL: '' };
    upgraded.set(original, material);
    original.dispose();
    return material;
  }
  ship.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material) ? object.material.map(physicalMaterial) : physicalMaterial(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof THREE.MeshPhysicalMaterial) || materials.has(material)) continue;
      materials.add(material);
      material.wireframe = false;
      const glass = material.name === 'Bridge windows' || (model === 'falcon' && material.name === 'material_Material.006');
      material.metalness = glass ? 0.05 : 0.16;
      material.clearcoat = glass ? 1 : 0.16;
      material.clearcoatRoughness = glass ? 0.09 : 0.38;
      material.ior = 1.5;
      material.roughness = glass ? 0.12 : model === 'falcon' ? 0.62 : 0.56;
      if (model === 'falcon') {
        material.color.set(0xaaa79e);
        if (material.name === 'material_Material.006') {
          material.color.set(0x0b1720);
        } else if (material.name === 'material_Material.005') {
          material.color.set(0x303834);
          material.metalness = 0.7;
          material.roughness = 0.42;
          material.clearcoat = 0;
        } else if (material.name === 'material_Material.007') {
          material.color.set(0x74362f);
          material.roughness = 0.68;
          material.clearcoat = 0.07;
        }
      }
      if (material.emissiveMap) material.emissiveIntensity = 1.3;
      if (object.geometry.hasAttribute('_occlusion')) material.defines = { ...material.defines, SHIP_BAKED_OCCLUSION: 1 };
      applyShipSurface(material, hologram, scan, glass ? 0 : model === 'falcon' ? 1 : 0.55);
    }
  });

  function setHologram(enabled: boolean) { hologram.value = enabled ? 1 : 0; }
  function setScan(position: number) { scan.value = position; }
  return { ship, setHologram, setScan };
}
