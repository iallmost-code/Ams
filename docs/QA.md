# AetherStory balance and phone QA

Measured with Node 24.19.0 and Chromium/Playwright in the managed Linux workspace. No physical Android or iPhone was attached; these results do not certify Safari or device frame times.

## Balance measurements

Reproduce with `npm run balance`. Current before/after reports are [before the AUTO safety fixes](qa/auto-safety-balance-before.json) and [after](qa/auto-safety-balance-after.json). The [35-minute failure reproduction](qa/auto-safety-repro-before.json) records the previous Canopy death. Earlier quest and prototype reports remain archived under `docs/qa/`. Simulations use the real `updateGame` at 1/120-second substeps, with no time, XP, damage or healing multipliers.

| Measurement | Before this update | After |
| --- | --- | --- |
| Fresh-account AUTO → Lv.10 | 27:00 | **27:06** |
| Hands-off AUTO-quest → Lv.10 | 28:09 | **27:13** |
| Hands-off AUTO-quest at 35 minutes | 1 death; stopped / fallen | **0 deaths; still active** |
| First Canopy arrival with insufficient gear | 28:11; death at 28:27 | **Held in Glade with preparation message** |
| Paid progression → Lv.10 | 27:37 | **27:36** |
| Paid progression → Lv.25 | 3:46:27 | **3:52:29** |
| Longest Lv.1–10 interval without a story objective/bounty | 0 seconds (600-kill daily active) | **2:54**, within the 5-minute bound |
| Fresh AUTO, level at 10 min / 1 hour | 7 / 12 | **7 / 12** |
| Fresh AUTO, gold at 1 hour | 25,650 | **25,819**, no purchases |
| Paid progression, gold at 1 hour | 1,368 kept; 58,673 spent | **2,704 kept; 56,873 spent** |
| Paid progression deaths, first hour / four hours | 1 / 19 | **0 / 0** |
| First boss kill in fresh AUTO | None in 1 hour | **None in 1 hour** |
| Geared boss with manual dodge controller | 2:19.43 | **2:19.43** |
| Under-geared AUTO boss scenario, one hour | 1 death; no kill | **1 death; no kill** |
| Manual under-geared boss control | Not measured separately | **1 death; no boss kill** |

Five bridge missions still give 200/350/550/800/1,100 XP. The existing XP curve, enemy HP/damage, 11% Pip heal/35s cooldown and 45% tonic/10s cooldown were not changed in this safety update. New daily rewards give only 2%, 3% and 5% of the current level’s next-level requirement, once per bounty per day. Automatic gear selection now improves fresh accounts; the fresh AUTO scenario no longer means equipment is held at its original starter values.

Scenarios are deliberately distinct:

- **Fresh-account AUTO** automatically equips better bag gear, but never purchases, forges, or manually travels. AUTO now hunts the selected area rather than crossing into every newly unlocked area. It remains in Emerald Glade and has **0 deaths in one hour**; this safe-area figure is not evidence of boss survivability.
- **Paid progression** equips stronger drops, salvages spare gear, buys 90-gold tonics, trains vitality/mastery up to rank 6 and forges gear up to ★5. It chooses prepared hunting areas and leaves boss dodging to the player. It has **zero deaths in its first hour and over four hours**. Its level 25 time is a four-hour scenario, not a projection from a short run. Its policy stops upgrading at those caps; further training and forge ranks remain available gold sinks. Total spending after four hours: 175,923 gold.
- **Starter boss arena** starts at the required level 20, with the original weapon/armor and three tonics, next to the isolated guardian. AUTO loses, respawns in safety, and does not return automatically. The remaining hour is safe-area idle time, so the result is one death rather than repeated forced deaths.
- **Geared boss benchmark** uses a level-20 Vanguard, weapon 85 ATK/★7; five armor pieces at 26 DEF/★5; vitality rank 8, mastery rank 6 and skill ranks 5/5/3/1. This yields 278 ATK, 253 DEF, 912 HP. Its controller actually moves out of meteor columns and times jumps over shockwaves; it is not ordinary AUTO. No damage or cooldowns are disabled. It takes no hits in this ideal dodge run.

The table uses Vanguard. [Earlier class probes](qa/quest-class-balance.json) predate automatic equipment selection; current browser coverage still exercises all four classes and their skills/portals.

