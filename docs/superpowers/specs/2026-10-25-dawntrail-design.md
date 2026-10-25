# Dawntrail: Vanguard and first-region playable chapter

User chose a complete Vanguard-and-region preview before extending the other classes. Build on the existing mobile Canvas/Vite project, original artwork and offline/portable support. Work from merged PR8 on a new branch, keep legacy saves and gameplay accessible, no deployment or merge.

## Scope
An independently saved chapter, accessible prominently from the title. Four separate maps: Lantern Hollow village, Sunpetal Fields, Bellroot Rise and the Broken Sanctuary guardian arena. Portal travel loads a new local world; boundaries are visibly closed terrain, not level gates across one continuous floor. Distinct layouts, monster populations, elevations and return routes. A regional map shows connections. Village supplies and quests give a reason to return.

Vanguard is a holy hammer-and-shield warrior. Responsive full-speed thumb movement, jump buffering/coyote time, an aerial advance, readable swing startup/impact/recovery, combo swings, a forward shield strike, consecrated hammer skill, timed defensive blessing and an earned ultimate. Damage resolves at visible strike times. Blocking, critical/strength/survival builds must alter actual combat. Pip collects drops and supplies a limited healing ability.

Equipment has variable base rolls and rarity-dependent percentage affixes. Random monster-specific drops, six slots, item comparison, equip-best, locks and protected dismantling. A build choice and mastery strengthen the character; level-ups increase HP/MP and attack. No paid/random purchase mechanic. Level gates apply to skills rather than invisible map travel. Training is an explicitly separate session with all moves available; it cannot overwrite chapter progress.

Reuse existing illustrated scenery, terrain and creatures, with new Vanguard motion artwork. Existing classes/long balance benchmark remain in the legacy mode. Preview balance is measured independently, not claimed to match the legacy 27-minute curve.

## Approach
A separate chapter simulation and UI use the existing renderer with a specialized Vanguard renderer. This keeps old saves and the proven game available while replacing the world/combat together. A wholesale rewrite of all classes would delay an assessable result; adding only effects would leave the underlying problem. The user selected this chapter-first approach.

## Completion
Playable village-to-guardian route, persistent gear and character progress, real skill actions, random affixes consumed by stats, return portals, touch/keyboard/pause, offline and portable export. Unit tests cover transitions, collision, attack timing, builds, drops and saves. Real browser screenshots at 844×390 and 390×844. All existing checks pass; new PR into main, no merge or publishing.
