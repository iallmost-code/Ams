import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress, clearProgress, SAVE_KEY } from '../src/save.js';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const memory = () => {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
};
const item = (type, id = type) => ({
  id,
  name: 'Dawnleaf ' + type,
  type,
  rarity: 'mythic',
  icon: '✦',
  count: 1,
  attack: 27,
  defense: 12,
  stars: 8,
});
const progress = () => ({
  version: 4,
  saveVersion: 4,
  absence: null,
  player: { level: 25, xp: 82, gold: 4700, deaths: 0 },
  upgrades: { vitality: 0, mastery: 0 },
  inventory: [item('weapon', 'alternate'), { ...item('potion'), count: 3 }],
  equipment: Object.fromEntries(
    ['weapon', 'hat', 'armor', 'cape', 'gloves', 'boots'].map((t) => [t, item(t)]),
  ),
  settings: {
    sound: false,
    music: true,
    particles: false,
    reducedMotion: true,
    minimapCollapsed: false,
  },
  unlockedAreas: ['emerald_glade', 'whispering_canopy', 'crystal_cavern', 'ember_altar'],
  quest: { kills: 11, target: 20, completed: false, claimed: false },
  classId: 'nightblade',
  damageSkin: 'sakura',
  starCores: 18,
  sp: 7,
  skillLevels: [2, 3, 1, 0],
  currentArea: 'ember_altar',
});

