import test from 'node:test';
import assert from 'node:assert/strict';
import {
  primaryKeyframes,
  PRIMARY_SKILL_SECONDS,
  effectIsForeground,
  paintedPosition,
} from '../src/game/skill-presentation.js';
import { createGame, updateGame } from '../src/game/engine.js';
import atlas from '../src/assets/skills.atlas.json' with { type: 'json' };
test('primary animation holds full power for 650ms and its visual lifetime exceeds one second', () => {
  assert.equal(
    atlas.frameDurationsMs.reduce((a, b) => a + b, 0),
    PRIMARY_SKILL_SECONDS * 1000,
  );
  for (let ms = 225; ms < 875; ms += 10) assert.equal(primaryKeyframes(ms / 1250).fullPower, true);
  assert.equal(primaryKeyframes(224 / 1250).fullPower, false);
  assert.equal(primaryKeyframes(876 / 1250).fullPower, false);
  const s = createGame();
  s.enemies = [];
  updateGame(s, { skill: true }, 1 / 120);
  for (let i = 0; i < 96; i++) updateGame(s, {}, 1 / 120);
  assert.ok(s.effects.some((e) => e.skillIndex === 0));
  for (let i = 0; i < 60; i++) updateGame(s, {}, 1 / 120);
  assert.ok(!s.effects.some((e) => e.skillIndex === 0));
});
test('every active skill, including nova and ultimate, renders in the foreground pass', () => {
  for (const [skillIndex, type] of ['slash', 'burst', 'nova', 'ultimate'].entries())
    assert.equal(effectIsForeground({ skillIndex, type }), true);
  assert.equal(effectIsForeground({ type: 'telegraph' }), false);
});
test('portrait effects preserve their leading edge rather than traveling out of view', () => {
  for (const classId of ['vanguard', 'arcanist', 'nightblade', 'ranger']) {
    const e = { classId, skillIndex: 0, range: 390, viewLeft: -101, viewRight: 158 };
    const x = paintedPosition(e, 0.7, 388, 0.7);
    assert.ok(x + (388 * 0.7) / 2 <= e.viewRight - 4 + 0.001);
  }
});
