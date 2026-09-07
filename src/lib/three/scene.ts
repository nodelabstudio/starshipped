import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Both viewers own their renderer and resources. Rendering sleeps when the
// scene settles, leaves the viewport, or the browser tab becomes hidden.
export function createScene(host: HTMLElement, onUnavailable: () => void, options: { preserveDrawingBuffer?: boolean } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, ...options });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x05080f, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  // Scrolling the page stays available until the viewer is explicitly engaged.
  controls.enableZoom = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const renderListeners = new Set<(time: number) => boolean | void>();
  const resizeListeners = new Set<() => void>();
  const draw: { current: (moving: boolean) => void } = { current: () => renderer.render(scene, camera) };
  let frame = 0;
  let visible = true;
  let disposed = false;

  function render(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    let moving = controls.update();
    for (const listener of renderListeners) moving = Boolean(listener(time)) || moving;
    draw.current(moving);
    if (moving) invalidate();
  }

  function invalidate() {
    if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(render);
  }

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    // Hidden panels can briefly report zero dimensions. Keep the last valid
    // projection until the observer sees the visible viewport again.
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    for (const listener of resizeListeners) listener();
    invalidate();
  }

  function motionChanged() {
    controls.enableDamping = !motion.matches;
    invalidate();
  }

  function contextLost(event: Event) {
    event.preventDefault();
    onUnavailable();
  }

  const observer = new ResizeObserver(resize);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
  });
  observer.observe(host);
  visibility.observe(host);
  controls.addEventListener('change', invalidate);
  document.addEventListener('visibilitychange', invalidate);
  motion.addEventListener('change', motionChanged);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  motionChanged();
  resize();

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    visibility.disconnect();
    document.removeEventListener('visibilitychange', invalidate);
    motion.removeEventListener('change', motionChanged);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    controls.dispose();
    disposeObject(scene);
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { scene, camera, renderer, controls, motion, renderListeners, resizeListeners, draw, invalidate, dispose };
}

export function addStars(scene: THREE.Scene, count = 500) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = Math.sin(i * 127.1) * 130;
    positions[i * 3 + 1] = 8 + ((i * 71) % 85);
    positions[i * 3 + 2] = Math.cos(i * 311.7) * 110;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0x9fbed8, size: 0.19, transparent: true, opacity: 0.65, sizeAttenuation: true,
  })));
}

export function addRing(scene: THREE.Object3D, radius: number, color: number, opacity: number) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.045, 100),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  return ring;
}

// Also used when an asset finishes decoding after its viewer was unmounted.
export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight || object instanceof THREE.PointLight) {
      object.shadow?.dispose();
    }
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    }
  });
  const bitmaps = new Set<ImageBitmap>();
  for (const texture of textures) {
    if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) bitmaps.add(texture.source.data);
    texture.dispose();
  }
  bitmaps.forEach((bitmap) => bitmap.close());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
