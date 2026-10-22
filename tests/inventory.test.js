import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../src/game/engine.js';
import { saveProgress, loadProgress } from '../src/save.js';
const gear = (id, type = 'weapon', stat = 10, extra = {}) => ({
  id,
  name: id,
  type,
  icon: '✦',
  count: 1,
  rarity: 'normal',
  [type === 'weapon' ? 'attack' : 'defense']: stat,
  ...extra,
});

test('Equip Best shares AUTO comparison, includes stars, keeps six slots and swapped gear', () => {
  const s = e.createGame();
  s.player.inventory.push(
    gear('high-base', 'weapon', 25),
    gear('starred', 'weapon', 24, { stars: 2 }),
    gear('best-hat', 'hat', 40),
  );
  for (const slot of Object.keys(s.player.equipment))
    if (!s.player.equipment[slot]) s.player.equipment[slot] = gear('starter-' + slot, slot, 1);
  const original = Object.values(s.player.equipment).map((i) => i.id);
  const automatic = e.createGame(e.serializeGame(s));
  const slots = e.equipBestGear(s);
  e.toggleAuto(automatic);
  e.updateGame(automatic, {}, 1 / 30);
  assert.ok(slots.includes('weapon'));
  assert.ok(slots.includes('hat'));
  assert.equal(s.player.equipment.weapon.id, 'starred');
  assert.deepEqual(s.player.equipment, automatic.player.equipment);
  assert.equal(Object.values(s.player.equipment).filter(Boolean).length, 6);
  for (const id of original)
    assert.ok(
      [...s.player.inventory, ...Object.values(s.player.equipment)].some((i) => i.id === id),
    );
  assert.deepEqual(e.equipBestGear(s), []);
});

test('batch preview is nonmutating; confirms only low unstarred unlocked gear and sums single rewards', () => {
  const s = e.createGame();
  s.player.inventory = [
    gear('upgrade', 'weapon', 60),
    gear('low'),
    gear('tied', 'weapon', 60),
    gear('star', 'weapon', 1, { stars: 1 }),
    gear('locked', 'weapon', 1, { locked: true }),
    gear('tonic', 'potion'),
    gear('letter', 'quest'),
    gear('epic', 'hat', 1, { rarity: 'epic' }),
  ];
  const before = JSON.stringify(s);
  const plan = e.previewDismantle(s);
  assert.equal(JSON.stringify(s), before, 'Cancel leaves every field unchanged');
  assert.ok(plan.ids.includes('low'));
  assert.ok(plan.ids.includes('tied'));
  for (const id of ['upgrade', 'star', 'locked', 'tonic', 'letter', 'epic'])
    assert.ok(!plan.ids.includes(id));
  const single = e.createGame(e.serializeGame(s));
  e.equipBestGear(single);
  const gold = single.player.gold,
    cores = single.starCores;
  for (const id of plan.ids) assert.equal(e.salvageItem(single, id), true);
  assert.equal(plan.gold, single.player.gold - gold);
  assert.equal(plan.cores, single.starCores - cores);
  const result = e.dismantleLowGear(s, plan);
  assert.equal(result.count, plan.ids.length);
  assert.equal(s.player.equipment.weapon.id, 'upgrade');
  for (const id of ['star', 'locked', 'tonic', 'letter', 'epic'])
    assert.ok(
      [...s.player.inventory, ...Object.values(s.player.equipment)].some((i) => i?.id === id),
    );
  assert.equal(s.player.gold, single.player.gold);
  assert.equal(s.starCores, single.starCores);
  assert.equal(e.salvageItem(s, 'locked'), false);
});

test('confirmation revalidates changed locks; rarity filter is explicit', () => {
  const s = e.createGame();
  s.player.equipment.hat = gear('strong-hat', 'hat', 30);
  s.player.inventory = [gear('low', 'weapon', 1), gear('epic', 'hat', 1, { rarity: 'epic' })];
  const plan = e.previewDismantle(s);
  e.toggleItemLock(s, 'low');
  assert.equal(e.dismantleLowGear(s, plan).count, 0);
  assert.ok(s.player.inventory.some((i) => i.id === 'low'));
  assert.ok(e.previewDismantle(s, ['epic']).ids.includes('epic'));
});

test('lock persists through validated saves and old items default unlocked', () => {
  const values = new Map(),
    storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const s = e.createGame();
  const id = s.player.inventory.find((i) => i.type === 'weapon').id;
  assert.equal(e.toggleItemLock(s, id), true);
  assert.equal(saveProgress(e.serializeGame(s), storage), true);
  const loaded = e.createGame(loadProgress(storage));
  assert.equal(loaded.player.inventory.find((i) => i.id === id).locked, true);
  const old = e.serializeGame(s);
  for (const i of old.inventory) delete i.locked;
  saveProgress(old, storage);
  assert.ok(loadProgress(storage).inventory.every((i) => !i.locked));
});

test('all slots choose their effective main stat, ties keep equipped, no-candidate preview is empty', () => {
  const s = e.createGame();
  s.player.inventory = [];
  for (const slot of Object.keys(s.player.equipment)) {
    s.player.equipment[slot] = gear('wearing-' + slot, slot, 10, { stars: 5 });
    s.player.inventory.push(
      gear('base-' + slot, slot, 15),
      gear('best-' + slot, slot, 14, { stars: 2 }),
    );
  }
  assert.equal(e.equipBestGear(s).length, 6);
  for (const slot of Object.keys(s.player.equipment))
    assert.equal(s.player.equipment[slot].id, 'best-' + slot);
  s.player.inventory = [];
  assert.deepEqual(e.previewDismantle(s).ids, []);
  assert.deepEqual(e.equipBestGear(s), []);
  for (const item of Object.values(s.player.equipment)) assert.ok(item);
});
