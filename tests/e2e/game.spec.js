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
    cavern: true,
    altar: true,
    pip: true,
    skills: true,
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
  expect(forged.player.gold).toBe(before.player.gold - 150);
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
    for (const slot of ['hat', 'armor', 'cape', 'gloves', 'boots'])
      state.player.equipment[slot] = {
        id: `test-${slot}`,
        name: `Test ${slot}`,
        type: slot,
        rarity: 'epic',
        icon: '✦',
        count: 1,
        defense: 50,
        stars: 10,
      };
    state.player.equipment.weapon.attack = 85;
    state.player.equipment.weapon.stars = 10;
    await seedProgress(page, serializeGame(state));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await launch(page);
    expect((await snapshot(page)).currentArea).toBe(areas[index]);
    if (index >= 2) {
      await page.waitForTimeout(250);
      await page.screenshot({ path: `docs/qa/after-${index === 2 ? 'cavern' : 'altar'}.png` });
    }
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

for (const [width, height, orientation] of [
  [844, 390, 'landscape'],
  [390, 844, 'portrait'],
]) {
  test(`phone HUD, collapsible map and complete forge fit ${orientation}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const game = createGame();
    game.player.gold = 50000;
    await seedProgress(page, serializeGame(game));
    await launch(page);
    await page.waitForTimeout(500);
    const dock = await page.locator('.bottom-center').boundingBox();
    expect(dock.y + dock.height).toBeLessThanOrEqual(height < 500 ? 80 : 175);
    if (height < 500) {
      const card = await page.locator('.identity').boundingBox();
      expect(card.width).toBeLessThanOrEqual(170);
      expect(card.height).toBeLessThanOrEqual(60);
    }
    const toggle = page.getByRole('button', { name: /mini-map/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.locator('.minimap canvas')).toBeVisible();
    await toggle.click();
    await expect(page.locator('.minimap canvas')).toBeHidden();
    await page.keyboard.press('t');
    await expect(page.locator('.auto-button')).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `docs/qa/after-${orientation}.png` });
    await page.keyboard.press('g');
    const start = page.getByRole('button', { name: 'Begin forging' });
    const box = await start.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(height - 8);
    expect(
      await page.locator('.panel-forge').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
    await page.screenshot({ path: `docs/qa/after-forge-${orientation}.png` });
    await start.click();
    await expect(page.getByRole('button', { name: 'STOP THE SPARK' })).toBeVisible();
    await page.getByRole('button', { name: 'STOP THE SPARK' }).click();
    await expect(page.locator('.forge-result')).toBeVisible();
  });
}

test('supply shop spends real gold on potions and persistent training', async ({ page }) => {
  const game = createGame();
  game.player.gold = 5000;
  await seedProgress(page, serializeGame(game));
  await launch(page);
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Buy 5 tonics' }).click();
  await page.getByRole('button', { name: 'Train vitality' }).click();
  let s = await snapshot(page);
  expect(s.player.gold).toBe(4300);
  expect(s.player.maxHp).toBe(205);
  expect(s.upgrades.vitality).toBe(1);
  await page.reload();
  await launch(page);
  s = await snapshot(page);
  expect(s.upgrades.vitality).toBe(1);
  expect(s.player.maxHp).toBe(205);
});

test('NPC dialogue accepts a mission, AUTO-quest makes real progress and reload stops automation', async ({
  page,
}) => {
  await launch(page);
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Elder Rowan', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Lanterns for the lost', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Accept quest', exact: true }).click();
  expect((await snapshot(page)).story.activeId).toBe('glade-jellies');
  await page.getByRole('button', { name: 'Follow quest', exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).story.progress, { timeout: 15000 })
    .toBeGreaterThan(0);
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('aetherstory_v4')).story.progress > 0,
  );
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('aetherstory_v4')).story);
  await page.reload();
  await page.waitForFunction(() => window.aetherStory);
  await page.keyboard.press('Enter');
  const restored = await snapshot(page);
  expect(restored.story.activeId).toBe(saved.activeId);
  expect(restored.story.progress).toBeGreaterThanOrEqual(saved.progress);
  expect(restored.story.autoQuest).toBe(false);
});
test('completed NPC mission pays once and the next story offer appears', async ({ page }) => {
  const game = createGame({ story: { activeId: 'glade-jellies', progress: 6 } });
  await seedProgress(page, serializeGame(game));
  await launch(page);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Turn in quest', exact: true }).click();
  const done = await snapshot(page);
  expect(done.story.completed).toEqual(['glade-jellies']);
  expect(done.player.gold).toBe(400);
  await expect(
    page.getByRole('heading', { name: 'A pocketful of light', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn in quest', exact: true })).toHaveCount(0);
  await page.reload();
  await launch(page);
  expect((await snapshot(page)).player.gold).toBe(400);
});
for (const [width, height, name] of [
  [844, 390, 'landscape'],
  [390, 844, 'portrait'],
])
  test(`quest journal and tracker work on phone ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await launch(page);
    await expect(page.locator('.story-strip')).toBeVisible();
    const box = await page.locator('.story-strip').boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThan(height * 0.5);
    await page.getByRole('button', { name: 'Quests', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'The lantern trail', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.story-list .story-entry')).toHaveCount(17);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `docs/qa/quests-${name}.png` });
    await page.keyboard.press('Escape');
    await page.locator('.story-strip [data-action="follow-quest"]').click();
    await expect.poll(async () => (await snapshot(page)).story.autoQuest).toBe(true);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `docs/qa/quest-tracker-${name}.png` });
  });

