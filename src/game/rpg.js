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
export function growthStats(classId, level) {
  const attributes = { STR: 4, DEX: 4, INT: 4, LUK: 4 };
  const [main, secondary] = ATTRIBUTES[classId];
  attributes[main] += (level - 1) * 3;
  attributes[secondary] += level - 1;
  return {
    attributes,
    main,
    secondary,
    attackGrowth: attributes[main] + attributes[secondary] - 8,
  };
}
export const combatPower = (p) =>
  Math.round(p.attack * 12 + p.defense * 8 + p.maxHp * 0.4 + p.maxMp * 0.2);
export function lootRarity(roll, boss = false, rank = 0) {
  if (boss) return roll < 0.08 ? 'mythic' : roll < 0.3 ? 'unique' : 'epic';
  if (rank >= 1 && roll < 0.015) return 'unique';
  return roll < 0.14 ? 'epic' : roll < 0.75 ? 'rare' : 'normal';
}
