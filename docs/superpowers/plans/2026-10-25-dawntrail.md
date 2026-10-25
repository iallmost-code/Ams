# Dawntrail Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a playable Vanguard first region with discrete maps, timed combat and build-changing randomized loot.
**Architecture:** Isolated chapter simulation/state, original world definitions and gear module, UI and specialized renderer reusing proven art/input. Bootstrap selects legacy or chapter; separate local save key and ephemeral training.
**Tech Stack:** Vite, JavaScript, Canvas, CSS, Node tests, Playwright.
**Spec:** docs/superpowers/specs/2026-10-25-dawntrail-design.md

## Global Constraints
- Mobile browser, multitouch, offline/PWA/portable HTML, no backend/accounts.
- Preserve original names and art, legacy saves/gameplay; no merge/publishing.
- New branch from latest main; chapter-first scope approved by user.

## Review Focus
- Corrupt/old save: reject invalid stats and keep legacy storage untouched.
- Portal arrival: no immediate bounce, always a supported landing, return route works.
- Low frame rate: fixed-step hit timings apply once, no repeated loot rewards.
- Gear: equipped/locked/starred items survive batch cleanup, affixes affect actual combat.
- Mobile: controls remain reachable, modal scroll and pause clear held input.

### Task 1: Region and randomized equipment
**Files:** src/chapter/world.js, gear.js; tests/chapter.test.js
**Interfaces:** createMap(id) returns independent world/enemies/portals; rollGear(seed,type,rarity) deterministic item; gearStats(items) aggregates bounded percent bonuses.
- [ ] Write failing map-isolation, reciprocal portal, randomized roll and protected-item tests; run Node tests and confirm RED.
- [ ] Define four maps and enemy families, loot/affix generation and score functions.
- [ ] Run chapter tests GREEN and whole unit suite. Commit.

### Task 2: Playable Vanguard simulation
**Files:** src/chapter/engine.js; tests/chapter.test.js
**Interfaces:** createChapter(saved), updateChapter(state,input,dt), chapterAction(state,action,arg), serializeChapter(state).
- [ ] Write failing startup/hit-once, buffered jump, portal/save and progression tests; confirm RED.
- [ ] Implement movement, timed combat, enemies/guardian telegraphs, drops, quests, pets, build stats and safe persistence. Training bypasses saving only, not combat.
- [ ] Run chapter tests GREEN and unit suite. Commit.

### Task 3: Illustrated motion and mobile chapter interface
**Files:** src/chapter/main.js, renderer.js, chapter.css; src/bootstrap.js; index.html; src/ui.js; assets.
**Interfaces:** startChapter() binds real input/UI and renderer; title link selects chapter. readonly diagnostics for browser verification.
- [ ] Add failing E2E entry/travel/cast/equipment tests; confirm missing UI failure.
- [ ] Add animated Vanguard poses, holy skill choreography, region navigator, build/gear/quest panels, compact touch controls, training entry and separate save.
- [ ] Verify phone screenshots, actual hits/monster deaths, responsive controls, return portals and reload; run full suite. Commit.

### Task 4: Finish and review
**Files:** docs/QA.md, README.md, AetherStory.html; tests/e2e/chapter.spec.js.
- [ ] Run npm test, build, build:html, test:e2e and retained legacy balance.
- [ ] Document implemented scope and preview balance honestly; regenerate portable HTML and capture both phone views.
- [ ] Review whole diff, fix material findings with tests; push new branch and open PR into main, no merge/publish.
