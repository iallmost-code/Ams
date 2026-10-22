import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/game/engine.js';
import { saveProgress, loadProgress } from '../src/save.js';
const tick = (s, seconds = 1, raw = {}) => engine.updateGame(s, raw, seconds);
const npc = (s) => {
  const a = s.world.areas.find((a) => a.id === s.currentArea);
  s.player.x = a.npc.x - s.player.w / 2;
  s.player.y = a.npc.y - s.player.h;
  s.player.platformId = 'ground';
  s.player.grounded = true;
  return a.npc;
};

test('quest offers require a real nearby giver and only the next ordered quest', () => {
  const s = engine.createGame();
  assert.ok(engine.getStoryView(s).quest);
  const id = engine.getStoryView(s).quest.id;
  s.player.x = 700;
  assert.equal(engine.acceptStoryQuest(s, id), false);
  npc(s);
  assert.equal(engine.acceptStoryQuest(s, 'bogus'), false);
  assert.equal(engine.acceptStoryQuest(s, id), true);
  assert.equal(engine.acceptStoryQuest(s, id), false);
  assert.equal(s.story.progress, 0);
});
test('hunt objectives count matching enemies only after acceptance and rewards cannot repeat', () => {
  const s = engine.createGame();
  s.enemies = [];
  npc(s);
  const view = engine.getStoryView(s);
  engine.acceptStoryQuest(s, view.quest.id);
  const slimes = Array.from({ length: view.quest.objective.count }, (_, i) => ({
    id: `test-${i}`,
    type: 'slime',
    x: s.player.x + 45,
    y: s.player.y,
    w: 46,
    h: 42,
    hp: 1,
    maxHp: 1,
    level: 1,
    areaRank: 0,
    platformId: 'ground',
    homeMin: 0,
    homeMax: 1200,
    vx: 0,
    attackTimer: 5,
    hitTimer: 0,
  }));
  s.enemies = slimes;
  tick(s, 1 / 120, { attack: true });
  assert.equal(engine.getStoryView(s).status, 'ready');
  const gold = s.player.gold;
  assert.equal(engine.turnInStoryQuest(s), true);
  const after = s.player.gold;
  assert.ok(after > gold);
  assert.equal(engine.turnInStoryQuest(s), false);
  assert.equal(s.player.gold, after);
  assert.equal(s.story.completed.length, 1);
});
test('AUTO-quest completes the first chapter using combat, quest loot, ropes and NPC turn-ins', () => {
  const s = engine.createGame();
  engine.toggleAutoQuest(s);
  let climbed = false;
  for (let i = 0; i < 300 * 30 && s.story.completed.length < 3; i++) {
    tick(s, 1 / 30);
    climbed ||= !!s.player.climbing;
  }
  assert.equal(
    s.story.completed.length,
    3,
    JSON.stringify({ story: s.story, x: s.player.x, y: s.player.y, nav: s.autoNavigation }),
  );
  assert.ok(climbed);
  assert.ok(s.story.progress === 0);
  assert.equal(engine.getStoryView(s).status, 'locked');
});
test('manual input overrides AUTO-quest and death pauses it without discarding objectives', () => {
  const s = engine.createGame();
  engine.toggleAutoQuest(s);
  tick(s, 1, { right: true });
  assert.ok(s.autoOverride > 0);
  assert.ok(s.player.x > 170);
  const story = JSON.stringify({
    activeId: s.story.activeId,
    progress: s.story.progress,
    completed: s.story.completed,
  });
  s.player.hp = 0;
  tick(s, 0.1);
  assert.equal(s.story.autoQuest, false);
  assert.equal(s.auto, false);
  assert.equal(
    JSON.stringify({
      activeId: s.story.activeId,
      progress: s.story.progress,
      completed: s.story.completed,
    }),
    story,
  );
});
test('loaded journal progress survives validated storage but automation never auto-resumes', () => {
  const s = engine.createGame();
  npc(s);
  engine.acceptStoryQuest(s, engine.getStoryView(s).quest.id);
  engine.toggleAutoQuest(s);
  let raw;
  const storage = {
    setItem(k, v) {
      raw = v;
    },
    getItem() {
      return raw;
    },
  };
  assert.equal(saveProgress(engine.serializeGame(s), storage), true);
  const restored = engine.createGame(loadProgress(storage));
  assert.equal(restored.story.activeId, s.story.activeId);
  assert.equal(restored.story.autoQuest, false);
  assert.equal(restored.auto, false);
});

test('AUTO-quest uses an unlocked portal to reach the next giver and pauses before the boss', async () => {
  const { STORY_QUESTS } = await import('../src/game/quests.js');
  const s = engine.createGame({
    player: { level: 10 },
    story: { completed: STORY_QUESTS.filter((q) => q.areaId === 'emerald_glade').map((q) => q.id) },
  });
  s.player.equipment.weapon.attack = 75;
  s.player.equipment.armor.defense = 60;
  s.player.statLevel = 0;
  engine.updateGame(s, {}, 1 / 120);
  engine.toggleAutoQuest(s);
  for (let i = 0; i < 20 * 30 && s.story.activeId !== 'canopy-trail'; i++) tick(s, 1 / 30);
  assert.equal(s.currentArea, 'whispering_canopy');
  assert.equal(s.story.activeId, 'canopy-trail');
  const boss = engine.createGame({
    player: { level: 20 },
    currentArea: 'ember_altar',
    story: {
      completed: STORY_QUESTS.slice(0, -1).map((q) => q.id),
      activeId: 'ember-guardian',
      progress: 0,
    },
  });
  engine.toggleAutoQuest(boss);
  tick(boss, 0.1);
  assert.equal(boss.story.autoQuest, false);
  assert.equal(boss.auto, false);
  assert.equal(boss.story.status, 'manual-boss');
  assert.equal(boss.player.x, 3770);
});
test('an impossible quest route stops automation instead of spinning forever', () => {
  const s = engine.createGame();
  npc(s);
  engine.acceptStoryQuest(s, engine.getStoryView(s).quest.id);
  engine.toggleAutoQuest(s);
  for (const mob of s.enemies)
    if (mob.type === 'slime' && mob.x < 1200) mob.platformId = 'missing-platform';
  tick(s, 0.2);
  assert.equal(s.story.autoQuest, false);
  assert.match(s.story.status, /route/i);
});

