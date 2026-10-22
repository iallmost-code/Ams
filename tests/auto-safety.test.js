import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/game/engine.js';
import { STORY_QUESTS } from '../src/game/quests.js';
test('AUTO equips only stronger effective gear in every slot without deleting displaced items', () => {
  const s = engine.createGame();
  s.player.inventory.push(
    { id: 'starred', type: 'weapon', name: 'Starred blade', attack: 13, stars: 4 },
    { id: 'weaker', type: 'weapon', name: 'Weak blade', attack: 10, stars: 0 },
    { id: 'helm', type: 'hat', name: 'Helm', defense: 8, stars: 1 },
  );
  engine.toggleAuto(s);
  engine.updateGame(s, {}, 0.1);
  assert.equal(s.player.equipment.weapon.id, 'starred');
  assert.equal(s.player.equipment.hat.id, 'helm');
  assert.ok(s.player.inventory.some((i) => i.id === 'starter-sword'));
  assert.ok(s.player.inventory.some((i) => i.id === 'weaker'));
  engine.toggleAuto(s);
  s.player.inventory.push({ id: 'manual-choice', type: 'weapon', attack: 99, stars: 0 });
  engine.updateGame(s, {}, 2);
  assert.equal(s.player.equipment.weapon.id, 'starred');
});
test('AUTO-quest refuses an unlocked but under-geared destination and keeps hunting locally', () => {
  const s = engine.createGame({
    player: { level: 10 },
    story: {
      revision: 2,
      completed: STORY_QUESTS.filter((q) => q.areaId === 'emerald_glade').map((q) => q.id),
    },
  });
  s.player.inventory = [];
  engine.toggleAutoQuest(s);
  engine.updateGame(s, {}, 10);
  assert.equal(s.currentArea, 'emerald_glade');
  assert.equal(s.story.autoQuest, true);
  assert.match(s.story.status, /Gear up before Whispering Canopy.*Bag.*Forge.*Shop/);
  assert.ok(s.kills > 0);
});
test('low HP AUTO retreats and stops attacking while a tonic is cooling down', () => {
  const s = engine.createGame();
  s.enemies = s.enemies.filter((e) => e.id === 'enemy-0-0');
  const e = s.enemies[0];
  Object.assign(s.player, { x: e.x - 50, hp: 30, potionCooldown: 8, attackTimer: 0, invuln: 1 });
  s.auto = true;
  const before = s.player.x,
    hp = e.hp;
  engine.updateGame(s, {}, 0.1);
  assert.equal(e.hp, hp);
  assert.ok(s.player.x < before);
  assert.equal(s.story.autoQuest, false);
});
test('35 minutes of hands-off AUTO-quest survives and remains active after the level-ten gate', () => {
  const s = engine.createGame();
  engine.toggleAutoQuest(s);
  let timeTo10 = null;
  for (let second = 1; second <= 2100; second++) {
    engine.updateGame(s, {}, 1);
    if (s.player.level >= 10 && timeTo10 === null) timeTo10 = second;
  }
  assert.equal(s.deaths, 0, JSON.stringify({ level: s.player.level, status: s.story.status }));
  assert.equal(s.story.autoQuest, true);
  assert.equal(s.auto, true);
  assert.ok(timeTo10 >= 1500 && timeTo10 <= 1800, `Lv.10 at ${timeTo10}s`);
});

test('prepared Canopy AUTO-quest can recover at the safe edge instead of being pinned on a platform', () => {
  const s = engine.createGame({
    player: { level: 10 },
    story: {
      revision: 2,
      completed: STORY_QUESTS.filter((q) => q.areaId === 'emerald_glade').map((q) => q.id),
    },
  });
  s.player.equipment.weapon.attack = 37;
  s.player.equipment.armor.defense = 40;
  s.player.statLevel = 0;
  engine.updateGame(s, {}, 1 / 120);
  engine.toggleAutoQuest(s);
  for (let i = 0; i < 300; i++) engine.updateGame(s, {}, 1);
  assert.equal(s.deaths, 0);
  assert.equal(s.story.autoQuest, true);
  assert.equal(s.currentArea, 'whispering_canopy');
});
