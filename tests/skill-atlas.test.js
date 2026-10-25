import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import atlas from '../src/assets/skills.atlas.json' with { type: 'json' };
function pngAlpha(file) {
  const b = readFileSync(file);
  let offset = 8,
    width,
    height;
  const parts = [];
  while (offset < b.length) {
    const n = b.readUInt32BE(offset),
      tag = b.toString('ascii', offset + 4, offset + 8),
      data = b.subarray(offset + 8, offset + 8 + n);
    if (tag === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      assert.equal(data[9], 6);
      assert.equal(data[12], 0);
    }
    if (tag === 'IDAT') parts.push(data);
    offset += n + 12;
  }
  const raw = inflateSync(Buffer.concat(parts)),
    alpha = new Uint8Array(width * height),
    stride = width * 4 + 1;
  const paeth = (a, b, c) => {
    const p = a + b - c,
      pa = Math.abs(p - a),
      pb = Math.abs(p - b),
      pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const f = raw[y * stride];
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        a = x ? alpha[i - 1] : 0,
        u = y ? alpha[i - width] : 0,
        ul = x && y ? alpha[i - width - 1] : 0;
      alpha[i] =
        (raw[y * stride + 1 + x * 4 + 3] + [0, a, u, Math.floor((a + u) / 2), paeth(a, u, ul)][f]) &
        255;
    }
  }
  return { width, height, alpha };
}
test('source skill sheet has twenty centered frames and 32px fully transparent borders', () => {
  const { width, height, alpha } = pngAlpha(new URL('../src/assets/skills.png', import.meta.url));
  assert.equal(width, 1536);
  assert.equal(height, 1024);
  assert.equal(atlas.image, 'skills.webp');
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 5; col++) {
      let minX = 306,
        maxX = -1,
        minY = 256,
        maxY = -1;
      for (let y = 0; y < 256; y++)
        for (let x = 0; x < 306; x++) {
          const a = alpha[(row * 256 + y) * width + 3 + col * 306 + x];
          if (x < 32 || x >= 274 || y < 32 || y >= 224) assert.equal(a, 0);
          if (a) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      assert.ok(maxX >= minX);
      assert.ok(Math.abs((minX + maxX) / 2 - 152.5) <= 1.5);
      assert.ok(Math.abs((minY + maxY) / 2 - 127.5) <= 1.5);
    }
  const webp = readFileSync(new URL('../src/assets/skills.webp', import.meta.url));
  assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
  assert.ok(webp.length < 400000);
});
