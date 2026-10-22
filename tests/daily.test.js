import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/game/engine.js';
import { STORY_QUESTS } from '../src/game/quests.js';
import { saveProgress, loadProgress } from '../src/save.js';
const atGuide = (s) => {
  const n = s.world.areas.find((a) => a.id === s.currentArea).npc;
  Object.assign(s.player, {
    x: n.x - s.player.w / 2,
    y: n.y - s.player.h,
    grounded: true,
    platformId: 'ground',
  });
};
test('five Glade bridge quests have spread level gates and a named creature objective', () => {
  const bridge = STORY_QUESTS.filter((q) => q.areaId === 'emerald_glade' && q.minLevel > 1);
  assert.deepEqual(
    bridge.map((q) => q.minLevel),
    [3, 5, 6, 8, 9],
  );
  assert.ok(bridge.some((q) => q.objective.kind === 'collect'));
  assert.ok(bridge.some((q) => q.objective.kind === 'visit'));
  assert.ok(bridge.some((q) => q.objective.enemyId));
});
test('daily bounties pay once, survive validated reload, cap at three, and reset at local midnight', () => {
  const before = new Date(2026, 9, 22, 23, 59, 59),
    after = new Date(2026, 9, 23, 0, 0, 0);
  let s = engine.createGame(null, before);
  atGuide(s);
  for (let i = 0; i < 3; i++) {
    assert.equal(engine.acceptDailyBounty(s, undefined, before), true);
    s.daily.progress = engine.getDailyView(s).bounty.count;
    const gold = s.player.gold;
    assert.equal(engine.claimDailyBounty(s, before), true);
    assert.ok(s.player.gold > gold);
    assert.equal(engine.claimDailyBounty(s, before), false);
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
    s = engine.createGame(loadProgress(storage), before);
    atGuide(s);
    assert.equal(engine.claimDailyBounty(s, before), false);
    assert.equal(s.daily.claimed.length, i + 1);
  }
  assert.equal(engine.getDailyView(s).status, 'finished');
  assert.equal(engine.acceptDailyBounty(s, undefined, before), false);
  assert.equal(engine.refreshDailyBounties(s, after), true);
  assert.equal(s.daily.claimed.length, 0);
  assert.equal(engine.acceptDailyBounty(s, undefined, after), true);
  assert.equal(
    engine.refreshDailyBounties(s, before),
    false,
    'turning the clock backward cannot reset again',
  );
});
test('daily objectives count real non-boss combat across every area and require a nearby guide', () => {
  const s = engine.createGame();
  atGuide(s);
  engine.acceptDailyBounty(s);
  s.enemies = [];
  for (const area of s.world.areas) {
    s.player.level = 25;
    engine.updateGame(s, {}, 1 / 120);
    engine.travelToArea(s, area.id);
    s.player.facing = 1;
    s.enemies = [
      {
        id: area.id,
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
        homeMin: area.x,
        homeMax: area.end,
        vx: 0,
        attackTimer: 5,
        hitTimer: 0,
      },
    ];
    s.player.attackTimer = 0;
    engine.updateGame(s, { attack: true }, 1 / 120);
  }
  assert.equal(s.daily.progress, 4);
  s.daily.progress = engine.getDailyView(s).bounty.count;
  s.player.x += 300;
  assert.equal(engine.claimDailyBounty(s), false);
  atGuide(s);
  assert.equal(engine.claimDailyBounty(s), true);
});
test('AUTO-quest has no objective gap over five minutes before level ten', async () => {
  const { simulateQuestTrail } = await import('../scripts/quest-benchmark.js');
  const run = simulateQuestTrail();
  assert.ok(run.timeTo10 >= 1500 && run.timeTo10 <= 1800, JSON.stringify(run));
  assert.ok(run.maxObjectiveGap <= 300, JSON.stringify(run));
  assert.equal(run.gladeCompleted, 8);
  assert.equal(run.deaths, 0);
});

