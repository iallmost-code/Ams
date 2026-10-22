# Foundation and integration review

Reviewed `artifacts/foundation-review.diff` against `docs/superpowers/specs/2026-10-21-aetherstory-design.md`, with current integration references to input, engine serialization/actions, UI status and production HTML. Review targets were `src/main.js`, `src/loop.js`, `src/audio.js`, `src/save.js`, `scripts/build-sw.js` and their tests. Other agents' unfinished UI, engine and renderer implementations were not reviewed as independent targets. No implementation changes made; known-passing module tests were not repeated.

Verdict: no critical or high-priority defect identified in this scope. Two medium-priority integration defects should be addressed.

## P2 — First and subsequent save failures are silent

**Location:** `src/main.js:26`, `src/main.js:36–39`, `src/main.js:76`.

`saveAvailable` starts true. The only player-facing unavailable-storage notice is checked on `start`, before the usual first save. The first autosave after five seconds can therefore set the flag false without ever displaying that notice. Failures after an initially successful save also receive no notice. The current HUD continues to say `AUTO SAVED`, so a player can play a long session believing progression is preserved and lose it on reload.

**Reproduction:** deny localStorage access (or make `setItem` throw a quota error), load a fresh page, start immediately and play for at least five seconds. `getDiagnostics().saveAvailable` becomes false, but there is no warning at the failure point. Reload loses the session. A scoped VM integration probe with `saveProgress` returning false confirmed that the game starts and advances six seconds with a false save diagnostic; source inspection confirms the sole warning branch runs only at start.

**Suggested correction:** report the transition to unsuccessful persistence from `persist()` and expose the actual save status to the HUD. Avoid warning repeatedly on each autosave. Optionally probe storage before start if an initial-session warning is desired, without allowing storage exceptions to block play.

**Coverage gap:** the storage-denial browser test verifies movement and pause, but neither the first failed autosave nor the displayed save status.

## P2 — Offline fallback breaks nested navigation because the shell uses relative asset URLs

**Location:** `scripts/build-sw.js:47–52`, in combination with `vite.config.js:4` (`base: './'`) and generated HTML.

The worker returns the same cached `index.html` for every in-scope navigation URL. Its script and stylesheet URLs are relative (`./assets/index-…js` and `./assets/index-…css`). A navigation URL ending in a nested slash, such as `/games/aether/map/`, therefore resolves assets beneath `/games/aether/map/assets/`, while the worker precaches only `/games/aether/assets/`. Those requests are absent from `KNOWN` and fail offline, leaving the game unable to boot. Normal root/subdirectory-root offline reload works; this defect concerns the broader navigation fallback that the worker advertises and tests.

**Reproduction:** load the production game once at `/games/aether/`, wait for its worker to control the page, go offline and navigate to `/games/aether/map/` (or `/games/aether/map/deep`). The cached HTML is returned but its main module and stylesheet fail. A direct check of the current production HTML confirmed the main module resolves to `/games/aether/map/assets/index-D553JdSo.js` from these URLs rather than the precached `/games/aether/assets/index-D553JdSo.js`.

**Suggested correction:** canonicalize fallback navigation to the registration scope, or serve fallback HTML with a base URL derived from the registration scope. Keep subdirectory deployment support. This needs one real browser check of a trailing-slash/nested fallback URL; the existing worker mock only checks the returned shell text at the one-segment, no-trailing-slash path `/games/aether/map`, where relative assets happen to resolve correctly.

## Other inspected behavior

- Storage getters, quota exceptions, corrupt JSON, malformed item/scalar fields and serialization cycles are caught inside save helpers; no uncaught exception path found there.
- Fixed-step delivery consumes edge inputs once per simulation frame and retains edges across short render frames; pause/reset drops pending edges and stale elapsed time.
- Main's class, forge, equip, salvage, skill, skin and travel payloads match the extension contract; persistence follows their mutations. Modal entry/exit clears inputs, and hide/blur saves and pauses.
- Generated caches are versioned by actual asset contents, scoped per deployment, installed through `cache.addAll`, and cleaned without deleting other applications' caches. No third-party dependency was found.
- Audio unlock is optional and guarded; synthesized sound has no network dependency. No sufficiently certain important audio failure was found during source review. Actual mobile browser interruption/resume behavior remains a browser-integration check.
- Engine/UI/renderer correctness and complete production/browser acceptance remain with the active implementers and root's final fresh review.
