# Environment Rebuild Plan — Smart Home Digital Twin (per design spec)

Source: the "SMART HOME DIGITAL TWIN — ENVIRONMENT DESIGN SPECIFICATION" board.
Scale: **1 world unit = 1 meter** (spec requirement). Footprint **13m × 10m**.
Status: **PLANNING** — coordinates below are my interpretation of the floor-plan image
(the hand-drawn adjacencies in §4 have minor internal conflicts, e.g. bathroom is listed
both "East of bedroom" and "South of bedroom"); **confirm before execution**.

## Coordinate system
Origin centred. x: −6.5 (West/W4) → +6.5 (East/W2). z: −5 (North/W1) → +5 (South/W3).
Wall height 3m, door height 2.2m, window height 1.5m.

## Proposed room rectangles (13×10)
| Room | id | size | x range | z range | notes |
|------|----|------|---------|---------|-------|
| Master Bedroom | `master-bedroom` | 5×5 | [−6.5,−1.5] | [−5, 0] | top-left; W1 N, W4 W |
| Living Room | `living-room` | 8×6 | [−1.5, 6.5] | [−5, 1] | top-right (hero); W1 N, W2 E, W3 S, open to hallway W |
| Bathroom | `bathroom` | 3×3 | [−6.5,−3.5] | [0, 3] | W4 W; N→bedroom, S→hallway |
| Hallway | `hallway` (NEW) | 2 wide | [−3.5,−1.5] | [0, 5] | central spine; connective, no devices |
| Home Office | `office` | 4×4 | [−6.5,−2.5] | [1, 5] | W3 S, W4 W; N→hallway, E→living/kitchen |
| Kitchen + Dining | `kitchen` | 5×4 | [1.5, 6.5] | [1, 5] | W2 E, W3 S; N→hallway, W→office |

> Note: bathroom (z[0,3]) and office (z[1,5]) overlap slightly on the west strip — in
> execution I'll snap to a clean non-overlapping partition (likely bathroom z[0,2.5],
> office z[2.5,5] or shift the hallway) and keep each room's stated area as close as possible.
> **This is the main thing to confirm.**

## Keep / preserve (per earlier locked decisions)
- Room IDs above (commands key off `living-room/kitchen/master-bedroom/bathroom/office`).
- `commandProcessor` interaction logic, device state model, scene/persona systems.
- Smart-device → room mapping (each room keeps its Alexa devices).

## Camera (§3) — REVERSES the earlier "locked" decision
- Default: 3/4 isometric, 45°. **Orbit ENABLED** (mouse drag / touch). Zoom 3–18m.
- Room focus: smooth zoom-in on interaction → action → smooth zoom-out. (CameraController
  already does focus/return; re-enable OrbitControls rotate; retune default zoom for 13×10.)

## Room-by-room furniture (§4) → asset (Quaternius Ultimate Interior pack, catalog pending scout)
- **Living Room (hero, 40% effort):** L-shaped sofa (S+W aligned), coffee table (centred),
  accent chair (corner), floor lamp (corner), Alexa hub (side table), robot-vacuum dock
  (near wall), smart speaker (console), indoor plants (corners), 85" TV (W1 N, window-centred),
  TV console.
- **Master Bedroom:** king bed (headboard on W1 N), 2× nightstand+lamp, wardrobe (W4 W),
  floor lamp (corner), Alexa device (nightstand), smart ceiling fan, curtains (N window).
- **Home Office:** desk (facing W4 W), ergonomic chair, dual monitors, bookshelf (S wall),
  plant (corner), desk lamp, Alexa device, window (W4 W).
- **Kitchen + Dining:** counter+sink (N), stove+chimney, fridge (E wall), dining table
  (center) + 4 chairs, pendant lights (above table), water purifier (counter), window (W3 S).
- **Bathroom:** vanity+mirror (N), sink, shower (W corner), toilet, towel rack,
  cabinet (E wall), small plant.

## Windows & curtains (§5)
- Windows fixed on walls (not floating); per §4: Living N (centred), Living E (large),
  Bedroom N, Office W, Kitchen S.
- Curtains attached to rods above windows ONLY; sheer fabric, subtle idle sway ALWAYS on.

## Dynamic objects (§6, must animate)
Doors (open/close), ceiling fans (spin/stop), curtains (open/close + idle sway), TV (on/off),
lights (dim/brighten), AC (on/off + indicator), robot vacuum (dock/move).

## Asset sources (§8)
- Furniture/interior: **Quaternius Ultimate Interior** (CC0) ← primary, scout fetching now.
- Animated doors: Sketchfab/CGTrader. Robot vacuum: Sketchfab/CGTrader. Dog: Sketchfab/Mixamo.
- Plants/decor: Sketchfab / Poly Haven. HDRI/materials: Poly Haven (have interior_2k.hdr).

## Execution subtasks (created in task tracker)
1. New floor-plan geometry: rewrite `constants/layout.ts` (nodes/walls for 13×10 + hallway) and
   `DEFAULT_ROOMS` (6 rooms incl. hallway, 1u=1m), retune camera default + `getRoomView`.
2. Re-place doors/windows on the new walls; add hallway connectivity.
3. Furnish each room from the Quaternius catalog → rebuild `DEFAULT_PLACED_OBJECTS` (in-bounds,
   wall-aligned per §7). Living room first (hero).
4. Wire new GLBs in `GLBFurniture.tsx`/`PlacedObjectMesh` with fallbacks; consistent scale.
5. Dynamic objects: ensure fan/TV/lights/AC/curtains/doors/vacuum animate; AC indicator.
6. Camera: re-enable orbit, retune zoom range (3–18m) + room focus for the smaller footprint.
7. Bounds/QA: update `layout.bounds.test.ts` for new rooms; live visual verification.

## Done already
- Backend link switched to DuckDNS (`https://alexa-india.duckdns.org`) in `config/env.ts` (health 200).
- Step 1: current furniture cleared (`DEFAULT_PLACED_OBJECTS` emptied) — clean slate.
