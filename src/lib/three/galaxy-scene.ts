import * as THREE from 'three';
import type { MapPlanet, MapRoute, RouteFilter } from '../map-types';
import { routeProgress, routeIsVisible } from '../map-types';
import { PLANET_APPEARANCE } from '../planet-appearance';
import { createScene, addRing, addStars } from './scene';
import { createPlanet, lightPlanets } from './planets';

export function planetPosition(planet: Pick<MapPlanet, 'x' | 'y'>) {
  return new THREE.Vector3((planet.x - 500) / 10, 2.6, (planet.y - 300) / 10);
}

export function createRouteCurve(a: THREE.Vector3, b: THREE.Vector3, index: number) {
  const distance = a.distanceTo(b);
  const height = Math.min(5 + distance * 0.16, 15) + Math.floor(index / 2) * 2;
  if (distance < 0.01) {
    return new THREE.CubicBezierCurve3(a, a.clone().add(new THREE.Vector3(7 + index, 8, -5)),
      a.clone().add(new THREE.Vector3(7 + index, 8, 5)), b);
  }
  const mid = a.clone().lerp(b, 0.5);
  const side = new THREE.Vector3(b.z - a.z, 0, a.x - b.x).normalize();
  mid.addScaledVector(side, (index % 2 === 0 ? 1 : -1) * (3 + Math.floor(index / 2) * 3));
  mid.y += height;
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

export function mountGalaxy(host: HTMLElement, planets: Array<MapPlanet>, routes: Array<MapRoute>,
  onSelect: (name: string) => void, onSelectRoute: (id: number) => void, onUnavailable: () => void) {
  const runtime = createScene(host, onUnavailable);
  const { scene, camera, controls, renderer, invalidate } = runtime;
  const labels = document.createElement('div');
  labels.className = 'galaxy-labels';
  const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  leaders.classList.add('galaxy-leaders');
  leaders.setAttribute('aria-hidden', 'true');
  labels.appendChild(leaders);
  const tooltip = document.createElement('div');
  tooltip.className = 'galaxy-tooltip';
  tooltip.hidden = true;
  tooltip.setAttribute('aria-hidden', 'true');
  host.append(labels, tooltip);
  const labelEntries: Array<{ planet: MapPlanet; element: HTMLButtonElement; mesh: THREE.Mesh; leader: SVGLineElement }> = [];
  const routeEntries: Array<{ route: MapRoute; line: THREE.Line; glow: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; points: Array<THREE.Vector3>; markers: Array<{ mesh: THREE.Mesh; progress: MapRoute['progress'] }> }> = [];
  const destinationCamera = new THREE.Vector3();
  const destinationTarget = new THREE.Vector3();
  let transitioning = false;
  let selected: string | null = null;
  let selectedRoute: number | null = null;
  let filter: RouteFilter = 'all';
  let hovered: { planet?: string; route?: number } | null = null;
  let framing: 'overview' | 'focus' | 'free' = 'overview';
  let dragging = false;

  lightPlanets(scene);
  addStars(scene, 220);
  const grid = new THREE.GridHelper(130, 16, 0x244057, 0x1b3043);
  grid.material.transparent = true;
  grid.material.opacity = 0.09;
  scene.add(grid);
  for (const radius of [25, 50]) addRing(scene, radius, 0x6ba5c3, 0.065);
  const selection = addRing(scene, 3.7, 0x7cdfff, 0.8);
  selection.visible = false;
  selection.position.y = 0.16;

  controls.minDistance = 12;
  controls.maxDistance = 250;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.rotateSpeed = 0.45;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.panSpeed = 0.65;
  const byName = new Map(planets.map((planet) => [planet.name, planet]));
  for (const planet of planets) {
    const mesh = createPlanet(planet.name);
    mesh.position.copy(planetPosition(planet));
    mesh.scale.setScalar(1.35);
    mesh.userData.planetName = planet.name;
    scene.add(mesh);
    const orbit = addRing(scene, 3.2, 0x7ba4b8, 0.13);
    orbit.position.set(mesh.position.x, 0.12, mesh.position.z);
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'galaxy-label';
    element.textContent = planet.name;
    element.setAttribute('aria-label', `${planet.name}, ${planet.ships.length} ships docked`);
    element.setAttribute('aria-pressed', 'false');
    element.addEventListener('click', () => onSelect(planet.name));
    element.addEventListener('pointerenter', () => setHover({ planet: planet.name }));
    element.addEventListener('pointerleave', () => setHover(null));
    element.addEventListener('focus', () => setHover({ planet: planet.name }));
    element.addEventListener('blur', () => setHover(null));
    labels.appendChild(element);
    const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leaders.appendChild(leader);
    labelEntries.push({ planet, element, mesh, leader });
  }

  const pairs = new Map<string, number>();
  for (const route of routes) {
    const a = byName.get(route.origin), b = byName.get(route.destination);
    if (!a || !b) continue;
    const key = [a.name, b.name].sort().join('|');
    const index = pairs.get(key) ?? 0;
    pairs.set(key, index + 1);
    const curve = createRouteCurve(planetPosition(a), planetPosition(b), index);
    const points = curve.getPoints(80);
    const material = route.active
      ? new THREE.LineBasicMaterial({ color: 0xffbc70, transparent: true, opacity: 0.8 })
      : new THREE.LineDashedMaterial({ color: 0x7eacc4, transparent: true, opacity: 0.42, dashSize: 0.45, gapSize: 0.35 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    line.computeLineDistances();
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.12, 4, false),
      new THREE.MeshBasicMaterial({ color: route.active ? 0xffbc70 : 0x7cdfff, transparent: true, opacity: 0.1, depthWrite: false }));
    scene.add(line, glow);
    const journeys = route.active ? (route.vessels?.length ? route.vessels.map((vessel) => vessel.progress) : [route.progress]) : [];
    const markers = journeys.map((progress) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.95); shape.lineTo(-0.42, -0.55); shape.lineTo(0, -0.28); shape.lineTo(0.42, -0.55); shape.closePath();
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }),
        new THREE.MeshBasicMaterial({ color: 0xffd3a0 }));
      scene.add(mesh);
      return { mesh, progress };
    });
    routeEntries.push({ route, line, glow, curve, points, markers });
  }

  function refreshStyles() {
    const emphasized = hovered?.route ?? selectedRoute;
    const world = hovered?.planet ?? selected;
    const connection = routes.find((route) => route.id === emphasized);
    for (const { planet, element } of labelEntries) {
      element.setAttribute('aria-pressed', String(planet.name === selected));
      element.dataset.connected = String(Boolean(connection && (connection.origin === planet.name || connection.destination === planet.name)));
    }
    const planet = selected ? byName.get(selected) : undefined;
    selection.visible = Boolean(planet);
    if (planet) { const point = planetPosition(planet); selection.position.set(point.x, 0.16, point.z); }
    for (const { route, line, glow, markers } of routeEntries) {
      const visible = routeIsVisible(route, filter, selected);
      const related = emphasized != null ? route.id === emphasized : !world || route.origin === world || route.destination === world;
      const highlighted = related && (emphasized != null || Boolean(world));
      line.visible = glow.visible = visible;
      (line.material as THREE.LineBasicMaterial).opacity = related ? (highlighted ? 1 : route.active ? 0.8 : 0.43) : 0.09;
      (line.material as THREE.LineBasicMaterial).color.setHex(route.active ? 0xffbc70 : highlighted ? 0x9beaff : 0x7eacc4);
      (glow.material as THREE.MeshBasicMaterial).opacity = related ? (highlighted ? 0.25 : route.active ? 0.09 : 0.025) : 0;
      for (const { mesh } of markers) mesh.visible = visible && related;
    }
    invalidate();
  }

  function setHover(next: typeof hovered) {
    if (hovered?.planet === next?.planet && hovered?.route === next?.route) return;
    hovered = next;
    tooltip.replaceChildren();
    tooltip.hidden = !next;
    if (next) {
      const title = document.createElement('strong');
      const detail = document.createElement('span');
      if (next.planet) {
        const planet = byName.get(next.planet)!;
        title.textContent = planet.name;
        detail.textContent = `${planet.ships.length} docked · ${routes.filter((route) => route.origin === planet.name || route.destination === planet.name).length} connections`;
      } else {
        const route = routes.find((route) => route.id === next.route)!;
        title.textContent = route.jobName;
        detail.textContent = `${route.origin} → ${route.destination}${route.active ? ' · In transit' : ''}`;
      }
      tooltip.append(title, detail);
    }
    renderer.domElement.style.cursor = next ? 'pointer' : 'grab';
    refreshStyles();
  }

  function moveCamera(position: THREE.Vector3, target: THREE.Vector3, immediate = false) {
    destinationCamera.copy(position); destinationTarget.copy(target);
    if (immediate || runtime.motion.matches) {
      camera.position.copy(position); controls.target.copy(target); transitioning = false;
    } else transitioning = true;
    invalidate();
  }

  function frameBounds(bounds: THREE.Box3, immediate = false, worlds?: Array<THREE.Vector3>) {
    const target = bounds.getCenter(new THREE.Vector3());
    const direction = (camera.aspect < 0.85 ? new THREE.Vector3(1, 1.35, 0.12) : new THREE.Vector3(0.08, 1.1, 1)).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const horizontal = tanV * camera.aspect * Math.max(0.55, 1 - 100 / host.clientWidth);
    const vertical = tanV * Math.max(0.45, 1 - 210 / host.clientHeight);
    let distance = 20;
    // Fit the actual distribution of worlds instead of empty corners of the
    // enclosing box. This keeps a portrait viewport from shrinking the atlas.
    const corners: Array<THREE.Vector3> = [];
    if (worlds?.length) {
      for (const world of worlds) for (const x of [-4, 4]) for (const y of [-4, 4]) for (const z of [-4, 4]) corners.push(world.clone().add(new THREE.Vector3(x, y, z)));
    } else {
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
    for (const corner of corners) {
      const offset = corner.sub(target);
      distance = Math.max(distance, Math.abs(offset.dot(right)) / horizontal + offset.dot(direction), Math.abs(offset.dot(up)) / vertical + offset.dot(direction));
    }
    moveCamera(target.clone().addScaledVector(direction, distance), target, immediate);
  }

  function reset(immediate = false) {
    framing = 'overview';
    const bounds = new THREE.Box3().setFromPoints(planets.map(planetPosition)).expandByScalar(4);
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-35, 0, -25), new THREE.Vector3(35, 12, 25));
    frameBounds(bounds, immediate, planets.map(planetPosition));
  }

  function select(name: string | null, routeId: number | null = null, nextFilter: RouteFilter = filter) {
    selected = name; selectedRoute = routeId; filter = nextFilter;
    setHover(null);
    refreshStyles();
  }

  function focus() {
    const route = routeEntries.find((entry) => entry.route.id === selectedRoute);
    const planet = selected ? byName.get(selected) : undefined;
    if (route) {
      framing = 'focus';
      frameBounds(new THREE.Box3().setFromPoints(route.points).expandByScalar(4));
    } else if (planet) {
      framing = 'focus';
      const point = planetPosition(planet);
      frameBounds(new THREE.Box3(point.clone().addScalar(-4.5), point.clone().addScalar(4.5)));
    }
  }

  function zoom(factor: number) {
    framing = 'free'; transitioning = false;
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
    invalidate();
  }

  function stopTransition() { transitioning = false; framing = 'free'; setHover(null); }
  controls.addEventListener('start', stopTransition);
  const pointer = new THREE.Vector2(), pointerStart = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3();
  function screenPosition(point: THREE.Vector3) {
    projected.copy(point).project(camera);
    return { x: (projected.x * 0.5 + 0.5) * host.clientWidth, y: (-projected.y * 0.5 + 0.5) * host.clientHeight, z: projected.z };
  }
  function hitAt(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    pointer.set(x / rect.width * 2 - 1, -(y / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(labelEntries.map((entry) => entry.mesh), false)[0];
    if (hit) return { planet: hit.object.userData.planetName as string };
    let closest = 11;
    let routeId: number | undefined;
    for (const entry of routeEntries) {
      if (!entry.line.visible) continue;
      let previous = screenPosition(entry.points[0]);
      for (const point of entry.points.slice(1)) {
        const next = screenPosition(point);
        if (previous.z >= -1 && previous.z <= 1 && next.z >= -1 && next.z <= 1) {
          const distance = distanceToSegment(x, y, previous, next);
          if (distance < closest) { closest = distance; routeId = entry.route.id; }
        }
        previous = next;
      }
    }
    return routeId == null ? null : { route: routeId };
  }
  function pointerDown(event: PointerEvent) { pointerStart.set(event.clientX, event.clientY); dragging = true; }
  function pointerUp(event: PointerEvent) {
    dragging = false;
    if (pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 6 || event.button !== 0) return;
    const hit = hitAt(event);
    if (hit?.planet) onSelect(hit.planet);
    else if (hit?.route != null) onSelectRoute(hit.route);
  }
  function pointerMove(event: PointerEvent) { if (!dragging && event.pointerType !== 'touch') setHover(hitAt(event)); }
  function pointerLeave() { dragging = false; setHover(null); }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerleave', pointerLeave);
  renderer.domElement.addEventListener('pointercancel', pointerLeave);

  const tangentUp = new THREE.Vector3(0, 1, 0);
  runtime.renderListeners.add(() => {
    if (transitioning) {
      camera.position.lerp(destinationCamera, 0.12); controls.target.lerp(destinationTarget, 0.12);
      if (camera.position.distanceTo(destinationCamera) < 0.03 && controls.target.distanceTo(destinationTarget) < 0.03) transitioning = false;
      camera.lookAt(controls.target);
    }
    camera.updateMatrixWorld();
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
    const discs = labelEntries.map(({ mesh, planet }) => {
      const point = screenPosition(mesh.position);
      const depth = mesh.position.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const radius = ((PLANET_APPEARANCE[planet.name]?.radius ?? 1.5) * 1.35 * host.clientHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(0.1, -depth));
      return { ...point, radius, name: planet.name };
    });
    const ordered = [...labelEntries].sort((a, b) => Number(b.planet.name === selected || b.planet.name === hovered?.planet) - Number(a.planet.name === selected || a.planet.name === hovered?.planet));
    for (const { mesh, element, leader } of ordered) {
      const point = screenPosition(mesh.position);
      const width = element.offsetWidth || 90, height = 32;
      const radius = PLANET_APPEARANCE[mesh.userData.planetName]?.radius ?? 1.5;
      const top = screenPosition(mesh.position.clone().add(new THREE.Vector3(0, radius * 1.35 + 1.3, 0)));
      const disc = discs.find((item) => item.name === mesh.userData.planetName)!;
      let placement: { x: number; y: number; width: number; height: number } | undefined;
      for (const y of [top.y - height, point.y + disc.radius + 6, top.y - height * 2 - 4]) {
        for (const shift of [0, -32, 32, -64, 64]) {
          const candidate = { x: top.x - width / 2 + shift, y, width, height };
          if (candidate.x < 4 || candidate.x + width > host.clientWidth - 4 || candidate.y < 76 || candidate.y + height > host.clientHeight - 90) continue;
          if (discs.some((other) => other.name !== mesh.userData.planetName && other.z > -1 && other.z < 1 && Math.hypot(other.x - THREE.MathUtils.clamp(other.x, candidate.x, candidate.x + width), other.y - THREE.MathUtils.clamp(other.y, candidate.y, candidate.y + height)) < other.radius + 3)) continue;
          if (!occupied.some((other) => candidate.x < other.x + other.width + 3 && candidate.x + width + 3 > other.x && candidate.y < other.y + other.height + 2 && candidate.y + height + 2 > other.y)) { placement = candidate; break; }
        }
        if (placement) break;
      }
      element.hidden = point.z < -1 || point.z > 1 || !placement;
      leader.style.display = 'none';
      if (placement && !element.hidden) {
        occupied.push(placement);
        element.style.transform = `translate(${placement.x}px, ${placement.y}px)`;
        if (Math.abs(placement.x + width / 2 - point.x) > 12 || placement.y > point.y || placement.y < top.y - height - 4) {
          const endX = THREE.MathUtils.clamp(point.x, placement.x + 4, placement.x + width - 4);
          const endY = THREE.MathUtils.clamp(point.y, placement.y + 4, placement.y + height - 4);
          const dx = endX - point.x, dy = endY - point.y;
          const fraction = Math.min(1, (disc.radius + 3) / Math.max(1, Math.hypot(dx, dy)));
          leader.setAttribute('x1', String(point.x + dx * fraction)); leader.setAttribute('y1', String(point.y + dy * fraction));
          leader.setAttribute('x2', String(endX)); leader.setAttribute('y2', String(endY));
          leader.style.display = '';
        }
      }
    }
    if (hovered) {
      const point = hovered.planet ? byName.get(hovered.planet) : undefined;
      const route = routeEntries.find((entry) => entry.route.id === hovered?.route);
      const anchor = point ? planetPosition(point) : route?.curve.getPointAt(0.5);
      if (anchor) {
        const screen = screenPosition(anchor);
        tooltip.style.left = `${THREE.MathUtils.clamp(screen.x - 110, 8, host.clientWidth - 228)}px`;
        tooltip.style.top = `${THREE.MathUtils.clamp(screen.y + 26, 85, host.clientHeight - 170)}px`;
      }
    }
    const now = Date.now();
    for (const { curve, markers } of routeEntries) for (const { mesh, progress } of markers) {
      const fraction = routeProgress(progress, now);
      mesh.position.copy(curve.getPointAt(fraction));
      mesh.quaternion.setFromUnitVectors(tangentUp, curve.getTangentAt(fraction).normalize());
    }
    return transitioning;
  });
  runtime.resizeListeners.add(() => { if (framing === 'overview') reset(true); else if (framing === 'focus') focus(); });
  const timer = routeEntries.some((entry) => entry.markers.length) ? window.setInterval(invalidate, 1000) : undefined;
  reset(true);
  refreshStyles();

  function dispose() {
    window.clearInterval(timer);
    renderer.domElement.removeEventListener('pointerdown', pointerDown);
    renderer.domElement.removeEventListener('pointerup', pointerUp);
    renderer.domElement.removeEventListener('pointermove', pointerMove);
    renderer.domElement.removeEventListener('pointerleave', pointerLeave);
    renderer.domElement.removeEventListener('pointercancel', pointerLeave);
    controls.removeEventListener('start', stopTransition);
    labels.remove(); tooltip.remove();
    runtime.dispose();
  }
  return { select, focus, zoom, reset, dispose };
}

export function distanceToSegment(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared ? THREE.MathUtils.clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSquared, 0, 1) : 0;
  return Math.hypot(x - a.x - dx * fraction, y - a.y - dy * fraction);
}
