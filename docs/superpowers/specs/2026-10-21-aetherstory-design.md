# AetherStory M: Chronicles of Aetheria

Final requested cleanup supersedes the initial persistence/idle defaults below: save schema and key are version4 with explicit migration from versions1/3; map data owns NPC/portal coordinates; AUTO-only non-boss idle rewards use a separate immutable departure timestamp, an eight-hour cap and once-only summary. Production render starts after font readiness. All names/art/icons are original and local. See docs/QA.md for final evidence.

Build a playable mobile browser auto-RPG in the Ams repository, using the supplied Canvas prototype as the concept reference. Preserve directional side-scrolling movement, jumping between grassy platforms, rope climbing, slime/mushroom combat, and a switchable AUTO mode. The prototype's frame-based positions, floor lookup, delayed damage callbacks, and shared input mutations are replaced.

The user subsequently supplied a larger AetherStory M prototype, cut off at `function trigger`. Treat its class, world-map, equipment and forge concepts as additional requirements. Keep the AetherStory M name; replace references to copyrighted game-specific maps/bosses/branding with original names and artwork. No external CDNs, icon kits or fonts.

## Product and presentation

An original illustrated woodland adventure, with warm parchment/gold HUD panels, teal controls, parallax forests, distant ruins, flowering grass, floating rock platforms, a chibi sword-wielding adventurer, slimes, mushrooms, wisps, and boars. The game itself occupies the screen; a compact start overlay introduces controls and enters play. No backend, accounts, external assets, or remote font dependency.

The game uses responsive landscape gameplay and remains usable in portrait with a rotate suggestion that does not block play. DOM controls respect safe areas and allow multitouch. Desktop keys: A/D or arrows, W/S to climb, Space to jump, J to attack, K to cast, E to collect/interact, T AUTO, I inventory, C character, Escape pause.

## Architecture

Vite and native JavaScript ES modules. `src/game/engine.js` owns a deterministic simulation independent of DOM/canvas. Engine modules own world/platform definitions, collision, navigation, combat, progression and drops. `src/renderer.js` owns the Canvas illustration, animation, particles and following camera. `src/input.js` owns independent pointer/keyboard state with cancellation. `src/ui.js` owns HUD, start/pause/settings/inventory/stats panels. `src/save.js` validates versioned progress. `src/main.js` integrates a fixed 1/120s update with clamped elapsed time, renderer, UI, saving and PWA registration.

## Engine contract

Exports from `src/game/engine.js`: `createGame(progress = null)`, `updateGame(state, input, dt)`, `toggleAuto(state)`, `equipItem(state, id)`, `usePotion(state)`, `claimQuest(state)`, `serializeGame(state, settings)`, `respawnPlayer(state)`. Simulation uses seconds and top-left entity rectangles. Input fields: `left,right,up,down,jump,attack,skill,interact`, booleans; jump and skill are rising-edge pulses. All entities have numeric x,y,w,h; player has facing +/-1, vx,vy, grounded, platformId, climbing (rope id or null), hp,maxHp,mp,maxMp,level,xp,xpToNext,gold,attack,defense,equipment,inventory,attackTimer,combo,invuln,deadTimer. Inventory items have id,name,type,rarity,icon,count and optional attack/defense bonuses.

State contains `world:{width,height,platforms,ropes,areas}`, `player`, `enemies`, `drops`, `particles`, `numbers`, `effects`, `time`, `auto`, `paused`, `kills`, `quest:{kills,target,completed,claimed}`, `unlockedAreas`, `notice` (string), `noticeTimer`, `settings`. Platforms have id,x,y,w,h. Ropes have id,x,y1,y2. Enemies have id,type (`slime`, `mushroom`, `wisp`, `boar`), x,y,w,h,vx,hp,maxHp,platformId,facing,attackTimer,respawnTimer,level,hitTimer,deathTimer. Drops have id,x,y,type,amount,item,age. Particle/number/effect fields are tolerant for presentation: renderer must handle missing arrays or optional properties. `numbers` have x,y,text,color,life; `effects` have type,x,y,facing,life,maxLife,combo.

World is around 4800 wide, 1000 high, with continuous ground at y=820, stacked floating platforms and ropes, including jump-connected platforms. A directed graph contains walking, physically feasible jump, downward drop, and rope edges. AUTO targets only living, graph-reachable monsters, climbs and jumps deliberately, collects drops, switches target after death, and has a stuck recovery timeout. Manual movement temporarily overrides auto without shared input mutation. Respect cooldowns and facing. Dead monsters reward once, disappear then respawn; player death restores at a safe spawn after a delay. Increasing areas/levels provide stronger opponents and unlocks.

## UI and rendering contract

`createUI({onAction,onSettings})` from `src/ui.js` creates UI under `#ui`, returns `update(state)`, `showPanel(name,state)`, `closePanel()`, `setStarted()`, `isModalOpen()`, `setInstallPrompt(event)`, `destroy()`. `onAction(action,payload)` actions: start,auto,pause,resume,inventory,character,settings,close,equip,potion,claim,install. `onSettings(settings)` delivers changed preferences. Inputs use buttons with `data-control="left|right|up|down|jump|attack|skill|interact"`. UI does not itself import engine.

