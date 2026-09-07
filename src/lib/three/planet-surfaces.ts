import * as THREE from 'three';

// Sample on a sphere, so terrain, relief, and clouds meet at the texture seam.
export function terrainNoise(x: number, y: number, z: number) {
  function hash(a: number, b: number, c: number) {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const a = THREE.MathUtils.lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), u);
  const b = THREE.MathUtils.lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u);
  const c = THREE.MathUtils.lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u);
  const d = THREE.MathUtils.lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, v), THREE.MathUtils.lerp(c, d, v), w);
}

function terrain(x: number, y: number, z: number) {
  let value = 0, amplitude = 0.55;
  for (let octave = 0; octave < 5; octave++) {
    value += terrainNoise(x, y, z) * amplitude;
    x = x * 2.03 + 11; y = y * 2.03 + 7; z = z * 2.03 + 3;
    amplitude *= 0.48;
  }
  return value;
}

const cache = new Map<string, ReturnType<typeof drawSurfaces>>();

function drawSurfaces(name: string) {
  const width = 512, height = 256;
  const canvases = Array.from({ length: 4 }, () => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    return canvas;
  });
  const contexts = canvases.map((canvas) => canvas.getContext('2d')!);
  const layers = contexts.map((context) => context.createImageData(width, height));
  const seed = Array.from(name).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) * 0.17;
  const verdant = ['Naboo', 'Corellia', 'Endor', 'Kashyyyk'].includes(name);
  const forest = name === 'Endor' || name === 'Kashyyyk';
  const color = new THREE.Color();
  const ocean = new THREE.Color('#143b56'), land = new THREE.Color(forest ? '#526549' : '#688477');
  const ice = new THREE.Color('#d3e6e8'), rock = new THREE.Color('#536d81');
  const sand = new THREE.Color(name === 'Jakku' ? '#c6a078' : '#dfb982'), darkSand = new THREE.Color('#796149');
  for (let row = 0; row < height; row++) {
    const latitude = row / (height - 1) * Math.PI;
    for (let column = 0; column < width; column++) {
      const longitude = column / (width - 1) * Math.PI * 2;
      const x = Math.cos(longitude) * Math.sin(latitude), y = Math.cos(latitude), z = Math.sin(longitude) * Math.sin(latitude);
      const n = terrain(x * 3 + seed, y * 3, z * 3);
      const fine = terrainNoise(x * 90 + seed, y * 90, z * 90);
      const ridge = Math.abs(terrainNoise(x * 16 + seed, y * 16, z * 16) - 0.5) * 2;
      let relief = n, roughness = 0.9, light = 0, cloud = 0;
      if (verdant) {
        const coast = forest ? 0.35 : 0.48;
        const landmass = THREE.MathUtils.smoothstep(n, coast, coast + 0.055);
        color.copy(ocean).lerp(land, landmass).multiplyScalar(0.7 + n * 0.8 + fine * 0.12);
        if (Math.abs(y) > 0.96 + (n - 0.5) * 0.1) color.lerp(ice, 0.85);
        relief = landmass * (0.4 + ridge * 0.5);
        roughness = THREE.MathUtils.lerp(0.22, 0.95, landmass);
        cloud = THREE.MathUtils.smoothstep(terrain(x * 6 + seed + 10, y * 7, z * 6), 0.55, 0.73) * 0.8;
      } else if (name === 'Hoth') {
        color.copy(rock).lerp(ice, THREE.MathUtils.smoothstep(n + ridge * 0.2, 0.34, 0.55));
        color.multiplyScalar(0.88 + fine * 0.2);
        relief = ridge * 0.6 + n * 0.4;
      } else if (name === 'Bespin') {
        const band = Math.sin(latitude * 36 + n * 10 + Math.sin(longitude * 5) * Math.sin(latitude) * 1.2);
        color.copy(darkSand).lerp(sand, 0.54 + band * 0.24).lerp(ice, Math.max(0, band) * 0.32);
        relief = 0.5; roughness = 1;
      } else if (name === 'Coruscant') {
        const district = terrainNoise(x * 38 + seed, y * 38, z * 38);
        const avenue = Math.pow(Math.max(Math.abs(Math.sin(longitude * 156)), Math.abs(Math.sin(latitude * 120))), 64);
        color.set('#636065').multiplyScalar(0.5 + district * 0.6);
        light = avenue * THREE.MathUtils.smoothstep(n, 0.42, 0.6) * fine * fine;
        relief = district; roughness = 0.74;
      } else if (name === 'Kamino') {
        color.copy(ocean).lerp(rock, n * 0.6);
        roughness = 0.2; relief = fine * 0.035;
        cloud = THREE.MathUtils.smoothstep(terrain(x * 5 + seed, y * 6, z * 5), 0.32, 0.66) * 0.95;
      } else {
        const dunes = Math.sin((n * 12 + ridge * 0.6) * 18) * 0.03;
        color.copy(darkSand).lerp(sand, THREE.MathUtils.clamp(n * 1.5 + dunes, 0, 1));
        color.multiplyScalar(0.86 + fine * 0.24);
        relief = n * 0.8 + ridge * 0.2 + dunes;
      }
      color.convertLinearToSRGB();
      const offset = (row * width + column) * 4;
      layers[0].data.set([color.r * 255, color.g * 255, color.b * 255, 255], offset);
      layers[1].data.set([relief * 255, roughness * 255, 0, 255], offset);
      layers[2].data.set([255 * light, 170 * light, 80 * light, 255], offset);
      layers[3].data.set([225, 238, 245, cloud * 255], offset);
    }
  }
  contexts.forEach((context, index) => context.putImageData(layers[index], 0, 0));
  return canvases;
}

export function planetSurfaces(name: string) {
  let surfaces = cache.get(name);
  if (!surfaces) {
    surfaces = drawSurfaces(name);
    cache.set(name, surfaces);
  }
  return surfaces.map((canvas, index) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = index === 1 ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  });
}
