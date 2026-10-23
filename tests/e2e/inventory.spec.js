import { test, expect } from '@playwright/test';
import { createGame, serializeGame } from '../../src/game/engine.js';

test.use({ hasTouch: true });
const snapshot = (page) => page.evaluate(() => window.aetherStory.getSnapshot());
for (const [orientation, width, height] of [
  ['landscape', 844, 390],
  ['portrait', 390, 844],
]) {
  test(`Bag batch actions, locks and confirmation on ${orientation} phone`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const s = createGame();
    const gear = (id, stat, extra = {}) => ({
      id,
      name: id,
      type: 'weapon',
      attack: stat,
      rarity: 'normal',
      count: 1,
      icon: '✦',
      ...extra,
    });
    s.player.inventory.push(
      gear('Sunlit Saber', 65),
      gear('Keepsake Blade', 1, { locked: true }),
      gear('Forged Blade', 1, { stars: 1 }),
      ...Array.from({ length: 12 }, (_, i) => gear(`Old Blade ${i + 1}`, 1)),
    );
    await page.addInitScript((data) => {
      if (!localStorage.getItem('aetherstory_v4'))
        localStorage.setItem('aetherstory_v4', JSON.stringify(data));
    }, serializeGame(s));
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: /Enter Aetheria/ }).tap();
    await page.locator('[data-action="inventory"]').first().tap();
    const before = await snapshot(page);
    for (const action of ['equip-best', 'dismantle-low']) {
      const button = page.locator(`[data-action="${action}"]`);
      const box = await button.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
    await page.getByRole('button', { name: 'Equip Best', exact: true }).tap();
    const equipped = await snapshot(page);
    expect(equipped.player.attack).toBeGreaterThan(before.player.attack);
    expect(equipped.player.equipment.weapon.id).toBe('Sunlit Saber');
    await expect(
      page.getByRole('status').filter({ hasText: /Equipped \d+ upgrades/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Equip Best', exact: true }).tap();
    await expect(
      page.getByRole('status').filter({ hasText: 'Already wearing your best gear' }),
    ).toBeVisible();
    await page.screenshot({ path: `docs/qa/inventory-bag-${orientation}.png` });
    const baseline = await snapshot(page);
    await page.getByRole('button', { name: 'Dismantle Low Gear', exact: true }).tap();
    await expect(page.locator('.dismantle-summary')).toContainText(
      /Dismantle \d+ items for \d+ gold \+ \d+ star cores/,
    );
    for (const name of ['Confirm', 'Cancel']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
    await page.screenshot({ path: `docs/qa/inventory-confirm-${orientation}.png` });
    await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
    expect((await snapshot(page)).player).toEqual(baseline.player);
    expect((await snapshot(page)).starCores).toBe(baseline.starCores);
    await page.getByRole('button', { name: 'Dismantle Low Gear', exact: true }).tap();
    const summary = await page.locator('.dismantle-summary').innerText();
    const [, count, gold, cores] = summary
      .match(/Dismantle (\d+) items for (\d+) gold \+ (\d+)/)
      .map(Number);
    await page.getByRole('button', { name: 'Confirm', exact: true }).tap();
    const after = await snapshot(page);
    expect(after.player.inventory.length).toBe(baseline.player.inventory.length - count);
    expect(after.player.gold).toBe(baseline.player.gold + gold);
    expect(after.starCores).toBe(baseline.starCores + cores);
    expect(after.player.inventory.some((i) => i.id === 'Keepsake Blade')).toBe(true);
    expect(after.player.inventory.some((i) => i.id === 'Forged Blade')).toBe(true);
    const lockedRow = page.locator('.item-row').filter({ hasText: 'Keepsake Blade' });
    await expect(lockedRow.getByRole('button', { name: 'Salvage', exact: true })).toBeDisabled();
    await lockedRow.getByRole('button', { name: 'Unlock Keepsake Blade', exact: true }).tap();
    await expect(lockedRow.getByRole('button', { name: 'Salvage', exact: true })).toBeEnabled();
    await lockedRow.getByRole('button', { name: 'Lock Keepsake Blade', exact: true }).tap();
    await page.reload();
    await page.getByRole('button', { name: /Enter Aetheria/ }).tap();
    await page.locator('[data-action="inventory"]').first().tap();
    await expect(
      page.getByRole('button', { name: 'Unlock Keepsake Blade', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
}
