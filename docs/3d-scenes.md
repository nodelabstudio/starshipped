# Galaxy and ship scenes

The viewers use the existing Three.js dependency. Scene modules load when their
viewport becomes visible. The surrounding controls and readouts are React/HTML.

- `src/components/galaxy-map.tsx` owns selection, the route readout, and arrival refreshes.
- Worlds and routes select without moving the camera. Focus world, Frame route,
  Fit fleet, zoom, right-drag panning, and fullscreen provide explicit navigation.
  All routes / In transit / Selected world filters apply to both map modes.
- `src/lib/three/planet-surfaces.ts` builds deterministic 512×256 spherical terrain,
  packed relief/roughness, city-light, and transparent cloud textures. Generated
  canvases are cached for the ten worlds; each viewer owns its GPU textures.
  `planets.ts` shades ocean highlights, terrain relief, a separate cloud shell,
  atmospheric rims, and Coruscant's night-side lights. Selected-world portraits
  use the same surface and lighting in a small renderer that sleeps when idle.
- `src/lib/three/galaxy-scene.ts` renders planets and routes. Display depth is
  separate from the original travel-time calculation in `src/lib/starmap.ts`.
  Route picking uses an 11 CSS-pixel distance to projected segments, independent
  of zoom. Labels avoid other labels and planetary silhouettes; displaced labels
  have leader lines. Portrait camera framing fits the actual world distribution.
- `src/components/tactical-map.tsx` is the selectable SVG overview and WebGL fallback.
  Both routes and worlds support keyboard selection. The HTML route list also
  provides access to every filtered connection. Mobile details use a collapsible
  sheet; the map remains visible above it.
- Map data includes every currently assigned vessel and its own journey timestamps,
  cargo count, and completed-run state. Moving markers and arrival readouts follow
  those clocks. In-transit ships are excluded from docked counts. The map changes
  no dispatch behavior or travel-time calculations.
- `src/components/ship-viewport.tsx` provides hull, hologram, and photo modes.
- `public/models/` contains artist-authored Falcon and Star Destroyer GLBs with
  embedded geometry/textures. Credits, source revisions, and CC BY 4.0 licenses
  are in `public/models/credits.txt`, also linked below each viewer.
- `src/lib/three/ship-scene.ts` loads models with the existing Three.js GLTFLoader
  and MeshoptDecoder. The studio Falcon retains 575,233 triangles in a 7.4 MB compressed
  model; the textured studio Destroyer is 1.2 MB. There are no runtime third-party asset
  requests. Fetching is aborted on unmount, and late-decoded models are disposed.
- The `*-studio.glb` variants add 32-sample, cosine-weighted ambient occlusion
  baked against the original geometry. `_OCCLUSION` is a normalized per-vertex
  attribute; all original geometry and texture bytes are retained. Original GLBs
  remain available as source assets. The browser does no raycasting for the bake.
- `src/lib/three/ship-geometry.ts` centers and normalizes the authored geometry and
  upgrades the authored materials to physical paint, bare metal, and glass.
  All source texture bindings are preserved. `ship-surface.ts` adds object-space weathering,
  roughness variation, and edge wear to the hull, with filtered fine detail to
  avoid subpixel shimmer. Cockpit and bridge glass retain their clean finish.
  Hologram mode uses the same solid, depth-tested
  surfaces with a cyan lighting response, highlighted bevels and normal-map details,
  filtered scan lines, and a brief scan sweep.
  It does not expose the triangulation or make the back faces show through.
- `ship-details.ts` fits the Falcon's luminous engine core inside its aft slot
  and adds deck batteries, bridge windows, and a sensor mast to the Destroyer.
  Battery heights come from raycasts against the original deck. Added fittings
  are merged by material to keep the number of draw calls small.
- Directional shadows and GTAO contact shading reveal recesses and plating.
  A locally generated PMREM lighting environment adds soft reflections, and
  thresholded bloom softens the engine light and brightest hologram edges.
  Baked shading modulates indirect light and the holographic recesses.
  Environment, bloom, and ambient-occlusion resources are released on unmount.
  Shadow maps render once per mount; postprocessing uses multisampled targets.
  Reduced-motion mode disables the entrance and scan animations.
- `src/lib/ship-model.ts` maps the known ship names to those models. Other names
  retain their own photographs. Renaming a supported ship can remove its 3D view.
- `src/lib/three/scene.ts` owns rendering, visibility, reduced motion, and resource cleanup.

The renderer sleeps when idle or offscreen. Active route positions update once
per second from departure/arrival timestamps. The map caps pixel density at 1.5.
Ship interaction uses up to 1.25; resting views refine to 2, with a 1.2-million
pixel budget. Fullscreen inspection is available when the browser supports it.
Users can select planets with the keyboard or dropdown and operate ship controls
with buttons. Context loss returns to the tactical map or photograph.
Zero-size measurements from hidden panels preserve the last valid camera projection.

Run `npm test` for route progress, filters, picking distances, terrain continuity,
overlapping routes, same-world loops, model
selection, authored-model decoding, solid hull/hologram materials, and shared-resource cleanup. Run `npm run lint` and
`npm run build` for application checks (Next.js requires Node 20.9 or newer).

## Reproducing the ambient-occlusion assets

Use Node 24 and an isolated `three-mesh-bvh` 0.9.14 installation. The bake script
also uses the installed `three` and an isolated `meshoptimizer` encoder (1.1.1
for these assets); the encoder is not an application import. Run from the repository
root, supplying both utility paths and a fresh output suffix:

```sh
node scripts/bake-ship-occlusion.mjs /path/to/three-mesh-bvh/build/index.umd.cjs /path/to/meshoptimizer/meshopt_encoder.js studio-v2
```

The script refuses to overwrite existing models. Point `ship-scene.ts` at the
new variants only after inspecting them and checking their decode and size.
