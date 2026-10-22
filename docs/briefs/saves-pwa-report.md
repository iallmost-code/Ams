# Saves and offline shell verification

Implemented `src/save.js`, `scripts/build-sw.js`, the web manifest, original sword/leaf/sparkle SVG artwork, and genuine 192px/512px PNG icons. No CDN, network font or external asset dependency.

Storage key: `aetherstory-m.progress.v1`. Version-one saves preserve the complete six-slot item objects, inventory, quest, preferences and AetherStory extension fields. Missing extension fields receive engine-compatible defaults. Unknown versions or missing player roots return null. Invalid scalars are bounded/defaulted; unsafe or unknown item types and mismatched equipment slots are rejected. Missing/private/quota-limited storage returns null/false without throwing; clearing removes only this game's key. Save normalization creates a fresh object and leaves live game state untouched.

Inventory has no item-count limit. `MAX_SAVE_BYTES` is a shared 2,000,000-byte UTF-8 JSON budget for reading and writing. Oversized input or normalized output returns false before storage access/write, preserving the previous save. An oversized stored value returns null. Browser quota can still be smaller; its write failure also returns false. The byte budget includes all JSON fields and multibyte names/icons.

The build script discovers exact recursive dist output and excludes source maps and sw.js. Asset contents and paths determine the revision. Installation uses `cache.addAll`; failure deletes the incomplete revision and rejects install. Activation removes only this game's older caches for the current deployment scope. Navigation prefers network and falls back to precached index.html; same-origin known assets use cache first. Offline deep links whose document directory differs from the deployment scope first redirect to the scope root, so relative HTML assets resolve to the precached URLs. Other-origin URLs, non-GET requests and out-of-scope URLs are untouched. Subdirectory deployments derive every asset URL from worker registration scope.

## Commands and actual results

- `node --test tests/save.test.js`: initial RED observed because save module was absent; after implementation, 6/6 save cases passed. Engine confirmation of default skill levels produced another observed RED, then GREEN after matching `[1,1,1,1]` for legacy saves.
- `node --test tests/save.test.js`: final targeted run 8/8 passed, including worker build and lifecycle tests. Coverage includes exact hashed-asset discovery, sourcemap exclusion, deterministic/content-changing revision, offline navigation in a nested deployment path, online navigation preference, same-origin boundaries, own-cache cleanup, and failed-install cleanup.
- `node --check scripts/build-sw.js`: passed.
- PNG192 visually inspected; original artwork is centered on opaque dark teal with gold ring, mint blade, leaves and gold sparkles. Pillow wrote RGB PNGs at exactly 192x192 and 512x512.
- `npm test`: in-progress integration snapshot, 12 passed / 20 failed. Other agents were still replacing engine and loop stubs. All 8 save/PWA and all 4 input tests passed. Failures were: new-adventure state; one-way platform landing; grounded jump/drop-through; ropes; facing/cooldowns/combo; four-class skills; once-only enemy death rewards; enemy patrol bounds; death recovery; equipment/salvage/potions/classes/forge/skill/travel persistence; quest claim; leveling/unlocks; fixed-simulation distances; one-shot jump edges; short-frame edge retention; stall clamp/reset; invalid elapsed time; navigation routes; high-platform AUTO; long-running AUTO/manual override. Root must rerun the complete suite after integration.
- `npm run build`: in-progress integration snapshot failed because another agent had not yet written `src/style.css` imported by `src/main.js`. Worker generation itself passed using production-shaped temporary fixtures in automated tests. Root must rerun the real build after integration.

## Review follow-up: nested offline navigation

The reviewer identified that serving relative-base HTML directly at `/games/aether/map/deep/` would resolve `./assets/…` under the nested directory. Added a regression that loads this nested offline URL, follows a canonical redirect to the deployment scope, verifies no redirect loop at the root, resolves the actual relative script URL from cached HTML, and fetches that asset offline. Observed RED: the original worker returned status 200 instead of the required canonical redirect. The worker now returns a scope-local 302 only when the failed navigation's document directory differs from the registration scope. Ordinary root/index and one-segment fallback behavior remains intact, as do atomic install and cache boundaries.

- `node --test tests/save.test.js`: 9/9 passed after the fix.
- `npm test`: 48/48 passed after all agents completed integration; this supersedes the earlier in-progress failure snapshot above.
- `npm run build`: passed; generated worker precaches 7 real production assets, excludes the JS sourcemap, revision `d54743bef41554bd`. This supersedes the earlier missing-stylesheet snapshot.
- Browser root offline reload was reported passing by root before this review fix. The nested regression is a modeled service-worker test; root should additionally confirm the canonical redirect and relative asset loading in the real production browser.

## Review follow-up: large inventories

Removed the 1000-item normalization slice, which could silently drop valid late-game equipment while reporting a successful write. Added regressions for a complete 1200-item round trip and a multibyte oversized save that must reject without replacing the previous raw save. The latter also verifies load rejection and distinguishes UTF-8 byte size from JavaScript string length. Observed RED on both regressions: restored length was 1000 rather than 1200; oversized writes incorrectly returned true. Both pass after the fix.

- `node --test tests/save.test.js`: 11/11 passed.
- `npm run build`: passed, 7 assets, revision `b3f3210167866ed9`.
- `npm test`: latest concurrent snapshot 50/52 passed. The two unrelated new navigation regressions failed: `AUTO takes over a manually attached rope and defeats an elevated target` and `AUTO resumes after toggling off and on in the middle of an ascent`. Root was notified; these belong to the concurrent engine review fix. All 11 save/PWA tests passed.

## Integration and remaining browser evidence

Root owns registration: production only, `navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')`. HTML should reference `%BASE_URL%manifest.webmanifest` and `%BASE_URL%icons/icon-192.png` for apple-touch-icon. Manifest uses relative id/start_url/scope, standalone display and landscape orientation.

Automated lifecycle tests execute the generated worker with modeled CacheStorage and fetch failures; they do not establish real browser service-worker lifecycle or installation support. Root will verify production first-load online, worker activation, browser offline reload, and local-save recovery in the browser. HTTPS or localhost is required. Android install UI and iOS Safari Share → Add to Home Screen vary by browser; iOS does not provide the Chromium install prompt. No physical-device install/performance claim is made. Saves are local to the origin/browser and can be cleared by browser storage deletion; private storage may be unavailable.
