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

- `npm test`: **118 passed, 0 failed**. Includes a real one-hour fresh AUTO simulation, 35-minute hands-off AUTO-quest survival, short manual under-geared danger controls, a 15-minute paid progression smoke test, timed geared boss fight, danger in all higher areas, telegraph dodge/counterplay, healing/potion cooldowns, prices, training/saves, navigation, physics and atlas gutter bounds.
- `npm run build`: passed; 28 modules and 13 local precached production assets, including all six painted images. Background filtering is cached rather than reapplied every frame.
- `npm run test:e2e`: **39 passed, 0 failed**. Checks cover controls, all classes/skills/areas and portals, reload persistence, forge, shop purchases, training, mobile geometry, offline PWA and storage failure.
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

PR #4 was merged before this feature branch was created from latest `main` (`a243921`). This inventory update stays on `feat/inventory-tools` in a new PR into `main`. No merge or direct `gh-pages` push is part of this task. Pages publishes only from `main`; PR CI cannot deploy.

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


## Inventory tools

Equip Best calls the same `equipBestGear()` as AUTO, once per button press. The comparison is weapon attack / other-slot defense multiplied by `1 + stars × 0.12`; ties retain equipped gear and displaced items return to the bag. No level/class gear restrictions exist in this game's item model. Bag item stat labels now include stars, using the same scoring helper.

Dismantle Low Gear runs that helper on temporary inventory/equipment containers to prepare a nonmutating quote. Confirm revalidates the quote, equips upgrades and salvages the selected spares. Cancel leaves equipment, inventory and currencies unchanged. Normal and Rare start checked; Epic is opt-in. Equipped items, forged items, locked items and non-gear items never qualify. Rewards share the single-salvage formula: 35 gold for each unstarred item and one core (Normal/Rare) or two (Epic). No reward or progression formula changed.

Locks are additive to v4 item saves: only literal `true` is restored as locked, and older saves remain unlocked. Single salvage checks locks in the engine as well as disabling the UI button. Inventory locks also remain attached when equipment moves between the bag and a slot.

Five unit regressions cover effective scores for all six slots, AUTO/manual parity, retaining displaced/equipped gear, preview cancellation, protected items, rarity filtering, changed-quote rejection, reward equivalence and validated save/reload migration. Two touch browser scenarios verify real stat increases, quoted reward totals and bag counts, unchanged Cancel state, empty-result toast, disabled locked salvage and locks after reload.

The batch controls sit above the independently scrolling item list, with 44px minimum height. The six-slot equipped overview is collapsed under “Worn gear”; it can still be expanded in the Bag, and the Forge also shows equipped pieces. Both Bag buttons and Confirm/Cancel are fully inside the viewport without panel scrolling at 844×390 and 390×844.

| Phone | Bag tools | Confirmation |
| --- | --- | --- |
| 844×390 | [Bag](qa/inventory-bag-landscape.png) | [Confirmation](qa/inventory-confirm-landscape.png) |
| 390×844 | [Bag](qa/inventory-bag-portrait.png) | [Confirmation](qa/inventory-confirm-portrait.png) |

The screenshots use seeded loot with ordinary gameplay values and actual touch actions against the production build. Existing balance regression scenarios still run in the unit suite; no new long simulation was added. Physical-device Safari testing remains unverified.

Inventory verification: `npm test` passed all 110 tests (22.8s alongside browser checks); the full 33-test browser run passed in 2.3 minutes. The final Bag-layout rerun passed both phone scenarios in 13s. Production and standalone HTML builds passed; the standalone Chromium smoke loaded all six painted assets, started the game and recorded zero page errors or external requests.


## RPG stats, rarity, buffs and ultimate arts

This follow-up builds on unmerged inventory PR #5 on `feat/rpg-stats-skills`; the new PR targets main and must follow #5. No merge or publishing action is included.

Character power is no longer hidden: STR/DEX/INT/LUK grow by class, contribute the existing +4 attack per level, and the sheet shows attack, defense, HP/MP, critical chance/damage, gear contributions and combat power. Power is a summary metric, not an additional damage multiplier. Every level also grants +2 defense, +28 HP, +7 MP and two skill points, with explicit feedback. The existing XP curve is unchanged.

