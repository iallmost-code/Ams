import { test, expect } from '@playwright/test';
import { createGame, serializeGame } from '../../src/game/engine.js';
test('installed client offers a safe restart and preserves allocated AP on worker updates', async ({
  page,
}) => {
  const saved = serializeGame(createGame({ player: { level: 2 } }));
  await page.addInitScript((data) => {
    if (!localStorage.getItem('aetherstory_v4'))
      localStorage.setItem('aetherstory_v4', JSON.stringify(data));
  }, saved);
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.reload();
  await page.getByRole('button', { name: /Enter Aetheria/ }).click();
  await page.locator('.quick-nav [data-action="character"]').click();
  await page.locator('[data-action="assign-main-stat"]').click();
  const allocation = await page.evaluate(
    () => window.aetherStory.getSnapshot().attributeAllocation,
  );
  await page.keyboard.press('Escape');
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
  await expect(page.locator('.update-ready')).toBeVisible();
  await page.locator('.update-ready').click();
  await page.getByRole('button', { name: /Enter Aetheria/ }).click();
  expect(await page.evaluate(() => window.aetherStory.getSnapshot().attributeAllocation)).toEqual(
    allocation,
  );
  expect(await page.evaluate(() => window.aetherStory.getDiagnostics().version)).toBe('1.1.0');
});
