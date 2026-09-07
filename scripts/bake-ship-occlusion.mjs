import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// Offline utility only. Pass an isolated three-mesh-bvh 0.9.14 CJS build;
// the application does not import or ship this raycasting dependency.
const utility = process.argv[2];
const encoder = process.argv[3];
const suffix = process.argv[4] ?? 'studio';
if (!utility || !encoder || !/^[a-z0-9-]+$/.test(suffix)) {
  throw new Error('Usage: node scripts/bake-ship-occlusion.mjs /path/to/mesh-bvh.cjs /path/to/meshopt_encoder.js [new-output-suffix]');
}
for (const name of ['millennium-falcon', 'star-destroyer']) {
  const output = `public/models/${name}-${suffix}.glb`;
  if (fs.existsSync(output)) throw new Error(`${output} already exists. Choose a new output suffix.`);
}
const { MeshBVH, SAH } = createRequire(import.meta.url)(resolve(utility));
const { MeshoptEncoder } = await import(pathToFileURL(resolve(encoder)).href);
await MeshoptEncoder.ready;
globalThis.ProgressEvent = class {};
const samples = 32;
for (const name of ['millennium-falcon', 'star-destroyer']) {
  const original = fs.readFileSync(`public/models/${name}.glb`);
  const jsonLength = original.readUInt32LE(12);
  const metadata = JSON.parse(original.subarray(20, 20 + jsonLength));
  const binary = original.subarray(28 + jsonLength);
  const working = structuredClone(metadata);
  working.materials = working.materials.map(m => ({ name: m.name }));
  working.buffers[0].uri = 'data:application/octet-stream;base64,' + binary.toString('base64');
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(JSON.stringify(working), '');
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = Math.max(...bounds.getSize(new THREE.Vector3()).toArray());
  const radius = size * .055;
  const epsilon = size * .00005;
  const groups = new Map();
  let vertexTotal = 0;
  const allIndices = [];
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const association = gltf.parser.associations.get(mesh);
    const primitive = metadata.meshes[association.meshes].primitives[association.primitives];
    const key = `${primitive.attributes.POSITION}:${primitive.attributes.NORMAL}:${mesh.matrixWorld.elements.join(',')}`;
    let group = groups.get(key);
    if (!group) {
      const positions = mesh.geometry.attributes.position;
      const normals = mesh.geometry.attributes.normal;
      const worldPositions = new Float32Array(positions.count * 3);
      const worldNormals = new Float32Array(positions.count * 3);
      const point = new THREE.Vector3();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).toArray(worldPositions, i * 3);
        point.fromBufferAttribute(normals, i).applyNormalMatrix(normalMatrix).toArray(worldNormals, i * 3);
      }
      group = { positions: worldPositions, normals: worldNormals, count: positions.count, offset: vertexTotal, primitives: [] };
      groups.set(key, group);
      vertexTotal += positions.count;
    }
    group.primitives.push(primitive);
    for (const index of mesh.geometry.index.array) allIndices.push(index + group.offset);
  });
  const positions = new Float32Array(vertexTotal * 3);
  for (const group of groups.values()) positions.set(group.positions, group.offset * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(allIndices), 1));
  console.log(name, 'building acceleration structure', { vertices: vertexTotal, triangles: allIndices.length / 3, radius });
  const bvh = new MeshBVH(geometry, { strategy: SAH, targetLeafSize: 8 });
  const chunks = [binary];
  let binaryLength = binary.length;
  const point = new THREE.Vector3(), normal = new THREE.Vector3(), tangent = new THREE.Vector3(), bitangent = new THREE.Vector3();
  const ray = new THREE.Ray();
  let completed = 0;
  const start = Date.now();
  for (const group of groups.values()) {
    const cache = new Map();
    const values = new Uint8Array(group.count * 4);
    let sum = 0, minimum = 255;
    for (let i = 0; i < group.count; i++) {
      point.fromArray(group.positions, i * 3);
      normal.fromArray(group.normals, i * 3).normalize();
      const cacheKey = [...point.toArray(), ...normal.toArray()].map(v => Math.round(v * 10000)).join(',');
      let value = cache.get(cacheKey);
      if (value === undefined) {
        tangent.set(Math.abs(normal.y) < .9 ? 0 : 1, Math.abs(normal.y) < .9 ? 1 : 0, 0).cross(normal).normalize();
        bitangent.crossVectors(normal, tangent);
        ray.origin.copy(point).addScaledVector(normal, epsilon);
        let blocked = 0;
        const rotation = ((Math.sin(point.x * 12.98 + point.y * 78.233 + point.z * 37.7) * 43758.5453) % 1) * Math.PI * 2;
        for (let sample = 0; sample < samples; sample++) {
          const r = Math.sqrt((sample + .5) / samples);
          const angle = sample * 2.3999632297 + rotation;
          ray.direction.copy(normal).multiplyScalar(Math.sqrt(1 - r * r))
            .addScaledVector(tangent, Math.cos(angle) * r).addScaledVector(bitangent, Math.sin(angle) * r);
          const hit = bvh.raycastFirst(ray, THREE.DoubleSide, epsilon * .5, radius);
          if (hit) {
            const distance = hit.distance / radius;
            blocked += 1 - distance * distance * (3 - 2 * distance);
          }
        }
        value = Math.round(255 * Math.max(.12, 1 - blocked / samples));
        cache.set(cacheKey, value);
      }
      values[i * 4] = value;
      minimum = Math.min(minimum, value); sum += value;
      completed++;
      if (completed % 100000 === 0) console.log(name, `${completed}/${vertexTotal}`, `${((Date.now() - start) / 1000).toFixed(1)}s`);
    }
    const compressed = Buffer.from(MeshoptEncoder.encodeGltfBuffer(values, group.count, 4, 'ATTRIBUTES'));
    const padding = Buffer.alloc((4 - binaryLength % 4) % 4);
    chunks.push(padding); binaryLength += padding.length;
    const offset = binaryLength;
    chunks.push(compressed); binaryLength += compressed.length;
    const fallback = metadata.buffers.length;
    metadata.buffers.push({byteLength:values.length,extensions:{EXT_meshopt_compression:{fallback:true}}});
    const view = metadata.bufferViews.length;
    metadata.bufferViews.push({buffer:fallback,byteOffset:0,byteLength:values.length,byteStride:4,target:34962,extensions:{EXT_meshopt_compression:{buffer:0,byteOffset:offset,byteLength:compressed.length,byteStride:4,count:group.count,mode:'ATTRIBUTES'}}});
    const accessor = metadata.accessors.length;
    metadata.accessors.push({bufferView:view,byteOffset:0,componentType:5121,normalized:true,count:group.count,type:'SCALAR'});
    for (const primitive of group.primitives) primitive.attributes._OCCLUSION = accessor;
    console.log(name, 'baked group', {count:group.count,unique:cache.size,min:minimum/255,mean:sum/group.count/255,compressed:compressed.length});
  }
  metadata.buffers[0].byteLength = binaryLength;
  metadata.asset.extras.studioBake = {type:'Cosine-weighted vertex ambient occlusion',samples,radius,utility:'three-mesh-bvh 0.9.14',originalGeometryPreserved:true};
  let json = Buffer.from(JSON.stringify(metadata));
  json = Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  let bin = Buffer.concat(chunks);
  bin = Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67,0); header.writeUInt32LE(2,4); header.writeUInt32LE(28+json.length+bin.length,8);
  header.writeUInt32LE(json.length,12); header.writeUInt32LE(0x4e4f534a,16);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  const output=Buffer.concat([header,json,binHeader,bin]);
  fs.writeFileSync(`public/models/${name}-${suffix}.glb`,output);
  console.log(name,'COMPLETE',{bytes:output.length,seconds:(Date.now()-start)/1000});
}
