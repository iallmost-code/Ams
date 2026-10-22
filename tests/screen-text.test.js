import test from 'node:test';
import assert from 'node:assert/strict';
import { placeFloatingTexts, worldToScreen } from '../src/game/screen-text.js';
const overlap = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
test('world anchors project to CSS pixels independent of device density', () => {
  assert.deepEqual(worldToScreen(200, 300, { x: 100, y: 200 }, 2, 2), { x: 100, y: 100 });
  assert.deepEqual(worldToScreen(200, 300, { x: 100, y: 200 }, 1, 1), { x: 100, y: 100 });
});
test('simultaneous quest, gold and damage boxes fit both phone viewports without overlaps', () => {
  for (const [width, height] of [
    [844, 390],
    [390, 844],
  ]) {
    const labels = Array.from({ length: 14 }, (_, i) => ({
      text: ['QUEST +1', '+13g', '102'][i % 3],
      x: i < 7 ? -15 : width + 10,
      y: i < 7 ? 5 : height - 5,
      width: 100,
      height: 28,
    }));
    const boxes = placeFloatingTexts(labels, { width, height });
    assert.equal(boxes.length, labels.length);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      assert.ok(b.x >= 4 && b.y >= 4);
      assert.ok(b.x + b.width <= width - 4 && b.y + b.height <= height - 4);
      for (let j = 0; j < i; j++) assert.equal(overlap(b, boxes[j]), false);
    }
  }
});
