import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixedStepper } from '../src/loop.js';

test('fixed simulation advances the same distance at 30, 60 and 120 display FPS', () => {
  const positions = [30, 60, 120].map((fps) => {
    let x = 0;
    const clock = createFixedStepper((input, dt) => {
      if (input.right) x += 240 * dt;
    });
    for (let frame = 0; frame < fps * 2; frame++) clock.advance(1 / fps, { right: true });
    return x;
  });
  for (const x of positions) assert.ok(Math.abs(x - 480) < 0.01, `expected 480, got ${x}`);
});

test('one jump edge is delivered once even when a display frame runs several steps', () => {
  let jumps = 0;
  let steps = 0;
  const clock = createFixedStepper((input) => {
    steps++;
    if (input.jump) jumps++;
  });
  clock.advance(1 / 30, { jump: true, attack: true });
  assert.equal(steps, 4);
  assert.equal(jumps, 1);
});

test('edge inputs survive a render frame too short for a physics step', () => {
  let casts = 0;
  const clock = createFixedStepper((input) => {
    if (input.skill2) casts++;
  });
  clock.advance(1 / 480, { skill2: true });
  clock.advance(1 / 480, {});
  clock.advance(1 / 240, {});
  assert.equal(casts, 1);
});

test('long stalls are clamped and resetting discards pending input and elapsed time', () => {
  let elapsed = 0;
  let jumps = 0;
  const clock = createFixedStepper((input, dt) => {
    elapsed += dt;
    if (input.jump) jumps++;
  });
  clock.advance(30, {});
  assert.ok(elapsed <= 0.101 && elapsed >= 0.09);
  clock.advance(1 / 480, { jump: true });
  clock.reset();
  clock.advance(1 / 120, {});
  assert.equal(jumps, 0);
});

test('invalid elapsed time cannot advance or corrupt the simulation', () => {
  let count = 0;
  const clock = createFixedStepper(() => count++);
  clock.advance(NaN, { right: true });
  clock.advance(-1, {});
  clock.advance(Infinity, {});
  assert.equal(count, 0);
  clock.advance(1 / 120, {});
  assert.equal(count, 1);
});

// Menu close can reset the clock after a queued RAF timestamp. Never lose its tap.
test('skill and buff taps survive zero or backward render timestamps', () => {
  for (const elapsed of [0, -0.001]) {
    const events = [],
      clock = createFixedStepper((input) => events.push(input));
    clock.advance(elapsed, { buff: true, skill: true });
    clock.advance(1 / 120, {});
    assert.equal(events[0].buff, true);
    assert.equal(events[0].skill, true);
    clock.advance(1 / 120, {});
    assert.equal(events[1].buff, false);
  }
});
