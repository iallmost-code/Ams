# AetherStory M original renderer

Implemented `src/renderer.js` as a standalone `Renderer` with `constructor(canvas)`, `resize()` and `render(state, dt)`. No external artwork, fonts, network requests or image dependency. Artwork uses custom Canvas paths, gradients and locally cached background canvases.

## Artwork and behavior

- Three depths of woodland parallax, distant ruined arch, softened sunlight and diagonal sun shafts, floating motes, large curved trees, layered leaf clusters, flowers, stones, cottage at Rowan’s Rest and directional signs.
- Continuous grassy terrain with soil texture, floating stone platforms with faceted sides and hanging roots, climbable vine ladders.
- Original expressive chibi adventurer with separate face, eyes/blink, hair, armor, cape, articulated legs, weapon arm and class-specific helmet/hat/hood, staff/bow/knife/sword. Walk, idle, climb, air pose, attack/cast and death presentation; companion Pip.
- Squash/stretch leaf slimes, broad-capped mushrooms, translucent wisps, tusked boars and the large antlered Cinderroot Guardian. Guardian has a glowing core, crack details, warning ring, name and health.
- Emerald, canopy, crystal and ember area palettes; crystals in the cavern.
- Actual engine drops and damage numbers, five damage-skin palettes, sword arcs, arrows, spell bolts, radial skills, level-up rings, defeat sparkles, damage flashes, boss warning and slam effects.
- Smoothed world-coordinate camera follows the player. Logical height is 720; width follows CSS aspect ratio; DPR capped at 2. Distant layer canvases are discarded when theme changes to limit retained raster memory. Platform, creature and scenery culling reduces offscreen work.
- Reduced-motion preference stops ambient bobbing/sway/particles drift and camera interpolation; combat feedback still communicates game events. Particle preference removes ambient motes and engine particles.

## State expectations

Consumes the shared spec contract without mutation. Uses `player.attackAnimation` and `skillAnimation` when available, with timer fallback; honors `enemy.isBoss` as well as boss/guardian types, `telegraph` and `attackPhase`. Arrays and optional visual fields may be absent. Effects support slash/arrow/bolt/burst/nova/ultimate/levelup/defeat/hurt/telegraph/boss-slam, with generic spell rendering fallback. Damage numbers use their engine positions and remaining life. Area theme is read from `world.areas` via `currentArea`.

`renderer.camera` exposes `{x,y}` for optional minimap/view diagnostics. Renderer retains only presentation state and never writes to the supplied game state.

## Verification performed

- `node --check src/renderer.js`: passed.
- Chromium (system `/usr/bin/chromium`) isolated browser render smoke: all 4 classes × all 4 area themes rendered without errors; repeated render left serialized game state unchanged.
- Browser screenshot at 1280×720 inspected: full layered scene, entities, terrain and cottage render correctly. Preview saved as `docs/briefs/renderer-preview.png`.
- Browser resize/backing test at 844×390 with device scale factor 3: logical dimensions 1558.15×720; backing canvas 1688×780; effective DPR 2.
- Guardian warning, reduced motion, particles disabled and minimal optional state rendered without exceptions.
- A 120-frame isolated headless render sample averaged approximately 7.42 ms per render on this execution environment before final soil-detail addition. This is a development sample, not a physical-device performance claim.

Final UI integration, complete gameplay checks and offline checks are owned by the integration task. No physical-device testing performed here.
