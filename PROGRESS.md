# PROGRESS — Alexa+ Twin Redesign

_Last updated: 2026-06-18T00:30Z by main session_

## How to resume
Read this file top-to-bottom, then open the plan at
`~/.claude/plans/this-is-the-prompt-iterative-ember.md`. Pick the first task whose
status is TODO / IN_PROGRESS and continue. Run the verification for any DONE goal you're
unsure about. All work happens in this **frontend** repo (`Arman-Saini/Alexa2Frontend`,
branch `feature/alexa-plus-india-v2`). Do NOT touch the backend repo.

## Current focus
G1, G3, G5, G6, G7, G8 DONE + floorplan/furniture fix DONE. Camera locked to isometric,
prototype elements (room orbs, floor labels) removed, creepy auto-voice removed.
NEXT (G9 remaining): premium furnishing per rebuild spec — better/consistent assets
(current = Kenney CC0 low-poly; UE5-archviz quality needs sourced assets, risky tonight),
door/curtain animations, optional SSAO. Furniture already alive (fans spin, TV/lights glow,
dog/vacuum/cat animate). Decide with user whether to invest in asset sourcing vs ship current.

## Environment / commands
- dev: `cd frontend && npm run dev`   ·   test: `npm test`   ·   build: `npm run build`
- branch: `feature/alexa-plus-india-v2` (frontend repo)
- reference image: `../image.png` (dark cutaway dollhouse, glowing blue room orbs)

## Goal status
| Goal | Status | Owner/Subagent | Notes |
|------|--------|----------------|-------|
| G0 Progress file        | DONE        | main | this file |
| G1 Command reliability  | DONE        | main | live path → processCommand; +choreography +confirm glow; 10 resolver bugs fixed; tests pass |
| G5 Natural voice (free) | DONE        | main | utils/voice.ts: Google en-IN TTS + browser fallback; removed creepy auto-voice (no auto-play scenario) |
| G6 Easter eggs          | DONE        | main | voxel German Shepherd + robot vacuum + sleeping cat (room-gated, decor only) |
| G7 Persona moments      | DONE        | main | Dadi→Grandparent, emojis removed, scenarios filtered per persona + persona-specific narration |
| G8 Demo CTA             | DONE        | main | onboarding chips run real commands (zoom+animate+voice) |
| G9 Premium rebuild      | PARTIAL     | main | removed orbs/labels, locked iso camera, brighter interior; REMAINING: premium assets, door/curtain anim, SSAO |
| G2 Asset pipeline       | TODO        | —    | CC0 GLBs (Kenney/Quaternius), fallback-safe |
| G3 Twin visual redesign | IN_PROGRESS | main | cinematic base DONE (dark mood, ACES, bloom/vignette, room orbs, HDRI, dark walls/floor/ground, no PCF warn, build+tsc pass). PENDING per user feedback: better assets (sofa/TV cabinet matching theme), positioning, building+room layout redesign |
| G5 Natural voice (free) | TODO        | —    | replace robotic TTS; user wants natural + free |
| G4 Polish & cleanup     | TODO        | —    | dead UI, dark palette, security notes |

## Task log (newest first)
- [2026-06-18T09:00Z] ENVIRONMENT REBUILD per design spec: backend→DuckDNS; cleared old
  furniture (Step 1); NEW 13×10 floor plan (constants/layout.ts + DEFAULT_ROOMS: 6 rooms incl
  hallway, 1u=1m) + camera retune + ORBIT RE-ENABLED (§3, reverses earlier lock); sourced
  Quaternius Ultimate Interior pack (82 CC0 GLBs, public/models/quaternius/); new
  RoomFurniture.tsx places furniture per room (L-sofa/bed/bathtub/toilet/fridge/oven/shelves/
  plants/rugs); re-added smart DEVICES as placedObjects per room (commands work); repositioned
  doors/curtains/easter-eggs + per-room pendant lights for the new plan; removed old HouseDecor.
  Quaternius models render upright (Y-up, no rotation fix). 85 tests pass; tsc + build clean.
  ⚠️ VERIFY LIVE: confirm furniture scale/placement per room in a real browser (headless GL is
  dark/flaky); fine-tune positions in RoomFurniture.tsx. Remaining polish: AC on/off indicator,
  window meshes (curtains exist), per-room furniture nudges.
