# Original AetherStory artwork

These seven assets were generated for AetherStory with the image generation tool. They contain original character and environment designs, with no extracted commercial game assets. The original six WebP files total less than 3.4 MB; the transparent skill WebP adds 275,400 bytes. All seven shipped images are local and precached for offline play. The editable skill PNG is not shipped or precached.

- `mushroom-valley.webp`: illustrated scenery for Emerald Glade and the tinted forest canopy. Its camera drift is independent of gameplay coordinates.
- `crystal-cavern.webp` and `ember-altar.webp`: painted cavern and volcanic temple scenery with quiet background depth. Each painted scene is softened, desaturated and shaded once in a cached layer, leaving walkable terrain sharp.
- `pip.webp`: a transparent 2 × 2 dragon companion atlas: wings up/down, collecting and healing.
- `adventurers.webp`: transparent 4 × 4 atlas. Rows: Vanguard, Arcanist, Nightblade, Ranger. Columns: idle, running A, running B, attack.
- `creatures.webp`: transparent 4 × 4 atlas. Rows: aqua jelly, starcap mushroom, forest spirit, boar. Columns: idle, moving A, moving B, hurt.

The loader isolates integer cell interiors into individual canvases, with 12 transparent pixels on every side. This prevents filtering from sampling neighboring animation frames, including at fractional source cell boundaries. Animation frames, facing, hit flash, death fade and feet positions follow simulation state. Atlas artwork does not alter collision boxes, attack reach or platform navigation. The portable HTML build embeds these assets, including the HUD portrait, as data URLs.


- `skills.webp`: cleaned, transparent 1536 × 1024 skill sheet, ordered Vanguard / Arcanist / Nightblade / Ranger. Each row progresses start, growth, full power, breakup, fading sparkles. `skills.atlas.json` defines twenty equal 306 × 256 cells with a 3-pixel horizontal outer margin. Each frame is alpha-centered with at least 32 pixels of transparent border.
- `skills.png` remains the editable cleaned source. `scripts/prepare-skill-atlas.py INPUT.png [OUTPUT_DIR]` cleans the original generated sheet and exports PNG + quality-90 WebP + atlas metadata. It removes faint alpha noise, preserves relative frame sizes within each row, and verifies exact alpha equality between exports. Run it against the original source, not repeatedly against its own output.
- Primary effects last 1.25 seconds, including a 650ms full-power hold, and appear about 1.5× larger than the previous presentation. Every class skill renders after both hero and Pip. Ultimate effects add painted class accents to their separate procedural choreography. Source padding replaces the previous runtime alpha scan and shrink.

## Dawntrail chapter art

- `vanguard-motion.webp`: newly generated original twenty-pose (5×4) hammer-and-shield character sheet. Rows: running, hammer swing, airborne/landing, holy casting/guard. Runtime frames are isolated and aligned to a stable foot baseline.
- `aurel.webp`: newly generated original painted stone-bell guardian with moss, flowers and golden rune inlays. The chapter renderer animates its telegraph pulse and hit reaction.

Both transparent WebPs are bundled locally, precached and embedded in the portable HTML. The chapter reuses the original scenery, creatures and Pip for a consistent painted palette.