Five loot rarities now have actual rolls and stat differences: Normal ×0.85, Rare ×1.0, Epic ×1.12, Unique ×1.25, Mythic ×1.4 versus the previous Rare drop base. Higher-area ordinary creatures have a 1.5% Unique roll; boss drops are 70% Epic / 22% Unique / 8% Mythic. Ordinary drops retain the every-third-kill cadence. Existing stored item stats are preserved. Bag filters, rarity badges/sorting, upgrade labels, locks and shared best-gear comparison all work together.

Each class has a real Lv.3 buff (15 MP, 12s active / 45s cooldown): Dawnsteel Oath (+10% attack, +20% defense), Astral Attunement (+10% attack, −25% skill MP cost), Veil of Fortune (+10% attack, +15 percentage points critical chance), Windcaller’s Focus (+10% attack, +10 points critical chance). F or the touch button casts; AUTO casts only while fighting. Timers stop with pause; buffs expire without stacking, clear on death/class change and are session-only on reload. Base critical damage is 150%; critical chance starts at 5% and grows with LUK. A separate combat RNG leaves the loot/forge RNG independent.

All four class skill families have original effects; Lv.25 ultimates now deal 1,000% total attack with a 45s cooldown. The hit-line presentation groups skill totals into at most three numeric popups per enemy to avoid flooding the viewport; the displayed amounts sum exactly to damage applied. Ultimate art uses falling dawnsteel, astral crystal rain, moon scythes or a windbird arrow fan. No copied sprites, names or animations are included.

### Measured progression

`npm run balance` passed its timing, survival, objective-gap and boss-danger assertions. Raw output: [rpg-balance.json](qa/rpg-balance.json).

| Scenario | Previous | Current |
| --- | --- | --- |
| Fresh AUTO → Lv.10 | 27:06 | 27:16 |
| AUTO-quest → Lv.10 | 27:13 | 27:25 |
| Paid progression → Lv.25 | 3:52:29 | 3:44:18 |
| Geared boss with benchmark dodges | 2:19 | 2:16 |
| AUTO-quest deaths in 35 min | 0 | 0 (now reaches Canopy) |
| Starter manual boss | dies | dies |

### Phone review

| View | Landscape 844×390 | Portrait 390×844 |
| --- | --- | --- |
| Stats | [Character sheet](qa/rpg-stats-landscape.png) | [Character sheet](qa/rpg-stats-portrait.png) |
| Rarity Bag | [Bag](qa/rpg-bag-landscape.png) | [Bag](qa/rpg-bag-portrait.png) |
| Buff + ultimate | [Vanguard](qa/rpg-ultimate-vanguard-landscape.png) | [Vanguard](qa/rpg-ultimate-vanguard-portrait.png) |

Additional ultimate captures: [Arcanist](qa/rpg-ultimate-arcanist-landscape.png), [Nightblade](qa/rpg-ultimate-nightblade-landscape.png), [Ranger](qa/rpg-ultimate-ranger-landscape.png). Screenshots use seeded level-25 progress and actual keyboard/touch UI actions, not early-game balance claims. Physical-device Safari testing remains unverified.

Additional safety: area readiness uses permanent attack/defense, so a temporary buff cannot qualify an under-geared character for a harder map. The quick-buff-tap regression covers frames with no physics step. The final full suite also runs the embedded standalone HTML with no network, checking all six artwork files and the new RPG controls.

RPG verification: `npm test` passed all **118 tests**; the full **39-test** browser suite passed in **2.4 minutes**, including the portable HTML smoke. Dedicated new phone cases cover all four buffs/ultimates, portrait touch casting, rarity/category views and non-overlapping timer/banner lanes. Rank-30 skills show MAX RANK and disable further upgrades. Production and standalone builds passed, retaining thirteen local precached assets.


## v1.1.0: spendable attributes, passive mastery and painted primary skills