- [2026-06-18T02:37Z] G4 done (all goals complete): deleted unused digital-twin-backup/ (16
  files); added useBackendOnline hook → Seed/Mine buttons disabled offline + App Store offline
  notice (no dead buttons in local demo); SECURITY_NOTES.md added. Also committed the
  postprocessing/n8ao deps that were uncommitted since G3 (build dependency). 85 tests pass.
  NOTE: src/constants/defaults.ts + src/store/store.ts have the USER's own uncommitted edits
  (extra sofas etc.) — left untouched; alexa-back/ deletion left as-is.
- [2026-06-18T02:30Z] G9 push: added SSAO (N8AO) for archviz depth; animated DOORS
  (swing open/closed driven by smart-lock — "unlock the door" is visible) + fixed 2 door
  positions for the new floorplan; animated CURTAINS (open when room bright, close when
  dim/off); integrated PREMIUM furniture via asset-scout-2 — premium_sofa/bed/tvconsole/
  dining/plant (CMHT Oculus CC-BY + Quaternius CC0), repointed GLBFurniture, kitchen uses
  dressed dining set, living room plain coffee table; added CREDITS.md + footer attribution.
  tsc + build clean; GLBs load with no page errors.
  ⚠️ VERIFY LIVE: headless GL (swiftshader) crashes on the heavier scene (SSAO normal pass +
  29k-tri dining), so confirm premium furniture ORIENTATION/SCALE in a real browser; some
  pieces may need a per-asset rotation/targetSize tweak in GLBFurniture.tsx.
- [2026-06-18T00:30Z] Big iteration per user feedback: (1) VOICE — natural free TTS
  (Google en-IN) + removed creepy auto-play voice so Alexa only speaks on user action;
  (2) removed glowing room orbs + on-floor labels; (3) locked camera to isometric (no free
  orbit/pan); (4) added onboarding CTA chips that run real commands; (5) floorplan fix —
  bathroom resized, bedroom widened, all furniture repositioned in-bounds (+bounds test);
  (6) easter eggs — voxel German Shepherd + robot vacuum + cat; (7) persona — Dadi→Grandparent,
  emojis removed, per-persona scenario filtering + narration. tsc + tests clean.
  REMAINING (G9): premium asset sourcing (Kenney low-poly is the visual ceiling for free
  CC0), door/curtain animations, optional SSAO.
- [2026-06-17T17:35Z] G3 cinematic base done: DigitalTwinCanvas (shadows="soft", ACES tone
  mapping, EffectComposer Bloom+Vignette, HDRI Environment at 0.28, dark bg/fog); new
  RoomOrbs.tsx (glowing blue Alexa orb per room, brightens when active/recently-actuated);
  SceneLighting dark night default; RoomMesh darker floor palettes + roughness 0.9;
  House GroundPlane dark plinth + faint tech grid; ConnectedWalls warm dark taupe.
  Verified: no PCFSoftShadowMap warning, build + tsc clean, Playwright screenshot looks dark/cinematic.
  asset-scout subagent delivered CC0 HDRI public/hdri/interior_2k.hdr (Poly Haven, CC0).
  USER FEEDBACK (new): lighting good; assets+positioning iffy → want better sofa/TV-cabinet
  matching theme; redesign building + room layout; voice too robotic → want natural + free.
- [2026-06-17T16:55Z] G1 done. store.ts: added recentlyChangedIds + setRecentlyChanged +
  runLocalCommand; executeVoiceCommand now delegates to processCommand (old weak matcher
  deleted). AlexaAppSimView.tsx: both call sites now local-first hybrid. PlacedObjectMesh.tsx:
  confirm-glow ring on recentlyChanged devices. Fixed 10 real resolver bugs in
  commandProcessor.ts (normalize strip of "can you"; global all-lights swallowing room
  light cmds; all-fans swallowing speed words; room brightness without "light"; TV
  volume/channel/mute without "tv" word; duplicate lock updates in good-night/away;
  Hinglish "chalao"). Added src/test/store.command.test.ts. 82/82 tests pass; tsc -b clean.
