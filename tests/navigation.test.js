import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, toggleAuto } from '../src/game/engine.js';
import { buildNavigationGraph, findRoute } from '../src/game/navigation.js';
const run = (s, seconds, input = {}) => {
  for (let i = 0; i < seconds * 120; i++) updateGame(s, input, 1 / 120);
};
test('navigation routes include rope ascent, feasible jumps and downward paths', () => {
  const s = createGame(),
    g = buildNavigationGraph(s.world);
  const high = s.world.platforms.find((p) => p.y < 500 && p.x < 1200);
  const route = findRoute(g, 'ground', high.id);
  assert.ok(route?.length);
  assert.ok(route.some((e) => e.type === 'rope'));
  assert.ok(findRoute(g, high.id, 'ground')?.length);
  assert.ok(
    Object.values(g)
      .flat()
      .some((e) => e.type === 'jump'),
  );
});
test('AUTO reaches a monster on a high platform and collects its spoils', () => {
  const s = createGame();
  const p = s.world.platforms.find((p) => p.y < 500 && p.x < 1200);
  const e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, {
    platformId: p.id,
    x: p.x + 100,
    y: p.y - e.h,
    hp: 20,
    maxHp: 20,
    respawnTimer: 999,
    level: 1,
  });
  s.player.invuln = 1000;
  const gold = s.player.gold;
  toggleAuto(s);
  run(s, 45);
  assert.ok(s.kills >= 1, `auto at ${s.player.x},${s.player.y}, ${s.player.platformId}`);
  assert.ok(s.player.gold > gold, 'collects loot after kill');
});
test('AUTO tolerates long deterministic runs and resumes after temporary manual override', () => {
  const a = createGame(),
    b = createGame();
  toggleAuto(a);
  toggleAuto(b);
  run(a, 100);
  run(b, 100);
  assert.equal(a.kills, b.kills);
  assert.equal(a.player.x, b.player.x);
  assert.ok(a.kills > 8);
  assert.ok(a.player.level > 1);
  assert.ok(Number.isFinite(a.player.y));
  const x = a.player.x;
  run(a, 0.5, { left: true });
  assert.ok(a.player.x < x);
  assert.equal(a.auto, true);
  assert.ok(a.autoOverride > 0);
  run(a, 6);
  assert.equal(a.autoOverride, 0);
});
test('every jump graph edge launches and lands inside its platform', () => {
  const s = createGame();
  for (const edge of Object.values(s.navigation)
    .flat()
    .filter((e) => e.type === 'jump')) {
    const from = s.world.platforms.find((p) => p.id === edge.from),
      to = s.world.platforms.find((p) => p.id === edge.to);
    assert.ok(edge.x >= from.x + 19 && edge.x <= from.x + from.w - 19);
    assert.ok(
      edge.landX >= to.x + 19 && edge.landX <= to.x + to.w - 19,
      `${edge.from} -> ${edge.to}`,
    );
  }
});
test('AUTO executes a real jump route to a higher adjacent platform', () => {
  const s = createGame(),
    from = s.world.platforms.find((p) => p.id === '0-step'),
    to = s.world.platforms.find((p) => p.id === '0-mid');
  Object.assign(s.player, {
    x: from.x + 25,
    y: from.y - s.player.h,
    platformId: from.id,
    grounded: true,
    invuln: 1000,
  });
  const e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, {
    platformId: to.id,
    x: to.x + 260,
    y: to.y - e.h,
    hp: 20,
    maxHp: 20,
    homeMin: to.x,
    homeMax: to.x + to.w,
  });
  toggleAuto(s);
  run(s, 20);
  assert.ok(s.kills > 0, `auto at ${s.player.x},${s.player.y}, ${s.player.platformId}`);
});
test('AUTO descends from high terrain to a ground target', () => {
  const s = createGame(),
    from = s.world.platforms.find((p) => p.id === '0-high');
  Object.assign(s.player, {
    x: from.x + 100,
    y: from.y - s.player.h,
    platformId: from.id,
    grounded: true,
    invuln: 1000,
  });
  const e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, {
    x: 350,
    y: 820 - e.h,
    hp: 20,
    maxHp: 20,
    platformId: 'ground',
  });
  toggleAuto(s);
  run(s, 30);
  assert.ok(s.kills > 0);
});
test('touching platforms have a walking route that AUTO crosses without jumping', () => {
  const s = createGame();
  const from = s.world.platforms.find((p) => p.id === '0-low'),
    to = s.world.platforms.find((p) => p.id === '0-low-east');
  assert.ok(to, 'world includes adjacent walkable shelves');
  const route = findRoute(s.navigation, from.id, to.id);
  assert.ok(route.some((e) => e.type === 'walk'));
  Object.assign(s.player, {
    x: from.x + from.w - 70,
    y: from.y - s.player.h,
    platformId: from.id,
    grounded: true,
    invuln: 1000,
  });
  const e = s.enemies[0];
  s.enemies = [e];
  Object.assign(e, {
    platformId: to.id,
    x: to.x + 30,
    y: to.y - e.h,
    hp: 20,
    maxHp: 20,
    homeMin: to.x,
    homeMax: to.x + to.w,
  });
  toggleAuto(s);
  run(s, 10);
  assert.ok(s.kills > 0);
});