Areas unlock at levels **1 / 10 / 16 / 20**. Higher-area creatures chase on their platform and have stronger damage and HP; separate regressions confirm starter gear can die in each newly unlocked hunting ground. The guardian has **150,000 HP**, fixed 1.25-second shockwave and 1.5-second meteor warnings, and a 4.2-second recovery. Jumping avoids shockwaves; meteor columns require horizontal movement. Pip heals **11% max HP every 35 seconds**. Tonics restore 45% HP with a 10-second cooldown. Armor mitigation remains bounded above zero damage.

Forge gold costs are `150 × 1.7^stars + 50 × stars²`, capped at 5,000,000 per attempt; core costs also increase. Training costs `250 × nextRank²`. Online/offline monster reward formulas are shared; offline rewards remain AUTO-only, non-boss, once per absence and capped at eight hours.

## Automated verification

- `npm test`: **105 passed, 0 failed**. Includes a real one-hour fresh AUTO simulation, 35-minute hands-off AUTO-quest survival, short manual under-geared danger controls, a 15-minute paid progression smoke test, timed geared boss fight, danger in all higher areas, telegraph dodge/counterplay, healing/potion cooldowns, prices, training/saves, navigation, physics and atlas gutter bounds.
- `npm run build`: passed; 27 modules and 13 local precached production assets, including all six painted images. Background filtering is cached rather than reapplied every frame.
- `npm run test:e2e`: **31 passed, 0 failed**. Checks cover controls, all classes/skills/areas and portals, reload persistence, forge, shop purchases, training, mobile geometry, offline PWA and storage failure.
- `npm run build:html`: passed; the single HTML embeds artwork and does not register a service worker.
- `git diff --check`: passed before commit.
- `npm run balance`: retains the full one-hour and four-hour scenarios, with explicit assertions for progression timing, AUTO-quest survival/objective gaps and manual boss danger. Multi-hour progression is no longer repeated by `npm test`.

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

The current fresh-account story run completes the introductory trio in **66 seconds**, all eight Glade missions at **21:10 / Lv.9**, and reaches Lv.10 at **27:13**. It uses automatic gear upgrades, no purchases or manual equipment changes, and no death restarts. At 35 minutes it is alive and AUTO-quest remains active in the Glade, with 74 ATK / 65 DEF. The Canopy requires 75 ATK / 60 DEF, so the tracker correctly says **“Gear up before Whispering Canopy — check Bag / Forge / Shop.”** This is a readiness hold, not a failed route or a stopped controller.

### AUTO equipment, preparation and recovery

AUTO and AUTO-quest inspect the bag once per simulated second. Weapons compare effective attack, armor slots compare effective defense, including the existing `1 + stars × 0.12` multiplier. The runtime and paid benchmark use the same comparison and area thresholds. Only strictly stronger pieces replace a slot; displaced gear stays in the bag. Manual mode does not automatically change equipment.

Preparation thresholds are Glade 0/0, Canopy **75 ATK / 60 DEF**, Cavern **175 / 150**, Altar **300 / 250**. AUTO-quest checks every forward portal step before moving to a harder area. Unlocking an area by level is not sufficient. If underprepared, it continues hunting in the current area and displays the Bag/Forge/Shop message. Manual travel is still allowed, and manual starter-gear controls still die in the higher areas.

At low HP, AUTO tries an available tonic. If healing is unavailable it stops attacking, drops through one-way platforms and returns to the sheltered edge of its current area. It waits for tonic/Pip recovery before resuming; manual input still takes priority. A separate five-minute prepared-Canopy regression verifies it can recover without being pinned on a platform. No invulnerability, automatic gold spending or healing-strength increase was added.

### Rowan’s daily board

Three shared local-calendar-day bounties now require **25 / 50 / 100** non-boss defeats, down from 60/120/600. Rewards:

| Bounty | Gold | Cores | Tonics | XP at claim |
| --- | --- | --- | --- | --- |
| Trail patrol | 100 | 2 | 1 | 2% of current next-level requirement |
| Lantern watch | 180 | 3 | 1 | 3% |
| Warden relief | 300 | 5 | 3 | 5% |

Any area’s guide carries Rowan’s board. One bounty is active at a time, all-area combat and story kills count, and offline estimates do not count. Claims are recorded before payout and survive reload. Midnight expires partial/unclaimed work and opens a new three-reward allowance; a backward clock change cannot reset it again. Old active progress clamps to the new smaller target; already claimed rewards stay claimed.