- [2026-06-17T16:48Z] G0 done: created PROGRESS.md. Starting G1.

## Decisions & assets
- Twin visuals: elevate existing R3F scene (dark mood + post-fx + room orbs) AND swap
  in better CC0 GLB furniture; smart devices stay procedural but get restyled.
- Data path: hybrid, local-first — `processCommand` handles known commands; backend
  (`sendMockText`) only handles unmatched long-tail when `useBackend` is on.
- Sequencing: reliability (G1) first; G3 must look good with current meshes BEFORE
  asset swap-in so the demo always ships.
- Asset sources (to fill in as downloaded): Kenney Furniture Kit (CC0), Quaternius (CC0),
  Poly Haven HDRI (CC0). | <source URL | license | local path>
- [2026-06-17 asset-scout] Added CC0 interior HDRI for soft reflections + ambient:
  - local path: `public/hdri/interior_2k.hdr`
  - source URL: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/brown_photostudio_02_2k.hdr
    (Poly Haven, slug `brown_photostudio_02`)
  - license: CC0 (Poly Haven)
  - file size: 6,492,863 bytes (~6.2 MB); magic `#?RADIANCE` (valid)
  - WIRING: in the R3F scene use drei `<Environment files="/hdri/interior_2k.hdr" />`.
    For the dark cinematic look keep it LOW — `<Environment files="/hdri/interior_2k.hdr"
    environmentIntensity={0.25} background={false} />` (or set scene `environmentIntensity`
    ~0.2-0.3). `background={false}` keeps the deep-navy backdrop / glowing room orbs
    dominant; the HDRI only feeds soft PBR reflections on hero props (GlamVelvetSofa,
    ChairDamask) without washing out the mood.
  - NO new GLB props added: attempted Poly Haven model props (potted_plant_04 etc.), but
    Poly Haven serves no single-file GLBs and the multi-file gltf textures 404 over direct
    curl; per task rules ("if unsure, skip") left existing CC0 Kenney furniture untouched.
    HDRI was the priority and is in place.

