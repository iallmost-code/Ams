# Original AetherStory artwork

These seven assets were generated for AetherStory with the image generation tool. They contain original character and environment designs, with no extracted commercial game assets. The original six WebP files total less than 3.4 MB; the transparent skill PNG adds about 1.9 MB; all images are local and precached for offline play.

- `mushroom-valley.webp`: illustrated scenery for Emerald Glade and the tinted forest canopy. Its camera drift is independent of gameplay coordinates.
- `crystal-cavern.webp` and `ember-altar.webp`: painted cavern and volcanic temple scenery with quiet background depth. Each painted scene is softened, desaturated and shaded once in a cached layer, leaving walkable terrain sharp.
- `pip.webp`: a transparent 2 × 2 dragon companion atlas: wings up/down, collecting and healing.
- `adventurers.webp`: transparent 4 × 4 atlas. Rows: Vanguard, Arcanist, Nightblade, Ranger. Columns: idle, running A, running B, attack.
- `creatures.webp`: transparent 4 × 4 atlas. Rows: aqua jelly, starcap mushroom, forest spirit, boar. Columns: idle, moving A, moving B, hurt.

The loader isolates integer cell interiors into individual canvases, with 12 transparent pixels on every side. This prevents filtering from sampling neighboring animation frames, including at fractional source cell boundaries. Animation frames, facing, hit flash, death fade and feet positions follow simulation state. Atlas artwork does not alter collision boxes, attack reach or platform navigation. The portable HTML build embeds these assets, including the HUD portrait, as data URLs.


- `skills.png`: original generated RGBA PNG, exactly 1536 × 1024; five columns and four rows, ordered Vanguard / Arcanist / Nightblade / Ranger. Each row progresses start, growth, full power, breakup, fading sparkles. `skills.atlas.json` describes the equal conceptual 307.2 × 256 cells. No commercial sprites or source screenshots are included.
- The primary-skill player crossfades five painted frames over 0.75 seconds. At load time, skill frames are isolated, centered from their alpha content and given transparent sampling space; the source PNG remains unchanged. Ultimate effects add painted class accents to their separate procedural choreography. Further pixel-level source-export cleanup is pending the user’s choice of method.
