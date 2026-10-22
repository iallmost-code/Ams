# AetherStory balance and phone QA

Measured with Node 24.19.0 and Chromium/Playwright in the managed Linux workspace. No physical Android or iPhone was attached; these results do not certify Safari or device frame times.

## Balance measurements

Reproduce with `npm run balance`. The report is [balance-results.json](qa/balance-results.json); the original baseline is [balance-before.json](qa/balance-before.json). Every scenario calls the real `updateGame` at its normal 1/120-second simulation step. There are no XP, damage or time multipliers. The random seed is fixed.

| Measurement | Before | After |
| --- | --- | --- |
| Fresh starter AUTO → level 10 | 2:01 | 28:23 |
| AUTO with paid progression → level 10 | — | 29:02 |
| AUTO with paid progression → level 25 | 9:45 without upgrades | 3:49:03 |
| Fresh starter AUTO, level at 10 min | 25 | 7 |
| Fresh starter AUTO, level at 1 hour | 49 | 12 |
| Fresh starter AUTO, gold at 1 hour | 109,470 | 25,689 (no purchases) |
| Paid progression, gold at 1 hour | — | 1,339 retained; 58,026 spent |
| First boss kill in fresh AUTO | 2:16 | None in 1 hour |
| Geared boss fight with dodge input | — | 2:19.43; 0 deaths |
| Starter gear in boss arena, 1-hour run | Invulnerable progression baseline | 1 death; no boss kill |

Scenarios are deliberately distinct:

- **Fresh starter AUTO** never equips, shops, forges, or manually travels. AUTO now hunts the selected area rather than crossing into every newly unlocked area. It remains in Emerald Glade and has **0 deaths in one hour**; this safe-area figure is not evidence of boss survivability.
- **Paid progression** equips stronger drops, salvages spare gear, buys 90-gold tonics, trains vitality/mastery up to rank 6 and forges gear up to ★5. It chooses prepared hunting areas and leaves boss dodging to the player. It has **0 deaths in its first hour and 14 deaths over four hours**. Its level 25 time is a four-hour scenario, not a projection from a short run. Its policy stops upgrading at those caps; further training and forge ranks remain available gold sinks. Total spending after four hours: 176,176 gold.
- **Starter boss arena** starts at the required level 20, with the original weapon/armor and three tonics, next to the isolated guardian. AUTO loses, respawns in safety, and does not return automatically. The remaining hour is safe-area idle time, so the result is one death rather than repeated forced deaths.
- **Geared boss benchmark** uses a level-20 Vanguard, weapon 85 ATK/★7; five armor pieces at 26 DEF/★5; vitality rank 8, mastery rank 6 and skill ranks 5/5/3/1. This yields 278 ATK, 253 DEF, 912 HP. Its controller actually moves out of meteor columns and times jumps over shockwaves; it is not ordinary AUTO. No damage or cooldowns are disabled. It takes no hits in this ideal dodge run.

Other fresh starter class probes reached level 10 in **28:02 Arcanist, 29:00 Nightblade and 28:17 Ranger**; all three were level 12 at one hour with no boss kill. The table’s default class is Vanguard.

Areas unlock at levels **1 / 10 / 16 / 20**. Higher-area creatures chase on their platform and have stronger damage and HP; separate regressions confirm starter gear can die in each newly unlocked hunting ground. The guardian has **150,000 HP**, fixed 1.25-second shockwave and 1.5-second meteor warnings, and a 4.2-second recovery. Jumping avoids shockwaves; meteor columns require horizontal movement. Pip heals **11% max HP every 35 seconds**. Tonics restore 45% HP with a 10-second cooldown. Armor mitigation remains bounded above zero damage.

Forge gold costs are `150 × 1.7^stars + 50 × stars²`, capped at 5,000,000 per attempt; core costs also increase. Training costs `250 × nextRank²`. Online/offline monster reward formulas are shared; offline rewards remain AUTO-only, non-boss, once per absence and capped at eight hours.

## Automated verification

- `npm test`: **78 passed, 0 failed**. Includes a real one-hour fresh AUTO simulation, one-hour under-geared boss simulation, four-hour paid progression, timed geared boss fight, danger in all higher areas, telegraph dodge/counterplay, healing/potion cooldowns, prices, training/saves, navigation, physics and atlas gutter bounds.
- `npm run build`: passed; 23 modules and 13 local precached production assets, including all six painted images. Background filtering is cached rather than reapplied every frame.
- `npm run test:e2e`: **20 passed, 0 failed**. Checks cover controls, all classes/skills/areas and portals, reload persistence, forge, shop purchases, training, mobile geometry, offline PWA and storage failure.
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

This work is on a new source branch into `main`. **No push to `gh-pages` and no merge to main** is part of this task. `.github/workflows/pages.yml` publishes checked artifacts only on a push to main, with matching job guards. PR CI cannot deploy.

GitHub currently reports Pages source `gh-pages` and the `github-pages` environment permits that old branch. An attempt to set the Pages build type to workflow was denied with **HTTP 403: Resource not accessible by integration**. Before main deployment, the repository owner must select **Pages → Source → GitHub Actions** and change **Environments → github-pages → Deployment branches and tags** to allow **main only**. The existing public deployment is unchanged by this PR.
