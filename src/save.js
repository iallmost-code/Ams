/** Local-only, versioned progress. Storage failures must never stop a session. */
export const SAVE_VERSION = 4;
export const SAVE_KEY = 'aetherstory_v4';
// Shared UTF-8 JSON budget for reads/writes; inventory has no item-count cap.
export const MAX_SAVE_BYTES = 2_000_000;
const slots = ['weapon', 'hat', 'armor', 'cape', 'gloves', 'boots'];
const areas = ['emerald_glade', 'whispering_canopy', 'crystal_cavern', 'ember_altar'];
const areaLevels = [1, 10, 16, 20];
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value, min, max, fallback) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.floor(value)))
    : fallback;
const choice = (value, values, fallback) => (values.includes(value) ? value : fallback);
const safeText = (value, max) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= max &&
  !/[<>\u0000-\u001f]/u.test(value);
const withinBudget = (value) =>
  typeof value === 'string' &&
  value.length <= MAX_SAVE_BYTES &&
  new TextEncoder().encode(value).byteLength <= MAX_SAVE_BYTES;
function getStorage(storage) {
  return storage === undefined ? globalThis.localStorage : storage;
}
function item(value, slot) {
  if (
    !object(value) ||
    !safeText(value.id, 100) ||
    !safeText(value.name, 100) ||
    !safeText(value.icon, 40)
  )
    return null;
  const type = choice(value.type, [...slots, 'potion'], null);
  if (!type || (slot && slot !== type)) return null;
  const result = {
    id: value.id,
    name: value.name,
    type,
    rarity: choice(value.rarity, ['normal', 'rare', 'epic', 'unique', 'mythic'], 'normal'),
    icon: value.icon,
    count: number(value.count, 1, 9999, 1),
  };
  for (const key of ['attack', 'defense'])
    if (value[key] !== undefined) result[key] = number(value[key], 0, 100000, 0);
  if (value.stars !== undefined) result.stars = number(value.stars, 0, 25, 0);
  return result;
}
/** Migrations are explicit and leave the source save intact until a new save succeeds. */
export function migrateProgress(value) {
  if (!object(value)) return null;
  const version = value.saveVersion ?? value.version;
  if ((version === 1 || version === SAVE_VERSION) && object(value.player)) {
    return { ...value, version: SAVE_VERSION, saveVersion: SAVE_VERSION };
  }
  if ((version === 3 || version === undefined) && object(value.equipped)) {
    const names = {
      weapon: 'Dawnwood Blade',
      hat: 'Skyguard Helm',
      armor: 'Grovebound Mail',
      cape: 'Wayfarer Mantle',
      gloves: 'Brambleweave Grips',
      boots: 'Windtrail Boots',
    };
    const convert = (gear, fallbackSlot) => {
      if (!object(gear)) return null;
      const type = String(gear.slot || fallbackSlot || '').toLowerCase();
      if (!slots.includes(type)) return null;
      return {
        id: `legacy-${String(gear.id ?? type)}`,
        name: names[type],
        type,
        rarity: String(gear.tier || 'normal').toLowerCase(),
        icon: type === 'weapon' ? '⚔' : '✦',
        count: 1,
        stars: gear.stars || 0,
        ...(type === 'weapon'
          ? { attack: gear.baseAtk || 9 }
          : { defense: Math.round((gear.baseAtk || 9) / 3) }),
      };
    };
    const currentArea = areas[number(value.currentMapIndex, 0, 3, 0)];
    const inventory = (Array.isArray(value.inventory) ? value.inventory : [])
      .map((i) => convert(i))
      .filter(Boolean);
    if (number(value.hpPotions, 0, 9999, 0))
      inventory.push({
        id: 'legacy-tonic',
        name: 'Crimson Tonic',
        type: 'potion',
        rarity: 'normal',
        icon: '♥',
        count: value.hpPotions,
      });
    return {
      ...value,
      version: SAVE_VERSION,
      saveVersion: SAVE_VERSION,
      player: { level: value.level, xp: value.exp, gold: value.gold },
      inventory,
      equipment: Object.fromEntries(
        slots.map((slot) => [
          slot,
          convert(value.equipped[slot[0].toUpperCase() + slot.slice(1)], slot),
        ]),
      ),
      currentArea,
      unlockedAreas: areas.filter((a, i) => (value.level || 1) >= areaLevels[i]),
      quest: { kills: value.quest?.progress || 0, target: 10, claimed: false },
      absence: value.lastSavedAt
        ? {
            hiddenAt: value.lastSavedAt,
            autoBattle: value.autoBattle === true,
            areaId: currentArea,
          }
        : null,
    };
  }
  return null;
}
function normalize(value) {
  value = migrateProgress(value);
  if (!value) return null;
  const level = number(value.player.level, 1, 200, 1);
  const unlockedAreas = [
    ...new Set(
      (Array.isArray(value.unlockedAreas) ? value.unlockedAreas : ['emerald_glade']).filter(
        (area) => areas.includes(area) && level >= areaLevels[areas.indexOf(area)],
      ),
    ),
  ];
  if (!unlockedAreas.includes('emerald_glade')) unlockedAreas.unshift('emerald_glade');
  const settings = object(value.settings) ? value.settings : {};
  const quest = object(value.quest) ? value.quest : {};
  const target = number(quest.target, 1, 1000000, 10),
    kills = number(quest.kills, 0, 1000000, 0);
  const completed = kills >= target;
  return {
    version: SAVE_VERSION,
    saveVersion: SAVE_VERSION,
    absence:
      object(value.absence) && number(value.absence.hiddenAt, 0, Number.MAX_SAFE_INTEGER, 0) > 0
        ? {
            hiddenAt: number(value.absence.hiddenAt, 0, Number.MAX_SAFE_INTEGER, 0),
            autoBattle: value.absence.autoBattle === true,
            areaId: choice(value.absence.areaId, areas, 'emerald_glade'),
          }
        : null,
    player: {
      level,
      xp: number(value.player.xp, 0, 1e9, 0),
      gold: number(value.player.gold, 0, 1e9, 300),
      deaths: number(value.player.deaths, 0, 1e9, 0),
    },
    upgrades: {
      vitality: number(value.upgrades?.vitality, 0, 10, 0),
      mastery: number(value.upgrades?.mastery, 0, 10, 0),
    },
    inventory: (Array.isArray(value.inventory) ? value.inventory : [])
      .map((v) => item(v))
      .filter(Boolean),
    equipment: Object.fromEntries(slots.map((slot) => [slot, item(value.equipment?.[slot], slot)])),
    settings: Object.fromEntries(
      ['sound', 'music', 'particles', 'reducedMotion', 'minimapCollapsed'].map((key) => [
        key,
        typeof settings[key] === 'boolean' ? settings[key] : key !== 'reducedMotion',
      ]),
    ),
    unlockedAreas,
    quest: { kills, target, completed, claimed: completed && quest.claimed === true },
    classId: choice(value.classId, ['vanguard', 'arcanist', 'nightblade', 'ranger'], 'vanguard'),
    damageSkin: choice(value.damageSkin, ['amber', 'sakura', 'frost', 'cyber', 'solar'], 'amber'),
    starCores: number(value.starCores, 0, 1e9, 5),
    sp: number(value.sp, 0, 100000, 0),
    skillLevels: Array.from({ length: 4 }, (_, i) =>
      number(value.skillLevels?.[i], 0, 30, value.skillLevels === undefined ? 1 : 0),
    ),
    currentArea: choice(value.currentArea, unlockedAreas, 'emerald_glade'),
  };
}
export function loadProgress(storage) {
  try {
    const source = getStorage(storage);
    if (!source) return null;
    const keys = new Set([SAVE_KEY, 'aetherstory-m.progress.v1', 'aetherstory_v3']);
    // Discover previous product keys without depending on a discontinued subtitle.
    for (let i = 0; i < (source.length || 0); i++) {
      const key = source.key(i);
      if (key?.startsWith('aetherstory_') && key.endsWith('_v3')) keys.add(key);
    }
    for (const key of keys) {
      const raw = source.getItem(key);
      if (!raw || !withinBudget(raw)) continue;
      try {
        const result = normalize(JSON.parse(raw));
        if (result) return result;
      } catch {
        /* Try a retained previous save. */
      }
    }
    return null;
  } catch {
    return null;
  }
}
export function saveProgress(progress, storage) {
  try {
    // Serialize before normalization to reject cycles and invoke no partial writes.
    const raw = JSON.stringify(progress);
    if (!withinBudget(raw)) return false;
    const normalized = normalize(JSON.parse(raw));
    if (!normalized) return false;
    const serialized = JSON.stringify(normalized);
    if (!withinBudget(serialized)) return false;
    const target = getStorage(storage);
    if (!target) return false;
    target.setItem(SAVE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
export function clearProgress(storage) {
  try {
    const target = getStorage(storage);
    if (!target) return false;
    target.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
