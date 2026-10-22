import { test, expect } from '@playwright/test';
import { createGame, serializeGame } from '../../src/game/engine.js';

const snapshot = (page) => page.evaluate(() => window.aetherStory.getSnapshot());
async function seedProgress(page, data) {
  await page.addInitScript((progress) => {
    if (!localStorage.getItem('aetherstory_v4'))
      localStorage.setItem('aetherstory_v4', JSON.stringify(progress));
  }, data);
}
async function launch(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.aetherStory));
  await page.waitForFunction(() =>
    Object.values(window.aetherStory.getDiagnostics().art).every(Boolean),
  );
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).started).toBe(true);
}

test('starts a real canvas game with movement, jump, pause and no runtime exceptions', async ({
  page,
}) => {
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('data:'))
      external.push(request.url());
  });
  await launch(page);
  await expect(page.locator('#game-canvas')).toBeVisible();
  expect(await page.evaluate(() => window.aetherStory.getDiagnostics().art)).toEqual({
    background: true,
    heroes: true,
    creatures: true,
  });
  await page.waitForTimeout(350);
  const before = await snapshot(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(450);
  await page.keyboard.up('d');
  const moved = await snapshot(page);
  expect(moved.player.x).toBeGreaterThan(before.player.x + 40);
  await page.waitForTimeout(150);
  const floor = (await snapshot(page)).player.y;
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  expect((await snapshot(page)).player.y).toBeLessThan(floor - 15);
  await page.keyboard.press('Escape');
  const paused = await snapshot(page);
  await page.waitForTimeout(250);
  expect((await snapshot(page)).time).toBe(paused.time);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(paused.time);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('AUTO defeats monsters and manual movement overrides it immediately', async ({ page }) => {
  await launch(page);
  await page.keyboard.press('t');
  await expect.poll(async () => (await snapshot(page)).auto).toBe(true);
  await expect
    .poll(async () => (await snapshot(page)).kills, { timeout: 25_000 })
    .toBeGreaterThan(0);
  const before = await snapshot(page);
  await page.keyboard.down('a');
  await page.waitForTimeout(400);
  await page.keyboard.up('a');
  const after = await snapshot(page);
  expect(after.player.x).toBeLessThan(before.player.x - 20);
  await page.keyboard.press('t');
  expect((await snapshot(page)).auto).toBe(false);
});

test('equipment, class and settings persist after a real page reload', async ({ page }) => {
  await launch(page);
  await page.keyboard.press('i');
  const original = (await snapshot(page)).player.equipment.weapon?.id;
  await page.locator('[data-action="equip"]').first().click();
  await expect
    .poll(async () => (await snapshot(page)).player.equipment.weapon?.id)
    .not.toBe(original);
  await page.keyboard.press('Escape');
  await page.locator('[data-action="class"]').first().click();
  await page.getByRole('button', { name: /Arcanist/i }).click();
  await expect.poll(async () => (await snapshot(page)).classId).toBe('arcanist');
  await page.keyboard.press('Escape');
  await page.keyboard.press('o');
  const music = page.getByRole('checkbox', { name: /music/i });
  await music.check();
  const particles = page.getByRole('checkbox', { name: /particles/i });
  await particles.uncheck();
  await page.reload();
  await page.waitForFunction(() => Boolean(window.aetherStory));
  await page.waitForFunction(() =>
    Object.values(window.aetherStory.getDiagnostics().art).every(Boolean),
  );
  const restored = await snapshot(page);
  expect(restored.classId).toBe('arcanist');
  expect(restored.player.equipment.weapon?.id).not.toBe(original);
  expect(restored.settings.music).toBe(true);
  expect(restored.settings.particles).toBe(false);
});

test('independent fingers can move and attack, and cancellation releases both during combat', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await launch(page);
  await page.waitForTimeout(200);
  const right = await page.locator('[data-joystick]').boundingBox();
  const attack = await page.locator('[data-control="attack"]').boundingBox();
  expect(right).toBeTruthy();
  expect(attack).toBeTruthy();
  await expect(page.locator('[data-control="left"]')).toHaveCount(0);
  await expect(page.locator('.pet-status')).toContainText('PIP');
  expect((await snapshot(page)).pet.name).toBe('Pip');
  const before = (await snapshot(page)).player.x;
  const session = await context.newCDPSession(page);
  const touchPoints = [
    { x: right.x + right.width * 0.85, y: right.y + right.height / 2, id: 1 },
    { x: attack.x + attack.width / 2, y: attack.y + attack.height / 2, id: 2 },
  ];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
  await page.waitForTimeout(450);
  expect((await snapshot(page)).player.x).toBeGreaterThan(before + 30);
  expect((await snapshot(page)).player.attackTimer).toBeGreaterThan(0);
  // Lift the attack finger while retaining the movement finger.
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [touchPoints[1]],
  });
  await expect.poll(async () => (await snapshot(page)).player.vx).toBeGreaterThan(100);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  // An incoming hit can still displace the hero. Held movement/attacks must end
  // once that physical recoil has expired, instead of requiring a frozen world.
  await expect.poll(async () => (await snapshot(page)).player.vx).toBe(0);
  await expect.poll(async () => (await snapshot(page)).player.attackTimer).toBe(0);
  await session.detach();
});

