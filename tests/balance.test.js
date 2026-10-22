import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/game/engine.js';
const { createGame, updateGame, travelToArea, forgeItem, buyPotion, buyUpgrade, forgeCost } =
  engine;
import { simulateAuto } from '../scripts/balance.js';

test('one hour of unassisted AUTO respects progression and boss gates', () => {
  const r = simulateAuto();
  assert.ok(r.checkpoints[600].level < 10, JSON.stringify(r));
  assert.ok(r.firstBossKill === null || r.firstBossKill > 900, JSON.stringify(r));
  assert.ok(r.timeTo10 >= 1200 && r.timeTo10 <= 1800, JSON.stringify(r));
  assert.ok(r.level < 25, JSON.stringify(r));
});
test('starter equipment can die in the boss arena despite Pip and AUTO', () => {
  const s = createGame();
  s.player.level = 20;
  updateGame(s, {}, 1 / 120);
  travelToArea(s, 'ember_altar');
  const boss = s.enemies.find((e) => e.isBoss);
  s.enemies = [boss];
  s.player.x = boss.x - 75;
  s.auto = true;
  const result = simulateAuto({ game: s, seconds: 3600 });
  assert.ok(result.deaths > 0, 'an under-geared hero must not out-heal the boss');
  assert.equal(result.firstBossKill, null);
  assert.equal(s.kills, 0);
});
test('Pip healing has a 30 second cooldown and restores at most 12 percent', () => {
  const s = createGame();
  s.enemies = [];
  s.player.hp = s.player.maxHp * 0.25;
  const before = s.player.hp;
  updateGame(s, {}, 0.1);
  assert.ok(s.player.hp - before <= Math.ceil(s.player.maxHp * 0.12));
  assert.ok(s.pet.healCooldown >= 29.8);
});
test('forge costs rise steeply and purchases are bounded and consume gold', () => {
  const s = createGame();
  assert.ok(forgeCost(10).gold > forgeCost(0).gold * 20);
  assert.equal(buyPotion(s, 5), false);
  s.player.gold = 50000;
  const gold = s.player.gold;
  assert.equal(buyPotion(s, 5), true);
  assert.ok(s.player.gold < gold);
  assert.equal(buyPotion(s, -2), false);
  assert.equal(buyPotion(s, Infinity), false);
  assert.equal(buyUpgrade(s, 'vitality'), true);
  assert.ok(s.player.maxHp > 180);
  assert.equal(buyUpgrade(s, 'unknown'), false);
  s.player.gold = 0;
  const stars = s.player.equipment.weapon.stars;
  forgeItem(s, 'weapon', 0.5);
  assert.equal(s.player.equipment.weapon.stars, stars);
});

test('a geared hero who dodges telegraphs defeats the boss in two to four minutes', async () => {
  const { simulateGearedBoss } = await import('../scripts/boss-benchmark.js');
  const result = simulateGearedBoss();
  assert.equal(result.deaths, 0, JSON.stringify(result));
  assert.ok(result.killed >= 120 && result.killed <= 240, JSON.stringify(result));
});
test('meteor warning stays fixed and jumping alone cannot dodge it', () => {
  const s = createGame({ player: { level: 20 } });
  travelToArea(s, 'ember_altar');
  const boss = s.enemies.find((e) => e.isBoss);
  s.enemies = [boss];
  s.player.x = boss.x - 55;
  s.player.invuln = 0;
  boss.attackCount = 1;
  boss.bossCooldown = 0;
  updateGame(s, {}, 1 / 120);
  const x = boss.warningX;
  assert.equal(boss.attackKind, 'meteor');
  assert.ok(boss.telegraph >= 1.4);
  s.player.hp = s.player.maxHp;
  const hp = s.player.hp;
  s.player.y = 640;
  s.player.grounded = false;
  // Stay inside its column while airborne at impact.
  updateGame(s, {}, 1.1);
  updateGame(s, { jump: true }, 0.5);
  assert.equal(boss.warningX, x);
  assert.ok(s.player.hp < hp);
});

test('each newly unlocked hunting ground can kill an unprepared AUTO hero', () => {
  for (const [level, id] of [
    [10, 'whispering_canopy'],
    [16, 'crystal_cavern'],
    [20, 'ember_altar'],
  ]) {
    const s = createGame({ player: { level } });
    travelToArea(s, id);
    s.auto = true;
    for (let i = 0; i < 180 && !s.deaths; i++) updateGame(s, {}, 1);
    assert.ok(s.deaths > 0, `${id} must punish starter gear`);
  }
});
test('training and minimap preferences survive validated save round trips', async () => {
  const { saveProgress, loadProgress } = await import('../src/save.js');
  const { serializeGame } = engine;
  const s = createGame();
  s.player.gold = 5000;
  buyUpgrade(s, 'vitality');
  s.settings.minimapCollapsed = false;
  let raw;
  const storage = {
    setItem(k, v) {
      raw = v;
    },
    getItem() {
      return raw;
    },
  };
  assert.equal(saveProgress(serializeGame(s), storage), true);
  const restored = createGame(loadProgress(storage));
  assert.equal(restored.upgrades.vitality, 1);
  assert.equal(restored.player.maxHp, 205);
  assert.equal(restored.settings.minimapCollapsed, false);
});

test('paid progression still takes 20–30 minutes to level 10 and several hours to level 25', async () => {
  const { simulateProgression } = await import('../scripts/progression-benchmark.js');
  const r = simulateProgression(14400);
  assert.ok(r.timeTo10 >= 1200 && r.timeTo10 <= 1800, JSON.stringify(r));
  assert.ok(r.timeTo25 >= 7200 && r.timeTo25 <= 14400, JSON.stringify(r));
  assert.ok(r.checkpoints[3600].goldSpent > 10000, JSON.stringify(r));
  assert.ok(r.checkpoints[3600].gold < 10000, JSON.stringify(r));
});

test('a timed jump evades the shockwave and leaving the marked column evades a meteor', () => {
  for (const kind of ['slam', 'meteor']) {
    const s = createGame({ player: { level: 20 } });
    travelToArea(s, 'ember_altar');
    const b = s.enemies.find((e) => e.isBoss);
    s.enemies = [b];
    s.player.x = b.x - 55;
    s.player.invuln = 0;
    b.attackCount = kind === 'meteor' ? 1 : 0;
    b.bossCooldown = 0;
    updateGame(s, {}, 1 / 120);
    const hp = s.player.hp,
      mark = b.warningX;
    if (kind === 'slam') {
      updateGame(s, {}, 0.95);
      updateGame(s, { jump: true }, 0.4);
    } else {
      s.player.x = mark - 220;
      updateGame(s, {}, 1.6);
      assert.equal(b.warningX, mark);
    }
    assert.equal(s.player.hp, hp, kind);
  }
});