test('round trips equipment, inventory, preferences and extension progression', () => {
  const storage = memory(),
    data = progress();
  assert.equal(saveProgress(data, storage), true);
  assert.deepEqual(loadProgress(storage), data);
});
test('inventories with more than 1000 valid items round trip without dropping late-game gear', () => {
  const storage = memory(),
    data = progress();
  data.inventory = Array.from({ length: 1200 }, (_, i) => item('weapon', `loot-${i}`));
  assert.equal(saveProgress(data, storage), true);
  const restored = loadProgress(storage);
  assert.equal(restored.inventory.length, 1200);
  assert.deepEqual(restored.inventory, data.inventory);
});
test('oversized UTF-8 saves fail before replacing the previous save and oversized loads are rejected', () => {
  const storage = memory(),
    previous = progress();
  assert.equal(saveProgress(previous, storage), true);
  const previousRaw = storage.getItem(SAVE_KEY);
  const oversized = progress();
  oversized.inventory = Array.from({ length: 6000 }, (_, i) => ({
    ...item('weapon', `loot-${i}`),
    name: '葉'.repeat(80),
  }));
  const raw = JSON.stringify(oversized);
  assert.ok(
    raw.length < 2_000_000,
    'fixture distinguishes UTF-8 bytes from JavaScript string length',
  );
  assert.ok(Buffer.byteLength(raw, 'utf8') > 2_000_000);
  assert.equal(saveProgress(oversized, storage), false);
  assert.equal(storage.getItem(SAVE_KEY), previousRaw);
  assert.deepEqual(loadProgress(storage), previous);
  storage.setItem(SAVE_KEY, raw);
  assert.equal(loadProgress(storage), null);
});
test('corrupt JSON, unknown versions and invalid roots recover without throwing', () => {
  const storage = memory();
  for (const raw of ['{', 'null', '[]', '42', '{"version":99,"player":{}}', '{"version":1}']) {
    storage.setItem(SAVE_KEY, raw);
    assert.equal(loadProgress(storage), null);
  }
});
test('older version one saves receive extension defaults without losing gear', () => {
  const storage = memory(),
    data = progress();
  data.version = 1;
  delete data.saveVersion;
  for (const key of ['classId', 'damageSkin', 'starCores', 'sp', 'skillLevels', 'currentArea'])
    delete data[key];
  storage.setItem(SAVE_KEY, JSON.stringify(data));
  const loaded = loadProgress(storage);
  assert.deepEqual(loaded.equipment, data.equipment);
  assert.equal(loaded.classId, 'vanguard');
  assert.equal(loaded.damageSkin, 'amber');
  assert.deepEqual(loaded.skillLevels, [1, 1, 1, 1]);
});
test('version one progress migrates to the new key without replacing original storage', () => {
  const storage = memory(),
    data = progress();
  data.version = 1;
  delete data.saveVersion;
  delete data.absence;
  storage.setItem('aetherstory-m.progress.v1', JSON.stringify(data));
  const loaded = loadProgress(storage);
  assert.equal(loaded.saveVersion, 4);
  assert.equal(loaded.version, 4);
  assert.equal(loaded.player.gold, data.player.gold);
  assert.deepEqual(loaded.equipment, data.equipment);
  assert.ok(storage.getItem('aetherstory-m.progress.v1'));
});
test('flat version three progress migrates classes, gear, potions and safe offline eligibility', () => {
  const storage = memory();
  storage.setItem(
    'aetherstory_v3',
    JSON.stringify({
      saveVersion: 3,
      level: 12,
      exp: 45,
      gold: 500,
      classId: 'ranger',
      currentMapIndex: 1,
      autoBattle: true,
      lastSavedAt: 1000,
      hpPotions: 9,
      equipped: {
        Weapon: {
          id: 1,
          name: 'Legacy blade',
          slot: 'Weapon',
          tier: 'Rare',
          baseAtk: 40,
          stars: 3,
        },
      },
      inventory: [],
      skillLevels: [2, 2, 1, 1],
    }),
  );
  const loaded = loadProgress(storage);
  assert.equal(loaded.saveVersion, 4);
  assert.equal(loaded.player.level, 12);
  assert.equal(loaded.classId, 'ranger');
  assert.equal(loaded.equipment.weapon.stars, 3);
  assert.equal(loaded.inventory.find((i) => i.type === 'potion').count, 9);
  assert.equal(loaded.absence.autoBattle, true);
  assert.equal(loaded.absence.areaId, 'whispering_canopy');
});
test('malformed fields are bounded, unsafe items removed and slots checked', () => {
  const storage = memory(),
    data = progress();
  data.player = { level: 1e20, xp: -5, gold: '999' };
  data.inventory.push(
    { ...item('hat', 'unsafe'), name: '<img src=x onerror=alert(1)>' },
    { ...item('unknown') },
  );
  data.equipment.boots = item('weapon', 'wrong-slot');
  data.skillLevels = [-9, Infinity, '3', 999999];
  data.starCores = -4;
  data.settings.sound = 'false';
  data.unlockedAreas = ['emerald_glade', 'evil'];
  storage.setItem(SAVE_KEY, JSON.stringify(data));
  const loaded = loadProgress(storage);
  assert.equal(loaded.player.level, 200);
  assert.equal(loaded.player.xp, 0);
  assert.equal(loaded.player.gold, 300);
  assert.equal(loaded.inventory.length, 2);
  assert.equal(loaded.equipment.boots, null);
  assert.deepEqual(loaded.skillLevels, [0, 0, 0, 30]);
  assert.equal(loaded.starCores, 0);
  assert.equal(loaded.settings.sound, true);
  assert.deepEqual(loaded.unlockedAreas, ['emerald_glade']);
  assert.equal(loaded.currentArea, 'emerald_glade');
});
test('unavailable storage, quota and cyclic payloads do not interrupt play', () => {
  const unavailable = {
    getItem() {
      throw Error('privacy');
    },
    setItem() {
      throw Error('quota');
    },
    removeItem() {
      throw Error('privacy');
    },
  };
  assert.equal(loadProgress(unavailable), null);
  assert.equal(saveProgress(progress(), unavailable), false);
  assert.equal(clearProgress(unavailable), false);
  assert.equal(loadProgress(null), null);
  assert.equal(saveProgress(progress(), null), false);
  assert.equal(clearProgress(null), false);
  assert.doesNotThrow(() => loadProgress());
  assert.doesNotThrow(() => saveProgress(progress()));
  const cyclic = progress();
  cyclic.player = cyclic;
  assert.equal(saveProgress(cyclic, memory()), false);
});
test('clear removes only this game save', () => {
  const storage = memory();
  storage.setItem('other-game', 'keep');
  saveProgress(progress(), storage);
  assert.equal(clearProgress(storage), true);
  assert.equal(loadProgress(storage), null);
  assert.equal(storage.getItem('other-game'), 'keep');
});

