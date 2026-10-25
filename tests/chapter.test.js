import test from 'node:test';
import assert from 'node:assert/strict';
import { createMap, MAPS } from '../src/chapter/world.js';
import { rollGear, gearStats, canDismantle, itemScore } from '../src/chapter/gear.js';
test('chapter worlds are separate, large, distinct and linked by reciprocal portals', () => {
  const worlds = Object.keys(MAPS).map(createMap);
  assert.equal(worlds.length, 4);
  assert.ok(worlds.every((m) => m.width >= 1500));
  assert.equal(
    new Set(worlds.map((m) => JSON.stringify(m.platforms.map((p) => [p.x, p.y, p.w])))).size,
    4,
  );
  for (const m of worlds)
    for (const p of m.portals) {
      const target = createMap(p.target);
      assert.ok(target.portals.some((back) => back.target === m.id));
      assert.ok(m.platforms.some((f) => p.x >= f.x && p.x <= f.x + f.w && p.y === f.y));
    }
  const a = createMap('fields'),
    b = createMap('fields');
  a.platforms[0].y = 0;
  assert.notEqual(a.platforms[0].y, b.platforms[0].y);
  assert.notDeepEqual(
    new Set(createMap('fields').enemies.map((e) => e.type)),
    new Set(createMap('rise').enemies.map((e) => e.type)),
  );
});
test('random gear has real bounded affixes and varying base rolls at the same rarity', () => {
  const a = rollGear(42, 'weapon', 'epic', 3),
    b = rollGear(43, 'weapon', 'epic', 3);
  assert.notDeepEqual(a, b);
  assert.equal(a.affixes.length, 2);
  assert.ok(a.attack > 0);
  assert.ok(a.affixes.every((a) => a.value > 0 && a.value <= 20));
  assert.deepEqual(a, rollGear(42, 'weapon', 'epic', 3));
  const flat = gearStats([{ type: 'weapon', attack: 20, stars: 0, affixes: [] }]);
  const rolled = gearStats([
    {
      type: 'weapon',
      attack: 20,
      stars: 0,
      affixes: [
        { stat: 'attackPct', value: 10 },
        { stat: 'hpPct', value: 8 },
      ],
    },
  ]);
  assert.equal(flat.attack, rolled.attack);
  assert.equal(rolled.attackPct, 10);
  assert.equal(rolled.hpPct, 8);
  assert.ok(itemScore({ ...a, stars: 3 }) > itemScore(a));
});
test('batch dismantle protects equipped, starred, locked and non-equipment items', () => {
  const item = rollGear(7, 'hat', 'rare', 1);
  assert.equal(canDismantle(item, []), true);
  for (const protectedItem of [
    { ...item, locked: true },
    { ...item, stars: 1 },
    { ...item, type: 'quest' },
    { ...item, type: 'potion' },
  ])
    assert.equal(canDismantle(protectedItem, []), false);
  assert.equal(canDismantle(item, [item]), false);
});