This update runs on `feat/real-attributes-mastery`, based on current main. Original combat design notes are documented in [REFERENCE_REVIEW.md](REFERENCE_REVIEW.md).

Every level grants 5 AP and 2 SP. Main/secondary attributes contribute at a 4:1 ratio, normalized by 3.25 so automatic 3-main/1-secondary growth keeps the prior four base attack per level before new investments. All four attributes have real additional combat effects: STR +2 max HP / +0.2 defense per point; DEX +0.1% attack speed (25% cap) / +0.05 percentage points critical chance; INT +3 max MP / +0.1% skill damage; LUK +0.1 points critical chance / +0.2 points critical damage. Damage/skill/critical values and attack cooldowns consume these attributes directly.

Stats offers individual spending, recommended main-stat assignment and reset. Available AP is derived from `(level−1)×5 − assigned`, never trusted from a saved counter. Old saves receive their earned points; malformed or over-budget allocation is rejected. Save v4 remains compatible through optional additive fields. Learned mastery costs one shared SP per rank, up to 20 ranks, and raises base attack 2%, skill damage 1% and minimum damage by 0.5 percentage points per rank. Normal damage rolls range from 90–110% before mastery. Shop gold training remains separate.

Level-up summaries report measured attack, HP and MP deltas rather than fixed labels. Example with starter equipment, reaching Lv.2, assigning its 5 AP to the main stat and learning mastery rank 1:

| Class | Attack Lv.1 → built Lv.2 | Max HP | Max MP |
| --- | --- | --- | --- |
| Vanguard | 31 → 42 | 180 → 224 | 75 → 82 |
| Arcanist | 34 → 45 | 135 → 163 | 135 → 166 |
| Nightblade | 35 → 46 | 145 → 173 | 95 → 102 |
| Ranger | 32 → 43 | 155 → 185 | 105 → 112 |

Raw examples: [attribute-growth-example.json](qa/attribute-growth-example.json). AP and mastery tests also compare actual enemy HP loss, not only displayed values.

### Skills and sprite sheet

`src/assets/skills.png` is now a cleaned 1536×1024 RGBA source sheet. Twenty equal 306×256 cells sit inside a 3px horizontal outer margin. Every frame is centered, with at least 32 transparent pixels on every edge; row-relative frame sizes are preserved. `scripts/prepare-skill-atlas.py` also exports `skills.webp` at quality 90 and verifies its alpha channel exactly matches the cleaned PNG. The shipped WebP is **275,400 bytes**, down from the original **1,896,460-byte PNG** (85.5% smaller). The atlas, Vite import, generated service-worker precache and embedded portable HTML use WebP; the editable PNG is excluded from the runtime build.

Primary arts are approximately 1.5× their previous painted footprint, last 1.25s and hold frame 3 for 650ms. Every skill slot, including nova/ultimate, renders after the hero and Pip. All eight current phone captures use real casts with a running browser clock. Browser tests observe the full-power frame for at least 500ms; no clock install/pause or injected effects are used.

NPC name pills remain 11 CSS pixels, below the NPC’s feet, and move sideways around the measured HUD rectangles. A thin leader line preserves their anchor when displaced. The camera reserves space beneath the top-right buttons for upper ledges whenever the player and ledge can fit together; ground framing stays unchanged. Phone tests reach the ledges using normal movement and climbing and assert visible highest-platform creatures clear the header.

The fixed-step buffer now preserves edges even for zero/negative render-clock deltas immediately after menu close. This fixes the intermittent lost buff key rather than adding arbitrary delays or retries. Version 1.1.0 is visible in Settings/title; an update-ready button preserves saves and restarts an already-installed client when its controller changes.

### Balance

The unchanged real-engine benchmark passed its assertions. It does not spend the new optional AP/mastery points automatically; its previous gear/gold policy is retained. Raw report: [attributes-mastery-balance.json](qa/attributes-mastery-balance.json).

