"use client";

import { useEffect } from "react";

// Neon cursor trail, adapted from Kevin Levron's threejs-toys neonCursor
// (https://codepen.io/soju22/pen/wvyBorP, ISC license). Vendored so the idle
// orbit can track a DOM element, the color stays fixed, and teardown is real.
export function NeonCursor({ orbitSelector }: { orbitSelector: string }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let destroy: (() => void) | undefined;
    let cancelled = false;
    import("three").then((THREE) => {
      if (!cancelled) destroy = init(THREE, orbitSelector);
    });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [orbitSelector]);

  return null;
}

type Three = typeof import("three");

const SHADER_POINTS = 16;
const CURVE_POINTS = 80;
const CURVE_LERP = 0.5;
const RADIUS1 = 5;
const RADIUS2 = 30;
const ORBIT_TIME_COEF = 0.0025;
const ORBIT_FIT = 0.8; // idle orbit radius as a fraction of the target's half-size
const ORBIT_OFFSET_X = -100; // px shift of the orbit center from the target's center
const ORBIT_MARGIN = 16; // px the orbit's edge keeps clear of the viewport edge
const VELOCITY_THRESHOLD = 10;

const FRAGMENT_SHADER = `
  // https://www.shadertoy.com/view/wdy3DD
  // https://www.shadertoy.com/view/MlKcDD
  // Signed distance to a quadratic bezier
  float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;
    float kk = 1.0 / dot(b,b);
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);
    float res = 0.0;
    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
    float h = q*q + 4.0*p3;
    if(h >= 0.0){
      h = sqrt(h);
      vec2 x = (vec2(h, -h) - q) / 2.0;
      vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
      float t = uv.x + uv.y - kx;
      t = clamp( t, 0.0, 1.0 );
      // 1 root
      vec2 qos = d + (c + b*t)*t;
      res = length(qos);
    } else {
      float z = sqrt(-p);
      float v = acos( q/(p*z*2.0) ) / 3.0;
      float m = cos(v);
      float n = sin(v)*1.732050808;
      vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
      t = clamp( t, 0.0, 1.0 );
      // 3 roots
      vec2 qos = d + (c + b*t.x)*t.x;
      float dis = dot(qos,qos);
      res = dis;
      qos = d + (c + b*t.y)*t.y;
      dis = dot(qos,qos);
      res = min(res,dis);
      qos = d + (c + b*t.z)*t.z;
      dis = dot(qos,qos);
      res = min(res,dis);
      res = sqrt( res );
    }
    return res;
  }

  uniform vec2 uRatio;
  uniform vec2 uSize;
  uniform vec2 uPoints[SHADER_POINTS];
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float intensity = 1.0;

    vec2 pos = (vUv - 0.5) * uRatio;

    vec2 c = (uPoints[0] + uPoints[1]) / 2.0;
    vec2 c_prev;
    float dist = 10000.0;
    for(int i = 0; i < SHADER_POINTS - 1; i++){
      c_prev = c;
      c = (uPoints[i] + uPoints[i + 1]) / 2.0;
      dist = min(dist, sdBezier(pos, c_prev, uPoints[i], c));
    }
    dist = max(0.0, dist);

    float glow = pow(uSize.y / dist, intensity);
    vec3 col = vec3(0.0);
    col += 10.0 * vec3(smoothstep(uSize.x, 0.0, dist));
    col += glow * uColor;

    // Tone mapping
    col = 1.0 - exp(-col);
    col = pow(col, vec3(0.4545));

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

function init(THREE: Three, orbitSelector: string): (() => void) | undefined {
  const canvas = document.createElement("canvas");
  canvas.className = "neon-cursor-canvas";
  document.body.appendChild(canvas);

  let renderer: InstanceType<Three["WebGLRenderer"]>;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch {
    canvas.remove();
    return undefined;
  }

  const camera = new THREE.OrthographicCamera();
  const scene = new THREE.Scene();
  const points = Array.from({ length: CURVE_POINTS }, () => new THREE.Vector2());
  const spline = new THREE.SplineCurve(points);
  const uRatio = { value: new THREE.Vector2() };
  const uSize = { value: new THREE.Vector2() };
  const uPoints = {
    value: Array.from({ length: SHADER_POINTS }, () => new THREE.Vector2()),
  };
  const uColor = { value: new THREE.Color(0xff00ff) };
  const velocity = new THREE.Vector3();
  const velocityTarget = new THREE.Vector3();
  let hover = false;
  let width = 0;
  let height = 0;

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    uniforms: { uRatio, uSize, uPoints, uColor },
    defines: { SHADER_POINTS },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  scene.add(new THREE.Mesh(geometry, material));

  // Viewport px -> shader space ([-0.5, 0.5] * uRatio, y up)
  const toShaderX = (px: number) => (px / width - 0.5) * uRatio.value.x;
  const toShaderY = (py: number) => -(py / height - 0.5) * uRatio.value.y;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height);
    uSize.value.set(RADIUS1, RADIUS2);
    if (width >= height) {
      uRatio.value.set(1, height / width);
      uSize.value.multiplyScalar(1 / width);
    } else {
      uRatio.value.set(width / height, 1);
      uSize.value.multiplyScalar(1 / height);
    }
  }

  function onPointerMove(e: PointerEvent) {
    hover = true;
    spline.points[0].set(toShaderX(e.clientX), toShaderY(e.clientY));
    velocityTarget.x = Math.min(
      velocity.x + Math.abs(e.movementX) / VELOCITY_THRESHOLD,
      1,
    );
    velocityTarget.y = Math.min(
      velocity.y + Math.abs(e.movementY) / VELOCITY_THRESHOLD,
      1,
    );
    velocityTarget.z = Math.sqrt(
      velocityTarget.x * velocityTarget.x + velocityTarget.y * velocityTarget.y,
    );
    velocity.lerp(velocityTarget, 0.05);
  }

  function onPointerLeave() {
    hover = false;
  }

  let rafId = 0;
  function animate(timestamp: number) {
    rafId = requestAnimationFrame(animate);
    for (let i = 1; i < CURVE_POINTS; i++) {
      points[i].lerp(points[i - 1], CURVE_LERP);
    }
    for (let i = 0; i < SHADER_POINTS; i++) {
      spline.getPoint(i / (SHADER_POINTS - 1), uPoints.value[i]);
    }
    if (!hover) {
      const t = timestamp * ORBIT_TIME_COEF;
      const target = document.querySelector(orbitSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        const r = (Math.min(rect.width, rect.height) / 2) * ORBIT_FIT;
        const cx = Math.max(
          rect.left + rect.width / 2 + ORBIT_OFFSET_X,
          r + ORBIT_MARGIN,
        );
        spline.points[0].set(
          toShaderX(cx) + (r * uRatio.value.x * Math.cos(t)) / width,
          toShaderY(rect.top + rect.height / 2) +
            (r * uRatio.value.y * Math.sin(t)) / height,
        );
      } else {
        spline.points[0].set(
          (100 * uRatio.value.x * Math.cos(t)) / width,
          (100 * uRatio.value.y * Math.sin(t)) / height,
        );
      }
      uColor.value.r = 0.5 + 0.5 * Math.cos(timestamp * 15e-4);
      uColor.value.g = 0;
      uColor.value.b = 1 - uColor.value.r;
    } else {
      uColor.value.r = velocity.z;
      uColor.value.g = 0;
      uColor.value.b = 1 - velocity.z;
      velocity.multiplyScalar(0.95);
    }
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener("resize", resize);
  document.body.addEventListener("pointermove", onPointerMove);
  document.body.addEventListener("pointerleave", onPointerLeave);
  rafId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    document.body.removeEventListener("pointermove", onPointerMove);
    document.body.removeEventListener("pointerleave", onPointerLeave);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