test('midnight clears an unclaimed daily and partial objective; earlier dates cannot roll it back', () => {
  const day = new Date(2026, 9, 22, 23, 59, 59),
    s = engine.createGame(null, day);
  atGuide(s);
  engine.acceptDailyBounty(s, undefined, day);
  s.daily.progress = 999;
  const gold = s.player.gold,
    next = new Date(2026, 9, 23, 0, 0, 0);
  assert.equal(engine.claimDailyBounty(s, next), false);
  assert.equal(s.player.gold, gold);
  assert.equal(s.daily.activeId, null);
  assert.equal(s.daily.progress, 0);
  assert.equal(engine.acceptDailyBounty(s, undefined, next), true);
  s.daily.progress = 7;
  assert.equal(engine.refreshDailyBounties(s, day), false);
  assert.equal(s.daily.progress, 7);
});
test('legacy twelve-mission saves keep their completed chapters and active quest without extra rewards', () => {
  const legacy = STORY_QUESTS.filter((q) => !(q.areaId === 'emerald_glade' && q.minLevel > 1));
  const s = engine.createGame({
    player: { level: 16, gold: 4321 },
    story: {
      completed: legacy.slice(0, 4).map((q) => q.id),
      activeId: 'canopy-essence',
      progress: 2,
    },
  });
  assert.equal(s.story.completed.length, 9);
  assert.equal(s.story.activeId, 'canopy-essence');
  assert.equal(s.story.progress, 2);
  assert.equal(s.player.gold, 4321);
  const loaded = engine.createGame(engine.serializeGame(s));
  assert.deepEqual(loaded.story.completed, s.story.completed);
  assert.equal(loaded.story.progress, 2);
  assert.equal(loaded.player.gold, 4321);
});
test('Gloamcap is tougher, requires the named enemy, survives active reload and returns to an ordinary spawn', async () => {
  const q = STORY_QUESTS.find((q) => q.id === 'glade-gloamcap'),
    idx = STORY_QUESTS.indexOf(q);
  let s = engine.createGame({
    player: { level: 8 },
    story: { revision: 2, completed: STORY_QUESTS.slice(0, idx).map((q) => q.id) },
  });
  atGuide(s);
  assert.equal(engine.acceptStoryQuest(s, q.id), true);
  s = engine.createGame(engine.serializeGame(s));
  const enemy = s.enemies.find((e) => e.id === q.objective.enemyId);
  assert.equal(enemy.hp, 600);
  assert.ok(enemy.damage > 16);
  assert.equal(enemy.isElite, true);
  const { recordStoryEvent } = await import('../src/game/quests.js');
  assert.equal(
    recordStoryEvent(s, { kind: 'defeat', enemy: { ...enemy, id: 'ordinary-mushroom' } }),
    false,
  );
  s.enemies = [enemy];
  Object.assign(s.player, {
    x: enemy.x - 65,
    y: enemy.y + enemy.h - s.player.h,
    grounded: true,
    platformId: enemy.platformId,
    facing: 1,
  });
  for (let i = 0; i < 10 * 30 && enemy.hp > 0; i++) engine.updateGame(s, { attack: true }, 1 / 30);
  assert.equal(enemy.hp, 0);
  assert.equal(s.story.progress, 1);
  assert.equal(engine.getStoryView(s).status, 'ready');
  engine.updateGame(s, {}, 10);
  assert.equal(enemy.maxHp, 80);
  assert.ok(!enemy.isElite);
});

test('short daily bounties grant level-scaled XP, useful cores and tonics exactly once', async () => {
  const { DAILY_BOUNTIES, bountyRewards } = await import('../src/game/daily.js');
  assert.deepEqual(
    DAILY_BOUNTIES.map((b) => b.count),
    [25, 50, 100],
  );
  const low = bountyRewards(3, DAILY_BOUNTIES[2]),
    high = bountyRewards(10, DAILY_BOUNTIES[2]);
  assert.ok(high.xp > low.xp);
  assert.ok(high.cores >= 5 && high.tonics >= 2);
  const s = engine.createGame({ player: { level: 10 } });
  atGuide(s);
  engine.acceptDailyBounty(s);
  s.daily.progress = 25;
  const xp = s.player.xp,
    cores = s.starCores,
    tonics = s.player.inventory.filter((i) => i.type === 'potion').reduce((n, i) => n + i.count, 0);
  assert.equal(engine.claimDailyBounty(s), true);
  assert.ok(s.player.xp > xp);
  assert.ok(s.starCores > cores);
  assert.ok(
    s.player.inventory.filter((i) => i.type === 'potion').reduce((n, i) => n + i.count, 0) > tonics,
  );
  assert.equal(engine.claimDailyBounty(s), false);
});
