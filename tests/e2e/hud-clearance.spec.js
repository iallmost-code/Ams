import { test, expect } from '@playwright/test';
import { createGame, serializeGame } from '../../src/game/engine.js';
const overlaps = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
for (const [width, height, orientation] of [
  [844, 390, 'landscape'],
  [390, 844, 'portrait'],
]) {
  test(`NPC and highest ledge stay clear of phone HUD ${orientation}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const save = serializeGame(createGame({ player: { level: 25 } }));
    await page.addInitScript(
      (s) => localStorage.setItem('aetherstory_v4', JSON.stringify(s)),
      save,
    );
    await page.goto('/');
    await page.getByRole('button', { name: /Enter Aetheria/ }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.aetherStory.getDiagnostics().text.nameplates.some((n) => n.text === 'Elder Rowan'),
        ),
      )
      .toBe(true);
    const start = await page.evaluate(() => window.aetherStory.getDiagnostics());
    const rowan = start.text.nameplates.find((n) => n.text === 'Elder Rowan');
    expect(rowan.y).toBeGreaterThan(rowan.anchorY);
    for (const hud of start.scene.hud) expect(overlaps(rowan, hud)).toBe(false);
    await page.screenshot({ path: `docs/qa/npc-clearance-${orientation}.png` });
    // Reach the lower ledge using ordinary movement and climbing, with a running clock.
    await page.keyboard.down('d');
    await page.waitForFunction(() => window.aetherStory.getSnapshot().player.x >= 228);
    await page.keyboard.up('d');
    await page.keyboard.down('w');
    await page.waitForFunction(
      () => window.aetherStory.getSnapshot().player.platformId === '0-low',
    );
    await page.keyboard.up('w');
    if (orientation === 'portrait') {
      await page.keyboard.down('d');
      await page.keyboard.down('j');
      await page.waitForFunction(() => window.aetherStory.getSnapshot().player.x >= 449);
      await page.keyboard.up('d');
      await page.keyboard.up('j');
      await page.keyboard.down('w');
      await page.waitForFunction(
        () => window.aetherStory.getSnapshot().player.platformId === '0-mid',
      );
      await page.keyboard.up('w');
    }
    await page.keyboard.down('d');
    await page.keyboard.down('j');
    await page.waitForFunction(
      (target) => window.aetherStory.getSnapshot().player.x >= target,
      orientation === 'portrait' ? 690 : 575,
    );
    await page.keyboard.up('d');
    await page.keyboard.up('j');
    if (orientation === 'portrait') {
      await page.keyboard.down('w');
      await page.waitForFunction(
        () => window.aetherStory.getSnapshot().player.platformId === '0-high',
      );
      await page.keyboard.up('w');
      await page.keyboard.down('d');
      await page.waitForFunction(() => window.aetherStory.getSnapshot().player.x >= 810);
      await page.keyboard.up('d');
    }
    await page.waitForTimeout(350);
    const scene = await page.evaluate(() => window.aetherStory.getDiagnostics().scene);
    const header = scene.hud.find((r) => r.kind === 'top-right');
    const high = scene.enemies.filter(
      (e) => e.platformId === '0-high' && e.x + e.width * 0.5 > 0 && e.x + e.width * 0.5 < width,
    );
    expect(high.length).toBeGreaterThan(0);
    for (const monster of high) {
      expect(monster.y).toBeGreaterThanOrEqual(header.y + header.height + 4);
      expect(overlaps(monster, header)).toBe(false);
    }
    await page.screenshot({ path: `docs/qa/upper-ledge-${orientation}.png` });
  });
}
