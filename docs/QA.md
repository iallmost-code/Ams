# AetherStory M QA record

Final local verification of the implemented AetherStory M game and requested cleanup.

## Environment

- Node 24.19.0; npm 11.9.0; Linux managed workspace.
- Browser automation: installed Chromium with Playwright.
- No physical Android or iPhone is attached. Responsive browser checks are not physical-device performance measurements or Safari certification.

## Verified results

- Fixed-step loop: five behavior tests were first observed failing against an empty clock, then passed after implementation. Covers 30/60/120 display FPS equivalence, preserved tap edges, frame-stall clamping and reset.
- `npm test`: **62 passed, 0 failed**. Physics, directional cooldown combat, deaths/rewards, all classes, equipment/forge, reachable navigation, rope-to-AUTO takeover, pointer cancellation, fixed clock, migrations, offline eligibility/timestamps, portals/NPC coordinates and service-worker behavior.
- `npm run build`: **passed**, 14 ES modules bundled. Generated service worker precaches seven actual local production assets; sourcemaps excluded from precache.
- `npm run test:e2e`: **17 passed, 0 failed**, using system Chromium against the production build. Actual gameplay, AUTO kills/manual override, persisted gear/class/settings/skins, forge timing, simultaneous touch and cancellation, storage denial feedback, offline reload/deep URL fallback and once-only offline summary. Each of the four classes casts all four skills and uses its area's portal.
- Responsive browser checks passed at 844×390, 932×430, 740×360, 390×844 and 1440×900. No uncaught page errors in checked gameplay paths.
- Case-insensitive source search for the requested retired names, enhancement phrase, misspelled ambient identifier and external icon classes returned no matches in `src/`, `public/` and `index.html`. System-required terms such as manifest `standalone` are retained.
- Original Canvas renderer was checked across all four class silhouettes and four themes, DPR capped at 2, reduced motion, guardian warning and missing optional presentation fields.

## Review fixes

- Independent review found and verified fixes for AUTO toggling while attached to a rope and silently truncated large inventories. Regressions cover actual enemy defeat after takeover and complete 1,200-item roundtrips; oversized writes preserve the previous save and report failure.
- Save failure feedback and nested offline navigation were also fixed and browser-checked.
- Touch test diagnostics distinguished enemy recoil from held input, and corrected CDP touch-end targeting; actual cancellation and independent fingers pass.
- Offline reward regressions confirm AUTO eligibility captured at departure, zero boss-area rewards, an eight-hour cap, clock rollback rejection, unchanged hidden timestamp across saves and once-only payment across reloads.

## Scope limits

The game runs and saves offline after its production shell has been cached. Idle AUTO rewards are a bounded estimate, not background combat simulation. There is no multiplayer, cloud save or account system. Device installation UI depends on the browser. Physical midrange Android frame-time profiling and real iOS Safari installation remain device acceptance checks. CI is configured; local results above do not claim a completed hosted CI run.