test('portrait hint stays clear of the area label and appears only once per session', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await launch(page);
  const tip = page.locator('.portrait-tip');
  await expect(tip).toBeVisible();
  const a = await tip.boundingBox(),
    b = await page.locator('.area-pill').boundingBox();
  expect(
    a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y,
  ).toBe(true);
  await expect(tip).toBeHidden({ timeout: 9000 });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tip).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => window.aetherStory);
  await page.keyboard.press('Enter');
  await expect(tip).toBeHidden();
});
test('Rowan daily board accepts, pays once and preserves the daily limit after reload', async ({
  page,
}) => {
  const game = createGame();
  const { localDay, DAILY_BOUNTIES } = await import('../../src/game/daily.js');
  game.daily = {
    day: localDay(),
    claimed: [],
    activeId: DAILY_BOUNTIES[0].id,
    progress: DAILY_BOUNTIES[0].count,
  };
  await seedProgress(page, serializeGame(game));
  await launch(page);
  await page.keyboard.press('e');
  await expect(
    page.getByRole('heading', { name: 'Rowan’s daily board', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Claim daily bounty', exact: true }).click();
  const done = await snapshot(page);
  expect(done.daily.claimed).toHaveLength(1);
  expect(done.player.gold).toBe(400);
  await expect(page.getByRole('button', { name: 'Claim daily bounty', exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  await launch(page);
  expect((await snapshot(page)).daily.claimed).toHaveLength(1);
  expect((await snapshot(page)).player.gold).toBe(400);
});

for (const [width, height, name] of [
  [844, 390, 'landscape'],
  [390, 844, 'portrait'],
]) {
  test(`locked quest names the next mission and offers Rowan daily board on phone ${name}`, async ({
    page,
  }) => {
    const { STORY_QUESTS } = await import('../../src/game/quests.js');
    const game = createGame({
      player: { level: 4 },
      story: { revision: 2, completed: STORY_QUESTS.slice(0, 4).map((q) => q.id) },
    });
    await seedProgress(page, serializeGame(game));
    await page.setViewportSize({ width, height });
    await launch(page);
    await expect(page.locator('.story-strip-title')).toHaveText(
      'Next: A wick for every window · Lv.5',
    );
    await expect(page.locator('.story-strip-progress')).toContainText('Try a daily bounty');
    await page.screenshot({ path: `docs/qa/quest-gate-${name}.png` });
    await page.keyboard.press('q');
    const board = page.locator('.daily-board');
    await board.scrollIntoViewIfNeeded();
    await expect(
      board.getByRole('button', { name: 'Accept daily bounty', exact: true }),
    ).toBeEnabled();
    await page.screenshot({ path: `docs/qa/daily-board-${name}.png` });
    await board.getByRole('button', { name: 'Accept daily bounty', exact: true }).click();
    expect((await snapshot(page)).daily.activeId).toBe('trail-patrol');
  });
}

for (const [width, height, name] of [
  [844, 390, 'landscape'],
  [390, 844, 'portrait'],
]) {
  test(`screen-sized NPC names and gold pickups remain visible and separated on ${name}`, async ({
    page,
  }) => {
    const game = createGame({ classId: 'arcanist' });
    await seedProgress(page, serializeGame(game));
    await page.setViewportSize({ width, height });
    await launch(page);
    await page.keyboard.down('j');
    await page.waitForFunction(
      () => window.aetherStory.getDiagnostics().text.floating.some((n) => /g$/.test(n.text)),
      {},
      { timeout: 15000 },
    );
    const text = await page.evaluate(() => window.aetherStory.getDiagnostics().text);
    const rowan = text.nameplates.find((n) => n.text === 'Elder Rowan');
    expect(rowan.fontSize).toBe(11);
    expect(rowan.y).toBeGreaterThan(rowan.anchorY);
    const gold = text.floating.find((n) => /g$/.test(n.text));
    expect(gold.fontSize).toBe(20);
    for (let i = 0; i < text.floating.length; i++) {
      const a = text.floating[i];
      expect(a.x).toBeGreaterThanOrEqual(4);
      expect(a.x + a.width).toBeLessThanOrEqual(width - 4);
      expect(a.y).toBeGreaterThanOrEqual(4);
      expect(a.y + a.height).toBeLessThanOrEqual(height - 4);
      for (let j = 0; j < i; j++) {
        const b = text.floating[j];
        expect(
          a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ).toBe(false);
      }
    }
    await page.screenshot({ path: `docs/qa/readable-text-${name}.png` });
    await page.keyboard.up('j');
  });
}
test('AUTO-quest tracker explains why unlocked Canopy travel is blocked', async ({ page }) => {
  const { STORY_QUESTS } = await import('../../src/game/quests.js');
  const game = createGame({
    player: { level: 10 },
    inventory: [],
    story: {
      revision: 2,
      completed: STORY_QUESTS.filter((q) => q.areaId === 'emerald_glade').map((q) => q.id),
    },
  });
  await seedProgress(page, serializeGame(game));
  await launch(page);
  await page.keyboard.press('q');
  await page.getByRole('button', { name: 'Follow quest', exact: true }).click();
  await expect(page.locator('.quest-progress')).toContainText('Gear up before Whispering Canopy');
  await expect(page.locator('.quest-progress')).toContainText('Bag / Forge / Shop');
  expect((await snapshot(page)).currentArea).toBe('emerald_glade');
});
