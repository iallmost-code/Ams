# Quest chains and AUTO-questing

Approved scope: NPC dialogue, tracked quest chains, navigation to objectives and reward turn-ins. Add twelve original quests over four chapters/areas, with hunt, collected quest-item, exploration and boss objectives. Keep the balance/combat expansion from PR #3 intact. No dungeon, job-advancement or gear-set scope in this installment.

1. Add pure quest definitions, validated journal state and objective matching. Test ordered acceptance, actual event counts, quest-item collection, nonrepeatable rewards, level gates, legacy save defaults and full save round trips.
2. Integrate NPC interactions, quest drops, exploration, journal rewards and AUTO-quest into the engine. Reuse the existing platform/rope navigator and actual portals. Manual movement overrides automation; death and an uncompleted boss objective pause it. Normal AUTO remains local-area hunting.
3. Add a journal/dialogue panel and compact phone objective strip. NPCs show appropriate offer/turn-in markers. AUTO-quest requires an explicit opt-in and never resumes automatically from a loaded save.
4. Verify complete first-chapter automation with actual movement, loot and turn-ins, portal traversal, death/boss safety, persistence and mobile controls. Run unit/build/browser tests and refresh the portable HTML/QA/screenshots.
5. Push only the new source branch and open a PR into main. PR #3 was merged separately during implementation; this feature PR introduces only the quest expansion. No feature-branch publishing or main merge.
