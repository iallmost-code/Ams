# Engine implementation report

Implemented the deterministic, DOM-free game simulation in `src/game/engine.js`, terrain/enemy definitions in `src/game/world.js`, and directed platform routing in `src/game/navigation.js`.

## Public API and state

- `createGame(progress = null)` returns a fresh state. Native ES modules; no runtime dependencies, browser globals, timers, or asynchronous combat callbacks.
- `updateGame(state, input, dt)` mutates and returns state, consumes seconds in 1/120-second substeps, and never mutates input. Caller/main owns elapsed-time clamping. Paused states do not advance.
- `toggleAuto` returns the resulting AUTO boolean. `equipItem`, `usePotion`, `claimQuest`, `respawnPlayer`, `changeClass`, `travelToArea`, `upgradeSkill`, and `salvageItem` return success booleans. `forgeItem(state, slot, timing)` returns `{success, message}`.
- `serializeGame(state, settings = state.settings)` returns the exact version-one persisted shape including the AetherStory extension fields.
- All actor coordinates are top-left rectangles. Ground is platform `ground` at y820; the world is 4800×1000. Ropes store ids; player.climbing is a rope id or null. Platform ids are `0-low`, `0-low-east`, `0-mid`, `0-high`, `0-step`, `0-ledge`, repeated with prefixes 1–3 for the other areas.
- Player equipment always has six object-or-null slots. Item ids are strings; generated loot uses `loot-{integer}`. Restoring progress derives the next id from inventory/equipment to preserve unique item identity.
- Class ids: vanguard, arcanist, nightblade, ranger. State exposes class display metadata, four current skill definitions, four skill levels, four cooldowns, and player attack/skill animation timers.
- Skill fields: name, mp, cd, reqLv, range, damage, style, description. Basic attack ranges differ per class. Skill input supports skill, skill2, skill3, skill4. Manual skills are rising edges; AUTO casts on cooldown. Manual attack and all four skills overlay AUTO. Manual movement suspends AUTO movement for 2.5 seconds.
- `state.damageSkin` supports amber, sakura, frost, cyber, solar and is serialized. Root/UI selects this field.
- Boss: enemy `guardian`, original name Cinderroot Guardian, `isBoss: true`, `telegraph` seconds and `attackPhase`. Warning/strike effects include radius210. The 1.05-second warning deals no damage; staying within the zone when it expires causes mitigated damage. Boss rewards, cooldowns, respawn, bounded movement, and recoil use the same deterministic simulation.

## Behavior and verification

Tests were written before implementations. Initial missing-function and subsequent behavioral failures were observed. Regressions caught held-skill recasting, unsafe jump landing coordinates, missing physical recoil, AUTO ignoring additional manual skill inputs, persisted loot identity collisions, and truncated elapsed time before their fixes.

Final command: `npm test` — **47 tests passed, 0 failed** (including engine, navigation, input, fixed-loop, save and service-worker tests). Engine/navigation contribute 30 tests. Direct checks cover falling/undersides, grounded/edge jumping, drop-through, rope identity/top/bottom/jump/lateral detach, bounded enemy patrols, directional attacks and combo cooldowns, all class skills and locks, mana recovery, recoil and control recovery, one-time rewards, respawn, leveling/unlocks, quest claims, six-slot replacement, safe forge/cap/costs, salvage, serialization, unique restored loot ids, locked borders, avoidable boss telegraphs, pause, full-duration substepping, frozen caller controls, and AUTO routes using ropes/jumps/drops/walking. Tests include deterministic duplicate 100-second AUTO runs, an isolated y365 target, higher adjacent jumping targets, downward routes and touching shelves.

After the final terrain change, separate 600-second fixed-step simulations for all four classes completed with finite coordinates and no player deaths:

| Class | Kills | Level | Gold | Final area |
|---|---:|---:|---:|---|
| Vanguard | 283 | 25 | 17057 | Whispering Canopy |
| Arcanist | 313 | 25 | 17912 | Ember Altar |
| Nightblade | 292 | 25 | 17896 | Ember Altar |
| Ranger | 313 | 24 | 15486 | Ember Altar |

These are simulation results, not device-performance claims. Root owns production build and browser acceptance checks.

## Limits

Navigation is designed for this static world and standard player dimensions/jump parameters; changing terrain at runtime requires rebuilding `state.navigation`. AUTO targets only unlocked, graph-reachable living monsters, prioritizes reachable loot, uses deliberate route actions, and retries after a stationary timeout. It does not promise globally optimal farming. No idle/offline rewards or inventory capacity system are claimed. Forging is seeded deterministic chance, never destructive, with a timing bonus and 25-star cap.
