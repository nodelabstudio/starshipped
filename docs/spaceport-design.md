# Spaceport art direction

A working independent spaceport: monumental ships, restrained instruments,
readable freight documents. The approved implementation covers the homepage,
fleet, cargo, dispatch, and forms, with shared navigation and detail-page polish.

Palette: graphite #080d12, dock steel #17212a, titanium #89999f,
warm ivory #eee8da, amber #eeb777, navigation cyan #8ccbd7.
Michroma identifies the fleet and major vessels; Saira provides readable body
copy and controls; Share Tech Mono carries registration and numerical data.

Desktop compositions:

    HOME:    [ briefing      |       live ship / hangar atmosphere       ]
             [ available fleet / cargo / operating capacity             ]
             [ next cargo opportunity             | latest movements   ]

    FLEET:   [ large selected vessel / registry            | roster     ]
             [ optional compact gallery / search / availability        ]

    CARGO:   [ ivory open manifest / planet route          | context    ]
             [ active work ] [ compact completed archive               ]

    FORMS:   [ familiar input controls | live registry or manifest      ]

Left-align operational content. Use one dominant composition per screen, keep
navigation and data quiet, and reserve ivory surfaces for freight documents.
Planet destinations, capacity, and availability determine emphasis. Avoid a
repeated card kit and decorative targeting brackets around every photograph.

Keep selection, file previews, dispatch, and validation in the existing React /
server-action architecture. A departure receipt appears only after the existing
server action succeeds. Preserve ownership checks, reduced motion, keyboard
access, and the existing 3D/Tactical and Hull/Hologram/Photo fallbacks.

## Artwork

`public/art/spaceport-hangar.png` was created with the built-in image generation
tool. It is an original environment plate, with no vessel baked into the scene;
the interactive vessel remains a separately lit Three.js model.

Prompt used:

> Use case: stylized-concept. Asset type: cinematic background plate for a sophisticated interactive space-freight website, 3:2 landscape, highest quality. A vast independent orbital spaceport at the edge of the galaxy, viewed from inside a dark immense hangar looking outward through a very wide opening into black space. Only environment, absolutely NO spacecraft, NO people, NO text or symbols. Right two-thirds: distant enormous curved blue-gray planet horizon, thin luminous atmosphere, subtle warm sunlight touching suspended structural beams near upper right; lower right a receding dark titanium docking floor with tiny sparse amber runway lamps, realistic scale and painterly photographic restraint. Left third: extremely dark quiet graphite negative space suitable for ivory headings, almost no visible details. Central area must remain open and calm because a live 3D starship will be composited over it. Sophisticated 1970s science-fiction production design with photoreal film-miniature craftsmanship, subtle film grain, physically convincing metal, gentle atmospheric depth, deep blacks with detail, ivory/amber highlights and slate blue atmosphere, no neon cyberpunk glow. Asymmetrical panoramic composition with monumental scale. No typography, no watermark, no floating UI, no spaceship silhouette.

`public/portraits/` contains static renders from the existing Three.js ship and
planet scenes. Small roster images and manifest destinations therefore share
the appearance of their interactive counterparts without creating additional
WebGL contexts. Ship render source credits and licenses are recorded in
`public/models/credits.txt`, linked from the footer and interactive viewers.

## Verification

- `npm test`: 13 checks covering fleet search/status precedence and the existing
  model geometry, shading inputs, routes, and resource disposal.
- TypeScript, ESLint, and the Next.js production build pass. The build used a
  separate output directory with cleaning disabled; project configuration was
  restored afterward.
- Chromium review of public pages at 320, 390, 768, 1024, and 1440 px: fleet
  search, availability, gallery/selection, photograph fallback, contract archive,
  navigation, detail pages, and image loading.
- Actual form components were exercised in an isolated browser fixture: new and
  edit previews, required fields, file retention after server validation errors,
  dispatch capacity checks, rejected dispatch without a receipt, and successful
  dispatch with receipt/reset/dismissal, including fixed-contract dispatch.
  Signed-in production writes were not exercised.
- Starmap route picking, keyboard access, filtering, focus/framing, fullscreen,
  reduced motion, idle rendering, mobile details, and context-loss fallback pass.
- Ship frame pixels remain present at rest after Rotate, Reset, Hull, Hologram,
  resizing, and fullscreen. Draw calls stop at rest. Photo and context-loss
  fallbacks pass. Review WebGL using viewport captures; full-page browser
  captures can omit the composited canvas even when its pixels remain valid.

The ship renderer retains its last transparent drawing buffer so its composed
image survives idle periods; the existing 1.2-million-pixel rendering budget and
lighter interaction resolution remain in place. Static portraits and optimized
hangar backgrounds keep the surrounding interface free of extra live scenes.
