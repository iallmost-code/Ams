import { createGame } from '../game/engine.js';
import { createMap, MAPS } from './world.js';
import {
  SLOTS,
  RARITIES,
  rollGear,
  gearStats,
  itemScore,
  normalizeGear,
  canDismantle,
  salvageValue,
} from './gear.js';
export const CHAPTER_SAVE_KEY = 'aetherstory_dawntrail_v1';
export const SKILLS = [
  {
    name: 'Sanctified Cleave',
    key: 'Z',
    level: 1,
    mp: 9,
    cd: 3.2,
    windup: 0.12,
    duration: 0.56,
    hits: [0.14, 0.24, 0.34],
    damage: 0.8,
    range: 185,
    icon: '☀',
    description: 'Three holy hammer arcs. Each visible strike deals 80% attack.',
  },
  {
    name: 'Aegis Rush',
    key: 'X',
    level: 1,
    mp: 12,
    cd: 6,
    windup: 0.08,
    duration: 0.46,
    hits: [0.1],
    damage: 2.1,
    range: 140,
    icon: '⛨',
    description:
      'Advance behind your shield. 210% attack; reduced incoming damage during the rush.',
  },
  {
    name: 'Consecration',
    key: 'C',
    level: 5,
    mp: 20,
    cd: 11,
    windup: 0.2,
    duration: 1.25,
    hits: [0.3, 0.65, 1],
    damage: 1.4,
    range: 270,
    icon: '✦',
    description: 'Bless the ground with three pulses, each dealing 140% attack.',
  },
  {
    name: 'Judgment Bell',
    key: 'V',
    level: 10,
    mp: 32,
    cd: 35,
    windup: 0.3,
    duration: 1.3,
    hits: [0.35, 0.5, 0.65, 0.8, 0.95],
    damage: 1.5,
    range: 480,
    icon: '♜',
    description: 'Call five radiant hammers. Each impact deals 150% attack.',
  },
];
export const BUILDS = {
  balanced: { name: 'Vowkeeper', detail: 'A steady balance of hammer power and protection.' },
  bulwark: { name: 'Bastion', detail: '+25% max HP · +30% defense · stronger shield blocks.' },
  zeal: { name: 'Dawnbringer', detail: '+15% attack · +10% critical chance · +12% skill damage.' },
};
export const QUESTS = [
  {
    name: 'A road worth keeping',
    text: 'Rowan: “The jellies have swallowed our lantern oil. Clear the fields, and I will mend your hammer.”',
    goal: 8,
    reward: '140 gold · Rare hammer · 90 XP',
  },
  {
    name: 'The bell above the roots',
    text: 'Rowan: “A light still burns at the top of Bellroot Rise. Reach the Last Bell. Pip knows its song.”',
    goal: 1,
    reward: 'Epic mantle · 180 XP',
  },
  {
    name: 'The hollow bell',
    text: 'Rowan: “Aurel has forgotten the vow. Dodge his signs, withstand his fury, and bring the sanctuary back to light.”',
    goal: 1,
    reward: 'Unique hammer · 600 XP',
  },
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const safe = (n, lo, hi, fallback) => (Number.isFinite(n) ? clamp(n, lo, hi) : fallback);
const center = (p) => p.x + p.w / 2;
const rand = (s) => {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
};
export const chapterXp = (level) => Math.round(55 * Math.pow(level, 1.75));
function say(s, text) {
  s.notice = text;
  s.noticeTimer = 4;
}
function number(s, x, y, text, color = '#ffe49b') {
  s.numbers.push({ x, y, text: String(text), color, life: 1, maxLife: 1 });
}
function fx(s, type, x, y, extra = {}) {
  s.effects.push({
    type,
    x,
    y,
    facing: s.player.facing,
    classId: 'vanguard',
    life: 0.6,
    maxLife: 0.6,
    ...extra,
  });
}
function recalculate(s, heal = false) {
  const p = s.player,
    g = gearStats(Object.values(p.equipment)),
    l = p.level - 1,
    oldHP = p.maxHp || 210,
    oldMP = p.maxMp || 90;
  const str = (10 + l * 5) * (1 + g.strPct / 100),
    mastery = s.mastery || 0;
  p.attributes = { STR: Math.floor(str), DEX: 6 + l, INT: 4, LUK: 4 + l };
  p.baseAttack = Math.round(
    (20 + str * 0.9 + g.attack) *
      (1 + g.attackPct / 100 + mastery * 0.025) *
      (s.build === 'zeal' ? 1.15 : 1),
  );
  p.baseDefense = Math.round(
    (8 + l * 2 + g.defense) * (1 + g.defensePct / 100) * (s.build === 'bulwark' ? 1.3 : 1),
  );
  p.attack = Math.round(p.baseAttack * (p.buffRemaining > 0 ? 1.1 : 1));
  p.defense = Math.round(p.baseDefense * (p.buffRemaining > 0 ? 1.25 : 1));
  p.maxHp = Math.round((210 + l * 34) * (1 + g.hpPct / 100) * (s.build === 'bulwark' ? 1.25 : 1));
  p.maxMp = Math.round((90 + l * 9) * (1 + g.mpPct / 100));
  p.critRate = Math.min(0.65, 0.06 + g.critPct / 100 + (s.build === 'zeal' ? 0.1 : 0));
  p.critDamage = 1.6;
  p.attackSpeed = 1 + Math.min(0.45, g.speedPct / 100);
  p.skillDamageMultiplier =
    1 + g.skillPct / 100 + (s.build === 'zeal' ? 0.12 : 0) + mastery * 0.015;
  p.hp = heal ? p.maxHp : clamp(p.hp + (p.maxHp - oldHP), 0, p.maxHp);
  p.mp = heal ? p.maxMp : clamp(p.mp + (p.maxMp - oldMP), 0, p.maxMp);
  p.xpToNext = chapterXp(p.level);
  p.combatPower = Math.round(p.attack * 14 + p.defense * 8 + p.maxHp * 0.4);
  p.affixes = g;
}
function setMap(s, id, from = null) {
  const map = createMap(id);
  s.mapId = map.id;
  s.currentArea = map.id;
  s.world = map;
  s.enemies = map.enemies;
  s.effects = [];
  s.numbers = [];
  s.drops = [];
  s.particles = [];
  const arrival = map.portals.find((p) => p.target === from);
  const x = arrival
    ? clamp(arrival.x + (arrival.x > map.width / 2 ? -90 : 70), 40, map.width - 80)
    : 170;
  Object.assign(s.player, {
    x,
    y: map.ground - s.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
    platformId: 'ground',
    climbing: null,
    action: null,
    deadTimer: 0,
    portalCooldown: 0.25,
    airAdvanceUsed: false,
    invuln: 1,
  });
  s.pet.x = x - 50;
  s.pet.y = s.player.y + 15;
  s.cameraReset = true;
  if (!s.visited.includes(map.id)) s.visited.push(map.id);
  say(s, map.name + ' · ' + map.subtitle);
}
export function createChapter(saved = null, { training = false } = {}) {
  const data = saved?.saveVersion === 1 ? saved : {};
  const s = createGame({ classId: 'vanguard' });
  s.chapter = true;
  s.training = training;
  s.seed = Math.floor(safe(data.seed, 0, 4294967295, 37219));
  s.time = 0;
  s.mapId = 'hollow';
  s.visited = ['hollow'];
  s.build = Object.hasOwn(BUILDS, data.build) ? data.build : 'balanced';
  s.mastery = Math.floor(safe(data.mastery, 0, 10, 0));
  s.questIndex = Math.floor(safe(data.questIndex, 0, 3, 0));
  s.questProgress = Math.floor(safe(data.questProgress, 0, 8, 0));
  s.kills = Math.floor(safe(data.kills, 0, 1e7, 0));
  s.deaths = Math.floor(safe(data.deaths, 0, 1e6, 0));
  s.beaconLit = !!data.beaconLit;
  s.bossDefeated = !!data.bossDefeated;
  s.starCores = Math.floor(safe(data.cores, 0, 1e8, 0));
  s.autoBattle = false;
  s.paused = false;
  if (typeof data.settings?.sound === 'boolean') s.settings.sound = data.settings.sound;
  s.skillDefinitions = SKILLS;
  s.sounds = [];
  if (Array.isArray(data.visited))
    s.visited = [...new Set(['hollow', ...data.visited.filter((id) => Object.hasOwn(MAPS, id))])];
  const p = s.player;
  Object.assign(p, {
    level: training ? 10 : Math.floor(safe(data.level, 1, 30, 1)),
    xp: Math.floor(safe(data.xp, 0, 1e7, 0)),
    gold: Math.floor(safe(data.gold, 0, 1e9, 120)),
    tonics: Math.floor(safe(data.tonics, 0, 99, 5)),
    sp: Math.floor(safe(data.sp, 0, 100, 0)),
    action: null,
    skillCooldowns: [0, 0, 0, 0],
    buffRemaining: 0,
    buffCooldown: 0,
    attackTimer: 0,
    attackAnimation: 0,
    skillAnimation: 0,
    skillTimer: 0,
    invuln: 0,
    portalCooldown: 0,
    coyote: 0,
    jumpBuffer: 0,
    airTime: 0,
    airAdvanceUsed: false,
    dashTime: 0,
    combo: 0,
    comboTimer: 0,
    deadTimer: 0,
    guarding: false,
    potionCooldown: 0,
    grounded: true,
  });
  p.equipment = Object.fromEntries(SLOTS.map((slot) => [slot, null]));
  p.equipment.weapon = rollGear(11, 'weapon', 'normal', 1);
  p.equipment.armor = rollGear(12, 'armor', 'normal', 1);
  if (data.equipment && typeof data.equipment === 'object')
    for (const slot of SLOTS) {
      const item = normalizeGear(data.equipment[slot]);
      if (item && item.type === slot && item.level <= p.level) p.equipment[slot] = item;
    }
  const equippedIds = new Set(
    Object.values(p.equipment)
      .filter(Boolean)
      .map((i) => i.id),
  );
  p.inventory = Array.isArray(data.inventory)
    ? data.inventory
        .slice(0, 72)
        .map(normalizeGear)
        .filter((i) => {
          if (!i || equippedIds.has(i.id)) return false;
          equippedIds.add(i.id);
          return true;
        })
    : [];
  if (training) {
    p.equipment.weapon = rollGear(13, 'weapon', 'epic', 8);
    p.equipment.armor = rollGear(14, 'armor', 'epic', 8);
    p.tonics = 20;
  }
  s.pet = { x: 120, y: 720, mode: 'following', healFlash: 0, healCooldown: 0 };
  recalculate(s, true);
  setMap(s, training ? 'fields' : Object.hasOwn(MAPS, data.mapId) ? data.mapId : 'hollow');
  return s;
}
export function serializeChapter(s) {
  if (s.training) return null;
  return {
    saveVersion: 1,
    seed: s.seed,
    mapId: s.mapId,
    visited: s.visited,
    level: s.player.level,
    xp: s.player.xp,
    gold: s.player.gold,
    tonics: s.player.tonics,
    sp: s.player.sp,
    equipment: s.player.equipment,
    inventory: s.player.inventory,
    build: s.build,
    mastery: s.mastery,
    questIndex: s.questIndex,
    questProgress: s.questProgress,
    kills: s.kills,
    deaths: s.deaths,
    beaconLit: s.beaconLit,
    bossDefeated: s.bossDefeated,
    cores: s.starCores,
    settings: { sound: s.settings.sound },
  };
}
function gain(s, amount) {
  const p = s.player;
  p.xp += amount;
  while (p.level < 30 && p.xp >= chapterXp(p.level)) {
    p.xp -= chapterXp(p.level);
    p.level++;
    p.sp += 2;
    recalculate(s, true);
    fx(s, 'levelup', center(p), p.y, { life: 1, maxLife: 1 });
    say(s, `Level ${p.level} · HP +34 · MP +9 · 2 mastery points`);
  }
  p.xpToNext = chapterXp(p.level);
}
function equip(s, id) {
  const p = s.player,
    index = p.inventory.findIndex((i) => i.id === id),
    item = p.inventory[index];
  if (!item || item.level > p.level) return false;
  const old = p.equipment[item.type];
  p.inventory.splice(index, 1);
  p.equipment[item.type] = item;
  if (old) p.inventory.push(old);
  recalculate(s);
  return true;
}
function best(s) {
  let count = 0;
  for (const slot of SLOTS) {
    const candidates = s.player.inventory
      .filter((i) => i.type === slot && i.level <= s.player.level)
      .sort((a, b) => itemScore(b) - itemScore(a));
    if (
      candidates[0] &&
      itemScore(candidates[0]) > itemScore(s.player.equipment[slot]) &&
      equip(s, candidates[0].id)
    )
      count++;
  }
  say(s, count ? `Equipped ${count} upgrades` : 'Already wearing your best gear');
  return count;
}
export function dismantlePreview(s) {
  const worn = Object.values(s.player.equipment),
    bestPerSlot = Object.fromEntries(
      SLOTS.map((slot) => [
        slot,
        Math.max(
          itemScore(s.player.equipment[slot]),
          ...s.player.inventory
            .filter((i) => i.type === slot && i.level <= s.player.level)
            .map(itemScore),
        ),
      ]),
    );
  const items = s.player.inventory.filter(
    (i) =>
      canDismantle(i, worn) &&
      ['normal', 'rare'].includes(i.rarity) &&
      i.level <= s.player.level &&
      itemScore(i) < bestPerSlot[i.type],
  );
  return {
    ids: items.map((i) => i.id),
    gold: items.reduce((n, i) => n + salvageValue(i).gold, 0),
    cores: items.reduce((n, i) => n + salvageValue(i).cores, 0),
  };
}
export function chapterAction(s, action, arg) {
  const p = s.player;
  if (action === 'travel' && Object.hasOwn(MAPS, arg)) {
    const old = s.mapId;
    setMap(s, arg, old);
    return true;
  }
  if (action === 'equip') {
    const ok = equip(s, arg);
    say(s, ok ? 'Equipment updated' : 'Requires a higher level');
    return ok;
  }
  if (action === 'best') return best(s);
  if (action === 'lock') {
    const item = p.inventory.find((i) => i.id === arg);
    if (item) item.locked = !item.locked;
    return !!item;
  }
  if (action === 'dismantle') {
    const plan = dismantlePreview(s);
    if (arg !== plan.ids.join('|')) return false;
    p.inventory = p.inventory.filter((i) => !plan.ids.includes(i.id));
    p.gold += plan.gold;
    s.starCores += plan.cores;
    say(s, `Dismantled ${plan.ids.length} items · +${plan.gold} gold · +${plan.cores} cores`);
    return true;
  }
  if (action === 'build' && Object.hasOwn(BUILDS, arg)) {
    s.build = arg;
    recalculate(s);
    say(s, BUILDS[arg].name + ' selected');
    return true;
  }
  if (action === 'mastery' && p.sp > 0 && s.mastery < 10) {
    p.sp--;
    s.mastery++;
    recalculate(s);
    say(s, `Hammer mastery ${s.mastery} · Attack +2.5% · Holy damage +1.5%`);
    return true;
  }
  if (action === 'forge') {
    const item = p.equipment[arg],
      cost = item ? 80 * Math.pow(item.stars + 1, 2) : Infinity;
    if (!item || item.stars >= 10 || p.gold < cost || s.starCores < 1) return false;
    p.gold -= cost;
    s.starCores--;
    item.stars++;
    recalculate(s);
    say(s, `${item.name} → ★${item.stars}`);
    return true;
  }
  if (action === 'shop') {
    if (p.gold < 45 || p.tonics >= 99) return false;
    p.gold -= 45;
    p.tonics++;
    say(s, 'Crimson tonic added');
    return true;
  }
  if (action === 'potion') {
    if (p.tonics <= 0 || p.potionCooldown > 0 || p.hp >= p.maxHp || p.deadTimer) return false;
    p.tonics--;
    p.potionCooldown = 8;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.4);
    p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.25);
    number(s, center(p), p.y, 'RESTORED', '#89ffbd');
    return true;
  }
  if (action === 'auto') {
    s.autoBattle = !s.autoBattle;
    say(s, s.autoBattle ? 'AUTO · hunts on your current platform' : 'Manual controls');
    return true;
  }
  return false;
}
function interact(s) {
  const p = s.player;
  if (p.portalCooldown > 0) return;
  const portal = s.world.portals.find(
    (t) => Math.abs(center(p) - t.x) < 75 && Math.abs(p.y + p.h - t.y) < 65,
  );
  if (portal) {
    chapterAction(s, 'travel', portal.target);
    return;
  }
  if (
    s.world.beacon &&
    !s.beaconLit &&
    Math.hypot(center(p) - s.world.beacon.x, p.y + p.h - s.world.beacon.y) < 90
  ) {
    s.beaconLit = true;
    say(s, 'The Last Bell sings again');
    if (s.questIndex === 1) completeQuest(s);
    return;
  }
  if (s.world.npc && Math.abs(center(p) - s.world.npc.x) < 110) {
    s.dialogue = true;
    say(s, QUESTS[Math.min(2, s.questIndex)].text);
  } else say(s, 'Stand beside a portal, Rowan or the Last Bell to interact.');
}
function completeQuest(s) {
  const q = s.questIndex;
  if (q >= QUESTS.length) return;
  s.questIndex++;
  s.questProgress = 0;
  const p = s.player;
  if (q === 0) {
    p.gold += 140;
    gain(s, 90);
    p.inventory.push(
      rollGear(Math.floor(rand(s) * 4294967295), 'weapon', 'rare', Math.min(p.level, 3)),
    );
  }
  if (q === 1) {
    gain(s, 180);
    p.inventory.push(rollGear(Math.floor(rand(s) * 4294967295), 'cape', 'epic', p.level));
  }
  if (q === 2) {
    gain(s, 600);
    p.gold += 500;
  }
  say(s, `Quest complete · ${QUESTS[q].name} · ${QUESTS[q].reward}`);
  if ((s.questIndex === 1 && s.beaconLit) || (s.questIndex === 2 && s.bossDefeated))
    completeQuest(s);
}
function reward(s, e) {
  if (e.rewarded) return;
  e.rewarded = true;
  e.deathTimer = 0.55;
  e.respawnTimer = e.isBoss ? 120 : e.isElite ? 90 : 12;
  s.kills++;
  gain(s, e.exp);
  if (s.questIndex === 0 && s.mapId === 'fields' && !e.isElite) {
    s.questProgress++;
    if (s.questProgress >= 8) completeQuest(s);
  }
  const roll = rand(s),
    shouldDrop = e.isElite || e.isBoss || roll < 0.32;
  s.drops.push({
    id: 'coin-' + s.kills,
    x: center(e),
    y: e.y + e.h - 15,
    type: 'gold',
    amount: e.isBoss ? 300 : e.isElite ? 65 : 7 + s.world.rank * 5,
    life: 90,
  });
  if (shouldDrop) {
    const types = {
      slime: ['boots', 'cape'],
      mushroom: ['hat', 'gloves'],
      boar: ['weapon', 'armor'],
      wisp: ['cape', 'weapon'],
      guardian: ['weapon'],
    };
    const pool = types[e.type] || SLOTS;
    const rarity = e.isBoss
      ? rand(s) < 0.08
        ? 'mythic'
        : 'unique'
      : e.isElite
        ? 'epic'
        : roll < 0.015
          ? 'unique'
          : roll < 0.1
            ? 'epic'
            : roll < 0.24
              ? 'rare'
              : 'normal';
    const item = rollGear(
      Math.floor(rand(s) * 4294967295),
      pool[Math.floor(rand(s) * pool.length)],
      rarity,
      Math.max(1, Math.min(pLevel(s), s.world.rank * 2)),
    );
    s.drops.push({
      id: item.id,
      x: center(e) + 25,
      y: e.y + e.h - 10,
      type: 'gear',
      item,
      life: 120,
    });
  }
  if (e.isBoss) {
    s.bossDefeated = true;
    if (s.questIndex === 2) completeQuest(s);
    say(s, 'Aurel’s vow is restored · Sanctuary cleared');
  }
}
const pLevel = (s) => s.player.level;
function hit(s, action, mult, range) {
  const p = s.player;
  for (const e of s.enemies) {
    if (e.hp <= 0 || e.rewarded) continue;
    const dx = center(e) - center(p),
      dy = e.y + e.h - (p.y + p.h);
    const radial = action.slot >= 2;
    if (Math.abs(dy) > 120 || Math.abs(dx) > range || (!radial && dx * action.facing < -e.w * 0.25))
      continue;
    const critical = rand(s) < p.critRate;
    const amount = Math.max(
      1,
      Math.round(
        p.attack *
          mult *
          (action.kind === 'skill' ? p.skillDamageMultiplier : 1) *
          (critical ? p.critDamage : 1) *
          (0.95 + rand(s) * 0.1),
      ),
    );
    e.hp = Math.max(0, e.hp - amount);
    e.hitTimer = 0.25;
    e.stun = 0.18;
    e.x = clamp(e.x + action.facing * (e.isBoss ? 0 : 16), e.homeMin, e.homeMax - e.w);
    number(s, center(e), e.y - 10, amount, critical ? '#fff3a9' : '#ffd16a');
    s.numbers.at(-1).critical = critical;
    fx(s, 'skill-impact', center(e), e.y + e.h * 0.4, {
      style: action.kind === 'attack' ? 'attack' : 'holy',
      life: 0.35,
      maxLife: 0.35,
    });
    if (e.hp <= 0) reward(s, e);
  }
}
function damage(s, amount, fromX) {
  const p = s.player;
  if (p.invuln > 0 || p.deadTimer) return;
  const forward = (fromX - center(p)) * p.facing > 0,
    block = (p.guarding && forward) || p.action?.slot === 1;
  const reduction = block ? (s.build === 'bulwark' ? 0.78 : 0.62) : 0;
  const n = Math.max(1, Math.round((amount - p.defense * 0.32) * (1 - reduction)));
  p.hp = Math.max(0, p.hp - n);
  p.invuln = block ? 0.25 : 0.65;
  if (!block) {
    p.vx += (center(p) > fromX ? 1 : -1) * 100;
  }
  number(s, center(p), p.y - 10, block ? 'BLOCK ' + n : '−' + n, block ? '#aee7ff' : '#ff8f89');
  if (p.hp <= 0) {
    p.deadTimer = 2;
    p.buffRemaining = 0;
    recalculate(s);
    p.action = null;
    s.autoBattle = false;
    s.deaths++;
    say(s, 'Pip is taking you home. Your equipment is safe.');
  }
}
function begin(s, kind, slot = -1) {
  const p = s.player,
    def = SKILLS[slot];
  if (p.action) return false;
  if (
    kind === 'skill' &&
    (p.level < def.level || p.skillCooldowns[slot] > 0 || p.mp < def.mp || p.climbing)
  )
    return false;
  if (kind === 'skill') {
    p.mp -= def.mp;
    p.skillCooldowns[slot] = def.cd;
  }
  const combo = p.comboTimer > 0 ? (p.combo % 3) + 1 : 1;
  p.combo = combo;
  p.comboTimer = 1.3;
  p.action = {
    kind,
    slot,
    elapsed: 0,
    nextHit: 0,
    facing: p.facing,
    combo,
    duration: kind === 'skill' ? def.duration : 0.32 / p.attackSpeed,
  };
  p.attackAnimation = kind === 'attack' ? 0.32 : 0;
  p.skillAnimation = kind === 'skill' ? def.duration : 0;
  p.skillTimer = p.skillAnimation;
  p.attackTimer = 0.32 / p.attackSpeed;
  return true;
}
function advanceAction(s, dt) {
  const p = s.player,
    a = p.action;
  if (!a) return;
  a.elapsed += dt;
  const def = SKILLS[a.slot],
    times = a.kind === 'skill' ? def.hits : [0.09 / p.attackSpeed];
  while (a.nextHit < times.length && a.elapsed >= times[a.nextHit]) {
    const mult = a.kind === 'skill' ? def.damage : 1 + (a.combo - 1) * 0.14,
      range = a.kind === 'skill' ? def.range : 112;
    hit(s, a, mult, range);
    fx(s, 'chapter-holy', center(p) + a.facing * 35, p.y + p.h * 0.4, {
      slot: a.slot,
      combo: a.combo,
      life: a.slot === 3 ? 0.7 : 0.48,
      maxLife: a.slot === 3 ? 0.7 : 0.48,
      range,
      facing: a.facing,
    });
    if (a.slot === 1) {
      p.dashTime = 0.18;
      p.vx = a.facing * 580;
    }
    a.nextHit++;
  }
  if (a.elapsed >= a.duration) p.action = null;
}
function movement(s, input, dt) {
  const p = s.player,
    ground = s.world.ground;
  p.jumpBuffer = input.jump ? 0.12 : Math.max(0, p.jumpBuffer - dt);
  p.coyote = p.grounded ? 0.09 : Math.max(0, p.coyote - dt);
  p.airTime = p.grounded ? 0 : p.airTime + dt;
  if (p.climbing) {
    const rope = s.world.ropes.find((r) => r.id === p.climbing);
    if (!rope || input.jump || input.left || input.right) {
      p.climbing = null;
      p.ropeCooldown = 0.25;
      if (input.jump) {
        p.vy = -670;
        p.jumpBuffer = 0;
      }
    } else {
      p.vy = 0;
      p.vx = 0;
      p.y += (Number(!!input.down) - Number(!!input.up)) * 205 * dt;
      if (p.y + p.h <= rope.y1) {
        const top = s.world.platforms.find(
          (f) => Math.abs(f.y - rope.y1) < 2 && rope.x >= f.x && rope.x <= f.x + f.w,
        );
        p.climbing = null;
        p.ropeCooldown = 0.35;
        if (top) {
          p.y = top.y - p.h;
          p.platformId = top.id;
          p.grounded = true;
        }
      } else if (p.y + p.h >= rope.y2) {
        const bottom = s.world.platforms.find(
          (f) => Math.abs(f.y - rope.y2) < 2 && rope.x >= f.x && rope.x <= f.x + f.w,
        );
        p.climbing = null;
        p.ropeCooldown = 0.35;
        p.y = rope.y2 - p.h;
        if (bottom) {
          p.platformId = bottom.id;
          p.grounded = true;
        }
      }
      return;
    }
  }
  if ((input.up || input.down) && p.ropeCooldown <= 0 && !p.action) {
    const rope = s.world.ropes.find(
      (r) =>
        Math.abs(center(p) - r.x) < 19 &&
        p.y + p.h >= r.y1 - 5 &&
        p.y + p.h <= r.y2 + 5 &&
        ((input.up && p.y + p.h > r.y1 + 4) || (input.down && p.y + p.h < r.y2 - 4)),
    );
    if (rope) {
      p.climbing = rope.id;
      p.x = rope.x - p.w / 2;
      p.grounded = false;
      p.platformId = null;
      return;
    }
  }
  const dir = Number(!!input.right) - Number(!!input.left);
  p.guarding = !!input.guard && p.grounded && !p.action;
  const a = p.action,
    lock = a && a.elapsed < (a.kind === 'skill' ? SKILLS[a.slot].windup : 0.09 / p.attackSpeed);
  if (dir && !lock) p.facing = dir;
  const desired = p.guarding ? 0 : dir * 285 * (lock ? 0.45 : 1);
  p.vx += (desired - p.vx) * Math.min(1, dt * (dir ? 55 : 42));
  if (p.dashTime > 0) p.vx = (a?.facing || p.facing) * 580;
  if (p.jumpBuffer > 0 && (p.grounded || p.coyote > 0)) {
    if (input.down && p.platformId !== 'ground') {
      p.dropPlatformId = p.platformId;
      p.dropTimer = 0.3;
      p.y += 4;
      p.vy = 40;
    } else p.vy = -760;
    p.grounded = false;
    p.platformId = null;
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.airAdvanceUsed = false;
    if (a?.nextHit > 0) p.action = null;
  } else if (input.jump && !p.grounded && p.airTime > 0.1 && !p.airAdvanceUsed) {
    p.airAdvanceUsed = true;
    p.dashTime = 0.2;
    p.vy = -220;
    fx(s, 'chapter-holy', center(p) - p.facing * 20, p.y + 35, {
      slot: 1,
      life: 0.3,
      maxLife: 0.3,
    });
  }
  const before = p.y + p.h;
  p.x = clamp(p.x + p.vx * dt, 12, s.world.width - p.w - 12);
  const old = s.world.platforms.find((f) => f.id === p.platformId);
  if (p.grounded && old && p.x + p.w > old.x && p.x < old.x + old.w) {
    p.y = old.y - p.h;
    p.vy = 0;
  } else {
    p.grounded = false;
    p.platformId = null;
    p.vy += 1950 * dt;
    p.y += p.vy * dt;
    if (p.vy >= 0) {
      const landing = s.world.platforms
        .filter(
          (f) =>
            f.id !== p.dropPlatformId &&
            p.x + p.w > f.x + 2 &&
            p.x < f.x + f.w - 2 &&
            before <= f.y + 0.5 &&
            p.y + p.h >= f.y,
        )
        .sort((a, b) => a.y - b.y)[0];
      if (landing) {
        p.y = landing.y - p.h;
        p.vy = 0;
        p.grounded = true;
        p.platformId = landing.id;
        p.airAdvanceUsed = false;
      }
    }
  }
  if (p.y > ground + 200) {
    p.y = ground - p.h;
    p.vy = 0;
    p.grounded = true;
    p.platformId = 'ground';
    damage(s, 30, center(p) - 100);
  }
}
function enemies(s, dt) {
  const p = s.player;
  for (const e of s.enemies) {
    e.hitTimer = Math.max(0, e.hitTimer - dt);
    e.stun = Math.max(0, (e.stun || 0) - dt);
    e.attackTimer = Math.max(0, e.attackTimer - dt);
    if (e.hp <= 0) {
      e.deathTimer = Math.max(0, e.deathTimer - dt);
      e.respawnTimer -= dt;
      if (e.respawnTimer <= 0 && !e.isBoss) {
        e.hp = e.maxHp;
        e.rewarded = false;
        e.x = e.spawnX;
      }
      continue;
    }
    if (e.isBoss) {
      e.bossCooldown -= dt;
      if (e.bossCooldown <= 0 && !e.telegraph) {
        e.pattern = ((e.pattern || 0) + 1) % 2;
        e.targetX = center(p);
        e.telegraph = 1.15;
        e.attackPhase = e.pattern ? 'pillars' : 'shockwave';
        fx(s, 'chapter-warning', e.pattern ? e.targetX : center(e), s.world.ground, {
          radius: e.pattern ? 75 : 280,
          vertical: !!e.pattern,
          life: 1.15,
          maxLife: 1.15,
        });
      }
      if (e.telegraph > 0) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          const x = e.pattern ? e.targetX : center(e),
            radius = e.pattern ? 75 : 280;
          fx(s, 'chapter-smite', x, s.world.ground, {
            radius,
            vertical: !!e.pattern,
            life: 0.45,
            maxLife: 0.45,
          });
          if (Math.abs(center(p) - x) < radius && (e.pattern || p.y + p.h > s.world.ground - 65))
            damage(s, e.damage * (e.hp < e.maxHp * 0.4 ? 1.3 : 1), x);
          e.bossCooldown = e.hp < e.maxHp * 0.4 ? 1.4 : 2.5;
          e.attackPhase = 'idle';
        }
      }
      continue;
    }
    if (!e.stun) {
      e.x += e.vx * dt;
      if (e.x < e.homeMin) {
        e.x = e.homeMin;
        e.vx = Math.abs(e.vx);
      }
      if (e.x + e.w > e.homeMax) {
        e.x = e.homeMax - e.w;
        e.vx = -Math.abs(e.vx);
      }
      e.facing = Math.sign(e.vx);
    }
    const dx = center(e) - center(p),
      dy = e.y + e.h - p.y - p.h;
    if (Math.abs(dx) < (e.w + p.w) * 0.45 && Math.abs(dy) < 50 && e.attackTimer <= 0) {
      damage(s, e.damage, center(e));
      e.attackTimer = 1.25;
    }
    if (e.type === 'wisp' && Math.abs(dx) < 320 && Math.abs(dy) < 80 && e.attackTimer <= 0) {
      fx(s, 'chapter-warning', center(p), p.y + p.h, {
        radius: 45,
        life: 0.65,
        maxLife: 0.65,
        enemyDamage: e.damage,
      });
      e.attackTimer = 2.6;
    }
  }
}
function collect(s, dt) {
  const p = s.player,
    pet = s.pet;
  pet.healCooldown = Math.max(0, pet.healCooldown - dt);
  pet.healFlash = Math.max(0, pet.healFlash - dt);
  const nearby = s.drops
    .filter((d) => Math.hypot(d.x - center(p), d.y - p.y - p.h) < 380)
    .sort((a, b) => Math.abs(a.x - center(p)) - Math.abs(b.x - center(p)));
  const target = nearby[0];
  pet.mode = target ? 'looting' : 'following';
  const tx = target ? target.x : center(p) - p.facing * 55,
    ty = target ? target.y - 15 : p.y + 18;
  pet.x += (tx - pet.x) * Math.min(1, dt * 7);
  pet.y += (ty - pet.y) * Math.min(1, dt * 7);
  if (p.hp < p.maxHp * 0.55 && pet.healCooldown <= 0) {
    const amount = Math.round(p.maxHp * 0.1);
    p.hp = Math.min(p.maxHp, p.hp + amount);
    pet.healCooldown = 35;
    pet.healFlash = 1;
    number(s, center(p), p.y, 'PIP +' + amount, '#a0ffc7');
  }
  for (const d of s.drops) {
    d.life -= dt;
    if (
      Math.hypot(d.x - center(p), d.y - (p.y + p.h - 15)) > 65 &&
      Math.hypot(d.x - pet.x, d.y - pet.y) > 35
    )
      continue;
    if (d.type === 'gold') {
      p.gold += d.amount;
      number(s, d.x, d.y - 20, '+' + d.amount + 'g', '#ffd24a');
      d.life = 0;
    } else if (p.inventory.length < 72) {
      p.inventory.push(d.item);
      number(
        s,
        d.x,
        d.y - 20,
        RARITIES[d.item.rarity].name + ' ' + d.item.type,
        RARITIES[d.item.rarity].color,
      );
      say(s, `${d.item.name} · ${RARITIES[d.item.rarity].name} · check Bag`);
      d.life = 0;
    }
  }
  s.drops = s.drops.filter((d) => d.life > 0);
}
export function updateChapter(s, input = {}, dt = 1 / 120) {
  if (s.paused || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.1);
  s.time += dt;
  const p = s.player;
  for (const k of [
    'invuln',
    'portalCooldown',
    'ropeCooldown',
    'dropTimer',
    'dashTime',
    'comboTimer',
    'potionCooldown',
    'attackTimer',
    'attackAnimation',
    'skillAnimation',
    'skillTimer',
    'buffCooldown',
  ])
    p[k] = Math.max(0, (p[k] || 0) - dt);
  for (let i = 0; i < p.skillCooldowns.length; i++)
    p.skillCooldowns[i] = Math.max(0, p.skillCooldowns[i] - dt);
  if (!p.dropTimer) p.dropPlatformId = null;
  s.noticeTimer = Math.max(0, s.noticeTimer - dt);
  if (p.buffRemaining > 0) {
    p.buffRemaining = Math.max(0, p.buffRemaining - dt);
    if (!p.buffRemaining) recalculate(s);
  }
  for (const e of s.effects) {
    e.life -= dt;
    if (e.enemyDamage && e.life <= 0 && Math.abs(center(p) - e.x) < e.radius)
      damage(s, e.enemyDamage, e.x);
  }
  s.effects = s.effects.filter((e) => e.life > 0);
  for (const n of s.numbers) n.life -= dt;
  s.numbers = s.numbers.filter((n) => n.life > 0);
  if (p.deadTimer > 0) {
    p.deadTimer -= dt;
    if (p.deadTimer <= 0) {
      setMap(s, 'hollow');
      recalculate(s, true);
    }
    return;
  }
  for (let i = 0; i < 4; i++) {
    const key = i ? 'skill' + (i + 1) : 'skill';
    if (input[key]) s.bufferedSkill = { slot: i, remaining: 0.25 };
  }
  if (s.bufferedSkill) {
    s.bufferedSkill.remaining -= dt;
    if (s.bufferedSkill.remaining <= 0) s.bufferedSkill = null;
  }
  let controls = { ...input };
  if (s.autoBattle && !input.left && !input.right && !input.jump && !input.up && !input.down) {
    bestSilent(s);
    const target = s.enemies
      .filter((e) => e.hp > 0 && e.platformId === p.platformId)
      .sort((a, b) => Math.abs(center(a) - center(p)) - Math.abs(center(b) - center(p)))[0];
    if (target) {
      const delta = center(target) - center(p);
      if (p.hp < p.maxHp * 0.3 && p.potionCooldown > 0) {
        controls.left = delta > 0;
        controls.right = delta < 0;
        controls.guard = Math.abs(delta) < 100;
      } else {
        controls.left = delta < -88;
        controls.right = delta > 88;
        controls.attack = Math.abs(delta) < 120;
        controls.skill = Math.abs(delta) < 170;
        controls.buff = true;
      }
      if (p.hp < p.maxHp * 0.45) chapterAction(s, 'potion');
    }
  }
  movement(s, controls, dt);
  if (controls.buff && p.buffCooldown <= 0 && p.mp >= 12 && p.level >= 3) {
    p.mp -= 12;
    p.buffRemaining = 12;
    p.buffCooldown = 40;
    recalculate(s);
    say(s, 'Lantern Vow · +10% attack · +25% defense · 12s');
  }
  if (!p.climbing && !p.guarding) {
    if (s.bufferedSkill && !p.action && begin(s, 'skill', s.bufferedSkill.slot))
      s.bufferedSkill = null;
    for (let i = 0; i < 4; i++) if (controls[i ? 'skill' + (i + 1) : 'skill']) begin(s, 'skill', i);
    if (controls.attack) begin(s, 'attack');
  }
  advanceAction(s, dt);
  enemies(s, dt);
  collect(s, dt);
  p.mp = Math.min(p.maxMp, p.mp + dt * (s.mapId === 'hollow' ? 8 : 1.7));
  if (s.mapId === 'hollow') p.hp = Math.min(p.maxHp, p.hp + dt * 18);
  if (controls.interact) interact(s);
  if (
    s.mapId === 'rise' &&
    s.questIndex === 1 &&
    !s.beaconLit &&
    Math.hypot(center(p) - s.world.beacon.x, p.y + p.h - s.world.beacon.y) < 65
  ) {
    s.beaconLit = true;
    completeQuest(s);
  }
}
function bestSilent(s) {
  if (s.time - (s.lastAutoEquip || 0) < 2) return;
  s.lastAutoEquip = s.time;
  const text = s.notice,
    timer = s.noticeTimer;
  best(s);
  s.notice = text;
  s.noticeTimer = timer;
}
