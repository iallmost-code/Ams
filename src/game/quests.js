/** Original, ordered story chapters. Objective credit is granted by real world events. */
const chapter = (areaId, giverId, minLevel, rows) =>
  rows.map(([id, title, kind, count, enemyType, description, rewards, location]) => ({
    id,
    title,
    areaId,
    giverId,
    minLevel,
    description,
    objective: { kind, count, enemyType, ...(location ? { location } : {}) },
    rewards,
    offer: [description, 'Follow the trail at your own pace. Come back when the work is done.'],
    reminder: 'Your trail is still waiting. The journal marks what remains.',
    thanks: 'You kept your word. Take these supplies for the road ahead.',
  }));
export const STORY_QUESTS = [
  ...chapter('emerald_glade', 'rowan', 1, [
    [
      'glade-jellies',
      'Lanterns for the lost',
      'hunt',
      6,
      'slime',
      'The lantern trail has gone dark. Clear six jellies so our travelers can return safely.',
      { xp: 80, gold: 100, cores: 0 },
    ],
    [
      'glade-spores',
      'A pocketful of light',
      'collect',
      5,
      'mushroom',
      'Gather five luminous spores from the starcap mushrooms. Pip can carry the drops back to you.',
      { xp: 100, gold: 150, cores: 1, tonics: 1 },
    ],
    [
      'glade-watchlight',
      'The old watchlight',
      'visit',
      1,
      null,
      'Find the lantern beacon on the highest glade platform. Its light will show Lyra the way.',
      { xp: 120, gold: 200, cores: 1, tonics: 1 },
      { x: 850, y: 365, platformId: '0-high', name: 'Watchlight beacon' },
    ],
  ]),
  ...chapter('emerald_glade', 'rowan', 3, [
    [
      'glade-pathfinders',
      'Footprints in the dew',
      'hunt',
      12,
      'slime',
      'Lyra left fresh trail marks. Clear twelve jellies before they swallow her footprints.',
      { xp: 200, gold: 90, cores: 0 },
    ],
  ]),
  ...chapter('emerald_glade', 'rowan', 5, [
    [
      'glade-wick',
      'A wick for every window',
      'collect',
      8,
      'mushroom',
      'Bring eight starcap embers to Rowan. Each one will light a window along Lyra’s road.',
      { xp: 350, gold: 110, cores: 1 },
    ],
  ]),
  ...chapter('emerald_glade', 'rowan', 6, [
    [
      'glade-signal',
      'The windward signal',
      'visit',
      1,
      null,
      'Climb to the mid-glade signal lantern. Lyra needs to know the old ropes are safe.',
      { xp: 550, gold: 120, cores: 0 },
      { x: 600, y: 520, platformId: '0-mid', name: 'Windward lantern' },
    ],
  ]),
  ...chapter('emerald_glade', 'rowan', 8, [
    [
      'glade-gloamcap',
      'The lantern thief',
      'hunt',
      1,
      'mushroom',
      'Gloamcap has stolen the watchlight’s flame. Find the crowned starcap on the low glade platform and win it back.',
      { xp: 800, gold: 180, cores: 1, tonics: 2 },
    ],
  ]).map((q) => ({
    ...q,
    objective: { ...q.objective, enemyId: 'enemy-0-3', enemyName: 'Gloamcap, the Lantern Thief' },
  })),
  ...chapter('emerald_glade', 'rowan', 9, [
    [
      'glade-farewell',
      'A light for Lyra',
      'hunt',
      6,
      'boar',
      'Clear six thornback sentinels from the upper glade. At level ten, carry our lantern trail to Scout Lyra.',
      { xp: 1100, gold: 150, cores: 1 },
    ],
  ]),
  ...chapter('whispering_canopy', 'lyra', 10, [
    [
      'canopy-trail',
      'The scout’s promise',
      'hunt',
      8,
      null,
      'Rowan’s light reached us. Clear eight canopy creatures while I search for the missing wardens.',
      { xp: 200, gold: 250, cores: 1 },
    ],
    [
      'canopy-essence',
      'Whispers in a bottle',
      'collect',
      4,
      'wisp',
      'The forest spirits hold traces of the lost wardens. Bring me four drops of whisper essence.',
      { xp: 250, gold: 350, cores: 2, tonics: 1 },
    ],
    [
      'canopy-beacon',
      'Above the green sea',
      'visit',
      1,
      null,
      'Reach the canopy’s high beacon. Its signal points toward the crystal sanctuary.',
      { xp: 300, gold: 450, cores: 2 },
      { x: 2050, y: 365, platformId: '1-high', name: 'Canopy beacon' },
    ],
  ]),
  ...chapter('crystal_cavern', 'iona', 16, [
    [
      'crystal-wardens',
      'Echoes of the wardens',
      'hunt',
      8,
      null,
      'The wardens sealed something beneath the altar. Clear eight cavern creatures so I can read their echoes.',
      { xp: 500, gold: 600, cores: 2 },
    ],
    [
      'crystal-shards',
      'Pieces of the dawn',
      'collect',
      4,
      'wisp',
      'Gather four resonant fragments from cavern spirits. Their song can restore the old seal.',
      { xp: 600, gold: 750, cores: 2, tonics: 2 },
    ],
    [
      'crystal-resonance',
      'A song in the stone',
      'visit',
      1,
      null,
      'Carry the resonance to the high crystal beacon. Ceryn is waiting beyond the next gate.',
      { xp: 700, gold: 900, cores: 3 },
      { x: 3250, y: 365, platformId: '2-high', name: 'Resonance beacon' },
    ],
  ]),
  ...chapter('ember_altar', 'ceryn', 20, [
    [
      'ember-sentinels',
      'Ash on the wind',
      'hunt',
      5,
      'boar',
      'The guardian’s sentinels roam the upper altar. Defeat five and bring the path back under our watch.',
      { xp: 900, gold: 1200, cores: 2 },
    ],
    [
      'ember-seal',
      'The last seal',
      'visit',
      1,
      null,
      'Find the high altar beacon and rekindle the final seal. Prepare your armor before approaching Cinderroot.',
      { xp: 1000, gold: 1500, cores: 3, tonics: 2 },
      { x: 4450, y: 365, platformId: '3-high', name: 'Altar beacon' },
    ],
    [
      'ember-guardian',
      'Cinderroot’s vow',
      'boss',
      1,
      null,
      'Face Cinderroot. Jump over the shockwave and move out of the meteor column. This fight needs your hands, not AUTO.',
      { xp: 1500, gold: 3000, cores: 6 },
    ],
  ]),
];
export function normalizeStoryProgress(value) {
  const input = value && typeof value === 'object' ? value : {};
  // Old journal saves used twelve missions. Preserve their completed chapters and active
  // objectives when inserting the five new Glade missions; never pay skipped rewards.
  const bridgeIds = STORY_QUESTS.filter((q) => q.areaId === 'emerald_glade' && q.minLevel > 1).map(
    (q) => q.id,
  );
  const legacy = STORY_QUESTS.filter((q) => !bridgeIds.includes(q.id));
  let ids = Array.isArray(input.completed) ? input.completed : [];
  const legacyPrefix = ids.every((id, i) => id === legacy[i]?.id);
  if (
    input.revision !== 2 &&
    legacyPrefix &&
    ids.length >= 3 &&
    (ids.length > 3 || legacy.some((q) => q.id === input.activeId && q.areaId !== 'emerald_glade'))
  )
    ids = [...ids.slice(0, 3), ...bridgeIds, ...ids.slice(3)];
  const completed = [];
  for (const id of ids) {
    if (id !== STORY_QUESTS[completed.length]?.id) break;
    completed.push(id);
  }
  const next = STORY_QUESTS[completed.length];
  const activeId = next && input.activeId === next.id ? next.id : null;
  const progress =
    activeId && Number.isFinite(input.progress)
      ? Math.max(0, Math.min(next.objective.count, Math.floor(input.progress)))
      : 0;
  return { revision: 2, completed, activeId, progress };
}
export function createStory(value) {
  return {
    ...normalizeStoryProgress(value),
    autoQuest: false,
    status: 'idle',
    cooldown: 0,
    lastDialogue: '',
  };
}
export function getStoryView(state) {
  const story = state.story,
    quest = STORY_QUESTS[story.completed.length] || null;
  if (!quest)
    return { quest: null, status: 'finished', progress: 0, total: STORY_QUESTS.length, chapter: 4 };
  const area = state.world.areas.find((a) => a.id === quest.areaId),
    npc = area?.npc;
  const status =
    story.activeId === quest.id
      ? story.progress >= quest.objective.count
        ? 'ready'
        : 'active'
      : state.player.level < quest.minLevel
        ? 'locked'
        : 'available';
  const objective = quest.objective;
  const description =
    status === 'locked'
      ? `Next: ${quest.title} · Lv.${quest.minLevel} · ${state.daily?.claimed.length < 3 ? 'try a daily bounty' : 'train on the lantern trail'}`
      : status === 'available'
        ? `Speak to ${npc?.name || 'your guide'}`
        : status === 'ready'
          ? `Return to ${npc?.name || 'your guide'}`
          : objective.kind === 'visit'
            ? `Reach ${objective.location.name}`
            : objective.kind === 'boss'
              ? 'Defeat Cinderroot · manual combat'
              : `${objective.kind === 'collect' ? 'Collect' : 'Defeat'} ${objective.enemyType || 'creatures'} · ${story.progress}/${objective.count}`;
  return {
    quest,
    npc,
    area,
    status,
    description,
    progress: story.progress,
    total: STORY_QUESTS.length,
    chapter: state.world.areas.findIndex((a) => a.id === quest.areaId) + 1,
  };
}
export function matchesQuestEnemy(quest, enemy) {
  return (
    !!quest &&
    enemy.x >=
      { emerald_glade: 0, whispering_canopy: 1200, crystal_cavern: 2400, ember_altar: 3600 }[
        quest.areaId
      ] &&
    enemy.x <
      { emerald_glade: 1200, whispering_canopy: 2400, crystal_cavern: 3600, ember_altar: 4800 }[
        quest.areaId
      ] &&
    (quest.objective.kind === 'boss' ? enemy.isBoss : !enemy.isBoss) &&
    (!quest.objective.enemyType || enemy.type === quest.objective.enemyType) &&
    (!quest.objective.enemyId || enemy.id === quest.objective.enemyId)
  );
}
export function recordStoryEvent(state, event) {
  const view = getStoryView(state),
    q = view.quest;
  if (!q || view.status !== 'active') return false;
  const match =
    (event.kind === 'defeat' &&
      ['hunt', 'boss'].includes(q.objective.kind) &&
      matchesQuestEnemy(q, event.enemy)) ||
    (event.kind === 'collect' && q.objective.kind === 'collect' && event.questId === q.id) ||
    (event.kind === 'visit' && q.objective.kind === 'visit' && event.questId === q.id);
  if (!match) return false;
  state.story.progress = Math.min(q.objective.count, state.story.progress + 1);
  return true;
}