- [2026-06-18 asset-scout-2] Premium warm-modern hero furniture set sourced from Poly Pizza.
  Style anchor: chose a SINGLE coherent author (CMHT Oculus) for 4 of 5 hero pieces so the
  set reads as one collection — all are untextured multi-material PBR (no image textures),
  matte (metallic 0, roughness ~0.9), sharing a recurring warm palette: walnut wood
  baseColor [0.34,0.13,0.04], cream/linen [0.8,0.77,0.65] & [0.98,0.92,0.74], neutral
  grey-beige [0.52,0.48,0.43]. Meaningfully higher poly than the Kenney set (3k–29k tris
  vs Kenney's few-hundred) while staying tiny on disk. Plant + floor lamp come from
  Quaternius (CC0) — also untextured solid-color matte PBR, so they blend with the same
  flat-PBR look. Shipped UNCOMPRESSED originals (all <1MB) rather than the draco-optimized
  copies: optimize succeeded (e.g. dining 701KB→25KB) but draco sets extensionsRequired=
  KHR_draco_mesh_compression, which would break a plain drei `useGLTF` unless a DRACOLoader
  is wired. Originals load with zero extra setup. Validated every file: magic glTF
  (676c5446), sizes 10KB–701KB.
  All Poly Pizza direct GLB URLs are `https://static.poly.pizza/<uuid>.glb` (no login).

  ATTRIBUTION REQUIRED (CC-BY 3.0) for the 4 CMHT Oculus pieces — credit "CMHT Oculus"
  (poly.pizza) somewhere in the demo (about/credits). Quaternius pieces are CC0 (no
  attribution required).

  | role | local path | source page | author | license | bytes |
  |------|-----------|-------------|--------|---------|-------|
  | Sofa (modern "Cinema" sofa, walnut+dark) | `public/models/furniture/premium_sofa.glb` | https://poly.pizza/m/aFwNuRNmcO5 | CMHT Oculus | CC-BY 3.0 | 103,088 |
  | Bed (queen, cream/linen + walnut) | `public/models/furniture/premium_bed.glb` | https://poly.pizza/m/8qxEypin78N | CMHT Oculus | CC-BY 3.0 | 211,132 |
  | TV console / media unit (walnut + dark screen) | `public/models/furniture/premium_tvconsole.glb` | https://poly.pizza/m/aukWXD-AwKu | CMHT Oculus | CC-BY 3.0 | 95,460 |
  | Dining table (dressed set: table+candles+plates+bowl, 29k tris — hero piece) | `public/models/furniture/premium_dining.glb` | https://poly.pizza/m/9vaShH-8h_Q | CMHT Oculus | CC-BY 3.0 | 701,124 |
  | Indoor plant (green houseplant in pot) | `public/models/furniture/premium_plant.glb` | https://poly.pizza/m/bfLOqIV5uP | Quaternius | CC0 1.0 | 16,636 |
  | Floor lamp (neutral grey/metal, ~1.6m) | `public/models/furniture/premium_floorlamp.glb` | https://poly.pizza/m/eBQtooeh43 | Quaternius | CC0 1.0 | 10,112 |

  WIRING (GLBFurniture.tsx — repoint url + set targetSize; models are scale-normalized by
  the loader so native units don't matter, targetSize is the desired largest-dim in world/
  scene units, matching how existing GlamVelvetSofa/ChairDamask are sized):
  - premium_sofa.glb       → GLBSofa url, targetSize ~2.0 (3-seat sofa). Native bbox W72×H36×D36 (cm-ish), wider-than-tall, faces +X.
  - premium_bed.glb        → bed/GLBBed url, targetSize ~2.0 (queen). Native W72×H31×D83 (longer in depth = head-to-foot).
  - premium_tvconsole.glb  → TV cabinet/console url, targetSize ~1.8 (low media unit). Native W68×H22×D22 (long & low).
  - premium_dining.glb     → dining table url, targetSize ~1.6–2.0. Native W52×H39×D94 (rectangular, long axis = depth); comes pre-dressed (centerpiece candles/plates) so no extra props needed.
  - premium_plant.glb      → plant/pottedPlant url, targetSize ~1.0–1.2 (floor plant, ~1.2m tall native, already in meters).
  - premium_floorlamp.glb  → floor-lamp url, targetSize ~1.6 (~1.6m tall native, already in meters). BONUS piece; can drop if the lamp role isn't wanted.

- [2026-06-18 asset-scout-3] COHESIVE FURNITURE SET — Quaternius **Ultimate House Interior
  Pack** (the whole pack, one consistent low-poly flat-PBR style), all CC0 1.0. 82 GLB models
  in `public/models/quaternius/`. Total 1.8 MB. This is the deliverable for room layout.
  - SOURCE: pack page https://quaternius.com/packs/ultimatehomeinterior.html (CC0). The
    quaternius.com download is a Google-Drive folder (id 1SNK9PwPi8xqqxmpU5xEZeiQjB26C1oX6,
    FBX/OBJ/Blend — no direct GLB zip, Drive folders don't curl cleanly). Used the poly.pizza
    mirror of the SAME pack instead, which serves per-model GLBs over plain HTTPS, no login:
    bundle https://poly.pizza/bundle/Ultimate-House-Interior-Pack-2SXnFbwFzm — each model's
    GLB is `https://static.poly.pizza/<uuid>.glb` (uuid = the model's preview-image uuid).
  - LICENSE: CC0 1.0 (public domain) for ALL 82 — no attribution required (still credited to
    Quaternius in CREDITS.md is nice-to-have, not obligatory).
  - VALIDATION: every file's first 4 bytes = glTF magic `676c5446`; JSON chunks parse as
    valid glTF 2.0 (generator FBX2glTF v0.9.7). UNTEXTURED solid-color multi-material PBR
    (0 images) — same flat-PBR look as the existing premium_plant/premium_floorlamp pieces,
    so the whole set is style-consistent with the Quaternius hero props already shipped.
  - STYLE NOTE: this is low-poly (matches Kenney tier), NOT the higher-poly CMHT Oculus
    premium pieces. Value here = one COHESIVE 82-piece set covering every room from a single
    author, ideal for filling out rooms uniformly. Mix-and-match with premium_* hero pieces
    as desired (both are flat-PBR untextured so they blend).

  FULL CATALOG (path under `public/models/quaternius/` → what it depicts). Grouped by room use:

  LIVING ROOM / LOUNGE (seating + media + surfaces):
  - CouchLarge.glb            → large sofa (3+ seat)
  - CouchMedium1.glb          → medium sofa (2-seat), variant A
  - CouchMedium2.glb          → medium sofa (2-seat), variant B
  - CouchSmall1.glb           → loveseat / small sofa, variant A
  - CouchSmall2.glb           → loveseat / small sofa, variant B
  - LCouch.glb                → L-shaped sectional sofa (corner couch)
  - Chair1.glb                → accent / dining chair, variant A
  - Chair2.glb                → accent / dining chair, variant B
  - Stool.glb                 → stool (round seat)
  - TableRoundLarge.glb       → large round table (dining/center)
  - TableRoundSmall1.glb      → small round side/coffee table, variant A
  - TableRoundSmall2.glb      → small round side/coffee table, variant B
  - ShelfLarge.glb            → large bookshelf / shelving unit
  - ShelfSmall1.glb           → small shelf / bookcase, variant A
  - ShelfSmall2.glb           → small shelf / bookcase, variant B
  - Fireplace.glb             → fireplace (wall feature)
  - Rug.glb                   → rectangular rug
  - RoundRug.glb              → round rug
  - ColumnRound.glb           → round structural column / pillar (architectural)

  BEDROOM (beds + storage + nightstands):
  - BedKing.glb               → king / double bed
  - BedSingle.glb             → single bed
  - BunkBed.glb               → bunk bed (kids room)
  - NightStand1.glb           → bedside nightstand, variant A
  - NightStand2.glb           → bedside nightstand, variant B
  - NightStand3.glb           → bedside nightstand, variant C
  - Drawer1.glb               → chest of drawers / dresser, variant A
  - Drawer2.glb               → chest of drawers / dresser, variant B
  - Drawer3.glb               → chest of drawers / dresser, variant C (largest)
  - Drawer4.glb               → chest of drawers / dresser, variant D
  - Drawer5.glb               → chest of drawers / dresser, variant E

  KITCHEN (appliances + tableware):
  - KitchenFridge.glb         → refrigerator / fridge
  - KitchenSink.glb           → kitchen sink unit
  - Oven.glb                  → oven / stove
  - SquarePlate.glb           → plate (tableware prop)

  BATHROOM (sanitary fixtures):
  - Bathtub.glb               → bathtub
  - BathroomSink.glb          → bathroom sink / basin
  - Toilet.glb                → toilet
  - ToiletPaperStack.glb      → stack of toilet paper rolls (prop)
  - BathroomToiletPaper.glb   → wall toilet-paper holder / roll
  - TowelRack.glb             → towel rack
  - WashingMachine.glb        → washing machine (laundry/bath)

  LIGHTING (lamps + ceiling fixtures — pair with emissive material for glow):
  - Lamp.glb                  → generic lamp
  - TableLamp.glb             → table lamp (desk/nightstand)
  - LightDesk.glb             → desk lamp (angled)
  - LightStand.glb            → standing / floor lamp on a stand
  - LightFloor1.glb           → floor lamp, variant A
  - LightFloor2.glb           → floor lamp, variant B (== existing premium_floorlamp source)
  - CeilingLight.glb          → simple ceiling light
  - LightCeiling1.glb         → ceiling light fixture, variant A
  - LightCeiling2.glb         → ceiling light fixture, variant B
  - LightCeiling3.glb         → ceiling light fixture, variant C
  - LightCeilingSingle.glb    → single hanging ceiling pendant
  - LightChandelier.glb       → chandelier
  - LightCube1.glb            → cube/box ceiling or wall light, variant A
  - LightCube2.glb            → cube/box ceiling or wall light, variant B
  - LightIcosahedron.glb      → faceted geodesic ceiling light (decorative)

  PLANTS / DECOR (greenery):
  - Houseplant1.glb           → potted houseplant, variant A
  - Houseplant2.glb           → potted houseplant, variant B
  - Houseplant3.glb           → potted houseplant, variant C (== existing premium_plant source, bfLOqIV5uP)
  - Houseplant4.glb           → potted houseplant, variant D
  - Houseplant5.glb           → potted houseplant, variant E
  - Houseplant6.glb           → potted houseplant, variant F
  - Cactus.glb                → potted cactus
  - DeadHouseplant.glb        → dead/dry potted plant (decor humor)

  ARCHITECTURE (doors / windows / curtains — for walls + smart-lock/curtain animations):
  - Door1.glb                 → door, variant A
  - Door2.glb                 → door, variant B
  - Door3.glb                 → door, variant C
  - Door4.glb                 → door, variant D
  - Door5.glb                 → door, variant E
  - Door6.glb                 → door, variant F
  - Door7.glb                 → door, variant G
  - Door8.glb                 → door, variant H
  - DoorDouble.glb            → double / French door
  - WindowLarge.glb           → large window
  - WindowSmall.glb           → small window
  - WindowRound.glb           → round / porthole window
  - CurtainsDouble.glb        → double curtains (pair with curtain open/close anim)

  WASTE BINS (small props):
  - Trashcan1.glb             → trash can / bin, variant A
  - Trashcan2.glb             → trash can / bin, variant B
  - TrashcanLarge.glb         → large trash can
  - TrashcanSmall1.glb        → small trash can, variant A
  - TrashcanSmall2.glb        → small trash can, variant B

  SECONDARY easter-egg candidates (URLs recorded per task; NOT downloaded — quick note only):
  - Low-poly DOG/canine: Quaternius "Wolf" (closest CC0 dog, low-poly, same author/style),
    direct GLB https://static.poly.pizza/f1d12388-e39b-4157-b32a-646a1d089fc4.glb —
    page https://poly.pizza/m/P1gU3Qkr9r — license CC0 1.0 (no attribution).
  - ROBOT VACUUM (roomba): "Robot vacuum" https://static.poly.pizza/1f4f9e3b-9bb3-47b7-897d-7b2c23654202.glb
    — page https://poly.pizza/m/dQj7UZT-1w0 — license CC-BY 3.0, author "Poly by Google"
    (ATTRIBUTION REQUIRED if used). Alt "Vacuum" https://static.poly.pizza/65aaa8da-e7c4-48b8-95a9-9c4890e80c68.glb
    (https://poly.pizza/m/eJ96_O_dQ2p, also CC-BY 3.0 Poly by Google). A "Roomba" exists at
    https://poly.pizza/m/5WERTPcyIMn if a rounder shape is wanted.
  - INDOOR PLANTS: already fully covered by the pack above (Houseplant1-6 + Cactus, all CC0) —
    no extra download needed.

## Key facts (so a fresh session needn't re-derive)
- Live UI calls `store.executeVoiceCommand` (`src/store/store.ts:365`) — currently a weak
  matcher (no fan logic; room names only move camera). FIX = delegate to `processCommand`.
- Robust resolver already exists + unit-tested: `src/store/commandProcessor.ts`
  `processCommand(raw, objects) → { matched, response, tier, updates[], roomFocus }`.
- Room ids: living-room, kitchen, master-bedroom, bathroom, office.
- Assets load from `frontend/public/models/` via `src/components/canvas/GLBFurniture.tsx`.

## Known-good checkpoint
e7fcfb3 — "feat: full demo polish — voice, 3D visuals, scenarios, construction mode"
(pre-redesign baseline; safe rollback point).
