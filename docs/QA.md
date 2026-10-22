# AetherStory balance and phone QA

Measured with Node 24.19.0 and Chromium/Playwright in the managed Linux workspace. No physical Android or iPhone was attached; these results do not certify Safari or device frame times.

## Balance measurements

Reproduce with `npm run balance`. This PR update was measured before and after with the same real `updateGame` fixed steps, seed, equipment and purchase policies. Reports: [before this update](qa/quest-balance-before.json), [after](qa/quest-balance-after.json). The earlier prototype baseline remains [here](qa/balance-before.json). No simulation XP, damage, healing or time multipliers are used.

| Measurement | PR #4 before fixes | After fixes |
| --- | --- | --- |
| Fresh starter AUTO → level 10 | 28:23 | 27:00 |
| AUTO with paid progression → level 10 | 29:02 | 27:37 |
| AUTO with paid progression → level 25 | 3:49:03 | 3:46:27 |
| Unassisted AUTO-quest → level 10 | Not measured | 28:09 |
| Glade story content | 3 missions, then level-10 gate | 8 missions, completed at 22:11 / Lv.9 |
| Longest stretch without an actionable story quest or daily bounty, Lv.1–10 | Not measured | 0 seconds |
| Fresh starter AUTO, level at 10 min / 1 hour | 7 / 12 | 7 / 12 |
| Fresh starter AUTO, gold at 1 hour | 25,689 | 25,650 (no purchases) |
| Paid progression, gold at 1 hour | 1,339 retained; 58,026 spent | 1,368 retained; 58,673 spent |
| Paid progression deaths, first hour / four hours | 0 / 14 | 1 / 19 |
| First boss kill in fresh AUTO | None in 1 hour | None in 1 hour |
| Geared boss fight with dodge input | 2:19.43; 0 deaths | 2:19.43; 0 deaths |
| Starter gear in boss arena, 1-hour run | 1 death; no boss kill | 1 death; no boss kill |

The five new story rewards give **200 / 350 / 550 / 800 / 1,100 XP**, each about 12–20% of its level's next-level requirement, totaling 3,000 XP. Daily bounties give **zero XP**. Thresholds at levels 3–9 are 5% lower to offset quest travel; level 10+ retains the previous steep curve. All area level requirements remain unchanged.

Scenarios are deliberately distinct:

- **Fresh starter AUTO** never equips, shops, forges, or manually travels. AUTO now hunts the selected area rather than crossing into every newly unlocked area. It remains in Emerald Glade and has **0 deaths in one hour**; this safe-area figure is not evidence of boss survivability.
- **Paid progression** equips stronger drops, salvages spare gear, buys 90-gold tonics, trains vitality/mastery up to rank 6 and forges gear up to ★5. It chooses prepared hunting areas and leaves boss dodging to the player. It has **1 death in its first hour and 19 deaths over four hours**. Its level 25 time is a four-hour scenario, not a projection from a short run. Its policy stops upgrading at those caps; further training and forge ranks remain available gold sinks. Total spending after four hours: 174,573 gold.
- **Starter boss arena** starts at the required level 20, with the original weapon/armor and three tonics, next to the isolated guardian. AUTO loses, respawns in safety, and does not return automatically. The remaining hour is safe-area idle time, so the result is one death rather than repeated forced deaths.
- **Geared boss benchmark** uses a level-20 Vanguard, weapon 85 ATK/★7; five armor pieces at 26 DEF/★5; vitality rank 8, mastery rank 6 and skill ranks 5/5/3/1. This yields 278 ATK, 253 DEF, 912 HP. Its controller actually moves out of meteor columns and times jumps over shockwaves; it is not ordinary AUTO. No damage or cooldowns are disabled. It takes no hits in this ideal dodge run.

The table’s default class is Vanguard. Updated one-hour class probes reached level 10 in **26:38 Arcanist**, **27:36 Nightblade**, **26:53 Ranger**; all three finished at level 12 with zero deaths and no boss kill. The raw probes are [recorded here](qa/quest-class-balance.json).

