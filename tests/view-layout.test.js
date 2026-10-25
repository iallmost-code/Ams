import test from 'node:test';
import assert from 'node:assert/strict';
import { placeNameplate, intersects, clearUpperPlatformCamera } from '../src/game/view-layout.js';
test('NPC name stays below feet and beside the movement dock rather than over its label', () => {
  const hud = [
    { x: 0, y: 260, width: 140, height: 120 },
    { x: 600, y: 240, width: 244, height: 140 },
    { x: 0, y: 378, width: 844, height: 12 },
  ];
  const box = placeNameplate({ x: 80, y: 285 }, 86, 19, { width: 844, height: 390 }, hud);
  assert.ok(box);
  assert.ok(box.y > 285);
  for (const r of hud) assert.equal(intersects(box, r), false);
});
test('portrait name pills keep their anchor and avoid both lower control clusters', () => {
  const hud = [
    { x: 0, y: 680, width: 140, height: 150 },
    { x: 240, y: 650, width: 150, height: 180 },
  ];
  const box = placeNameplate({ x: 70, y: 690 }, 86, 19, { width: 390, height: 844 }, hud);
  assert.ok(box);
  assert.ok(box.y > 690);
  for (const r of hud) assert.equal(intersects(box, r), false);
});
test('upper platform camera clears the header without clipping the player at low ledges', () => {
  const platforms = [{ id: '0-high', x: 650, y: 365, w: 350 }],
    enemies = [{ platformId: '0-high', w: 64, h: 42 }];
  const y = clearUpperPlatformCamera(
    271.2,
    680,
    platforms,
    enemies,
    100,
    1211,
    { height: 390 },
    390 / 560,
    72,
  );
  assert.ok((365 - 80 - 10 - y) * (390 / 560) >= 80 - 0.001);
  assert.ok((680 - y) * (390 / 560) <= 366);
  assert.equal(
    clearUpperPlatformCamera(
      411.2,
      820,
      platforms,
      enemies,
      0,
      1211,
      { height: 390 },
      390 / 560,
      72,
    ),
    411.2,
    'distant upper ledges never push the ground player out of view',
  );
});
