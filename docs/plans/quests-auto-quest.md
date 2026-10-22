# Quest chains and AUTO-questing

Approved scope: NPC dialogue, tracked quest chains, navigation to objectives and reward turn-ins. Add twelve original quests over four chapters/areas, with hunt, collected quest-item, exploration and boss objectives. Keep the balance/combat expansion from PR #3 intact. No dungeon, job-advancement or gear-set scope in this installment.

1. Add pure quest definitions, validated journal state and objective matching. Test ordered acceptance, actual event counts, quest-item collection, nonrepeatable rewards, level gates, legacy save defaults and full save round trips.
2. Integrate NPC interactions, quest drops, exploration, journal rewards and AUTO-quest into the engine. Reuse the existing platform/rope navigator and actual portals. Manual movement overrides automation; death and an uncompleted boss objective pause it. Normal AUTO remains local-area hunting.
3. Add a journal/dialogue panel and compact phone objective strip. NPCs show appropriate offer/turn-in markers. AUTO-quest requires an explicit opt-in and never resumes automatically from a loaded save.
4. Verify complete first-chapter automation with actual movement, loot and turn-ins, portal traversal, death/boss safety, persistence and mobile controls. Run unit/build/browser tests and refresh the portable HTML/QA/screenshots.
5. Push only the new source branch and open a PR into main. PR #3 was merged separately during implementation; this feature PR introduces only the quest expansion. No feature-branch publishing or main merge.

PR #4 follow-up: implemented five Glade bridge missions at levels 3/5/6/8/9 and a named mini-boss, three local-midnight daily bounties carried by every area guide, clearer tracker/readable labels, a session-only portrait hint, revisioned journal migration, balance/gap regressions, and refreshed phone captures. Verified timings and limits are in docs/QA.md. This follow-up stays on the same branch and PR; no merge or publishing.

AUTO safety/readability follow-up on the same PR: shared effective-gear upgrades, preparation-gated travel, low-health recovery at safe area edges, exact 35-minute survival and prepared-Canopy regressions, CSS-pixel labels/stacked popups, shorter useful daily bounties, and preinstalled-browser CI. Full multi-hour balance assertions run through npm run balance; npm test retains fast smoke and direct reproduction coverage.
