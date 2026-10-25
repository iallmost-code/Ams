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
  test(`real AP, learned mastery and early skill effects ${classId} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const saved = serializeGame(createGame({ classId, player: { level: 2 }, sp: 2 }));
    await page.addInitScript((s) => {
      if (!localStorage.getItem('aetherstory_v4'))
        localStorage.setItem('aetherstory_v4', JSON.stringify(s));
    }, saved);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: /Enter Aetheria/ }).tap();
    await page.locator('.quick-nav [data-action="character"]').tap();
    const before = await snapshot(page);
    expect(before.player.ap).toBe(5);
    await page.getByRole('button', { name: `+ ${before.player.mainAttribute}`, exact: true }).tap();
    expect((await snapshot(page)).player.ap).toBe(4);
    await page.locator('[data-action="assign-main-stat"]').tap();
    const assigned = await snapshot(page);
    expect(assigned.player.ap).toBe(0);
    expect(assigned.player.attack).toBeGreaterThanOrEqual(before.player.attack + 5);
    const orientation = width > height ? 'landscape' : 'portrait';
    if (classId === 'vanguard') {
      await page.locator('.modal').evaluate((e) => (e.scrollTop = 0));
      await page.screenshot({ path: `docs/qa/attribute-stats-${orientation}.png` });
    }
    await page.keyboard.press('Escape');
    await page.locator('.quick-nav [data-action="skills"]').tap();
    await page.locator('[data-action="upgrade-mastery"]').tap();
    const mastered = await snapshot(page);
    expect(mastered.masteryRank).toBe(1);
    expect(mastered.sp).toBe(1);
    expect(mastered.player.attack).toBeGreaterThan(assigned.player.attack);
    if (classId === 'vanguard')
      await page.screenshot({ path: `docs/qa/mastery-${orientation}.png` });
    await page.reload();
    await page.getByRole('button', { name: /Enter Aetheria/ }).tap();
    const loaded = await snapshot(page);
    expect(loaded.masteryRank).toBe(1);
    expect(loaded.player.ap).toBe(0);
    expect(loaded.attributeAllocation).toEqual(mastered.attributeAllocation);
    await page.clock.install({ time: new Date('2026-10-25T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-25T12:00:01Z'));
    await page.locator('.skill-0').tap({ force: true });
    await page.clock.runFor(300);
    await expect
      .poll(async () => (await snapshot(page)).effects.some((e) => e.skillIndex === 0))
      .toBe(true);
    if (classId === 'vanguard' && width === 844)
      await page.screenshot({ path: 'docs/qa/early-first-skill-vanguard.png' });
    await page.locator('.skill-1').tap({ force: true });
    await page.clock.runFor(140);
    const combat = await snapshot(page);
    expect(
      combat.effects.some((e) => e.type === 'skill-impact') || combat.kills > loaded.kills,
    ).toBe(true);
    await page.screenshot({ path: `docs/qa/early-combat-${classId}-${orientation}.png` });
    expect(errors).toEqual([]);
  });
}
