import { test, expect } from '@playwright/test';
import { createGame, serializeGame } from '../../src/game/engine.js';
test.use({ hasTouch: true });
const snapshot = (p) => p.evaluate(() => window.aetherStory.getSnapshot());
for (const [classId, width, height] of [
  ['vanguard', 844, 390],
  ['arcanist', 844, 390],
  ['nightblade', 844, 390],
  ['ranger', 844, 390],
  ['vanguard', 390, 844],
]) {
  test(`RPG stats, rarity bag, buff and ultimate ${classId} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const s = createGame({ classId, player: { level: 25 } });
    if (classId === 'ranger') {
      s.skillLevels[0] = 30;
      s.sp = 5;
    }
    s.player.inventory.push(
      ...['normal', 'rare', 'epic', 'unique', 'mythic'].map((rarity, i) => ({
        id: 'preview-' + rarity,
        name: ['Trail', 'Cloud', 'Astral', 'Suncrest', 'Evergloam'][i] + ' Blade',
        type: 'weapon',
        rarity,
        attack: 20 + i * 8,
        stars: i,
        icon: '✦',
        count: 1,
      })),
    );
    await page.addInitScript(
      (data) => localStorage.setItem('aetherstory_v4', JSON.stringify(data)),
      serializeGame(s),
    );
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: /Enter Aetheria/ }).click();
    await page.keyboard.press('p');
    await expect(page.locator('.power-banner')).toContainText('COMBAT POWER');
    await expect(page.locator('.attribute-grid > div')).toHaveCount(4);
    const orientation = width > height ? 'landscape' : 'portrait';
    if (classId === 'vanguard')
      await page.screenshot({ path: `docs/qa/rpg-stats-${orientation}.png` });
    await page.getByRole('button', { name: 'Equipment & bag', exact: true }).click();
    await expect(page.locator('.rarity-badge.rarity-mythic')).toBeVisible();
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await expect(page.locator('.item-row').filter({ hasText: 'Crimson Tonic' })).toHaveCount(0);
    await page.getByRole('button', { name: 'All items', exact: true }).click();
    if (classId === 'vanguard')
      await page.screenshot({ path: `docs/qa/rpg-bag-${orientation}.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('u');
    await expect(page.locator('.buff-card')).toContainText('45s cooldown');
    if (classId === 'ranger')
      await expect(
        page
          .locator('.skill-detail')
          .first()
          .getByRole('button', { name: 'MAX RANK', exact: true }),
      ).toBeDisabled();
    await expect(page.locator('.skill-detail').last()).toContainText('ULTIMATE');
    await page.keyboard.press('Escape');
    if (width === 390) await page.locator('.buff-button').tap();
    else await page.keyboard.press('f');
    await expect(page.locator('.active-buff')).toBeVisible();
    const buffed = await snapshot(page);
    expect(buffed.player.attack).toBeGreaterThan(buffed.player.baseAttack);
    await page.waitForTimeout(200);
    expect((await snapshot(page)).player.buffRemaining).toBeLessThan(buffed.player.buffRemaining);
    await page.keyboard.press('v');
    await expect(page.locator('.ultimate-banner')).toBeVisible();
    expect((await snapshot(page)).player.skillCooldowns[3]).toBeGreaterThan(40);
    await page.waitForTimeout(230);
    await page.screenshot({ path: `docs/qa/rpg-ultimate-${classId}-${orientation}.png` });
    expect(errors).toEqual([]);
  });
}

test('portable HTML starts with all original artwork and the RPG controls without network access', async ({
  page,
}) => {
  const { readFile } = await import('node:fs/promises');
  const errors = [],
    external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith('data:') && !r.url().startsWith('about:')) external.push(r.url());
  });
  await page.setContent(await readFile(new URL('../../AetherStory.html', import.meta.url), 'utf8'));
  await page.waitForFunction(
    () =>
      window.aetherStory && Object.values(window.aetherStory.getDiagnostics().art).every(Boolean),
  );
  await page.getByRole('button', { name: /Enter Aetheria/ }).click();
  await expect(page.locator('.buff-button')).toBeVisible();
  expect((await snapshot(page)).player.combatPower).toBeGreaterThan(0);
  await page.keyboard.press('i');
  await expect(page.getByRole('button', { name: 'Equip Best', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
