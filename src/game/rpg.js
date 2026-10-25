/** Original class identities; effective equipment scores remain shared with AUTO. */
export const RARITIES = {
  normal: { name: 'Normal', color: '#b8c2bf', multiplier: 0.85 },
  rare: { name: 'Rare', color: '#69c9fa', multiplier: 1 },
  epic: { name: 'Epic', color: '#c896ff', multiplier: 1.12 },
  unique: { name: 'Unique', color: '#ffcc6d', multiplier: 1.25 },
  mythic: { name: 'Mythic', color: '#ff859a', multiplier: 1.4 },
};
const ATTRIBUTES = {
  vanguard: ['STR', 'DEX'],
  arcanist: ['INT', 'LUK'],
  nightblade: ['LUK', 'DEX'],
  ranger: ['DEX', 'STR'],
};
export const BUFFS = {
  vanguard: {
    name: 'Dawnsteel Oath',
    detail: '+10% attack · +20% defense',
    attack: 1.1,
    defense: 1.2,
    color: '#ffd37b',
  },
  arcanist: {
    name: 'Astral Attunement',
    detail: '+10% attack · −25% skill MP cost',
    attack: 1.1,
    mana: 0.75,
    color: '#bdadff',
  },
  nightblade: {
    name: 'Veil of Fortune',
    detail: '+10% attack · +15% critical chance',
    attack: 1.1,
    crit: 0.15,
    color: '#f3a5dd',
  },
  ranger: {
    name: 'Windcaller’s Focus',
    detail: '+10% attack · +10% critical chance',
    attack: 1.1,
    crit: 0.1,
    color: '#9bf0bd',
  },
};
export const BUFF_DURATION = 12,
  BUFF_COOLDOWN = 45,
  BUFF_LEVEL = 3,
  BUFF_MP = 15;
export function growthStats(classId, level, allocation = {}) {
  const attributes = { STR: 4, DEX: 4, INT: 4, LUK: 4 };
  const [main, secondary] = ATTRIBUTES[classId];
  attributes[main] += (level - 1) * 3;
  attributes[secondary] += level - 1;
  for (const stat of ATTRIBUTE_KEYS) attributes[stat] += allocation[stat] || 0;
  return {
    attributes,
    main,
    secondary,
    attackGrowth: ((attributes[main] - 4) * 4 + attributes[secondary] - 4) / 3.25,
  };
}
export const combatPower = (p) => {
  const expected =
    p.attack *
    p.attackSpeed *
    (1 + p.critRate * (p.critDamage - 1)) *
    (0.7 + 0.3 * p.skillDamageMultiplier) *
    ((p.minDamageMultiplier + p.maxDamageMultiplier) / 2);
  return Math.round(expected * 12 + p.defense * 8 + p.maxHp * 0.4 + p.maxMp * 0.2);
};
export function lootRarity(roll, boss = false, rank = 0) {
  if (boss) return roll < 0.08 ? 'mythic' : roll < 0.3 ? 'unique' : 'epic';
  if (rank >= 1 && roll < 0.015) return 'unique';
  return roll < 0.14 ? 'epic' : roll < 0.75 ? 'rare' : 'normal';
}

export const ATTRIBUTE_KEYS = ['STR', 'DEX', 'INT', 'LUK'];
export const ATTRIBUTE_DETAILS = {
  STR: 'Maximum HP +2 · Defense +0.2 per point',
  DEX: 'Attack speed +0.1% · Critical chance +0.05% per point',
  INT: 'Maximum MP +3 · Skill damage +0.1% per point',
  LUK: 'Critical chance +0.1% · Critical damage +0.2% per point',
};
export const MASTERY_NAMES = {
  vanguard: 'Dawnsteel Mastery',
  arcanist: 'Aether Mastery',
  nightblade: 'Shadowcraft Mastery',
  ranger: 'Windbow Mastery',
};
export function normalizeAllocation(value, level) {
  const result = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0]));
  if (!value || typeof value !== 'object') return result;
  for (const k of ATTRIBUTE_KEYS) {
    const n = value[k];
    if (n !== undefined && (!Number.isSafeInteger(n) || n < 0))
      return Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0]));
    result[k] = n || 0;
  }
  return Object.values(result).reduce((a, b) => a + b, 0) <= Math.max(0, (level - 1) * 5)
    ? result
    : Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0]));
}
