# AetherStory M Implementation Plan

> For agentic workers: implement with coordinated parallel tasks on disjoint files, followed by integration and fresh review. User explicitly requested continuous implementation in phases.

**Goal:** A polished mobile Canvas fantasy auto-RPG, playable offline with persistent progression.
**Architecture:** Deterministic engine, original canvas renderer, DOM UI/input, validated save layer and generated PWA precache. Shared interfaces are in the written design.
**Tech Stack:** JavaScript, Canvas 2D, Vite, Node test runner, Playwright.
**Spec:** docs/superpowers/specs/2026-10-21-aetherstory-design.md

## Global Constraints

- No backend, accounts or copyrighted assets.
- All movement and physics use seconds in fixed world coordinates.
- Preserve the supplied prototype's platform combat and ropes.
- Pointer cancellation, storage failure and resizing cannot break play.
- Test movement, combat, monster death and navigation; run production build and browser checks.

## Review Focus

1. AUTO reaching a high platform rather than attacking an unreachable target.
2. Rope top/bottom and jump detachment, including input cancellation.
3. Once-only monster rewards under repeated attack inputs.
4. Corrupted saves and denied storage preserving a playable default.
5. Full installed shell being available during an offline production reload.

### Task 1: Simulation and navigation

Files: src/game/*.js, tests/engine.test.js, tests/navigation.test.js.
Produces the exact engine/state API in the spec. Depends only on plain JS.
- [x] Write behavioral tests and observe failures for missing mechanics.
- [x] Implement world, fixed-step physics, rope/jump navigation, directional cooldown combat, RPG inventory/progression, drops, death and respawn.
- [x] Implement graph-based AUTO and long-running deterministic tests.
- [x] Run node --test tests/engine.test.js tests/navigation.test.js.

### Task 2: Illustration and camera

Files: src/renderer.js and optional original public/art assets.
Consumes engine state; produces Renderer API from spec.
- [x] Build layered woodland art, illustrated platforms and characters, original enemies, animation and effects.
- [x] Implement responsive DPR-capped camera and reduced-motion/particles settings.
- [x] Verify in the integrated browser at mobile and desktop sizes.

### Task 3: Interface and input

Files: src/ui.js, src/input.js, src/style.css, index.html, tests/input.test.js.
Consumes state; produces createUI/createInput APIs from spec.
- [x] Write cancellation/multitouch tests first and observe missing behavior.
- [x] Build polished HUD/start/modals, touch/keyboard controls and accessible buttons.
- [x] Test input clearing and independent pointers, then browser-check panels.

### Task 4: Saves and offline shell

Files: src/save.js, public/manifest.webmanifest, public/icons/*, scripts/build-sw.js, tests/save.test.js.
Consumes serializable engine progress. Produces load/save/clear and build-generated dist/sw.js.
- [x] Write validation/unavailable-storage tests and observe failures.
- [x] Implement bounded schema validation and failure-tolerant local saves.
- [x] Add install manifest/icons and build script generating precache of hashed assets.
- [x] Run save tests and inspect production precache.

### Task 5: Integration and QA

Files: src/main.js, package.json, vite.config.js, playwright.config.js, tests/e2e/*, README.md, docs/QA.md.
Consumes Tasks 1-4 interfaces.
- [x] Integrate fixed-step loop, all actions, safe lifecycle clearing/saving, audio and PWA registration.
- [x] Exercise actual playing, manual controls, AUTO, panels, mobile sizing and offline production reload with browser tests.
- [x] Fix observed defects with regression coverage; run whole suite and build.
- [x] Fresh review of final code; document tested results and honest remaining limits.
