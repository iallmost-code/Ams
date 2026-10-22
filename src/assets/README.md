# Original AetherStory artwork

These three assets were generated for AetherStory with the image generation tool. They contain original character and environment designs, with no extracted commercial game assets. WebP encoding keeps the combined download below 2 MB; all images are local and precached for offline play.

- `mushroom-valley.webp`: illustrated scenery for Emerald Glade and the tinted forest canopy. Its camera drift is independent of gameplay coordinates.
- `adventurers.webp`: transparent 4 × 4 atlas. Rows: Vanguard, Arcanist, Nightblade, Ranger. Columns: idle, running A, running B, attack.
- `creatures.webp`: transparent 4 × 4 atlas. Rows: aqua jelly, starcap mushroom, forest spirit, boar. Columns: idle, moving A, moving B, hurt.

The renderer derives cell dimensions from the decoded image dimensions. Animation frames, facing, hit flash, death fade and feet positions follow simulation state. Atlas artwork does not alter collision boxes, attack reach or platform navigation. The portable HTML build embeds these assets, including the HUD portrait, as data URLs.