To avoid spending all three short bounties during the first few minutes, AUTO-quest reserves one automatic acceptance for each longer level gate from the Lv.8 mission onward. Players can accept earlier at any guide. The measured Lv.1–10 objective gap is **174 seconds**, below the five-minute regression limit. Dates and saves remain device-local, not server-authoritative.

### Screen text

Player, NPC, pet and named-creature plates use **11 CSS-pixel** text; damage/gold use **20 CSS pixels**. Other floating messages use 13–16 CSS pixels. Device pixel ratio affects raster resolution, not text size. NPC plates start below the feet and draw above terrain/sprites; completely off-screen NPCs do not produce edge labels.

Floating messages are measured in screen space, clamped to a four-pixel viewport margin and placed in non-overlapping stacks. If the viewport is completely saturated, excess popups are omitted rather than overlapped. Geometry tests place fourteen simultaneous quest/gold/damage boxes at opposing viewport corners. Actual browser checks measure gold and name sizes, bounds and separation in both phone orientations; the portrait capture includes Elder Rowan’s name and a real gold pickup together.

### Regression coverage and limits

Eight added regressions cover automatic equipment comparison/manual-mode preservation, preparation holds, low-health attack suppression, 35-minute survival, prepared-Canopy recovery, short bounty payouts, CSS projection and simultaneous text geometry. Existing seventeen-mission, migration, midnight/reset, reload/duplicate-claim, offline and manual-override checks remain. Three added browser checks exercise actual gold/name rendering in both phone orientations and the readiness tracker.

The standalone HTML loads all six painted assets with no external requests or uncaught page errors in Chromium's embedded-content check. Journal revision 2 and additive v4 daily saves remain compatible; quest automation never resumes automatically after reload.

### CI duration

The prior successful run spent **19 seconds in `npm test` but 6m 44s installing browser dependencies**, then about 2m 7s in browser tests, finishing near the ten-minute limit. The current workflow uses the GitHub Ubuntu runner’s preinstalled `/usr/bin/google-chrome`, verifies that binary and avoids the browser/dependency download. PR updates run one check instead of duplicate push/PR checks; newer commits cancel superseded runs. Main still gets checks, and the Pages workflow still publishes only from main.

`npm test` keeps the one-hour progression regression and the new exact 35-minute reproduction, but moves the four-hour paid benchmark to `npm run balance`, retaining a 15-minute smoke test in CI. All simulations still use the real 1/120-second engine. The latest local 105-test run took **16.9s while the full balance report ran concurrently**; a lighter run took about 9.8s. The CI timeout remains **10 minutes**. The [verified code CI run](https://github.com/iallmost-code/Ams/actions/runs/39809666347) completed successfully in **2m 12s**, below the five-minute target: unit tests took **6s**, Chrome verification required no download, and all 31 browser tests finished in **1m 48s**.

### Current phone captures

| Phone | Real gold + NPC tag | Tracker | Daily board |
| --- | --- | --- | --- |
| 844×390 | [Text readability](qa/readable-text-landscape.png) | [Tracker](qa/quest-tracker-landscape.png) | [Daily board](qa/daily-board-landscape.png) |
| 390×844 | [NPC name and gold together](qa/readable-text-portrait.png) | [Tracker](qa/quest-tracker-portrait.png) | [Daily board](qa/daily-board-portrait.png) |

| Phone | Active tracker | Locked quest suggestion | Daily board | Journal |
| --- | --- | --- | --- | --- |
| 844×390 landscape | [Tracker](qa/quest-tracker-landscape.png) | [Level gate](qa/quest-gate-landscape.png) | [Daily board](qa/daily-board-landscape.png) | [Journal](qa/quests-landscape.png) |
| 390×844 portrait | [Tracker](qa/quest-tracker-portrait.png) | [Level gate](qa/quest-gate-portrait.png) | [Daily board](qa/daily-board-portrait.png) | [Journal](qa/quests-portrait.png) |

Daily dungeons, additional job advancements and gear-set bonuses remain outside this installment. Physical iPhone/Android testing and a multi-hour all-chapter story playthrough remain unverified. The four-hour paid-progression benchmark is ordinary hunting, not an all-chapter quest run.