| Scenario | Previous | Current |
| --- | --- | --- |
| Fresh AUTO → Lv.10 | 27:16 | 27:20 |
| AUTO-quest → Lv.10 | 27:25 | 27:07 |
| Gear/gold progression → Lv.25 | 3:44:18 | 3:31:55 |
| Geared boss + benchmark dodges | 2:16 | 2:16 |
| AUTO-quest deaths in 35 min | 0 | 0 |
| Manual starter gear versus boss | dies | dies |

### Verification and phone captures

The cleanup rerun produced a report **identical in every field** to [attributes-mastery-balance.json](qa/attributes-mastery-balance.json): fresh AUTO Lv.10 27:20, AUTO-quest Lv.10 27:07, paid Lv.25 3:31:55, prepared boss 2:15.87, and zero deaths in 35 minutes of hands-off AUTO-quest. Combat values, XP, cooldowns and AI were not changed by this cleanup.

`npm test`: **133 passed** in 13.8s. `npm run build` and `npm run build:html`: passed; production precaches 14 local files, including the skill WebP, and the portable HTML is 6,036,620 bytes. `npm run test:e2e`: **50 passed in 3.3 minutes** locally, including eight live primary casts, both HUD-clearance paths, offline installed reload and the standalone HTML without external requests. The source-export reproducibility check regenerated byte-identical PNG, WebP and atlas JSON from the original input. Full balance output is unchanged. Physical iPhone/Safari performance remains unverified; automated phone checks run Chromium at the two stated viewport sizes.

| Phone | Real attribute assignment | Learned mastery | Painted early combat |
| --- | --- | --- | --- |
| 844×390 | [Stats](qa/attribute-stats-landscape.png) | [Mastery](qa/mastery-landscape.png) | [Vanguard](qa/early-combat-vanguard-landscape.png) |
| 390×844 | [Stats](qa/attribute-stats-portrait.png) | [Mastery](qa/mastery-portrait.png) | [Vanguard](qa/early-combat-vanguard-portrait.png) |

Other low-level combat: [Arcanist](qa/early-combat-arcanist-landscape.png), [Nightblade](qa/early-combat-nightblade-landscape.png), [Ranger](qa/early-combat-ranger-landscape.png). These screenshots use actual Lv.2 characters with their earned five AP and two SP; no late-game skill unlocks are granted for the early-skill pictures.


Current live-cast phone captures:

| Class | 844×390 | 390×844 |
| --- | --- | --- |
| Vanguard | [Live cast](qa/early-combat-vanguard-landscape.png) | [Live cast](qa/early-combat-vanguard-portrait.png) |
| Arcanist | [Live cast](qa/early-combat-arcanist-landscape.png) | [Live cast](qa/early-combat-arcanist-portrait.png) |
| Nightblade | [Live cast](qa/early-combat-nightblade-landscape.png) | [Live cast](qa/early-combat-nightblade-portrait.png) |
| Ranger | [Live cast](qa/early-combat-ranger-landscape.png) | [Live cast](qa/early-combat-ranger-portrait.png) |

HUD clearance: [NPC landscape](qa/npc-clearance-landscape.png), [NPC portrait](qa/npc-clearance-portrait.png), [upper ledge landscape](qa/upper-ledge-landscape.png), [upper ledge portrait](qa/upper-ledge-portrait.png).

## Dawntrail: Vanguard and first-region preview

Open **Play Vanguard chapter · The Lantern Vow** from the title, or use `?chapter=vanguard`. The original adventure remains accessible at `?` and its save key is unchanged. Chapter progress uses `aetherstory_dawntrail_v1`. This is the agreed Vanguard-first playable preview; other classes and the original long progression remain in the original adventure.

Four independent maps replace the chapter world on portal travel: Lantern Hollow (1,800 wide), Sunpetal Fields (3,000), Bellroot Rise (2,400 wide / 1,500 high), Broken Sanctuary (1,700). Their terrain, vertical routes and creature populations differ. Field jellies/caps, Rise briarbacks/wisps, two named elites, an upper exploration bell and a painted guardian support the three-step regional story. Revisit discovered maps from the region board; first visits require portals. No map level gates or coordinate-based area walls are used in the chapter.

