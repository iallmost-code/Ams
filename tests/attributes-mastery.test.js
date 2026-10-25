import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../src/game/engine.js';
import { saveProgress, loadProgress } from '../src/save.js';

test('level up grants five spendable AP and increases HP and MP in all four classes', () => {
  for (const classId of ['vanguard', 'arcanist', 'nightblade', 'ranger']) {
    const s = e.createGame({ classId });
    const before = { ...s.player };
    e.gainExperience(s, s.player.xpToNext);
    assert.equal(s.player.ap, 5);
    assert.ok(s.player.maxHp > before.maxHp);
    assert.ok(s.player.maxMp > before.maxMp);
    assert.equal(s.player.hp, s.player.maxHp);
    assert.equal(s.player.mp, s.player.maxMp);
    assert.equal(s.levelUpSummary.hp, s.player.maxHp - before.maxHp);
    assert.equal(s.levelUpSummary.mp, s.player.maxMp - before.maxMp);
  }
});
test('STR DEX INT LUK each change actual combat stats and cannot overspend AP', () => {
  for (const stat of ['STR', 'DEX', 'INT', 'LUK']) {
    const s = e.createGame({ player: { level: 4 } });
    const before = { ...s.player };
    assert.equal(e.allocateAttribute(s, stat, 5), true);
    assert.equal(s.player.ap, 10);
    if (stat === 'STR') {
      assert.ok(s.player.maxHp > before.maxHp);
      assert.ok(s.player.defense > before.defense);
    }
    if (stat === 'DEX') {
      assert.ok(s.player.attackSpeed > before.attackSpeed);
      assert.ok(s.player.critRate > before.critRate);
    }
    if (stat === 'INT') {
      assert.ok(s.player.maxMp > before.maxMp);
      assert.ok(s.player.skillDamageMultiplier > before.skillDamageMultiplier);
    }
    if (stat === 'LUK') {
      assert.ok(s.player.critRate > before.critRate);
      assert.ok(s.player.critDamage > before.critDamage);
    }
    assert.equal(e.allocateAttribute(s, stat, 11), false);
    assert.equal(e.allocateAttribute(s, stat, -1), false);
    assert.equal(e.allocateAttribute(s, 'GOLD', 1), false);
  }
});
test('main-stat allocation raises actual attack and reset refunds only earned points', () => {
  for (const classId of ['vanguard', 'arcanist', 'nightblade', 'ranger']) {
    const s = e.createGame({ classId, player: { level: 4 } }),
      before = s.player.attack;
    assert.equal(e.allocateAttribute(s, s.player.mainAttribute, 15), true);
    assert.ok(s.player.attack >= before + 15);
    assert.equal(s.player.ap, 0);
    assert.equal(e.allocateAttribute(s, s.player.mainAttribute, 1), false);
    e.resetAttributes(s);
    assert.equal(s.player.ap, 15);
    assert.equal(s.player.attack, before);
  }
});
test('mastery spends SP, increases attack/skill power/minimum damage and respects cap', () => {
  const s = e.createGame({ sp: 21 });
  const before = { ...s.player };
  assert.equal(e.upgradeMastery(s), true);
  assert.equal(s.sp, 20);
  assert.ok(s.player.attack > before.attack);
  assert.ok(s.player.minDamageMultiplier > before.minDamageMultiplier);
  assert.ok(s.player.skillDamageMultiplier > before.skillDamageMultiplier);
  for (let i = 1; i < 20; i++) assert.equal(e.upgradeMastery(s), true);
  assert.equal(s.masteryRank, 20);
  assert.equal(e.upgradeMastery(s), false);
  assert.equal(s.sp, 1);
});
test('AP and mastery persist, old saves get earned AP, malformed allocation never mints points', () => {
  const values = new Map(),
    store = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const s = e.createGame({ player: { level: 5 }, sp: 4 });
  e.allocateAttribute(s, 'STR', 12);
  e.upgradeMastery(s);
  assert.equal(saveProgress(e.serializeGame(s), store), true);
  const loaded = e.createGame(loadProgress(store));
  assert.equal(loaded.player.ap, 8);
  assert.equal(loaded.player.attributes.STR, s.player.attributes.STR);
  assert.equal(loaded.masteryRank, 1);
  assert.equal(e.createGame({ player: { level: 10 } }).player.ap, 45);
  const corrupt = e.createGame({
    player: { level: 2 },
    attributeAllocation: { STR: 999999, DEX: -4, INT: '9', LUK: 0 },
  });
  assert.equal(corrupt.player.ap, 5);
  assert.ok(corrupt.player.attributes.STR < 100);
});

test('allocated primary stats and mastery increase enemy HP loss, DEX shortens real attack cooldown', () => {
  const hit = (classId, stat, mastery = 0) => {
    const s = e.createGame({ classId, player: { level: 11 }, sp: 5 });
    s.enemies = [s.enemies[0]];
    Object.assign(s.enemies[0], { x: s.player.x + 50, y: s.player.y, hp: 100000, maxHp: 100000 });
    if (stat) e.allocateAttribute(s, stat, 50);
    for (let i = 0; i < mastery; i++) e.upgradeMastery(s);
    s.player.critRate = 0;
    s.combatSeed = 1234;
    e.updateGame(s, { attack: true }, 1 / 120);
    return { loss: 100000 - s.enemies[0].hp, timer: s.player.attackTimer };
  };
  for (const [cls, stat] of [
    ['vanguard', 'STR'],
    ['arcanist', 'INT'],
    ['nightblade', 'LUK'],
    ['ranger', 'DEX'],
  ])
    assert.ok(hit(cls, stat).loss > hit(cls).loss);
  assert.ok(hit('vanguard', null, 5).loss > hit('vanguard').loss);
  assert.ok(hit('vanguard', 'DEX').timer < hit('vanguard').timer);
});