`createInput(root=document)` from `src/input.js` returns `sample()` (reads held actions, consumes jump/skill edges), `clear()`, `destroy()`. It tracks each pointer separately with pointer capture, removes pointers on pointerup/pointercancel/lostpointercapture, and clears on blur/visibility change.

`Renderer` exported from `src/renderer.js`: constructor(canvas), resize(), render(state,dt). It owns a smoothed world camera, sets DPR-capped canvas dimensions, draws a logical 720px high world with width from aspect ratio. State is not mutated by drawing. It supports `state.settings.particles` and reducedMotion. Original Canvas vector illustration is final artwork, not debug rectangles.

## Persistence and offline

`loadProgress(storage)` returns validated progress or null; `saveProgress(progress,storage)` returns success boolean; `clearProgress(storage)` resets only this game's key. Storage is optional and browser failures must not stop gameplay. Schema `{version:1,player:{level,xp,gold},inventory,equipment,settings,unlockedAreas,quest}`. Save every 5s and on hide/pagehide and equipment/settings changes. Recover sensible bounds from malformed/old saves.

PWA manifest and original icons. Build generates a precache list of exact hashed build assets; service worker atomically precaches application assets, handles offline navigation and local asset cache, cleans its own old caches, never requires third-party hosts. Install availability is browser-dependent. README covers Android and iOS installation, HTTPS/localhost, testing offline after first online load, and local-only save limits.

## Acceptance evidence

Node automated tests cover falling/landing/undersides, jump edge/no air jump, rope detachment, enemy bounds, facing and cooldowns, once-only death rewards and respawn, navigation graph routes and long-running AUTO recovery, leveling/equipment, malformed and unavailable storage. Browser tests cover start/manual play, panels/settings/equipment, pointer cancellation and simultaneous touches, pause/resume, resizing, runtime errors and offline reload. Check 844x390, 932x430, 740x360, desktop and portrait layouts. Build succeeds and precached production reload works offline. Record actual results in README and QA report. No claims about physical-device performance without physical-device measurements.

## AetherStory extension contract (supersedes conflicting defaults above)

- `state.classId`: vanguard, arcanist, nightblade or ranger; `state.damageSkin`: amber, sakura, frost, cyber or solar; `state.starCores`, `state.sp`, `state.skillLevels` (four integer skill levels), `state.currentArea` string. `state.classes` contains display metadata for UI; `state.areas` is an alias for world.areas.
- Player equipment has six slots: weapon,hat,armor,cape,gloves,boots. Inventory types match slots or potion; rarity normal,rare,epic,unique,mythic. Equipment values are item objects or null (not ids). Items can have attack,defense,stars. Initial equipment contains a usable sword and armor; inventory includes an alternative weapon and 3 health potions, and gold starts at 300 with 5 star cores. Replacing equipment returns the old item to inventory.
- Additional engine exports: `changeClass(state,id)`, `travelToArea(state,id)`, `upgradeSkill(state,index)`, `forgeItem(state,slot,timing)` and `salvageItem(state,id)`; all return boolean success, except forge returns `{success:boolean,message:string}`. `timing` is 0..1; center .4.. .6 awards a success bonus. Forge charges gold/cores, has a star cap of 25 and never destroys gear. Skill requirements 1,1,10,25; changing class recalculates stats but preserves inventory and advancement.
- Each class has four skills; input `skill` casts first, `skill2/skill3/skill4` cast subsequent skills. Keyboard Z/K, X, C, V respectively. Each skill owns cooldown, mana cost, damage/range/style. All first skills are actually functional and class combat ranges differ. Passive mana recovery supports ongoing auto-play. UI shows locked skills and real cooldowns.
- `player.skillCooldowns` four numbers, `state.skillDefinitions` current class skills with name,mp,cd,reqLv,description; player attack and skill animation timers are available to renderer.
- Original areas: emerald_glade, whispering_canopy, crystal_cavern, ember_altar, unlocked at levels 1,3,6,10. `world.areas` has id,name,minLevel,theme,x,end. Movement within the side-scrolling world changes currentArea; locked borders stop entry. World-map travel requires unlocked area. Final area includes an original large guardian boss with telegraphed attacks. No copying named commercial-game bosses.
- UI additional actions: map,forge,skills,class,travel,switch-class,upgrade-skill,forge-item,salvage,skin. Payload for forge-item is `{slot,timing}`; equip/salvage payload is item id; upgrade-skill is index; skin/class/travel payload is string id.
- Persistence preserves extension fields: classId,damageSkin,starCores,sp,skillLevels,currentArea. `serializeGame` owns exact progress shape; save normalization preserves the fields above plus settings/quest/equipment.
- Keep the broader prototype's minimap, quest tracker, skill wheel, character identity, gold and level HUD. Use original named Elder Rowan and companion Pip if depicted. Optional idle rewards must not be claimed as implemented unless separately tested.
