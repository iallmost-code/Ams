# Interface implementation report

## Owned deliverables

`index.html`, `src/style.css`, `src/ui.js`, `src/input.js`, `tests/input.test.js`.

The original AetherStory M interface uses local inline SVG symbols, warm gold/ivory type, dark green glass, and teal touch controls over the illustrated canvas. No font, icon, CSS, or asset CDN is required. The layout includes the character vitals, level and XP, gold/cores, live canvas minimap, quest progress and claim, AUTO status, four independent skills with real cooldown/level locks, potion/collect actions, direction pad, jump, and attack. Portrait has a small nonblocking orientation suggestion.

Panels provide six equipment slots and item actions, character stats, four class choices, skill upgrades, level-locked world travel, five damage skins, timing-based forging, settings/pause, and browser-specific installation help. The forge uses the engine's actual gold/core costs and reports its outcome inside the panel. Dynamic saved item names are inserted with `textContent`.

## Public API

`createUI({onAction,onSettings})` returns `update(state)`, `showPanel(name,state)`, `closePanel()`, `setStarted()`, `isModalOpen()`, `setInstallPrompt(event)`, and `destroy()`. The UI emits the design contract's action names and payloads. It never imports or mutates the engine. The integration owns menu keyboard shortcuts and game pausing.

`createInput(root=document)` returns `sample()`, `clear()`, and `destroy()`. It maintains independent keyboard codes and pointer ids, captures pointers, and handles pointer cancellation, lost capture, blur, and document visibility. Jump, four skills, and interact produce one-frame pulses; movement and attack remain held. K and Z both map to first skill, while C maps to skill 3 per the extension contract.

Stable `data-action` attributes exist on the start, HUD, and panel buttons. `data-testid` values `hp`, `level`, and `gold` expose the corresponding live HUD displays. Settings use the integrated `sound`, `music`, `particles`, and `reducedMotion` keys. The save indicator reflects the integration’s `state.saveStatus` as pending, saved, or session only; it never assumes storage succeeded. The UI includes modal focus trapping and accessible class-specific choice names.

## Verification

- Input tests were written before implementation. A minimal stub produced four assertion failures, then the implementation passed all four tests.
- `node --check src/ui.js` and `node --check src/input.js` passed.
- `npm test` passed all 48 tests present at verification, including all four independent input tests.
- Real Chromium rendered the production start screen and gameplay at 844×390 and 390×844. Checked all touch control bounds at 844×390, 740×360, and 390×844: none were outside the viewport.
- A Chromium interaction against the integrated development build performed a timed forge (300→200 gold, 5→4 cores, visible success feedback), switched to Arcanist through its real button, and checked the music preference. There were zero page runtime exceptions during those interactions.
- Visual inspection captures: `/tmp/interface-844.png`, `/tmp/interface-844-play.png`, `/tmp/interface-390-play.png`, `/tmp/interface-forge.png`.

## Limits

Physical phones were not measured. Installation availability is provided by the browser; iOS uses the documented Share menu flow. Offline caching and persistence validation are owned by the root integration and save/PWA module, rather than this interface module.