Areas unlock at levels **1 / 10 / 16 / 20**. Higher-area creatures chase on their platform and have stronger damage and HP; separate regressions confirm starter gear can die in each newly unlocked hunting ground. The guardian has **150,000 HP**, fixed 1.25-second shockwave and 1.5-second meteor warnings, and a 4.2-second recovery. Jumping avoids shockwaves; meteor columns require horizontal movement. Pip heals **11% max HP every 35 seconds**. Tonics restore 45% HP with a 10-second cooldown. Armor mitigation remains bounded above zero damage.

Forge gold costs are `150 × 1.7^stars + 50 × stars²`, capped at 5,000,000 per attempt; core costs also increase. Training costs `250 × nextRank²`. Online/offline monster reward formulas are shared; offline rewards remain AUTO-only, non-boss, once per absence and capped at eight hours.

## Automated verification

- `npm test`: **97 passed, 0 failed**. Includes a real one-hour fresh AUTO simulation, one-hour under-geared boss simulation, four-hour paid progression, timed geared boss fight, danger in all higher areas, telegraph dodge/counterplay, healing/potion cooldowns, prices, training/saves, navigation, physics and atlas gutter bounds.
- `npm run build`: passed; 25 modules and 13 local precached production assets, including all six painted images. Background filtering is cached rather than reapplied every frame.
- `npm run test:e2e`: **28 passed, 0 failed**. Checks cover controls, all classes/skills/areas and portals, reload persistence, forge, shop purchases, training, mobile geometry, offline PWA and storage failure.
- `npm run build:html`: passed; the single HTML embeds artwork and does not register a service worker.
- `git diff --check`: required before commit/PR.

The phone checks use **844×390 and 390×844**, plus existing 932×430, 740×360 and 1440×900 cases. They assert utility dock position, the short-screen character card dimensions, minimap expansion/collapse, complete forge bounds without scrolling, and usable start/stop/result controls. The original class/portal checks now use protective test gear so intentional higher-area danger does not invalidate an unrelated navigation check.

## Review screenshots

Before images were captured from the existing live site. After images are captured against this branch's production build using actual game controls; AUTO remains active in the play screenshots. No site publishing was used to create the previews.

| Phone | Before | After |
| --- | --- | --- |
| Landscape 844×390 | [Before](qa/before-landscape.png) | [After](qa/after-landscape.png) |
| Portrait 390×844 | [Before](qa/before-portrait.png) | [After](qa/after-portrait.png) |
| Landscape forge | [Before](qa/before-forge-landscape.png) | [After](qa/after-forge-landscape.png) |
| Portrait forge | [Before](qa/before-forge-portrait.png) | [After](qa/after-forge-portrait.png) |

Additional art checks: [Crystal Cavern](qa/after-cavern.png), [Ember Altar](qa/after-altar.png). All six images decode in browser checks. Pip uses painted animation frames; character and creature frames have isolated transparent sampling gutters. Damage and pickup text use bold colored gradients with a dark outline; background scenery is softened/desaturated while real platforms stay sharp.

## Publishing boundary

This update stays on `feat/quests-auto-quest` and the existing PR #4 into `main`. **No push to `gh-pages` and no merge to main** is part of this task. `.github/workflows/pages.yml` publishes checked artifacts only on a push to main, with matching job guards. PR CI cannot deploy.

GitHub reports Pages build type `workflow`; the `github-pages` environment permits **main only**. PR #3 has been merged separately, and its main-only publication succeeded. The quest feature branch has not been merged or deployed. No direct push to `gh-pages` is used.

## Quest chains and AUTO-questing

Implemented **seventeen ordered missions**: eight in Emerald Glade and three in each later area. Four nearby guides carry the story: Elder Rowan, Scout Lyra, Artificer Iona and Warden Ceryn. Acceptance and rewards require the actual giver and the appropriate level. Hunts require matching creatures in the correct area, collections require picked-up drops, exploration requires the marked platform/location, and the guardian mission requires a real boss defeat.

