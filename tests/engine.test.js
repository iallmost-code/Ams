import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/game/engine.js';
const step = (s, input = {}, seconds = 1) => {
  for (let t = 0; t < seconds; t += 1 / 120) engine.updateGame(s, input, 1 / 120);
};
const empty = () => {
  const s = engine.createGame();
  s.enemies = [];
  return s;
};
const stand = (s, p, x = p.x + 40) =>
  Object.assign(s.player, {
    x,
    y: p.y - s.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
    platformId: p.id,
    climbing: null,
  });

test('new adventure has nearby threats, stacked terrain, six equipment slots and class metadata', () => {
  const s = engine.createGame();
  assert.equal(s.player.gold, 300);
  assert.equal(s.starCores, 5);
  assert.deepEqual(Object.keys(s.player.equipment).sort(), [
    'armor',
    'boots',
    'cape',
    'gloves',
    'hat',
    'weapon',
  ]);
  assert.ok(s.player.equipment.weapon.attack > 0);
  assert.equal(s.player.inventory.find((i) => i.type === 'potion').count, 3);
  assert.equal(s.classes.length, 4);
  assert.equal(s.skillDefinitions.length, 4);
  assert.ok(s.enemies.some((e) => Math.abs(e.x - s.player.x) < 500));
  assert.ok(s.world.platforms.some((p) => p.y < 600));
  assert.equal(s.areas, s.world.areas);
});
test('one-way platforms catch falling feet but permit rising through undersides', () => {
  const s = empty(),
    p = s.world.platforms.find((p) => p.id !== 'ground');
  Object.assign(s.player, {
    x: p.x + 20,
    y: p.y - 160,
    vy: 20,
    grounded: false,
  });
  step(s, {}, 1);
  assert.equal(s.player.y, p.y - s.player.h);
  assert.equal(s.player.platformId, p.id);
  Object.assign(s.player, {
    x: p.x + 20,
    y: p.y + 15,
    vy: -600,
    grounded: false,
    platformId: null,
  });
  step(s, {}, 0.06);
  assert.ok(s.player.y < p.y, 'upward movement passes through underside');
});
test('jump is grounded and edge-triggered; down-jump drops through exactly one platform', () => {
  const s = empty(),
    p = s.world.platforms.find((p) => p.id !== 'ground');
  stand(s, p);
  engine.updateGame(s, { jump: true }, 1 / 120);
  const first = s.player.vy;
  assert.ok(first < 0);
  step(s, { jump: true }, 0.12);
  assert.ok(s.player.vy > first, 'holding cannot reset upward velocity');
  engine.updateGame(s, { jump: false }, 1 / 120);
  engine.updateGame(s, { jump: true }, 1 / 120);
  assert.ok(s.player.vy > first, 'no midair jump');
  stand(s, p);
  engine.updateGame(s, { jump: false }, 1 / 120);
  step(s, { down: true, jump: true }, 0.7);
  assert.ok(s.player.y > p.y);
});
test('ropes store their identity and detach safely at endpoints and on jump', () => {
  const s = empty(),
    r = s.world.ropes[0];
  Object.assign(s.player, {
    x: r.x - s.player.w / 2,
    y: r.y2 - s.player.h,
    grounded: true,
    platformId: 'ground',
  });
  step(s, { up: true }, 0.1);
  assert.equal(s.player.climbing, r.id);
  step(s, { up: true }, 4);
  assert.equal(s.player.climbing, null);
  assert.ok(s.player.y + s.player.h <= r.y1 + 2);
  Object.assign(s.player, {
    x: r.x - s.player.w / 2,
    y: (r.y1 + r.y2) / 2,
    grounded: false,
    climbing: r.id,
  });
  engine.updateGame(s, { jump: true, right: true }, 1 / 120);
  assert.equal(s.player.climbing, null);
  assert.ok(s.player.vy < 0);
});
test('attacks respect facing and a real cooldown, then advance a combo', () => {
  const s = engine.createGame();
  const p = s.player;
  const e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, { x: p.x + 45, y: p.y, hp: 10000, maxHp: 10000, vx: 0 });
  p.facing = -1;
  engine.updateGame(s, { attack: true }, 1 / 120);
  assert.equal(e.hp, 10000);
  step(s, {}, 0.6);
  p.facing = 1;
  engine.updateGame(s, { attack: true }, 1 / 120);
  assert.ok(e.hp < 10000);
  const hp = e.hp;
  engine.updateGame(s, { attack: true }, 1 / 120);
  assert.equal(e.hp, hp);
  step(s, { attack: true }, 0.55);
  assert.ok(e.hp < hp);
  assert.ok(p.combo >= 2);
});
test('all four classes have functional skills, independent cooldowns, mana costs and level locks', () => {
  for (const id of ['vanguard', 'arcanist', 'nightblade', 'ranger']) {
    const s = engine.createGame();
    engine.changeClass(s, id);
    const e = s.enemies[0];
    s.enemies = [e];
    Object.assign(e, {
      x: s.player.x + 60,
      y: s.player.y,
      hp: 10000,
      maxHp: 10000,
    });
    const mana = s.player.mp;
    engine.updateGame(s, { skill: true }, 1 / 120);
    assert.ok(e.hp < 10000, id);
    assert.ok(s.player.mp < mana);
    assert.ok(s.player.skillCooldowns[0] > 0);
    assert.equal(s.player.skillCooldowns[1], 0);
    engine.updateGame(s, { skill3: true }, 1 / 120);
    assert.equal(s.player.skillCooldowns[2], 0, 'level locked');
    engine.updateGame(s, {}, 1 / 120);
    s.player.level = 25;
    s.player.mp = 1000;
    engine.updateGame(s, { skill2: true, skill3: true, skill4: true }, 1 / 120);
    assert.ok(s.player.skillCooldowns.every((v) => v > 0));
  }
});
test('death rewards occur once, drops can be collected, and enemies respawn on their platform', () => {
  const s = engine.createGame(),
    e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, { x: s.player.x + 45, y: s.player.y, hp: 1 });
  s.player.facing = 1;
  engine.updateGame(s, { attack: true }, 1 / 120);
  assert.equal(s.kills, 1);
  const xp = s.player.xp;
  const gold = s.player.gold;
  step(s, {}, 0.8);
  assert.equal(s.kills, 1);
  assert.equal(s.player.xp, xp);
  assert.ok(s.drops.length || s.player.gold > gold, 'Pip may already have collected the reward');
  for (const d of s.drops) {
    d.x = s.player.x;
    d.y = s.player.y;
  }
  engine.updateGame(s, { interact: true }, 1 / 120);
  assert.ok(s.player.gold > gold);
  step(s, {}, 12);
  assert.ok(e.hp > 0);
  assert.equal(s.kills, 1);
});
test('enemy patrols remain within platform edges over a long simulation', () => {
  const s = engine.createGame();
  s.player.invuln = 1000;
  step(s, {}, 35);
  for (const e of s.enemies) {
    const p = s.world.platforms.find((p) => p.id === e.platformId);
    assert.ok(e.x >= p.x - 1);
    assert.ok(e.x + e.w <= p.x + p.w + 1);
  }
});
test('death recovers at safe spawn with restored health', () => {
  const s = engine.createGame();
  s.player.hp = 0;
  engine.updateGame(s, {}, 1 / 120);
  assert.ok(s.player.deadTimer > 0);
  step(s, {}, 4);
  assert.equal(s.player.hp, s.player.maxHp);
  assert.ok(s.player.invuln > 0);
  assert.ok(s.player.x < 300);
});
test('equipment replacement, salvage, potion, class advancement, forging, skill upgrades and travel persist', () => {
  const s = engine.createGame();
  const sword = s.player.inventory.find((i) => i.type === 'weapon');
  const old = s.player.equipment.weapon;
  assert.equal(engine.equipItem(s, sword.id), true);
  assert.ok(s.player.inventory.some((i) => i.id === old.id));
  s.player.hp = 1;
  assert.equal(engine.usePotion(s), true);
  assert.ok(s.player.hp > 1);
  assert.equal(engine.salvageItem(s, old.id), true);
  assert.equal(engine.forgeItem(s, 'weapon', 0.5).success, true);
  assert.equal(s.player.equipment.weapon.stars, 1);
  s.sp = 2;
  assert.equal(engine.upgradeSkill(s, 0), true);
  assert.equal(s.skillLevels[0], 2);
  assert.equal(engine.upgradeSkill(s, 3), false);
  assert.equal(engine.travelToArea(s, 'ember_altar'), false);
  s.player.level = 10;
  step(s, {}, 0.02);
  assert.equal(engine.travelToArea(s, 'ember_altar'), true);
  assert.equal(s.currentArea, 'ember_altar');
  assert.ok(s.enemies.some((e) => e.isBoss && e.telegraph !== undefined));
  const saved = engine.serializeGame(s, { sound: false });
  const restored = engine.createGame(saved);
  assert.equal(restored.player.level, 10);
  assert.equal(restored.player.equipment.weapon.stars, 1);
  assert.equal(restored.skillLevels[0], 2);
  assert.equal(restored.currentArea, 'ember_altar');
});
test('quest can only be claimed once and grants advancement', () => {
  const s = engine.createGame();
  assert.equal(engine.claimQuest(s), false);
  s.quest.kills = s.quest.target;
  s.quest.completed = true;
  const before = s.player.gold;
  assert.equal(engine.claimQuest(s), true);
  assert.ok(s.player.gold > before);
  assert.equal(engine.claimQuest(s), false);
});
test('leveling consumes experience thresholds and unlocks areas', () => {
  const s = engine.createGame();
  s.player.xp = 10000;
  step(s, {}, 0.01);
  assert.ok(s.player.level >= 6);
  assert.ok(s.unlockedAreas.includes('crystal_cavern'));
  assert.ok(s.sp > 0);
  assert.ok(s.player.maxHp > 100);
});
test('locked borders stop manual entry until level unlocks the next area', () => {
  const s = empty();
  s.player.x = 1150;
  step(s, { right: true }, 2);
  assert.ok(s.player.x + s.player.w <= 1200);
  assert.equal(s.currentArea, 'emerald_glade');
  s.player.level = 3;
  step(s, { right: true }, 1);
  assert.ok(s.player.x > 1200);
  assert.equal(s.currentArea, 'whispering_canopy');
});
test('boss announces a damaging strike long enough to evade it', () => {
  const s = engine.createGame();
  s.player.level = 12;
  engine.travelToArea(s, 'ember_altar');
  const boss = s.enemies.find((e) => e.isBoss);
  s.enemies = [boss];
  Object.assign(s.player, { x: boss.x - 55, y: 760, invuln: 0 });
  boss.bossCooldown = 0;
  engine.updateGame(s, {}, 1 / 120);
  assert.ok(boss.telegraph > 0.9);
  const hp = s.player.hp;
  step(s, {}, 0.65);
  assert.equal(s.player.hp, hp, 'warning causes no immediate damage');
  step(s, {}, 0.5);
  assert.ok(s.player.hp < hp, 'announced strike deals damage');
  s.player.invuln = 0;
  s.player.hp = s.player.maxHp;
  boss.bossCooldown = 0;
  engine.updateGame(s, {}, 1 / 120);
  s.player.x = boss.x - 500;
  const safe = s.player.hp;
  step(s, {}, 1.2);
  assert.equal(s.player.hp, safe, 'moving outside telegraph avoids damage');
});
test('manual skill presses are edges, while mana regenerates without attacks', () => {
  const s = empty();
  engine.updateGame(s, { skill: true }, 1 / 120);
  step(s, { skill: true }, 6);
  assert.equal(s.player.skillCooldowns[0], 0, 'holding cannot recast');
  engine.updateGame(s, { skill: false }, 1 / 120);
  engine.updateGame(s, { skill: true }, 1 / 120);
  assert.ok(s.player.skillCooldowns[0] > 0);
  s.player.mp = 0;
  step(s, {}, 2);
  assert.ok(s.player.mp >= 11.9);
});
test('long-range classes can hit targets a vanguard cannot reach', () => {
  for (const id of ['vanguard', 'arcanist', 'ranger']) {
    const s = engine.createGame();
    engine.changeClass(s, id);
    const e = s.enemies[0];
    s.enemies = [e];
    Object.assign(e, { x: s.player.x + 210, y: s.player.y, hp: 1000 });
    engine.updateGame(s, { attack: true }, 1 / 120);
    assert.equal(e.hp < 1000, id !== 'vanguard');
  }
});
test('forge failure and cap are safe and never destroy equipment', () => {
  const s = engine.createGame(),
    weapon = s.player.equipment.weapon;
  weapon.stars = 25;
  const gold = s.player.gold;
  assert.equal(engine.forgeItem(s, 'weapon', 0.5).success, false);
  assert.equal(s.player.gold, gold);
  assert.equal(s.player.equipment.weapon, weapon);
  weapon.stars = 1;
  s.player.gold = 0;
  assert.equal(engine.forgeItem(s, 'weapon', 0.5).success, false);
  assert.equal(weapon.stars, 1);
  assert.equal(engine.equipItem(s, 'missing'), false);
  assert.equal(engine.salvageItem(s, weapon.id), false);
});
test('simulation never mutates caller controls and substepping preserves movement', () => {
  const a = empty(),
    b = empty(),
    input = Object.freeze({ right: true });
  engine.updateGame(a, input, 0.2);
  for (let i = 0; i < 24; i++) engine.updateGame(b, input, 1 / 120);
  assert.ok(Math.abs(a.player.x - b.player.x) < 1e-8);
  assert.deepEqual(input, { right: true });
});
test('incoming and outgoing blows push combatants away and recover control', () => {
  const s = engine.createGame(),
    e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, {
    x: s.player.x + 42,
    y: s.player.y,
    hp: 1000,
    maxHp: 1000,
    vx: 0,
    homeMin: 0,
    homeMax: 1200,
  });
  const enemyX = e.x;
  engine.updateGame(s, { attack: true }, 1 / 120);
  step(s, {}, 0.1);
  assert.ok(e.x > enemyX + 5, 'enemy recoils away from blade');
  Object.assign(e, {
    x: s.player.x + 25,
    y: s.player.y,
    attackTimer: 0,
    knockbackTimer: 0,
    knockbackVx: 0,
  });
  s.player.invuln = 0;
  const x = s.player.x;
  step(s, {}, 0.12);
  assert.ok(s.player.x < x - 5, 'incoming contact recoils player');
  step(s, { right: true }, 0.5);
  assert.ok(s.player.x > x, 'manual control recovers');
});
test('manual attacks and every skill remain available while AUTO has no target', () => {
  const s = empty();
  s.player.level = 25;
  engine.changeClass(s, 'arcanist');
  engine.toggleAuto(s);
  for (const key of ['attack', 'skill', 'skill2', 'skill3', 'skill4']) {
    s.player.mp = s.player.maxMp;
    engine.updateGame(s, { [key]: true }, 1 / 120);
    if (key === 'attack') assert.ok(s.player.attackTimer > 0);
    else
      assert.ok(s.player.skillCooldowns[key === 'skill' ? 0 : Number(key.slice(-1)) - 1] > 0, key);
    engine.updateGame(s, {}, 1 / 120);
  }
});
test('restored loot identities cannot collide with newly earned equipment', () => {
  const original = engine.createGame();
  original.player.inventory.push({
    id: 'loot-2',
    name: 'Saved Hat',
    type: 'hat',
    rarity: 'rare',
    icon: 'H',
    count: 1,
    defense: 4,
  });
  const s = engine.createGame(engine.serializeGame(original));
  s.kills = 2;
  const e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, { x: s.player.x + 40, y: s.player.y, hp: 1 });
  engine.updateGame(s, { attack: true }, 1 / 120);
  const ids = [...s.player.inventory, ...s.drops.map((d) => d.item).filter(Boolean)].map(
    (i) => i.id,
  );
  assert.equal(new Set(ids).size, ids.length);
});
test('simulation consumes the full requested duration and pause freezes the world', () => {
  const a = empty(),
    b = empty();
  engine.updateGame(a, { right: true }, 0.5);
  for (let i = 0; i < 60; i++) engine.updateGame(b, { right: true }, 1 / 120);
  assert.ok(Math.abs(a.player.x - b.player.x) < 1e-8);
  assert.ok(Math.abs(a.time - 0.5) < 1e-8);
  const before = JSON.stringify(a);
  a.paused = true;
  const paused = JSON.stringify(a);
  engine.updateGame(a, { attack: true, right: true }, 1);
  assert.equal(JSON.stringify(a), paused);
  assert.notEqual(paused, before);
});
test('rope descent lands safely at bottom, and lateral input detaches mid-rope', () => {
  const s = empty(),
    r = s.world.ropes[0];
  Object.assign(s.player, {
    x: r.x - s.player.w / 2,
    y: r.y1 + 20,
    grounded: false,
    platformId: null,
    climbing: r.id,
  });
  step(s, { down: true }, 2);
  assert.equal(s.player.climbing, null);
  assert.equal(s.player.platformId, 'ground');
  assert.equal(s.player.y, 820 - s.player.h);
  Object.assign(s.player, {
    x: r.x - s.player.w / 2,
    y: r.y1 + 10,
    grounded: false,
    platformId: null,
    climbing: r.id,
  });
  engine.updateGame(s, { right: true }, 1 / 120);
  assert.equal(s.player.climbing, null);
  assert.ok(s.player.vx > 0);
});