test('forge timing enhances real equipment and a damage signature survives reload', async ({
  page,
}) => {
  await launch(page);
  const before = await snapshot(page);
  await page.keyboard.press('g');
  await page.locator('[data-action="begin-forge"]').click();
  await expect
    .poll(
      async () => {
        const position = await page
          .locator('.timing-marker')
          .evaluate((el) => parseFloat(el.style.left));
        return position >= 43 && position <= 57;
      },
      { intervals: [30], timeout: 5000 },
    )
    .toBe(true);
  await page.locator('[data-action="stop-forge"]').click();
  const forged = await snapshot(page);
  expect(forged.player.gold).toBe(before.player.gold - 100);
  expect(forged.starCores).toBe(before.starCores - 1);
  expect(forged.player.equipment.weapon.stars).toBe(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('p');
  await page.getByRole('button', { name: 'Damage signatures' }).click();
  await page.getByRole('button', { name: /Frost/i }).click();
  await expect.poll(async () => (await snapshot(page)).damageSkin).toBe('frost');
  await page.reload();
  await page.waitForFunction(() => Boolean(window.aetherStory));
  await page.waitForFunction(() =>
    Object.values(window.aetherStory.getDiagnostics().art).every(Boolean),
  );
  expect((await snapshot(page)).damageSkin).toBe('frost');
  expect((await snapshot(page)).player.equipment.weapon.stars).toBe(1);
});

for (const [width, height] of [
  [844, 390],
  [932, 430],
  [740, 360],
  [390, 844],
  [1440, 900],
]) {
  test(`playable responsive viewport ${width}x${height}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height });
    await launch(page);
    await page.waitForTimeout(200);
    for (const selector of [
      '[data-joystick]',
      '[data-control="jump"]',
      '[data-control="attack"]',
    ]) {
      const button = page.locator(selector);
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/game-${width}x${height}.png` });
    expect(errors).toEqual([]);
  });
}

test('storage denial does not prevent playing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
    });
  });
  await launch(page);
  await expect(page.locator('.save-indicator')).toContainText(/session only/i);
  await expect(page.locator('[data-control="left"]')).toHaveCount(0);
  await expect(page.locator('.pet-status')).toContainText('PIP');
  expect((await snapshot(page)).pet.name).toBe('Pip');
  const before = (await snapshot(page)).player.x;
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  expect((await snapshot(page)).player.x).toBeGreaterThan(before + 20);
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).paused).toBe(true);
});

test('installed production shell reloads and remains playable completely offline', async ({
  page,
  context,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.aetherStory));
  await page.waitForFunction(() =>
    Object.values(window.aetherStory.getDiagnostics().art).every(Boolean),
  );
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-control="left"]')).toHaveCount(0);
  await expect(page.locator('.pet-status')).toContainText('PIP');
  expect((await snapshot(page)).pet.name).toBe('Pip');
  const before = (await snapshot(page)).player.x;
  await page.keyboard.down('d');
  await page.waitForTimeout(300);
  await page.keyboard.up('d');
  expect((await snapshot(page)).player.x).toBeGreaterThan(before + 20);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await page.goto('/map/deep/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.aetherStory));
  await page.waitForFunction(() =>
    Object.values(window.aetherStory.getDiagnostics().art).every(Boolean),
  );
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  expect(errors).toEqual([]);
  await context.setOffline(false);
});

test('eligible offline expedition displays its summary and pays only once after reload', async ({
  page,
}) => {
  const data = serializeGame(createGame());
  data.absence = { hiddenAt: Date.now() - 80_000, autoBattle: true, areaId: 'emerald_glade' };
  await seedProgress(page, data);
  await launch(page);
  await expect(page.getByRole('heading', { name: 'Welcome back, adventurer' })).toBeVisible();
  const returned = await snapshot(page);
  expect(returned.player.gold).toBeGreaterThan(data.player.gold);
  await page.getByRole('button', { name: 'Continue adventure' }).click();
  await page.reload();
  await page.waitForFunction(() => Boolean(window.aetherStory));
  await page.waitForFunction(() =>
    Object.values(window.aetherStory.getDiagnostics().art).every(Boolean),
  );
  await page.keyboard.press('Enter');
  expect((await snapshot(page)).player.gold).toBe(returned.player.gold);
  await expect(page.getByRole('heading', { name: 'Welcome back, adventurer' })).toHaveCount(0);
});

for (const [index, classId] of ['vanguard', 'arcanist', 'nightblade', 'ranger'].entries()) {
  test(`${classId} casts all four skills and uses its area's portal`, async ({ page }) => {
    const areas = ['emerald_glade', 'whispering_canopy', 'crystal_cavern', 'ember_altar'];
    const state = createGame({ player: { level: 25 }, classId, currentArea: areas[index] });
    await seedProgress(page, serializeGame(state));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await launch(page);
    expect((await snapshot(page)).currentArea).toBe(areas[index]);
    for (const key of ['z', 'x', 'c', 'v']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(60);
    }
    expect((await snapshot(page)).player.skillCooldowns.every((value) => value > 0)).toBe(true);
    await page.keyboard.down('d');
    await expect
      .poll(async () => (await snapshot(page)).player.x, { timeout: 10_000, intervals: [30] })
      .toBeGreaterThan(index * 1200 + 1080);
    await page.keyboard.up('d');
    await page.keyboard.press('e');
    await expect.poll(async () => (await snapshot(page)).currentArea).toBe(areas[(index + 1) % 4]);
    expect(errors).toEqual([]);
  });
}
