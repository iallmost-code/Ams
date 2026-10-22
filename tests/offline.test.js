import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, serializeGame } from '../src/game/engine.js';
import { markAbsence, settleAbsence } from '../src/offline.js';
import { loadProgress, saveProgress } from '../src/save.js';

test('offline rewards require AUTO at departure and never reward a boss area', () => {
  for (const [auto, area] of [
    [false, 'emerald_glade'],
    [true, 'ember_altar'],
  ]) {
    const state = createGame();
    state.auto = auto;
    state.currentArea = area;
    const gold = state.player.gold;
    markAbsence(state, 1000);
    assert.equal(settleAbsence(state, 81_000), null);
    assert.equal(state.player.gold, gold);
  }
});

test('repeated hidden saves preserve the original departure and eligibility', () => {
  const state = createGame();
  state.auto = true;
  markAbsence(state, 1000);
  state.auto = false;
  markAbsence(state, 50_000);
  assert.equal(state.absence.hiddenAt, 1000);
  assert.equal(state.absence.autoBattle, true);
  const summary = settleAbsence(state, 81_000);
  assert.equal(summary.seconds, 80);
  assert.ok(summary.gold > 0 && summary.xp > 0 && summary.kills > 0);
  assert.equal(state.absence, null);
  assert.equal(settleAbsence(state, 90_000), null);
});

test('offline progress is capped, ignores clock rollback and grants only once', () => {
  const state = createGame();
  state.auto = true;
  markAbsence(state, 10_000);
  assert.equal(settleAbsence(state, 9000), null);
  markAbsence(state, 10_000);
  const summary = settleAbsence(state, 10_000 + 24 * 3600_000);
  assert.equal(summary.seconds, 8 * 3600);
  const gold = state.player.gold;
  assert.equal(settleAbsence(state, 10_000 + 25 * 3600_000), null);
  assert.equal(state.player.gold, gold);
});

test('departure survives a browser save/reload and its consumed reward cannot be claimed twice', () => {
  let raw;
  const storage = {
    getItem: () => raw ?? null,
    setItem: (key, value) => {
      raw = value;
    },
  };
  const state = createGame();
  state.auto = true;
  markAbsence(state, 1000);
  assert.equal(saveProgress(serializeGame(state), storage), true);
  const restored = createGame(loadProgress(storage));
  assert.ok(settleAbsence(restored, 81_000));
  assert.equal(saveProgress(serializeGame(restored), storage), true);
  assert.equal(settleAbsence(createGame(loadProgress(storage)), 90_000), null);
});