async function builtWorker(run) {
  const root = await mkdtemp(join(tmpdir(), 'aetherstory-sw-'));
  try {
    await mkdir(join(root, 'dist', 'assets'), { recursive: true });
    await writeFile(join(root, 'dist', 'index.html'), '<main>Offline adventure</main>');
    await writeFile(join(root, 'dist', 'assets', 'game-a31.js'), 'export const game=1;');
    await writeFile(join(root, 'dist', 'assets', 'game-a31.js.map'), 'source map');
    const build = () =>
      execFileSync(
        process.execPath,
        [fileURLToPath(new URL('../scripts/build-sw.js', import.meta.url))],
        { cwd: root },
      );
    build();
    await run(await readFile(join(root, 'dist', 'sw.js'), 'utf8'), root, build);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
function workerHarness(source, { failInstall = false, html = 'offline shell' } = {}) {
  const events = {},
    deleted = [],
    entries = new Map(),
    requests = [];
  let network = false;
  const cache = {
    async addAll(items) {
      requests.push(...items.map((r) => r.url));
      if (failInstall) throw Error('offline');
      for (const r of items)
        entries.set(r.url, new Response(r.url.endsWith('index.html') ? html : 'asset'));
    },
    async match(url) {
      return entries.get(typeof url === 'string' ? url : url.url)?.clone();
    },
  };
  const self = {
    registration: { scope: 'https://example.test/games/aether/' },
    location: { origin: 'https://example.test' },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener: (type, handler) => (events[type] = handler),
  };
  const caches = {
    async open() {
      return cache;
    },
    async keys() {
      return [
        'unrelated-app',
        'aetherstory-m:https://example.test/other/:old',
        'aetherstory-m:https://example.test/games/aether/:old',
      ];
    },
    async delete(key) {
      deleted.push(key);
    },
  };
  vm.runInNewContext(source, {
    self,
    caches,
    URL,
    Request,
    Response,
    Set,
    fetch: async () => {
      if (!network) throw Error('offline');
      return new Response('online');
    },
  });
  const life = (type) => {
    let pending;
    events[type]({ waitUntil: (p) => (pending = p) });
    return pending;
  };
  const fetchRequest = (request) => {
    let response;
    events.fetch({ request, respondWith: (p) => (response = p) });
    return response;
  };
  return { life, fetchRequest, deleted, requests, setNetwork: (v) => (network = v) };
}
test('production worker precaches exact assets and serves an offline shell under a subpath', async () => {
  await builtWorker(async (source, root, build) => {
    assert.equal(source.includes('game-a31.js.map'), false);
    const worker = workerHarness(source);
    await worker.life('install');
    await worker.life('activate');
    assert.deepEqual(worker.requests.sort(), [
      'https://example.test/games/aether/assets/game-a31.js',
      'https://example.test/games/aether/index.html',
    ]);
    assert.deepEqual(worker.deleted, ['aetherstory-m:https://example.test/games/aether/:old']);
    const request = {
      url: 'https://example.test/games/aether/map',
      method: 'GET',
      mode: 'navigate',
    };
    assert.equal(await (await worker.fetchRequest(request)).text(), 'offline shell');
    worker.setNetwork(true);
    assert.equal(await (await worker.fetchRequest(request)).text(), 'online');
    assert.equal(
      worker.fetchRequest({ url: 'https://cdn.test/remote.js', method: 'GET' }),
      undefined,
    );
    assert.equal(
      worker.fetchRequest({
        url: 'https://example.test/elsewhere',
        method: 'GET',
        mode: 'navigate',
      }),
      undefined,
    );
    build();
    assert.equal(await readFile(join(root, 'dist', 'sw.js'), 'utf8'), source);
    await writeFile(join(root, 'dist', 'assets', 'game-a31.js'), 'export const game=2;');
    build();
    assert.notEqual(await readFile(join(root, 'dist', 'sw.js'), 'utf8'), source);
  });
});
test('nested trailing-slash offline navigation resolves relative assets within the precached deployment scope', async () => {
  await builtWorker(async (source) => {
    const worker = workerHarness(source, {
      html: '<html><head><script type="module" src="./assets/game-a31.js"></script></head></html>',
    });
    await worker.life('install');
    const deepURL = 'https://example.test/games/aether/map/deep/';
    const response = await worker.fetchRequest({ url: deepURL, method: 'GET', mode: 'navigate' });
    assert.equal(
      response.status,
      302,
      'offline deep links must canonicalize before serving relative-base HTML',
    );
    const canonical = response.headers.get('Location');
    assert.equal(canonical, 'https://example.test/games/aether/');
    const document = await worker.fetchRequest({ url: canonical, method: 'GET', mode: 'navigate' });
    assert.equal(
      document.status,
      200,
      'the canonical root must serve HTML without a redirect loop',
    );
    const src = (await document.text()).match(/src="([^"]+)"/)[1];
    const assetURL = new URL(src, canonical).href;
    assert.ok(worker.requests.includes(assetURL), 'the browser-resolved asset must be precached');
    assert.equal(
      await (await worker.fetchRequest({ url: assetURL, method: 'GET', mode: 'cors' })).text(),
      'asset',
    );
  });
});
test('a failed worker install removes its incomplete cache and rejects activation', async () => {
  await builtWorker(async (source) => {
    const worker = workerHarness(source, { failInstall: true });
    await assert.rejects(worker.life('install'), /offline/);
    assert.equal(worker.deleted.length, 1);
    assert.match(worker.deleted[0], /^aetherstory-m:https:\/\/example.test\/games\/aether\/:/);
  });
});
