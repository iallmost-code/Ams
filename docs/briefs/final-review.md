# Independent whole-game review

Reviewed the complete implementation represented by `artifacts/final-review.diff`, the current source, extension design contract, README, module evidence, navigation tests, browser test coverage, and rendered 740×360 / 390×844 gameplay captures. This review did not change product code or repeat the broad test suites. The two findings below were reproduced with narrow deterministic diagnostics and sent to the integration owner for fixes.

## Findings requiring fixes

### P1 — Enabling AUTO while attached to a rope leaves the hero stuck indefinitely

**Location:** `src/game/engine.js:881` (AUTO node selection), with `toggleAuto` clearing the route at `src/game/engine.js:328` and the no-target return at `src/game/engine.js:918`.

A manually climbing hero has `platformId: null`. Enabling AUTO clears `autoNavigation.edge`, so neither source of the navigation node exists. Because the hero is climbing, the airborne fallback is skipped; every target fails graph reachability, and the no-target return bypasses the stuck timer. The hero remains attached without movement or combat indefinitely. Toggling AUTO off/on while it is climbing produces the same state. Manual control can rescue the hero, but the promised AUTO recovery cannot.

Reproduction with the real engine: create a fresh game; set the hero's x to 231 to align with the first rope; advance 40 ticks at 1/120s with `{up:true}`; enable AUTO; advance 30 seconds with empty input. Before and after AUTO, y is `699.8750000000015`, climbing is `0-rope-low`, and `platformId` is null. After 30 seconds, kills remain 0 and navigation stuck remains 0. Preserve or reconstruct a valid route from the attached rope and add a regression for both entry paths.

### P2 — A successful save silently discards every inventory item beyond item 1,000

**Location:** `src/save.js:34` (`normalize` inventory slicing).

Gameplay allows unlimited collected gear and tells the player it has saved the session, but normalization applies `.slice(0,1000)` during both save and load. Extended AUTO play can accumulate more than 1,000 items: every third monster drops equipment, with no enforced inventory capacity or warning. Reload permanently loses later acquisitions. Equipping a new item also appends the old equipped item at the end, so the previously equipped item can be among the silently discarded entries.

Narrow roundtrip reproduction: fill a valid fresh game's inventory with 1,002 valid uniquely identified weapon items; call `saveProgress(serializeGame(game), storage)` and then `loadProgress(storage)`. The save returns `true`, the live inventory remains 1,002 items, and restored inventory contains exactly 1,000. Preserve valid entries or enforce an explicit gameplay capacity before acquisition; if a storage byte budget is exceeded, report failure instead of reporting a destructive successful save.

## Review notes and limits

- A directed route diagnostic tried every different source/target platform pair within the first area's seven platform nodes, giving the hero invulnerability and one target constrained to its platform. All 36 graph-reachable cases produced a kill within 35 simulated seconds, including high platforms, rope ascent, jump routes, adjacent shelves, and descents. Six cases targeting the currently graph-unreachable empty ledge were rejected; the shipped world has no monsters on those ledges, so these are not reported as gameplay defects.
- Enemy rewards guard against repeat rewards; current combat skips already-dead enemies. Rope end and lateral/jump detach handling, manual override, death recovery, area restrictions, class/skill/forge integration, and exact-build PWA asset generation were inspected without another blocking finding.
- The mobile screenshots keep movement, combat, AUTO, inventory, class, forge, map, pause, and quest controls within the viewport. This does not certify physical phone performance or Safari behavior.
- Root's browser evidence and the service-worker module's modeled tests are separate from this static/narrow-diagnostic review. Root owns the final production suite and verification of the two fixes above. The touch test corrections reported by root reflect enemy recoil and CDP touch-end semantics; this review found no independent input-release defect.
- This review requests no additional expanded features such as accounts, offline combat rewards, multiplayer, procedural terrain, or an inventory management redesign.

## Scoped fix re-review — both findings addressed

Reviewed `artifacts/review-fixes.diff` and the changed engine/save code and regression tests. Formatting-only changes were separated from behavior changes. No new defect was found within the fix scope.

- **P1 addressed:** AUTO reconstructs a rope traversal edge from the hero's actual attached rope when its prior route was cleared. It also finishes a climb when there are no targets, and early-return paths now run the shared recovery logic. The added regressions assert actual kills after manual rope takeover and mid-ascent off/on toggling, plus a safe grounded exit when no enemies exist.
- **P2 addressed:** Save normalization preserves every valid inventory item. Reads and writes share a 2,000,000-byte UTF-8 JSON budget, and oversized writes return false before touching the previous stored save. Tests prove a complete 1,200-item roundtrip and preservation of the previous save when an oversized multibyte payload is rejected.

Independent targeted command executed during this re-review:

```sh
node --test --test-name-pattern='manually attached rope|toggling off and on|more than 1000|oversized UTF-8' tests/navigation.test.js tests/save.test.js
```

**Result: 5 passed, 0 failed.** No broad suite was repeated; final production/build/browser evidence remains owned by the integration run. Both original review findings are resolved.
