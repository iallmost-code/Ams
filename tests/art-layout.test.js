import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasCellBounds } from '../src/game/art-layout.js';
test('fractional atlas cells never sample neighbouring frames and have real transparent gutters', () => {
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const b = atlasCellBounds(1254, 1254, 4, 4, x, y);
      assert.ok(b.sx > (x * 1254) / 4 && b.sy > (y * 1254) / 4);
      assert.ok(b.sx + b.sw < ((x + 1) * 1254) / 4);
      assert.ok(b.sy + b.sh < ((y + 1) * 1254) / 4);
      assert.equal(b.width - b.sw, 24);
      assert.equal(b.height - b.sh, 24);
    }
});

test('five-by-four skill atlas source rectangles remain within equal fractional cells', () => {
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 5; col++) {
      const b = atlasCellBounds(1536, 1024, 5, 4, col, row);
      assert.ok(b.sx > (col * 1536) / 5);
      assert.ok(b.sx + b.sw < ((col + 1) * 1536) / 5);
      assert.ok(b.sy > row * 256);
      assert.ok(b.sy + b.sh < (row + 1) * 256);
    }
});
