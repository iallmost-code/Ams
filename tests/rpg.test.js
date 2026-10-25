import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../src/game/engine.js';
import { growthStats, lootRarity, BUFF_DURATION, BUFF_COOLDOWN } from '../src/game/rpg.js';
test('every class gains real power, attributes and explicit stat deltas on level-up', () => {
  for (const classId of ['vanguard', 'arcanist', 'nightblade', 'ranger']) {
    const s = e.createGame({ classId }),
      before = { ...s.player };
    e.gainExperience(s, s.player.xpToNext);
    assert.equal(s.player.attack, before.attack + 4);
    assert.ok(s.player.defense >= before.defense + 2);
    assert.ok(s.player.maxHp >= before.maxHp + 28);
    assert.ok(s.player.combatPower > before.combatPower);
    assert.equal(growthStats(classId, 2).attackGrowth, 4);
    assert.match(s.notice, /ATK/);
  }
});
test('buffs enforce unlock, MP and cooldown, apply and expire without stacking or saving invulnerability', () => {
  for (const classId of ['vanguard', 'arcanist', 'nightblade', 'ranger']) {
    const s = e.createGame({ classId });
    s.enemies = [];
    assert.equal(e.castBuff(s), false);
    s.player.level = 3;
    e.updateGame(s, {}, 0.01);
    const base = s.player.attack,
      mp = s.player.mp;
    assert.equal(e.castBuff(s), true);
    assert.ok(s.player.attack > base);
    assert.ok(s.player.mp < mp);
    assert.equal(s.player.buffRemaining, BUFF_DURATION);
    assert.equal(e.castBuff(s), false);
    e.updateGame(s, {}, BUFF_DURATION + 0.1);
    assert.equal(s.player.buffRemaining, 0);
    assert.equal(s.player.attack, base);
    assert.ok(s.player.buffCooldown > 0);
    const loaded = e.createGame(e.serializeGame(s));
    assert.equal(loaded.player.buffRemaining, 0);
    e.updateGame(s, {}, BUFF_COOLDOWN);
    assert.equal(e.castBuff(s), true);
  }
});
test('ultimate unlock, mana, cooldown and distinct class effects are actual combat rules', () => {
  for (const classId of ['vanguard', 'arcanist', 'nightblade', 'ranger']) {
    const s = e.createGame({ classId });
    s.enemies = [];
    e.updateGame(s, { skill4: true }, 0.01);
    assert.equal(s.player.skillCooldowns[3], 0);
    s.player.level = 25;
    e.updateGame(s, {}, 0.01);
    e.updateGame(s, { skill4: true }, 0.01);
    assert.ok(s.player.skillCooldowns[3] > 40);
    assert.ok(s.effects.some((f) => f.type === 'ultimate' && f.classId === classId));
    assert.ok(s.skillDefinitions[3].hits >= 8);
  }
});
test('rarity table contains actual attainable tiers and boss guarantees epic or better', () => {
  assert.equal(lootRarity(0.99), 'normal');
  assert.equal(lootRarity(0.5), 'rare');
  assert.equal(lootRarity(0.1), 'epic');
  assert.equal(lootRarity(0.01, false, 1), 'unique');
  assert.equal(lootRarity(0.01, true), 'mythic');
  assert.equal(lootRarity(0.2, true), 'unique');
  assert.equal(lootRarity(0.99, true), 'epic');
});

test('skill popup lines sum to actual damage without flooding the viewport', () => {
  const s = e.createGame();
  const enemy = s.enemies[0];
  s.enemies = [enemy];
  Object.assign(enemy, { x: s.player.x + 50, y: s.player.y, hp: 10000, maxHp: 10000 });
  s.player.critRate = 0;
  e.updateGame(s, { skill: true }, 1 / 120);
  const damage = 10000 - enemy.hp,
    lines = s.numbers.filter((n) => /^\d+$/.test(n.text));
  assert.ok(damage > 0);
  assert.ok(lines.length <= 3);
  assert.equal(
    lines.reduce((sum, n) => sum + Number(n.text), 0),
    damage,
  );
});

test('critical hits change actual health loss rather than only recoloring numbers', () => {
  const s = e.createGame(),
    enemy = s.enemies[0];
  s.enemies = [enemy];
  Object.assign(enemy, { x: s.player.x + 50, y: s.player.y, hp: 10000, maxHp: 10000 });
  s.player.critRate = 1;
  e.updateGame(s, { attack: true }, 1 / 120);
  assert.ok(
    10000 - enemy.hp >=
      Math.floor(s.player.attack * s.player.minDamageMultiplier * s.player.critDamage),
  );
  assert.ok(
    10000 - enemy.hp <=
      Math.ceil(s.player.attack * s.player.maxDamageMultiplier * s.player.critDamage),
  );
  assert.ok(s.numbers.some((n) => n.critical));
});

test('buff tap survives a render frame with no physics step', async () => {
  const { createFixedStepper } = await import('../src/loop.js');
  const calls = [],
    stepper = createFixedStepper((input) => calls.push(input));
  stepper.advance(0.001, { buff: true });
  stepper.advance(0.01, {});
  assert.equal(calls[0].buff, true);
});

test('temporary buffs cannot satisfy permanent area gear readiness', () => {
  const s = e.createGame();
  s.player.level = 10;
  s.player.equipment.weapon.attack = 14;
  s.player.equipment.armor.defense = 36;
  e.updateGame(s, {}, 0.01);
  assert.equal(e.areaReadiness(s, 'whispering_canopy'), false);
  e.castBuff(s);
  assert.ok(s.player.attack >= 75);
  assert.equal(e.areaReadiness(s, 'whispering_canopy'), false);
});
