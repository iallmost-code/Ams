import { test, expect } from '@playwright/test';
import { createChapter, serializeChapter, CHAPTER_SAVE_KEY } from '../../src/chapter/engine.js';
import { rollGear } from '../../src/chapter/gear.js';
const snapshot = (page) => page.evaluate(() => window.dawntrail.getSnapshot());
test('title offers the playable Vanguard chapter and village portals replace the world', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.getByRole('link', { name: /Play Vanguard chapter/ }).click();
  await page.getByRole('button', { name: 'Begin the chapter', exact: true }).click();
  expect((await snapshot(page)).mapId).toBe('hollow');
  await page.screenshot({ path: 'docs/qa/dawntrail-village-landscape.png' });
  await page.keyboard.down('d');
  await page.waitForFunction(() => window.dawntrail.getSnapshot().player.x > 1610);
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await expect.poll(async () => (await snapshot(page)).mapId).toBe('fields');
  expect((await snapshot(page)).world.width).toBe(3000);
  await page.keyboard.down('a');
  await page.waitForFunction(() => window.dawntrail.getSnapshot().player.x < 110);
  await page.keyboard.up('a');
  await page.keyboard.press('e');
  await expect.poll(async () => (await snapshot(page)).mapId).toBe('hollow');
});
for (const [width, height, name] of [
  [844, 390, 'landscape'],
  [390, 844, 'portrait'],
]) {
  test(`Vanguard live skills, affix builds and reload on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const state = createChapter();
    state.player.level = 10;
    state.mapId = 'fields';
    const save = serializeChapter(state);
    save.inventory = [rollGear(42, 'weapon', 'epic', 1), rollGear(43, 'armor', 'epic', 1)];
    await page.addInitScript(
      ({ key, save }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save));
      },
      { key: CHAPTER_SAVE_KEY, save },
    );
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?chapter=vanguard');
    await page.getByRole('button', { name: 'Begin the chapter', exact: true }).click();
    await page.getByRole('button', { name: 'Bag & build', exact: true }).click();
    const attack = (await snapshot(page)).player.attack;
    await page.getByRole('button', { name: 'Equip Best', exact: true }).click();
    expect((await snapshot(page)).player.attack).toBeGreaterThan(attack);
    await page.getByRole('button', { name: /Dawnbringer/ }).click();
    expect((await snapshot(page)).build).toBe('zeal');
    await page.screenshot({ path: `docs/qa/dawntrail-build-${name}.png` });
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.keyboard.down('d');
    await page.waitForFunction(() => window.dawntrail.getSnapshot().player.x > 300);
    await page.keyboard.up('d');
    await page.locator('[data-control="skill"]').click();
    await expect
      .poll(async () => (await snapshot(page)).effects.some((e) => e.type === 'chapter-holy'))
      .toBe(true);
    await page.screenshot({ path: `docs/qa/dawntrail-cleave-${name}.png` });
    await page.waitForTimeout(600);
    await page.locator('[data-control="skill4"]').click();
    await expect
      .poll(async () =>
        (await snapshot(page)).effects.some((e) => e.type === 'chapter-holy' && e.slot === 3),
      )
      .toBe(true);
    await page.screenshot({ path: `docs/qa/dawntrail-ultimate-${name}.png` });
    await expect(page.locator('[data-control="skill"]')).toBeEnabled();
    await page.getByRole('button', { name: 'Region map', exact: true }).click();
    await expect(page.locator('.chapter-map-card')).toHaveCount(4);
    await page.screenshot({ path: `docs/qa/dawntrail-region-${name}.png` });
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Begin the chapter', exact: true }).click();
    expect((await snapshot(page)).build).toBe('zeal');
    expect((await snapshot(page)).player.equipment.weapon.rarity).toBe('epic');
    expect(errors).toEqual([]);
  });
}

test('the region has real village/field/rise/sanctuary transitions and a live guardian', async ({
  page,
}) => {
  const s = createChapter(null, { training: true });
  const save = {
    ...serializeChapter(createChapter()),
    level: 10,
    mapId: 'fields',
    equipment: s.player.equipment,
  };
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), {
    key: CHAPTER_SAVE_KEY,
    save,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?chapter=vanguard');
  await page.getByRole('button', { name: 'Begin the chapter', exact: true }).click();
  await page.keyboard.down('d');
  await page.keyboard.down('j');
  await page.waitForFunction(() => window.dawntrail.getSnapshot().player.x > 2800);
  await page.keyboard.up('d');
  await page.keyboard.up('j');
  await page.keyboard.press('e');
  await expect.poll(async () => (await snapshot(page)).mapId).toBe('rise');
  await page.screenshot({ path: 'docs/qa/dawntrail-rise-landscape.png' });
  await page.keyboard.down('d');
  await page.keyboard.down('j');
  await page.waitForFunction(() => window.dawntrail.getSnapshot().player.x > 2200);
  await page.keyboard.up('d');
  await page.keyboard.up('j');
  await page.keyboard.press('e');
  await expect.poll(async () => (await snapshot(page)).mapId).toBe('sanctuary');
  await page.keyboard.down('d');
  await page.waitForFunction(() => window.dawntrail.getSnapshot().player.x > 780);
  await page.keyboard.up('d');
  await expect.poll(async () => (await snapshot(page)).enemies[0].telegraph).toBeGreaterThan(0);
  await page.screenshot({ path: 'docs/qa/dawntrail-guardian-landscape.png' });
  expect(errors).toEqual([]);
});
test('portrait guardian, real shield guard and training preserve the chapter save', async ({
  page,
}) => {
  const s = createChapter(null, { training: true });
  const save = {
    ...serializeChapter(createChapter()),
    level: 10,
    mapId: 'sanctuary',
    equipment: s.player.equipment,
  };
  await page.addInitScript(
    ({ key, save }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save));
    },
    { key: CHAPTER_SAVE_KEY, save },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?chapter=vanguard');
  await page.getByRole('button', { name: 'Begin the chapter', exact: true }).click();
  await page.keyboard.down('d');
  await page.waitForFunction(() => window.dawntrail.getSnapshot().player.x > 950);
  await page.keyboard.up('d');
  await page.keyboard.down('g');
  await expect.poll(async () => (await snapshot(page)).player.guarding).toBe(true);
  await page.screenshot({ path: 'docs/qa/dawntrail-guardian-portrait.png' });
  await page.keyboard.up('g');
  await page.getByRole('button', { name: 'Pause chapter', exact: true }).click();
  await page.getByRole('button', { name: 'Try all skills in training', exact: true }).click();
  expect((await snapshot(page)).training).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Begin the chapter', exact: true }).click();
  expect((await snapshot(page)).training).toBe(false);
  expect((await snapshot(page)).mapId).toBe('sanctuary');
});