import {
  createChapter,
  updateChapter,
  chapterAction,
  serializeChapter,
} from '../src/chapter/engine.js';
const step = (s, n, input = {}) => {
  for (let i = 0; i < n; i++) updateChapter(s, input, 1 / 120);
};
test('Vanguard strike damage waits for impact, applies once, and follows combo timing', () => {
  const s = createChapter();
  chapterAction(s, 'travel', 'fields');
  const e = s.enemies[0];
  s.player.x = e.x - 70;
  s.player.y = e.y + e.h - s.player.h;
  updateChapter(s, { attack: true }, 1 / 120);
  assert.equal(e.hp, e.maxHp);
  assert.equal(s.player.action.kind, 'attack');
  step(s, 20);
  assert.ok(e.hp < e.maxHp);
  const after = e.hp;
  step(s, 16);
  assert.equal(e.hp, after);
});
test('chapter portals replace the local world and save reload preserves gear/build without legacy fields', () => {
  const s = createChapter();
  chapterAction(s, 'travel', 'fields');
  assert.equal(s.mapId, 'fields');
  assert.equal(s.world.width, 3000);
  assert.equal(s.player.x, 175);
  const gear = rollGear(42, 'weapon', 'epic', 1);
  s.player.inventory.push(gear);
  chapterAction(s, 'equip', gear.id);
  chapterAction(s, 'build', 'zeal');
  const restored = createChapter(serializeChapter(s));
  assert.equal(restored.mapId, 'fields');
  assert.equal(restored.build, 'zeal');
  assert.equal(restored.player.equipment.weapon.id, gear.id);
  assert.equal(serializeChapter(s).saveVersion, 1);
  chapterAction(s, 'travel', 'hollow');
  assert.equal(s.mapId, 'hollow');
  assert.ok(s.player.x > 1400);
});
test('percent affixes and build choices change actual attack, defense and maximum HP', () => {
  const s = createChapter(),
    before = { ...s.player };
  s.player.inventory.push({
    ...rollGear(40, 'armor', 'epic', 1),
    id: 'affix-test',
    affixes: [
      { stat: 'hpPct', value: 20 },
      { stat: 'attackPct', value: 10 },
    ],
  });
  chapterAction(s, 'equip', 'affix-test');
  assert.ok(s.player.maxHp > before.maxHp);
  assert.ok(s.player.attack > before.attack);
  const hp = s.player.maxHp;
  chapterAction(s, 'build', 'bulwark');
  assert.ok(s.player.maxHp > hp);
  const armor = s.player.defense;
  chapterAction(s, 'build', 'zeal');
  assert.ok(s.player.defense < armor);
});
test('buffered jump fires after landing and air advance can only occur once per jump', () => {
  const s = createChapter();
  s.player.y = s.world.ground - s.player.h - 3;
  s.player.grounded = false;
  s.player.vy = 120;
  updateChapter(s, { jump: true }, 1 / 120);
  step(s, 8);
  assert.ok(s.player.vy < 0);
  assert.equal(s.player.grounded, false);
  step(s, 20);
  updateChapter(s, { jump: true }, 1 / 120);
  assert.equal(s.player.airAdvanceUsed, true);
  const n = s.effects.length;
  updateChapter(s, { jump: true }, 1 / 120);
  assert.equal(s.effects.length, n);
});
test('training sessions cannot serialize over chapter progress and malformed saves remain finite', () => {
  const s = createChapter({
    saveVersion: 1,
    level: NaN,
    mapId: 'missing',
    gold: -100,
    inventory: [null, { type: 'weapon' }],
  });
  assert.equal(s.mapId, 'hollow');
  assert.equal(s.player.level, 1);
  assert.ok(Number.isFinite(s.player.hp));
  assert.equal(s.player.inventory.length, 0);
  const training = createChapter(null, { training: true });
  assert.equal(training.player.level, 10);
  assert.equal(serializeChapter(training), null);
});
test('return portal accepts a deliberate new press after arrival movement', () => {
  const s = createChapter();
  chapterAction(s, 'travel', 'fields');
  step(s, 40, { left: true });
  assert.ok(Math.abs(s.player.x + s.player.w / 2 - 105) < 75);
  updateChapter(s, { interact: true }, 1 / 120);
  assert.equal(s.mapId, 'hollow');
});
test('guardian warning precedes damage and leaving its marked area avoids the strike', () => {
  const s = createChapter(null, { training: true });
  chapterAction(s, 'travel', 'sanctuary');
  const e = s.enemies[0];
  e.bossCooldown = 0.01;
  s.player.x = 1100;
  const before = s.player.hp;
  s.player.invuln = 0;
  step(s, 30);
  assert.equal(s.player.hp, before);
  assert.ok(s.effects.some((f) => f.type === 'chapter-warning'));
  s.player.x = 220;
  step(s, 140);
  assert.equal(s.player.hp, before);
});
test('skill taps near the end of a hammer swing buffer into the next action', () => {
  const s = createChapter();
  chapterAction(s, 'travel', 'fields');
  updateChapter(s, { attack: true }, 1 / 120);
  step(s, 12);
  updateChapter(s, { skill: true }, 1 / 120);
  step(s, 27);
  assert.equal(s.player.action?.kind, 'skill');
  assert.equal(s.player.action?.slot, 0);
});
test('death returns a living upright character to the village with equipment intact', () => {
  const s = createChapter(null, { training: true });
  chapterAction(s, 'travel', 'sanctuary');
  const e = s.enemies[0];
  s.player.x = 1100;
  s.player.hp = 1;
  s.player.invuln = 0;
  s.pet.healCooldown = 35;
  e.bossCooldown = 0.01;
  const id = s.player.equipment.weapon.id;
  step(s, 500);
  assert.equal(s.mapId, 'hollow');
  assert.equal(s.player.deadTimer, 0);
  assert.ok(s.player.hp > 0);
  assert.equal(s.player.equipment.weapon.id, id);
  assert.equal(s.deaths, 1);
});
test('skills cool down and can be cast again in the same session', () => {
  const s = createChapter();
  chapterAction(s, 'travel', 'fields');
  updateChapter(s, { skill: true }, 1 / 120);
  assert.ok(s.player.skillCooldowns[0] > 0);
  step(s, 400);
  assert.equal(s.player.skillCooldowns[0], 0);
  updateChapter(s, { skill: true }, 1 / 120);
  assert.equal(s.player.action?.slot, 0);
});
test('discovering the bell before its quest still advances the story after the field hunt', () => {
  const s = createChapter();
  chapterAction(s, 'travel', 'rise');
  const b = s.world.beacon;
  s.player.x = b.x - s.player.w / 2;
  s.player.y = b.y - s.player.h;
  s.player.platformId = s.world.platforms.find((p) => p.y === b.y).id;
  step(s, 40);
  updateChapter(s, { interact: true }, 1 / 120);
  assert.equal(s.beaconLit, true);
  chapterAction(s, 'travel', 'fields');
  s.questProgress = 7;
  const e = s.enemies[0];
  s.player.x = e.x - 55;
  s.player.attack = 1000;
  step(s, 40, { attack: true });
  assert.equal(s.questIndex, 2);
  assert.ok(s.player.inventory.some((i) => i.type === 'cape' && i.rarity === 'epic'));
});
test('descending a rope detaches onto its supported lower endpoint', () => {
  const s = createChapter();
  chapterAction(s, 'travel', 'rise');
  const rope = s.world.ropes[0];
  s.player.x = rope.x - s.player.w / 2;
  updateChapter(s, { up: true }, 1 / 120);
  assert.ok(s.player.climbing);
  step(s, 160, { down: true });
  assert.equal(s.player.climbing, null);
  assert.equal(s.player.y + s.player.h, s.world.ground);
  assert.equal(s.player.grounded, true);
});
test('a prepared Vanguard guardian fight lasts two to four minutes with active dodges', async () => {
  const { guardianBenchmark } = await import('../scripts/dawntrail-report.js');
  const report = guardianBenchmark();
  assert.equal(report.killed, true);
  assert.equal(report.deaths, 0);
  assert.ok(report.seconds >= 120 && report.seconds <= 240, JSON.stringify(report));
});
