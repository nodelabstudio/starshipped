import * as THREE from 'three';

const surfaceFunctions = /* glsl */`
  uniform float uHologram;
  uniform float uScan;
  uniform float uWear;
  varying vec3 vShipPosition;
  #ifdef SHIP_BAKED_OCCLUSION
    varying float vShipOcclusion;
  #endif

  float shipHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float shipNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(shipHash(i), shipHash(i + vec3(1, 0, 0)), f.x),
          mix(shipHash(i + vec3(0, 1, 0)), shipHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(shipHash(i + vec3(0, 0, 1)), shipHash(i + vec3(1, 0, 1)), f.x),
          mix(shipHash(i + vec3(0, 1, 1)), shipHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

const surfaceFinish = /* glsl */`
  float bakedOcclusion = 1.0;
  #ifdef SHIP_BAKED_OCCLUSION
    bakedOcclusion = pow(clamp(vShipOcclusion, 0.12, 1.0), 0.65);
  #endif
  // Signed normal variation distinguishes exposed edges from recessed seams.
  vec3 dpdx = dFdx(-vViewPosition);
  vec3 dpdy = dFdy(-vViewPosition);
  float curvature = (dot(dFdx(nonPerturbedNormal), dpdx) + dot(dFdy(nonPerturbedNormal), dpdy))
    / max(dot(dpdx, dpdx) + dot(dpdy, dpdy), 0.000001);
  float exposedEdge = smoothstep(0.4, 5.0, curvature);
  float recess = smoothstep(0.4, 5.0, -curvature);
  float etchedDetail = smoothstep(0.1, 0.4, length(fwidth(normal)));

  if (uHologram < 0.5 && uWear > 0.0) {
    float patina = shipNoise(vShipPosition * 3.8);
    float grain = shipNoise(vShipPosition * 95.0);
    // Fade subpixel grain instead of letting it sparkle while orbiting.
    float grainVisibility = 1.0 - smoothstep(0.35, 1.2, length(fwidth(vShipPosition * 95.0)));
    float streaks = shipNoise(vShipPosition * vec3(42.0, 18.0, 3.0));
    float dirt = (1.0 - patina) * 0.14 + (1.0 - streaks) * 0.1 + (1.0 - bakedOcclusion) * 0.24;
    diffuseColor.rgb *= 1.0 - uWear * (dirt + recess * 0.28);
    diffuseColor.rgb *= 1.0 + (grain - 0.5) * grainVisibility * 0.1 * uWear;
    float chippedPaint = exposedEdge * smoothstep(0.42, 0.75, grain) * uWear;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.43, 0.45, 0.44), chippedPaint * 0.38);
    vec3 grainTangent = cross(dpdy, normal);
    vec3 grainBitangent = cross(normal, dpdx);
    float surfaceArea = dot(dpdx, grainTangent);
    vec3 grainSlope = sign(surfaceArea) * (dFdx(grain) * grainTangent + dFdy(grain) * grainBitangent);
    normal = normalize(max(abs(surfaceArea), 0.000001) * normal - grainSlope * 0.0005 * grainVisibility * uWear);
    roughnessFactor = clamp(roughnessFactor + (patina - 0.5) * 0.18 - chippedPaint * 0.18, 0.25, 0.95);
  }
`;

const hologramFinish = /* glsl */`
  if (uHologram > 0.5) {
    float luminance = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
    float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.4);
    float scanCoordinate = vShipPosition.y * 95.0;
    float scanWidth = max(fwidth(scanCoordinate), 0.001);
    float scanLine = 1.0 - smoothstep(0.1, 0.1 + scanWidth, abs(fract(scanCoordinate) - 0.5));
    scanLine *= 1.0 - smoothstep(0.45, 1.0, scanWidth);
    float sweep = exp(-pow((vShipPosition.z - uScan) * 10.0, 2.0));
    float surfaceLight = pow(clamp(luminance * 0.95, 0.0, 1.0), 0.85);
    outgoingLight = mix(vec3(0.003, 0.012, 0.065), vec3(0.03, 0.34, 0.58), surfaceLight);
    outgoingLight *= (1.0 - scanLine * 0.18) * (1.0 - recess * 0.32) * mix(0.4, 1.0, bakedOcclusion);
    // The bright signal follows real bevels and normal-map detail, never triangles.
    outgoingLight += vec3(0.3, 1.5, 2.2) * (rim * 0.7 + exposedEdge * 0.24 + etchedDetail * 0.07);
    outgoingLight += vec3(0.45, 1.7, 2.1) * sweep * 0.7;
  }
`;

export function applyShipSurface(
  material: THREE.MeshStandardMaterial,
  hologram: { value: number },
  scan: { value: number },
  wear: number,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHologram = hologram;
    shader.uniforms.uScan = scan;
    shader.uniforms.uWear = { value: wear };
    shader.vertexShader = `varying vec3 vShipPosition;
      #ifdef SHIP_BAKED_OCCLUSION
        attribute float _occlusion;
        varying float vShipOcclusion;
      #endif
      ${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
        vShipPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        #ifdef SHIP_BAKED_OCCLUSION
          vShipOcclusion = _occlusion;
        #endif`,
    );
    shader.fragmentShader = `${surfaceFunctions}\n${shader.fragmentShader}`
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${surfaceFinish}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.indirectDiffuse *= bakedOcclusion;
        reflectedLight.indirectSpecular *= mix(0.4, 1.0, bakedOcclusion);
      `)
      .replace('#include <opaque_fragment>', `${hologramFinish}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'starshipped-studio-surface-v3';
}