test('AUTO takes over a manually attached rope and defeats an elevated target', () => {
  const s = createGame(),
    rope = s.world.ropes[0],
    platform = s.world.platforms.find((p) => p.id === '0-low');
  Object.assign(s.player, {
    x: rope.x - s.player.w / 2,
    y: 820 - s.player.h,
    platformId: 'ground',
    grounded: true,
    invuln: 1000,
  });
  const enemy = s.enemies[0];
  s.enemies = [enemy];
  Object.assign(enemy, {
    platformId: platform.id,
    x: platform.x + 130,
    y: platform.y - enemy.h,
    hp: 20,
    maxHp: 20,
    homeMin: platform.x,
    homeMax: platform.x + platform.w,
  });
  run(s, 40 / 120, { up: true });
  assert.equal(s.player.climbing, rope.id);
  const y = s.player.y;
  toggleAuto(s);
  run(s, 30);
  assert.ok(
    s.kills > 0,
    `rope takeover stuck at y${s.player.y}, started ${y}, climbing ${s.player.climbing}`,
  );
});

test('AUTO resumes after toggling off and on in the middle of an ascent', () => {
  const s = createGame(),
    platform = s.world.platforms.find((p) => p.id === '0-high');
  const enemy = s.enemies[0];
  s.enemies = [enemy];
  Object.assign(enemy, {
    platformId: platform.id,
    x: platform.x + 130,
    y: platform.y - enemy.h,
    hp: 20,
    maxHp: 20,
    homeMin: platform.x,
    homeMax: platform.x + platform.w,
  });
  s.player.invuln = 1000;
  toggleAuto(s);
  for (let i = 0; i < 1200 && !s.player.climbing; i++) updateGame(s, {}, 1 / 120);
  assert.ok(s.player.climbing, 'AUTO began a rope ascent');
  run(s, 0.15);
  assert.ok(s.player.climbing);
  toggleAuto(s);
  run(s, 0.2);
  toggleAuto(s);
  run(s, 40);
  assert.ok(s.kills > 0, `AUTO stopped at ${s.player.x},${s.player.y}, rope ${s.player.climbing}`);
});

test('AUTO leaves a manually attached rope safely even when no living target exists', () => {
  const s = createGame(),
    rope = s.world.ropes[0];
  s.enemies = [];
  Object.assign(s.player, {
    x: rope.x - s.player.w / 2,
    y: 820 - s.player.h,
    platformId: 'ground',
    grounded: true,
  });
  run(s, 0.3, { up: true });
  assert.equal(s.player.climbing, rope.id);
  toggleAuto(s);
  run(s, 7);
  assert.equal(s.player.climbing, null);
  assert.ok(s.player.grounded);
  assert.ok(s.player.platformId);
});