test('journal validation rejects skipped chapters, corrupt values and excess objective credit', async () => {
  const { normalizeStoryProgress } = await import('../src/game/quests.js');
  assert.deepEqual(
    normalizeStoryProgress({
      completed: ['canopy-trail'],
      activeId: 'ember-guardian',
      progress: Infinity,
    }),
    { revision: 2, completed: [], activeId: null, progress: 0 },
  );
  assert.deepEqual(
    normalizeStoryProgress({
      completed: ['glade-jellies'],
      activeId: 'glade-spores',
      progress: 999,
    }),
    { revision: 2, completed: ['glade-jellies'], activeId: 'glade-spores', progress: 5 },
  );
  assert.deepEqual(normalizeStoryProgress(null), {
    revision: 2,
    completed: [],
    activeId: null,
    progress: 0,
  });
});
test('every chapter matches only its own creatures and exploration platform', async () => {
  const { STORY_QUESTS, recordStoryEvent } = await import('../src/game/quests.js');
  for (let index = 0; index < STORY_QUESTS.length; index++) {
    const q = STORY_QUESTS[index],
      s = engine.createGame({
        player: { level: 25 },
        currentArea: q.areaId,
        story: { completed: STORY_QUESTS.slice(0, index).map((q) => q.id), activeId: q.id },
      });
    const area = s.world.areas.find((a) => a.id === q.areaId);
    if (q.objective.kind === 'visit') {
      const loc = q.objective.location;
      s.player.x = loc.x - s.player.w / 2;
      s.player.y = loc.y - s.player.h;
      s.player.platformId = loc.platformId;
      s.player.grounded = true;
      s.enemies = [];
      tick(s, 1 / 120);
      assert.equal(s.story.progress, 1, q.id);
    } else if (q.objective.kind === 'collect') {
      assert.equal(recordStoryEvent(s, { kind: 'collect', questId: 'wrong' }), false);
      assert.equal(recordStoryEvent(s, { kind: 'collect', questId: q.id }), true);
    } else {
      assert.equal(
        recordStoryEvent(s, {
          kind: 'defeat',
          enemy: { x: -100, type: q.objective.enemyType, isBoss: q.objective.kind === 'boss' },
        }),
        false,
      );
      assert.equal(
        recordStoryEvent(s, {
          kind: 'defeat',
          enemy: {
            x: area.x + 400,
            id: q.objective.enemyId || 'ordinary-creature',
            type: q.objective.enemyType || 'slime',
            isBoss: q.objective.kind === 'boss',
          },
        }),
        true,
        q.id,
      );
    }
  }
});
test('AUTO-quest does not open a blocking dialogue while walking toward its giver', () => {
  const s = engine.createGame();
  s.player.x = 600;
  engine.toggleAutoQuest(s);
  for (let i = 0; i < 15 * 30 && !s.story.activeId; i++) tick(s, 1 / 30);
  assert.equal(s.story.activeId, 'glade-jellies');
  assert.equal(s.dialogueNpcId, null);
  engine.toggleAuto(s);
  assert.equal(s.story.autoQuest, false);
});

test('each completed chapter mission pays only at its giver and stays paid after reload', async () => {
  const { STORY_QUESTS } = await import('../src/game/quests.js');
  for (let i = 0; i < STORY_QUESTS.length; i++) {
    const q = STORY_QUESTS[i],
      s = engine.createGame({
        player: { level: 25 },
        currentArea: q.areaId,
        story: {
          completed: STORY_QUESTS.slice(0, i).map((q) => q.id),
          activeId: q.id,
          progress: q.objective.count,
        },
      });
    npc(s);
    s.player.x += 300;
    assert.equal(engine.turnInStoryQuest(s), false, q.id);
    npc(s);
    const gold = s.player.gold;
    assert.equal(engine.turnInStoryQuest(s), true, q.id);
    assert.equal(s.player.gold, gold + q.rewards.gold);
    const loaded = engine.createGame(engine.serializeGame(s));
    assert.equal(loaded.story.completed.length, i + 1);
    assert.equal(engine.turnInStoryQuest(loaded), false);
    assert.equal(loaded.player.gold, s.player.gold);
  }
});
test('offline expedition rewards do not fabricate quest kills or gathered items', async () => {
  const { markAbsence, settleAbsence } = await import('../src/offline.js');
  const s = engine.createGame();
  npc(s);
  engine.acceptStoryQuest(s, 'glade-jellies');
  engine.acceptDailyBounty(s);
  engine.toggleAutoQuest(s);
  markAbsence(s, 1000);
  assert.ok(settleAbsence(s, 61000));
  assert.equal(s.story.progress, 0);
  assert.equal(s.daily.progress, 0);
});