test('Pip flies to loot in manual mode and collects each drop once', () => {
  const s = empty();
  const gold = s.player.gold;
  s.drops.push({
    id: 'pet-test',
    x: s.player.x + 210,
    y: s.player.y + 25,
    w: 10,
    h: 10,
    type: 'gold',
    amount: 37,
    age: 0,
  });
  step(s, {}, 2);
  assert.equal(s.player.gold, gold + 37);
  assert.equal(s.drops.length, 0);
  step(s, {}, 2);
  assert.equal(s.player.gold, gold + 37);
  assert.equal(s.auto, false);
});
test('Pip heals living injured heroes with a cooldown, without consuming potions', () => {
  const s = empty();
  s.player.hp = Math.floor(s.player.maxHp * 0.4);
  const hp = s.player.hp;
  const potions = JSON.stringify(s.player.inventory);
  step(s, {}, 0.1);
  assert.ok(s.player.hp > hp);
  assert.ok(s.player.hp <= s.player.maxHp);
  const healed = s.player.hp;
  step(s, {}, 1);
  assert.equal(s.player.hp, healed);
  assert.equal(JSON.stringify(s.player.inventory), potions);
  assert.ok(s.pet.healCooldown > 0);
  s.player.hp = 0;
  s.pet.healCooldown = 0;
  step(s, {}, 0.1);
  assert.equal(s.player.hp, 0);
});
test('analog movement supports a gentle walking speed', () => {
  const s = empty();
  step(s, { moveX: 0.5, right: true }, 0.1);
  const slow = s.player.vx;
  assert.equal(s.player.facing, 1, 'analog input must not shrink the facing transform');
  step(s, { right: true }, 0.1);
  assert.ok(slow > 0 && slow < s.player.vx * 0.6);
});

test('Pip collects equipment, leaves distant loot, and follows after travel', () => {
  const s = empty();
  const item = { id: 'pip-loot', name: 'Pip charm', type: 'cape', rarity: 'rare', count: 1 };
  s.drops.push({
    id: 'pet-item',
    x: s.player.x + 180,
    y: s.player.y + 15,
    w: 10,
    h: 10,
    type: 'item',
    item,
    age: 0,
  });
  s.drops.push({
    id: 'distant',
    x: s.player.x + 700,
    y: s.player.y,
    w: 10,
    h: 10,
    type: 'gold',
    amount: 99,
    age: 0,
  });
  step(s, {}, 2);
  assert.equal(s.player.inventory.filter((i) => i.id === item.id).length, 1);
  assert.equal(s.drops.length, 1);
  const cooldown = s.pet.healCooldown;
  s.paused = true;
  step(s, {}, 1);
  assert.equal(s.pet.healCooldown, cooldown);
  s.paused = false;
  s.player.x = 2500;
  step(s, {}, 0.1);
  assert.ok(Math.abs(s.pet.x - s.player.x) < 100);
});
