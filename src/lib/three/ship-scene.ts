import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { ShipModel } from '../ship-model';
import { createScene, disposeObject, addRing, addStars } from './scene';
import { createShip } from './ship-geometry';

const assets: Record<ShipModel, string> = {
  destroyer: '/models/star-destroyer-studio.glb',
  falcon: '/models/millennium-falcon-studio.glb',
};

export async function mountShip(host: HTMLElement, model: ShipModel, hologram: boolean, onUnavailable: () => void, signal: AbortSignal) {
  // Retain the final transparent frame while rendering sleeps. Some browser
  // compositors otherwise clear it after the adaptive resolution settles.
  const runtime = createScene(host, onUnavailable, { preserveDrawingBuffer: true });
  const { scene, camera, controls, invalidate } = runtime;
  let source: THREE.Group | undefined;
  try {
    const response = await fetch(assets[model], { signal });
    if (!response.ok) throw new Error('Ship asset unavailable');
    const buffer = await response.arrayBuffer();
    signal.throwIfAborted();
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '/models/');
    source = gltf.scene;
    signal.throwIfAborted();
  } catch (error) {
    if (source) disposeObject(source);
    runtime.dispose();
    throw error;
  }
  const { ship, setHologram, setScan } = createShip(source, model);
  scene.add(ship);
  setHologram(hologram);
  runtime.renderer.toneMappingExposure = 1.05;
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(runtime.renderer);
  const environment = pmrem.fromScene(studio, 0.05);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.2;
  scene.environmentRotation.set(0, 0.7, 0);
  studio.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xcbd9e7, 0x101b32, 0.28));
  const key = new THREE.DirectionalLight(0xffe2bf, 3.6);
  key.position.set(-4, 5, -3);
  key.castShadow = true;
  key.shadow.mapSize.set(3072, 3072);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 25;
  key.shadow.normalBias = 0.004;
  key.shadow.bias = -0.00008;
  runtime.renderer.shadowMap.enabled = true;
  runtime.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // The ship is stationary; orbiting and changing materials do not require
  // rendering its half-million-triangle shadow map again.
  runtime.renderer.shadowMap.autoUpdate = false;
  runtime.renderer.shadowMap.needsUpdate = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7bbcff, 3.2);
  rim.position.set(4, 1.5, 5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xa9c5e0, 0.28);
  fill.position.set(5, 1, -4);
  scene.add(fill);
  addStars(scene, 110);
  const floor = new THREE.Box3().setFromObject(ship).min.y - 0.5;
  const ring = addRing(scene, 3.35, 0x70bdd7, 0.07);
  ring.position.y = floor;
  ring.visible = hologram;
  controls.minDistance = 6;
  controls.maxDistance = 23;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.87;
  controls.rotateSpeed = 0.6;
  const target = new THREE.Vector3(0, model === 'falcon' ? -0.4 : -0.1, 0);
  const finalPosition = new THREE.Vector3();
  const startPosition = new THREE.Vector3();
  let introStart: number | null = null;
  let intro = !runtime.motion.matches;
  let scanStart: number | null = null;
  let scanning = hologram && !runtime.motion.matches;

  function reset() {
    const distance = (model === 'destroyer' ? 8.4 : 9.1) * Math.max(1, 1.35 / camera.aspect);
    // A low three-quarter view exposes the side trench and upper decks together.
    finalPosition.set(0.72, model === 'falcon' ? 0.6 : 0.46, -0.65).normalize().multiplyScalar(distance * 1.08);
    startPosition.copy(finalPosition).multiplyScalar(1.08);
    camera.position.copy(intro ? startPosition : finalPosition);
    controls.target.copy(target);
    invalidate();
  }

  function stopIntro() { intro = false; }
  controls.addEventListener('start', stopIntro);
  runtime.renderListeners.add((time) => {
    if (runtime.motion.matches) { intro = false; scanning = false; setScan(-6); }
    if (intro) {
      introStart ??= time;
      const progress = Math.min((time - introStart) / 1200, 1);
      camera.position.lerpVectors(startPosition, finalPosition, 1 - (1 - progress) ** 3);
      camera.lookAt(target);
      if (progress === 1) intro = false;
    }
    if (scanning) {
      scanStart ??= time;
      const progress = Math.min((time - scanStart) / 1800, 1);
      setScan(-5 + progress * 10);
      if (progress === 1) { scanning = false; setScan(-6); }
    }
    return intro || scanning;
  });
  let lastAspect = camera.aspect;
  runtime.resizeListeners.add(() => {
    if (camera.aspect === lastAspect) return;
    lastAspect = camera.aspect;
    intro = false;
    reset();
  });
  reset();

  // Contact shading gives the layered plating and recessed machinery depth.
  // Multisampling keeps the fine silhouette clean after postprocessing.
  const renderSize = runtime.renderer.getSize(new THREE.Vector2());
  const targetBuffer = new THREE.WebGLRenderTarget(renderSize.x, renderSize.y, {
    type: THREE.HalfFloatType, samples: 4,
  });
  const composer = new EffectComposer(runtime.renderer, targetBuffer);
  composer.addPass(new RenderPass(scene, camera));
  const occlusion = new GTAOPass(scene, camera, renderSize.x, renderSize.y);
  occlusion.updateGtaoMaterial({ radius: 0.3, thickness: 0.8, distanceFallOff: 1, scale: 1, samples: 12 });
  occlusion.blendIntensity = 0.85;
  composer.addPass(occlusion);
  const bloom = new UnrealBloomPass(renderSize, 0.2, 0.25, 1.0);
  // Preserve the transparent stage backdrop when adding the optical glow.
  bloom.blendMaterial.blending = THREE.CustomBlending;
  bloom.blendMaterial.blendSrc = THREE.OneFactor;
  bloom.blendMaterial.blendDst = THREE.OneFactor;
  bloom.blendMaterial.blendSrcAlpha = THREE.ZeroFactor;
  bloom.blendMaterial.blendDstAlpha = THREE.OneFactor;
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  function resizeEffects() { composer.setSize(host.clientWidth, host.clientHeight); }
  runtime.resizeListeners.add(resizeEffects);
  resizeEffects();
  let renderDensity = runtime.renderer.getPixelRatio();
  runtime.draw.current = (moving) => {
    // Refine the resting image at twice CSS resolution; cap total pixels for
    // larger viewports. Interaction stays lighter and rendering still sleeps.
    const pixelBudget = 1_200_000;
    const density = Math.min(moving ? 1.25 : 2, Math.sqrt(pixelBudget / Math.max(host.clientWidth * host.clientHeight, 1)));
    if (Math.abs(density - renderDensity) > 0.01) {
      renderDensity = density;
      runtime.renderer.setPixelRatio(density);
      composer.setPixelRatio(density);
    }
    composer.render();
  };

  function zoom(factor: number) {
    intro = false;
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
    invalidate();
  }

  function rotate() {
    intro = false;
    const offset = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
    camera.position.copy(controls.target).add(offset);
    invalidate();
  }

  function setMode(enabled: boolean) {
    setHologram(enabled);
    ring.visible = enabled;
    bloom.strength = enabled ? 0.38 : 0.2;
    occlusion.blendIntensity = enabled ? 0.65 : 0.85;
    scanning = enabled && !runtime.motion.matches;
    scanStart = null;
    setScan(-6);
    invalidate();
  }
  function dispose() {
    controls.removeEventListener('start', stopIntro);
    for (const pass of composer.passes) pass.dispose();
    // Three r185's GTAOPass.dispose omits these two shader materials.
    occlusion.gtaoMaterial.dispose();
    occlusion.blendMaterial.dispose();
    // The high-pass material is not released by UnrealBloomPass.dispose in r185.
    bloom.materialHighPassFilter.dispose();
    composer.dispose();
    environment.dispose();
    runtime.dispose();
  }
  return { zoom, rotate, reset, setMode, dispose };
}
