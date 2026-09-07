import * as THREE from 'three';
import { PLANET_APPEARANCE } from '../planet-appearance';
import { planetSurfaces } from './planet-surfaces';
import { createScene } from './scene';

export function createPlanet(name: string) {
  const appearance = PLANET_APPEARANCE[name] ?? PLANET_APPEARANCE.Kamino;
  const [map, surface, emissive, clouds] = planetSurfaces(name);
  const material = new THREE.MeshStandardMaterial({
    map, bumpMap: surface, bumpScale: name === 'Bespin' ? 0 : name === 'Coruscant' ? 0.025 : 0.09,
    roughnessMap: surface, roughness: 1, metalness: name === 'Coruscant' ? 0.22 : 0.02,
    emissiveMap: emissive, emissive: '#ffdfa7', emissiveIntensity: name === 'Coruscant' ? 2 : 0,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vPlanetNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvPlanetNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = 'varying vec3 vPlanetNormal;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0 - smoothstep(-0.18, 0.3, dot(normalize(vPlanetNormal), normalize(vec3(-35.0, 45.0, 20.0))));');
  };
  const planet = new THREE.Mesh(new THREE.SphereGeometry(appearance.radius, 64, 40), material);
  planet.rotation.set(name === 'Bespin' ? -0.85 : 0.1, name.length * 0.43, 0.13);
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(appearance.radius * 1.018, 48, 32),
    new THREE.MeshStandardMaterial({ map: clouds, transparent: true, opacity: 0.85, depthWrite: false, roughness: 1 })));
  planet.add(new THREE.Mesh(
    new THREE.SphereGeometry(appearance.radius * 1.055, 40, 28),
    new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(['Tatooine', 'Jakku', 'Bespin'].includes(name) ? '#d0a67e' : '#85c5e9') } },
      vertexShader: `varying vec3 vNormal; varying vec3 vEye;
        void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal); vEye = normalize(-p.xyz);
          gl_Position = projectionMatrix * p; }`,
      fragmentShader: `uniform vec3 tint; varying vec3 vNormal; varying vec3 vEye;
        void main() { float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vEye))), 3.5);
          gl_FragColor = vec4(tint, rim * 0.28); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  ));
  return planet;
}

export function lightPlanets(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xa9cce3, 0x0a1020, 0.65));
  const sun = new THREE.DirectionalLight(0xffedda, 3.1);
  sun.position.set(-35, 45, 20);
  scene.add(sun);
}

export function mountPlanetPortrait(host: HTMLElement, name: string, onUnavailable: () => void) {
  const runtime = createScene(host, onUnavailable);
  const planet = createPlanet(name);
  runtime.scene.add(planet);
  lightPlanets(runtime.scene);
  runtime.controls.enabled = false;
  const radius = PLANET_APPEARANCE[name]?.radius ?? 1.5;
  function resize() {
    runtime.camera.position.set(0, radius * 0.25, radius * 3.7);
    runtime.camera.lookAt(0, 0, 0);
  }
  runtime.resizeListeners.add(resize);
  resize();
  runtime.invalidate();
  return runtime;
}
