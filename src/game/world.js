/** Immutable definitions; createWorld returns fresh objects for each simulation. */
export const GRAVITY = 1800;
export const JUMP_SPEED = 690;
export const MOVE_SPEED = 245;
export const CLIMB_SPEED = 185;
export const AREA_DEFINITIONS = [
  {
    id: 'emerald_glade',
    name: 'Emerald Glade',
    minLevel: 1,
    theme: 'forest',
    x: 0,
    end: 1200,
    npc: { name: 'Elder Rowan', x: 115, y: 820 },
    isBoss: false,
  },
  {
    id: 'whispering_canopy',
    name: 'Whispering Canopy',
    minLevel: 10,
    theme: 'canopy',
    x: 1200,
    end: 2400,
    isBoss: false,
  },
  {
    id: 'crystal_cavern',
    name: 'Crystal Cavern',
    minLevel: 16,
    theme: 'crystal',
    x: 2400,
    end: 3600,
    isBoss: false,
  },
  {
    id: 'ember_altar',
    name: 'Ember Altar',
    minLevel: 20,
    theme: 'ember',
    x: 3600,
    end: 4800,
    isBoss: true,
  },
];
export function createWorld() {
  const platforms = [{ id: 'ground', ground: true, x: 0, y: 820, w: 4800, h: 180 }];
  const ropes = [];
  for (let a = 0; a < 4; a++) {
    const o = a * 1200;
    platforms.push(
      { id: `${a}-low`, x: o + 150, y: 680, w: 410, h: 35 },
      { id: `${a}-low-east`, x: o + 560, y: 680, w: 100, h: 35 },
      { id: `${a}-mid`, x: o + 400, y: 520, w: 360, h: 35 },
      { id: `${a}-high`, x: o + 650, y: 365, w: 350, h: 35 },
      { id: `${a}-step`, x: o + 820, y: 610, w: 280, h: 35 },
      { id: `${a}-ledge`, x: o + 1090, y: 690, w: 100, h: 35 },
    );
    ropes.push(
      { id: `${a}-rope-low`, x: o + 250, y1: 680, y2: 820 },
      { id: `${a}-rope-mid`, x: o + 470, y1: 520, y2: 680 },
      { id: `${a}-rope-high`, x: o + 700, y1: 365, y2: 520 },
      { id: `${a}-rope-step`, x: o + 970, y1: 610, y2: 820 },
    );
  }
  return {
    width: 4800,
    height: 1000,
    platforms,
    ropes,
    areas: AREA_DEFINITIONS.map((a, index) => ({
      ...a,
      npc: a.npc ? { ...a.npc } : null,
      portals: [
        { x: a.end - 65, y: platforms[0].y, targetArea: AREA_DEFINITIONS[(index + 1) % 4].id },
        ...(index > 0
          ? [{ x: a.x + 65, y: platforms[0].y, targetArea: AREA_DEFINITIONS[index - 1].id }]
          : []),
      ],
    })),
  };
}
export function createEnemies(world) {
  const result = [];
  for (let a = 0; a < 4; a++) {
    const level = [1, 10, 16, 20][a];
    for (let i = 0; i < 6; i++) {
      const platform = world.platforms.find(
        (p) => p.id === (i < 3 ? 'ground' : `${a}-${['low', 'mid', 'high'][i - 3]}`),
      );
      const type = ['slime', 'mushroom', 'slime', 'mushroom', 'wisp', 'boar'][i];
      const w = type === 'boar' ? 64 : 46,
        h = type === 'mushroom' ? 52 : 42;
      const x = i < 3 ? a * 1200 + 350 + i * 285 : platform.x + 100;
      result.push({
        id: `enemy-${a}-${i}`,
        type,
        x,
        y: platform.y - h,
        w,
        h,
        vx: (i % 2 ? 1 : -1) * (24 + level * 2),
        hp: [80, 900, 2300, 4500][a],
        maxHp: [80, 900, 2300, 4500][a],
        damage: [16, 110, 230, 330][a],
        platformId: platform.id,
        facing: i % 2 ? 1 : -1,
        attackTimer: 0,
        respawnTimer: 0,
        level,
        areaRank: a,
        hitTimer: 0,
        deathTimer: 0,
        spawnX: x,
        homeMin: i < 3 ? a * 1200 + 240 : platform.x,
        homeMax: i < 3 ? (a + 1) * 1200 - 30 : platform.x + platform.w,
        rewarded: false,
      });
    }
  }
  result.push({
    id: 'guardian',
    name: 'Cinderroot Guardian',
    type: 'boar',
    isBoss: true,
    x: 4470,
    y: 700,
    w: 150,
    h: 120,
    vx: 0,
    hp: 150000,
    maxHp: 150000,
    platformId: 'ground',
    facing: -1,
    attackTimer: 2,
    respawnTimer: 0,
    level: 12,
    hitTimer: 0,
    deathTimer: 0,
    spawnX: 4470,
    homeMin: 4100,
    homeMax: 4750,
    rewarded: false,
    telegraph: 0,
    bossCooldown: 3,
    attackPhase: 'idle',
  });
  return result;
}