Vanguard uses a new twenty-pose painted hammer/shield atlas, buffered jumps, coyote time, full-speed thumb directions, one aerial advance per jump, three-step basic combos and timed holy impacts. Sanctified Cleave and Aegis Rush start at Lv.1; Lantern Vow at Lv.3; Consecration at Lv.5; Judgment Bell at Lv.10. Skills consume mana, hit at individual strike times and have reusable cooldowns. Holding Guard reduces frontal damage; Bastion strengthens the block. Training offers all moves at Lv.10 and cannot serialize or overwrite chapter progress.

Equipment has six slots, five rarities, variable base rolls and zero/one/two/three distinct percentage affixes by rarity. STR%, attack%, defense%, HP%, MP%, critical chance, attack speed and holy damage enter actual character calculations. Vowkeeper/Bastion/Dawnbringer builds and learned hammer mastery change combat values. Monster families favor different slots; ordinary drops are random (32% gear chance), named enemies guarantee Epic gear and the guardian guarantees Unique/Mythic. Bag comparison, equip-best, locks, protected low-gear dismantling and guaranteed paid star enhancements are implemented. Pip gathers nearby drops and heals 10% max HP on a 35s cooldown. Tonics restore 40% HP / 25% MP with an 8s cooldown and cost 45 gold.

The new guardian was initially too short a fight (14.35s in the prepared simulation). After tuning, the same Lv.10 Epic-geared Dawnbringer with active movement/jump dodges defeats the 66,000-HP guardian in **124.62s (2:04.62)**, zero deaths, no tonics used. Raw report: [dawntrail-guardian-balance.json](qa/dawntrail-guardian-balance.json), reproducible with `node scripts/dawntrail-report.js`. This measures a specific dodge policy, not unattended AUTO survival. Standing in the guardian's warning with 1 HP kills the player in the death/respawn regression. The full original `npm run balance` report remains identical to the merged PR8 baseline, including fresh AUTO Lv.10 27:20 and zero AUTO-quest deaths in 35 minutes. No original progression timing is asserted for the separate chapter.

Regression checks cover strike startup/hit-once, repeat casts after cooldown, jump buffering/air advance, supported rope descent, percentage stats, portal returns, protected items, save reload, corrupt data, unsaved training, death recovery and discovering the bell before its quest. Independent review identified the cooldown, early-bell and rope-bottom gaps; each was reproduced with a failing test and fixed.

| View | 844×390 | 390×844 |
| --- | --- | --- |
| Build / percentage gear | [Bag & build](qa/dawntrail-build-landscape.png) | [Bag & build](qa/dawntrail-build-portrait.png) |
| Live holy strikes | [Cleave](qa/dawntrail-cleave-landscape.png) | [Cleave](qa/dawntrail-cleave-portrait.png) |
| Live ultimate | [Judgment Bell](qa/dawntrail-ultimate-landscape.png) | [Judgment Bell](qa/dawntrail-ultimate-portrait.png) |
| Region | [Map board](qa/dawntrail-region-landscape.png) | [Map board](qa/dawntrail-region-portrait.png) |
| Guardian | [Sanctuary](qa/dawntrail-guardian-landscape.png) | [Sanctuary & shield](qa/dawntrail-guardian-portrait.png) |

Additional real travel: [Lantern Hollow](qa/dawntrail-village-landscape.png), [Bellroot Rise](qa/dawntrail-rise-landscape.png). Browser scenarios walk through all outbound maps, return through a portal, change/equip builds, cast with a running clock, hold the shield, reload saves and enter/leave unsaved training. These are Chromium viewport checks; physical iOS/Android testing remains unverified. AUTO hunts the current platform; automatic route/quest traversal and additional chapter classes/pets are outside this preview.

Final verification: **149 unit tests passed** (10.3s); **55 browser tests passed** (4.1m), with a final five-scenario chapter rerun after guardian HP tuning. Production build and portable HTML passed; sixteen local assets are precached and the portable file is 7,483,662 bytes. The original balance report is unchanged. Chapter guardian simulation reports 124.62s with the stated prepared dodge policy.
