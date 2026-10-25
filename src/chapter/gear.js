export const SLOTS = ['weapon', 'hat', 'armor', 'cape', 'gloves', 'boots'];
export const RARITIES = {
  normal: { name: 'Normal', color: '#d5ddd7', affixes: 0, mult: 1 },
  rare: { name: 'Rare', color: '#78cfff', affixes: 1, mult: 1.2 },
  epic: { name: 'Epic', color: '#c995ff', affixes: 2, mult: 1.5 },
  unique: { name: 'Unique', color: '#ffd070', affixes: 3, mult: 1.9 },
  mythic: { name: 'Mythic', color: '#ff91ab', affixes: 3, mult: 2.5 },
};
export const AFFIXES = {
  strPct: 'STR',
  attackPct: 'Attack',
  hpPct: 'Max HP',
  defensePct: 'Defense',
  critPct: 'Critical chance',
  skillPct: 'Holy skill damage',
  speedPct: 'Attack speed',
  mpPct: 'Max MP',
};
const names = {
  weapon: ['Dawnsteel Hammer', 'Bellkeeper Maul', 'Suncrest Mace'],
  hat: ['Pilgrim Crown', 'Lantern Circlet', 'Dawnsteel Helm'],
  armor: ['Wayfarer Cuirass', 'Suncrest Plate', 'Bellkeeper Vest'],
  cape: ['Sunwoven Mantle', 'Pilgrim Cape', 'Vowkeeper Shroud'],
  gloves: ['Bellkeeper Grips', 'Dawnsteel Gauntlets', 'Sunwoven Gloves'],
  boots: ['Pilgrim Greaves', 'Suncrest Boots', 'Vowkeeper Treads'],
};
export function rollGear(seed, type = 'weapon', rarity = 'rare', level = 1) {
  if (!SLOTS.includes(type)) type = 'weapon';
  if (!RARITIES[rarity]) rarity = 'rare';
  let n = seed >>> 0;
  const r = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  const tier = RARITIES[rarity],
    affixes = [],
    pool = Object.keys(AFFIXES);
  for (let i = 0; i < tier.affixes; i++) {
    const index = Math.floor(r() * pool.length);
    affixes.push({
      stat: pool.splice(index, 1)[0],
      value: Math.min(
        20,
        2 + Math.floor(r() * (rarity === 'mythic' ? 13 : rarity === 'unique' ? 10 : 7)),
      ),
    });
  }
  const base = Math.round(
    (type === 'weapon' ? 12 + level * 1.8 : 4 + level * 0.8) * tier.mult * (0.85 + r() * 0.3),
  );
  return {
    id: `chapter-${seed >>> 0}-${type}`,
    type,
    name: names[type][Math.floor(r() * 3)],
    rarity,
    level: Math.max(1, Math.floor(level)),
    attack: type === 'weapon' ? base : 0,
    defense: type === 'weapon' ? 0 : base,
    stars: 0,
    affixes,
    locked: false,
    count: 1,
    icon: type === 'weapon' ? '⚒' : type === 'armor' ? '♜' : '✧',
  };
}
export function gearStats(items) {
  const stats = {
    attack: 0,
    defense: 0,
    ...Object.fromEntries(Object.keys(AFFIXES).map((k) => [k, 0])),
  };
  for (const item of items.filter(Boolean)) {
    stats.attack += (item.attack || 0) * (1 + (item.stars || 0) * 0.12);
    stats.defense += (item.defense || 0) * (1 + (item.stars || 0) * 0.12);
    for (const a of item.affixes || [])
      if (Object.hasOwn(AFFIXES, a.stat)) stats[a.stat] += Math.max(0, Math.min(20, a.value || 0));
  }
  return stats;
}
export function itemScore(item) {
  if (!item) return 0;
  return (
    (item.type === 'weapon' ? item.attack || 0 : (item.defense || 0) * 1.5) *
      (1 + (item.stars || 0) * 0.12) +
    (item.affixes || []).reduce(
      (v, a) => v + a.value * (a.stat === 'attackPct' || a.stat === 'skillPct' ? 1.1 : 0.7),
      0,
    )
  );
}
export const salvageValue = (i) => ({
  gold: 25 + Object.keys(RARITIES).indexOf(i.rarity) * 20,
  cores: ['epic', 'unique', 'mythic'].includes(i.rarity) ? 2 : 1,
});
export const canDismantle = (item, equipped) =>
  SLOTS.includes(item?.type) &&
  !item.locked &&
  !(item.stars > 0) &&
  !equipped.some((i) => i?.id === item.id);
export function normalizeGear(item) {
  if (
    !item ||
    typeof item !== 'object' ||
    !SLOTS.includes(item.type) ||
    !RARITIES[item.rarity] ||
    typeof item.id !== 'string'
  )
    return null;
  const number = (v, max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
  return {
    id: item.id.slice(0, 100),
    type: item.type,
    name: names[item.type].includes(item.name) ? item.name : names[item.type][0],
    rarity: item.rarity,
    level: Math.max(1, Math.floor(number(item.level, 30))),
    attack: number(item.attack, 500),
    defense: number(item.defense, 300),
    stars: Math.floor(number(item.stars, 25)),
    locked: item.locked === true,
    count: 1,
    affixes: Array.isArray(item.affixes)
      ? item.affixes
          .slice(0, 3)
          .filter((a) => a && Object.hasOwn(AFFIXES, a.stat))
          .map((a) => ({ stat: a.stat, value: number(a.value, 20) }))
      : [],
    icon: item.type === 'weapon' ? '⚒' : '✧',
  };
}