The five Glade additions are **Footprints in the dew (Lv.3)**, **A wick for every window (Lv.5)**, **The windward signal (Lv.6)**, **The lantern thief (Lv.8)** and **A light for Lyra (Lv.9)**. They mix hunts, mushroom embers, a mid-platform climb and the named mini-boss **Gloamcap, the Lantern Thief**. Gloamcap has 600 HP and 45 damage versus the ordinary spawn’s 80 HP and 16 damage, with a crown, enlarged painted sprite and readable name pill. Only that enemy ID counts. Its ordinary spawn stats return after the encounter; active reloads restore the encounter.

The real-engine starter-gear story run completes the first three introductory missions in **67 simulated seconds**, all eight Glade missions at **22:11 / Lv.9**, and reaches Lv.10 at **28:09**, with **zero deaths**, no purchases, no equipment changes and no automation restarts. Two daily rewards are claimed; the third is active at **579/600**. The longest interval without an available/active/ready story objective or bounty is **zero seconds**. This measures continuous objective availability, not a new story completion every five minutes. A daily patrol supplies an objective during the longer level gates.

### Rowan’s daily board

There are **three shared bounties per local calendar day**, carried by every area’s guide: 60, 120 and 600 non-boss creature defeats. The final bounty is a longer patrol that carries progress across areas. Rewards are respectively 60 gold/1 core, 90 gold/1 core and 120 gold/2 cores, with no XP. Only one is active at a time. Normal combat and active story hunts both count; offline expedition estimates do not. Accept and claim near a guide using the journal/dialogue board. AUTO-quest accepts, hunts and turns in bounties while waiting for story level gates.

At local midnight, claimed rewards, partial progress and unclaimed turn-ins reset. The board refreshes while open, on load and before acceptance/claim. Rewards are marked claimed before payout and survive reload; moving the clock backward does not reset the board. This remains a device-local save and clock, not a server-authoritative daily system.

The tracker shows the next quest’s name, required level and an active daily’s progress or a suggestion to try the board. Gold pickups now use the same 28px, weight-900 dark-outlined treatment as damage numbers and stay fully opaque longer. NPCs and the player share a contrasting bordered name pill. The portrait orientation tip occupies a separate left-side slot, disappears after 5.5 seconds, and is suppressed for the rest of the tab’s session, including reload and rotation.

### Regression coverage and limits

Seven new unit tests cover the spread level gates, all-area real-combat daily progress, three-claim cap, exact local-midnight reset, unclaimed/partial expiration, backward-clock protection, validated save/reload claim protection, legacy twelve-mission migration, the actual named encounter and the full Lv.1–10 AUTO-quest objective-gap/timing run. Existing story tests now cover all seventeen missions. Journal revision 2 preserves later-chapter progress from earlier PR #4 saves without awarding the inserted missions’ rewards. Daily state is an additive validated v4 save field; old saves receive an empty current-day board.

Four new browser checks cover the once-per-session portrait hint without area-label overlap, daily claim persistence, locked quest suggestions and usable daily boards in both phone sizes. All previous checks still cover classes, maps/portals, forge/equipment/skills, shop, offline summary and offline PWA reload. The standalone HTML starts with all six painted assets, no external requests and no page errors in Chromium's embedded-content check.

| Phone | Active tracker | Locked quest suggestion | Daily board | Journal |
| --- | --- | --- | --- | --- |
| 844×390 landscape | [Tracker](qa/quest-tracker-landscape.png) | [Level gate](qa/quest-gate-landscape.png) | [Daily board](qa/daily-board-landscape.png) | [Journal](qa/quests-landscape.png) |
| 390×844 portrait | [Tracker](qa/quest-tracker-portrait.png) | [Level gate](qa/quest-gate-portrait.png) | [Daily board](qa/daily-board-portrait.png) | [Journal](qa/quests-portrait.png) |

Daily dungeons, additional job advancements and gear-set bonuses remain outside this installment. Physical iPhone/Android testing and a multi-hour all-chapter story playthrough remain unverified. The four-hour paid-progression benchmark is ordinary hunting, not an all-chapter quest run.
