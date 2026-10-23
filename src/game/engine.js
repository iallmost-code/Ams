import {
  BUFFS,
  BUFF_DURATION,
  BUFF_COOLDOWN,
  BUFF_LEVEL,
  BUFF_MP,
  growthStats,
  combatPower,
  lootRarity,
  RARITIES,
} from './rpg.js';
import { gearScore, areaReadiness } from './auto.js';
export { areaReadiness } from './auto.js';
import { normalizeDaily, refreshDailyBounties, getDailyView, recordDailyDefeat } from './daily.js';
export { refreshDailyBounties, getDailyView } from './daily.js';
import {
  STORY_QUESTS,
  createStory,
  getStoryView,
  normalizeStoryProgress,
  matchesQuestEnemy,
  recordStoryEvent,
} from './quests.js';
export { getStoryView } from './quests.js';
import {
  xpThreshold,
  enemyXp,
  enemyGold,
  forgeCost,
  upgradeCost,
  upgradeLimit,
  PIP_HEAL_FRACTION,
  PIP_HEAL_COOLDOWN,
  POTION_PRICE,
  POTION_COOLDOWN,
} from './balance.js';
export { forgeCost, upgradeCost, POTION_PRICE } from './balance.js';
import {
  createWorld,
  createEnemies,
  GRAVITY,
  JUMP_SPEED,
  MOVE_SPEED,
  CLIMB_SPEED,
} from './world.js';
import { buildNavigationGraph, findRoute } from './navigation.js';

const SLOTS = ['weapon', 'hat', 'armor', 'cape', 'gloves', 'boots'];
const SKINS = ['amber', 'sakura', 'frost', 'cyber', 'solar'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);
const copy = (o) => JSON.parse(JSON.stringify(o));
const center = (e) => e.x + e.w / 2;
const CLASS_DEFS = [
  {
    id: 'vanguard',
    name: 'Vanguard',
    title: 'Dawnsteel Sentinel',
    icon: '⚔',
    color: '#efbd68',
    attack: 22,
    defense: 7,
    hp: 180,
    mp: 75,
    range: 100,
    description: 'Stalwart blade fighter with sweeping close-range strikes.',
  },
  {
    id: 'arcanist',
    name: 'Arcanist',
    title: 'Starlight Scholar',
    icon: '✦',
    color: '#a899ff',
    attack: 25,
    defense: 3,
    hp: 135,
    mp: 135,
    range: 245,
    description: 'Aether spells strike across the battlefield.',
  },
  {
    id: 'nightblade',
    name: 'Nightblade',
    title: 'Moonveil Dancer',
    icon: '☾',
    color: '#f29fc9',
    attack: 26,
    defense: 4,
    hp: 145,
    mp: 95,
    range: 120,
    description: 'Swift daggers and piercing shadow arts.',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    title: 'Wildwood Warden',
    icon: '➶',
    color: '#83d8a9',
    attack: 23,
    defense: 5,
    hp: 155,
    mp: 105,
    range: 320,
    description: 'Precise arrows and woodland magic.',
  },
];
const SKILL_NAMES = {
  vanguard: ['Crescent Cleave', 'Iron Tempest', 'Dawn Bastion', 'Solar Rupture'],
  arcanist: ['Aether Bolt', 'Frost Bloom', 'Astral Nova', 'Meteor Choir'],
  nightblade: ['Shadow Fan', 'Moonstep Flurry', 'Umbral Spiral', 'Eclipse Requiem'],
  ranger: ['Piercing Arrow', 'Gale Volley', 'Thornstorm', 'Celestial Hunt'],
};
function definitions(id) {
  const c = CLASS_DEFS.find((c) => c.id === id);
  return SKILL_NAMES[id].map((name, i) => ({
    name,
    mp: [12, 20, 32, 45][i],
    cd: [4.5, 8, 12, 45][i],
    hits: [3, 5, 7, 12][i],
    ultimate: i === 3,
    reqLv: [1, 1, 10, 25][i],
    range: c.range + [70, 110, 150, 220][i],
    damage: [1.85, 2.7, 3.8, 10][i],
    style: ['slash', 'burst', 'nova', 'ultimate'][i],
    description: `${name} deals ${[185, 270, 380, 1000][i]}% total attack across ${[3, 5, 7, 12][i]} hits${i > 1 ? ' in an aether burst' : '.'}`,
  }));
}
function recalculate(s, heal = false) {
  const p = s.player,
    c = CLASS_DEFS.find((c) => c.id === s.classId),
    oldHp = p.maxHp || c.hp,
    oldMp = p.maxMp || c.mp;
  const growth = growthStats(s.classId, p.level);
  p.attributes = growth.attributes;
  p.mainAttribute = growth.main;
  let attack = c.attack + growth.attackGrowth,
    defense = c.defense + (p.level - 1) * 2;
  for (const item of Object.values(p.equipment)) {
    if (!item) continue;
    attack += (item.attack || 0) * (1 + (item.stars || 0) * 0.12);
    defense += (item.defense || 0) * (1 + (item.stars || 0) * 0.12);
  }
  const buff = p.buffRemaining > 0 ? BUFFS[s.classId] : {};
  p.baseAttack = Math.round(attack + (s.upgrades?.mastery || 0) * 4);
  p.baseDefense = Math.round(defense);
  p.attack = Math.round(p.baseAttack * (buff.attack || 1));
  p.defense = Math.round(defense * (buff.defense || 1));
  p.critRate = Math.min(0.35, 0.05 + (p.attributes.LUK - 4) * 0.001) + (buff.crit || 0);
  p.critDamage = 1.5;
  p.manaCostMultiplier = buff.mana || 1;
  p.maxHp = c.hp + (p.level - 1) * 28 + (s.upgrades?.vitality || 0) * 25;
  p.maxMp = c.mp + (p.level - 1) * 7;
  p.combatPower = combatPower(p);
  p.attackRange = c.range;
  p.hp = heal ? p.maxHp : clamp(p.hp + (p.maxHp - oldHp), 0, p.maxHp);
  p.mp = heal ? p.maxMp : clamp(p.mp + (p.maxMp - oldMp), 0, p.maxMp);
  p.xpToNext = xpThreshold(p.level);
  p.statLevel = p.level;
  s.skillDefinitions = definitions(s.classId);
}
function notice(s, message) {
  s.notice = message;
  s.noticeTimer = 3.5;
}
function floating(s, x, y, text, color = '#ffe2a2') {
  s.numbers.push({ x, y, text: String(text), color, life: 1, maxLife: 1 });
}
function effect(s, type, x, y, extra = {}) {
  s.effects.push({
    type,
    x,
    y,
    facing: s.player.facing,
    life: 0.3,
    maxLife: 0.3,
    combo: s.player.combo,
    ...extra,
  });
}
function random(s) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function unlock(s) {
  for (const a of s.world.areas)
    if (s.player.level >= a.minLevel && !s.unlockedAreas.includes(a.id)) {
      s.unlockedAreas.push(a.id);
      notice(s, `${a.name} unlocked`);
    }
}
function advance(s) {
  const p = s.player;
  while (p.level < 200 && p.xp >= xpThreshold(p.level)) {
    p.xp -= xpThreshold(p.level);
    p.level++;
    s.sp += 2;
    recalculate(s, true);
    floating(s, center(p), p.y - 30, `LEVEL ${p.level}!`, '#9ff2c8');
    effect(s, 'levelup', center(p), p.y, { life: 1, maxLife: 1 });
    notice(s, `Level ${p.level} · +4 ATK · +2 DEF · +28 HP · +2 skill points`);
    s.levelUpSummary = { level: p.level, attack: 4, defense: 2, hp: 28, mp: 7, remaining: 5 };
  }
  unlock(s);
}
export function createGame(progress = null, now = new Date()) {
  const world = createWorld(),
    saved = progress && typeof progress === 'object' ? progress : {};
  const equipment = {
    weapon: {
      id: 'starter-sword',
      name: 'Dawnwood Sword',
      type: 'weapon',
      rarity: 'normal',
      icon: '⚔',
      count: 1,
      attack: 9,
      stars: 0,
    },
    hat: null,
    armor: {
      id: 'starter-armor',
      name: 'Wayfarer Tunic',
      type: 'armor',
      rarity: 'normal',
      icon: '♜',
      count: 1,
      defense: 5,
      stars: 0,
    },
    cape: null,
    gloves: null,
    boots: null,
  };
  if (saved.equipment && typeof saved.equipment === 'object')
    for (const slot of SLOTS)
      if (Object.hasOwn(saved.equipment, slot)) {
        const i = saved.equipment[slot];
        if (i === null || (i && i.type === slot)) equipment[slot] = copy(i);
      }
  const player = {
    x: 170,
    y: 760,
    w: 38,
    h: 60,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    platformId: 'ground',
    climbing: null,
    hp: 180,
    maxHp: 180,
    mp: 75,
    maxMp: 75,
    level: clamp(Math.floor(finite(saved.player?.level, 1)), 1, 200),
    xp: clamp(finite(saved.player?.xp), 0, 1e9),
    xpToNext: 89,
    gold: clamp(finite(saved.player?.gold, 300), 0, 1e9),
    attack: 31,
    defense: 12,
    equipment,
    inventory: Array.isArray(saved.inventory)
      ? copy(saved.inventory)
      : [
          {
            id: 'glade-sabre',
            name: 'Glade Sabre',
            type: 'weapon',
            rarity: 'rare',
            icon: '⚔',
            count: 1,
            attack: 15,
            stars: 0,
          },
          {
            id: 'health-potion',
            name: 'Crimson Tonic',
            type: 'potion',
            rarity: 'normal',
            icon: '♥',
            count: 3,
          },
        ],
    potionCooldown: 0,
    attackTimer: 0,
    attackAnimation: 0,
    skillTimer: 0,
    skillAnimation: 0,
    buffRemaining: 0,
    buffCooldown: 0,
    skillCooldowns: [0, 0, 0, 0],
    combo: 0,
    comboTimer: 0,
    invuln: 0,
    deadTimer: 0,
    dropTimer: 0,
    dropPlatformId: null,
    ropeCooldown: 0,
    knockbackVx: 0,
    knockbackTimer: 0,
  };
  const s = {
    saveVersion: 4,
    deaths: Math.max(0, Math.floor(finite(saved.player?.deaths))),
    upgrades: {
      vitality: clamp(Math.floor(finite(saved.upgrades?.vitality)), 0, 10),
      mastery: clamp(Math.floor(finite(saved.upgrades?.mastery)), 0, 10),
    },
    absence: saved.absence || null,
    offlineSummary: null,
    world,
    areas: world.areas,
    player,
    pet: {
      name: 'Pip',
      x: 120,
      y: 760,
      healCooldown: 0,
      healFlash: 0,
      targetId: null,
      mode: 'following',
    },
    enemies: createEnemies(world),
    drops: [],
    particles: [],
    numbers: [],
    effects: [],
    time: 0,
    auto: false,
    paused: false,
    kills: 0,
    story: createStory(saved.story),
    daily: normalizeDaily(saved.daily),
    dialogueNpcId: null,
    quest: {
      kills: 0,
      target: 10,
      completed: false,
      claimed: false,
      ...saved.quest,
    },
    unlockedAreas: ['emerald_glade'],
    notice: 'Welcome to Emerald Glade',
    noticeTimer: 4,
    settings: {
      sound: true,
      particles: true,
      minimapCollapsed: true,
      reducedMotion: false,
      ...saved.settings,
    },
    classId: CLASS_DEFS.some((c) => c.id === saved.classId) ? saved.classId : 'vanguard',
    classes: copy(CLASS_DEFS),
    damageSkin: SKINS.includes(saved.damageSkin) ? saved.damageSkin : 'amber',
    starCores: clamp(Math.floor(finite(saved.starCores, 5)), 0, 1e9),
    sp: clamp(Math.floor(finite(saved.sp)), 0, 1e9),
    skillLevels: Array.from({ length: 4 }, (_, i) =>
      clamp(Math.floor(finite(saved.skillLevels?.[i], 1)), 1, 30),
    ),
    currentArea: 'emerald_glade',
    seed: 16281,
    nextId: 1,
    autoOverride: 0,
    autoTarget: null,
    autoNavigation: { lastX: 170, lastY: 760, stuck: 0, edge: null },
    previousInput: {},
    navigation: buildNavigationGraph(world),
  };
  s.nextId =
    1 +
    Math.max(
      0,
      ...[...player.inventory, ...Object.values(equipment)]
        .filter(Boolean)
        .map((i) => Number(/^(?:loot|drop)-(\d+)$/.exec(i.id)?.[1] || 0)),
    );
  refreshDailyBounties(s, now);
  prepareStoryEncounter(s);
  recalculate(s, true);
  unlock(s);
  if (saved.currentArea && s.unlockedAreas.includes(saved.currentArea))
    travelToArea(s, saved.currentArea);
  return s;
}
export function toggleAuto(s) {
  s.story.autoQuest = false;
  s.story.status = 'idle';
  s.autoEquipTimer = 0;
  s.autoStatus = '';
  s.autoRecovering = false;
  s.auto = !s.auto;
  s.autoTarget = null;
  s.autoNavigation.edge = null;
  notice(s, s.auto ? 'AUTO exploration enabled' : 'Manual adventure');
  return s.auto;
}
export function equipBestGear(s) {
  const best = { ...s.player.equipment };
  for (const item of s.player.inventory)
    if (SLOTS.includes(item.type) && gearScore(item) > gearScore(best[item.type]))
      best[item.type] = item;
  const upgraded = [];
  for (const slot of SLOTS)
    if (best[slot] && best[slot] !== s.player.equipment[slot] && equipItem(s, best[slot].id))
      upgraded.push(slot);
  return upgraded;
}
function autoSurvivalInput(s) {
  const p = s.player;
  if (p.hp < p.maxHp * 0.45) usePotion(s);
  if (p.hp >= p.maxHp * 0.55) s.autoRecovering = false;
  if (p.hp < p.maxHp * 0.35) s.autoRecovering = true;
  if (!s.autoRecovering) return null;
  s.autoStatus = 'Recovering · keeping distance while tonics / Pip recharge';
  const input = {};
  if (p.climbing) return { down: true };
  // Ground patrols cannot enter the sheltered edge. Drop through one-way ledges
  // before returning there, rather than oscillating between nearby attackers.
  const area = s.world.areas.find((a) => a.id === s.currentArea),
    safeX = area.x + 110;
  if (Math.abs(center(p) - safeX) > 12) {
    input.left = center(p) > safeX;
    input.right = !input.left;
  }
  if (p.grounded && p.platformId && p.platformId !== 'ground') {
    input.down = true;
    input.jump = true;
  }
  return input;
}
export function equipItem(s, id) {
  const p = s.player,
    index = p.inventory.findIndex((i) => i.id === id);
  if (index < 0) return false;
  const item = p.inventory[index];
  if (!SLOTS.includes(item.type)) return false;
  p.inventory.splice(index, 1);
  const old = p.equipment[item.type];
  p.equipment[item.type] = item;
  if (old) p.inventory.push(old);
  recalculate(s);
  notice(s, `${item.name} equipped`);
  return true;
}
export function usePotion(s) {
  const p = s.player,
    item = p.inventory.find((i) => i.type === 'potion' && i.count > 0);
  if (!item || p.hp <= 0 || p.hp >= p.maxHp || p.potionCooldown > 0) return false;
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.45));
  p.potionCooldown = POTION_COOLDOWN;
  item.count--;
  if (!item.count) p.inventory.splice(p.inventory.indexOf(item), 1);
  floating(s, center(p), p.y, 'HEAL', '#9cf1be');
  return true;
}
export function buyPotion(s, quantity = 1) {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100 ||
    s.player.gold < POTION_PRICE * quantity
  )
    return false;
  let item = s.player.inventory.find((i) => i.id === 'health-potion' && i.type === 'potion');
  if (item && item.count + quantity > 9999) return false;
  s.player.gold -= POTION_PRICE * quantity;
  if (item) item.count += quantity;
  else
    s.player.inventory.push({
      id: 'health-potion',
      name: 'Crimson Tonic',
      type: 'potion',
      rarity: 'normal',
      icon: '♥',
      count: quantity,
    });
  notice(s, `Bought ${quantity} Crimson Tonic${quantity > 1 ? 's' : ''}`);
  return true;
}
export function buyUpgrade(s, type) {
  if (!['vitality', 'mastery'].includes(type)) return false;
  const rank = s.upgrades[type],
    cost = upgradeCost(rank);
  if (rank >= upgradeLimit || s.player.gold < cost) return false;
  s.player.gold -= cost;
  s.upgrades[type]++;
  recalculate(s);
  notice(s, `${type === 'vitality' ? 'Vitality' : 'Weapon mastery'} training improved`);
  return true;
}
function nearGiver(s, view = getStoryView(s)) {
  const n = view.npc,
    p = s.player;
  return (
    !!n && s.currentArea === view.quest.areaId && Math.hypot(center(p) - n.x, p.y + p.h - n.y) < 80
  );
}
function prepareStoryEncounter(s) {
  const view = getStoryView(s),
    q = view.quest;
  if (view.status !== 'active' || !q.objective.enemyId) return;
  const e = s.enemies.find((e) => e.id === q.objective.enemyId);
  if (!e || e.isElite) return;
  e.encounterBase = { maxHp: e.maxHp, damage: e.damage, level: e.level };
  Object.assign(e, {
    name: q.objective.enemyName,
    isElite: true,
    hp: 600,
    maxHp: 600,
    damage: 45,
    level: 8,
    respawnTimer: 0,
    rewarded: false,
    deathTimer: 0,
  });
}
function nearDailyGuide(s) {
  const guide = s.world.areas.find((a) => a.id === s.currentArea)?.npc,
    p = s.player;
  return !!guide && p.hp > 0 && Math.hypot(center(p) - guide.x, p.y + p.h - guide.y) < 80;
}
export function acceptDailyBounty(s, id, now = new Date()) {
  refreshDailyBounties(s, now);
  const view = getDailyView(s);
  if (view.status !== 'available' || !nearDailyGuide(s) || (id && id !== view.bounty.id))
    return false;
  s.daily.activeId = view.bounty.id;
  s.daily.progress = 0;
  notice(s, `Rowan’s daily: ${view.bounty.title}`);
  return true;
}
function grantTonics(s, count, source) {
  if (!count) return;
  const item = s.player.inventory.find((i) => i.type === 'potion' && i.count + count <= 9999);
  if (item) item.count += count;
  else
    s.player.inventory.push({
      id: `${source}-tonic`,
      name: 'Crimson Tonic',
      type: 'potion',
      rarity: 'normal',
      icon: '♥',
      count,
    });
}
export function claimDailyBounty(s, now = new Date()) {
  refreshDailyBounties(s, now);
  const view = getDailyView(s);
  if (view.status !== 'ready' || !nearDailyGuide(s)) return false;
  s.daily.claimed.push(view.bounty.id);
  s.daily.activeId = null;
  s.daily.progress = 0;
  const reward = view.rewards;
  s.player.gold += reward.gold;
  s.starCores += reward.cores;
  gainExperience(s, reward.xp);
  grantTonics(s, reward.tonics, `daily-${s.daily.day}-${view.bounty.id}`);
  notice(
    s,
    `Daily complete · +${reward.xp} XP · +${reward.cores} cores · +${reward.tonics} tonics`,
  );
  return true;
}
export function acceptStoryQuest(s, id) {
  const view = getStoryView(s);
  if (
    view.status !== 'available' ||
    view.quest.id !== id ||
    !nearGiver(s, view) ||
    s.player.hp <= 0
  )
    return false;
  s.story.activeId = id;
  prepareStoryEncounter(s);
  s.story.progress = 0;
  s.story.lastDialogue = view.quest.offer[0];
  notice(s, `${view.npc.name}: ${view.quest.title}`);
  return true;
}
export function turnInStoryQuest(s) {
  const view = getStoryView(s);
  if (view.status !== 'ready' || !nearGiver(s, view) || s.player.hp <= 0) return false;
  const q = view.quest,
    reward = q.rewards;
  s.story.completed.push(q.id);
  s.story.activeId = null;
  s.story.progress = 0;
  s.story.lastDialogue = q.thanks;
  s.player.gold += reward.gold;
  s.starCores += reward.cores || 0;
  gainExperience(s, reward.xp);
  grantTonics(s, reward.tonics, `story-${q.id}`);
  notice(s, `${q.title} complete · +${reward.gold} gold · +${reward.xp} XP`);
  return true;
}
export function toggleAutoQuest(s) {
  s.autoEquipTimer = 0;
  s.autoStatus = '';
  s.autoRecovering = false;
  s.story.autoQuest = !s.story.autoQuest;
  s.auto = s.story.autoQuest;
  s.story.status = s.story.autoQuest ? 'following' : 'idle';
  s.story.cooldown = 0;
  s.autoTarget = null;
  s.autoNavigation.edge = null;
  notice(
    s,
    s.story.autoQuest
      ? 'AUTO-quest follows your story. Manual movement takes priority.'
      : 'AUTO-quest stopped',
  );
  return s.story.autoQuest;
}
export function claimQuest(s) {
  if (s.quest.claimed || s.quest.kills < s.quest.target) return false;
  s.quest.completed = true;
  s.quest.claimed = true;
  s.player.gold += 500;
  s.starCores += 3;
  s.player.xp += 200;
  advance(s);
  notice(s, 'Rowan’s bounty: +500 gold · +3 star cores');
  return true;
}
export function changeClass(s, id) {
  if (!CLASS_DEFS.some((c) => c.id === id)) return false;
  s.classId = id;
  recalculate(s);
  s.player.buffRemaining = 0;
  s.player.skillCooldowns = [0, 0, 0, 0];
  recalculate(s);
  notice(s, `${s.classes.find((c) => c.id === id).name} awakened`);
  return true;
}
export function travelToArea(s, id) {
  unlock(s);
  const a = s.world.areas.find((a) => a.id === id);
  if (!a || !s.unlockedAreas.includes(id)) return false;
  Object.assign(s.player, {
    x: a.x + 170,
    y: 820 - s.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
    platformId: 'ground',
    climbing: null,
    invuln: 2,
  });
  s.currentArea = id;
  s.autoTarget = null;
  s.autoNavigation.edge = null;
  notice(s, `Arrived in ${a.name}`);
  return true;
}
export function upgradeSkill(s, index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > 3 ||
    s.sp < 1 ||
    s.skillLevels[index] >= 30 ||
    s.player.level < s.skillDefinitions[index].reqLv
  )
    return false;
  s.sp--;
  s.skillLevels[index]++;
  notice(s, `${s.skillDefinitions[index].name} upgraded`);
  return true;
}
export function forgeItem(s, slot, timing) {
  const item = s.player.equipment[slot];
  if (!item) return { success: false, message: 'Equip an item first' };
  const stars = item.stars || 0;
  if (stars >= 25) return { success: false, message: 'Maximum star level reached' };
  const { gold: cost, cores } = forgeCost(stars);
  if (s.player.gold < cost || s.starCores < cores)
    return {
      success: false,
      message: `Requires ${cost} gold and ${cores} star cores`,
    };
  s.player.gold -= cost;
  s.starCores -= cores;
  const perfect = finite(timing, -1) >= 0.4 && timing <= 0.6;
  const success = random(s) < clamp(0.78 - stars * 0.022 + (perfect ? 0.22 : 0), 0.2, 1);
  if (success) {
    item.stars = stars + 1;
    recalculate(s);
  }
  const message = success
    ? `${item.name} → ★${item.stars}${perfect ? ' · Perfect timing!' : ''}`
    : 'The spark faded. Your gear is safe.';
  notice(s, message);
  return { success, message };
}
/** One reward formula for single salvage and batch quotes. */
export function salvageRewards(item) {
  return {
    gold: 35 + (item.stars || 0) * 20,
    cores: ['epic', 'unique', 'mythic'].includes(item.rarity) ? 2 : 1,
  };
}
export function toggleItemLock(s, id) {
  const item = s.player.inventory.find((i) => i.id === id);
  if (!item) return false;
  item.locked = !item.locked;
  return true;
}
/** Run the real equip helper on isolated player containers. Preview/cancel never mutate play. */
export function previewDismantle(s, rarities = ['normal', 'rare']) {
  const draft = {
    ...s,
    player: {
      ...s.player,
      inventory: [...s.player.inventory],
      equipment: { ...s.player.equipment },
    },
  };
  equipBestGear(draft);
  const items = draft.player.inventory.filter(
    (i) =>
      SLOTS.includes(i.type) &&
      !i.locked &&
      !(i.stars > 0) &&
      rarities.includes(i.rarity || 'normal') &&
      !Object.values(draft.player.equipment).some((e) => e?.id === i.id) &&
      draft.player.equipment[i.type] &&
      gearScore(i) <= gearScore(draft.player.equipment[i.type]),
  );
  return {
    ids: items.map((i) => i.id),
    rarities: [...rarities],
    ...items.reduce(
      (sum, i) => {
        const r = salvageRewards(i);
        return { gold: sum.gold + r.gold, cores: sum.cores + r.cores };
      },
      { gold: 0, cores: 0 },
    ),
  };
}
export function dismantleLowGear(s, quote) {
  const current = previewDismantle(s, quote?.rarities || []);
  if (!quote?.ids?.length || JSON.stringify(current) !== JSON.stringify(quote)) {
    notice(s, 'Gear changed. Review dismantling again.');
    return { count: 0, gold: 0, cores: 0 };
  }
  equipBestGear(s);
  for (const id of current.ids) salvageItem(s, id);
  notice(
    s,
    `Dismantled ${current.ids.length} items · +${current.gold} gold · +${current.cores} star cores`,
  );
  return { count: current.ids.length, gold: current.gold, cores: current.cores };
}
export function salvageItem(s, id) {
  const index = s.player.inventory.findIndex((i) => i.id === id);
  if (
    index < 0 ||
    !SLOTS.includes(s.player.inventory[index].type) ||
    s.player.inventory[index].locked
  )
    return false;
  const [item] = s.player.inventory.splice(index, 1);
  const rewards = salvageRewards(item);
  s.player.gold += rewards.gold;
  s.starCores += rewards.cores;
  notice(s, `${item.name} salvaged`);
  return true;
}
export function respawnPlayer(s) {
  Object.assign(s.player, {
    x: 170,
    y: 820 - s.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
    platformId: 'ground',
    climbing: null,
    hp: s.player.maxHp,
    mp: s.player.maxMp,
    deadTimer: 0,
    invuln: 3,
    dropTimer: 0,
    ropeCooldown: 0.5,
    knockbackVx: 0,
    knockbackTimer: 0,
  });
  s.currentArea = 'emerald_glade';
  s.autoTarget = null;
  s.autoNavigation.edge = null;
  notice(s, 'Pip brought you back to safety');
  return true;
}
export function serializeGame(s, settings = s.settings) {
  return copy({
    version: 4,
    saveVersion: 4,
    absence: s.absence || null,
    player: { level: s.player.level, xp: s.player.xp, gold: s.player.gold, deaths: s.deaths },
    upgrades: s.upgrades,
    inventory: s.player.inventory,
    equipment: s.player.equipment,
    settings,
    unlockedAreas: s.unlockedAreas,
    quest: s.quest,
    story: normalizeStoryProgress(s.story),
    daily: normalizeDaily(s.daily),
    classId: s.classId,
    damageSkin: s.damageSkin,
    starCores: s.starCores,
    sp: s.sp,
    skillLevels: s.skillLevels,
    currentArea: s.currentArea,
  });
}
export function gainExperience(s, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  s.player.xp += Math.floor(amount);
  advance(s);
}
export function interactWorld(s) {
  const p = s.player,
    area = s.world.areas.find((a) => a.id === s.currentArea);
  if (!area) return false;
  const near = (target) => Math.hypot(center(p) - target.x, p.y + p.h - target.y) < 80;
  const portal = area.portals?.find(near);
  if (portal) {
    const moved = travelToArea(s, portal.targetArea);
    if (!moved) notice(s, 'This gate opens when you reach the next hunting level.');
    return moved;
  }
  if (area.npc && near(area.npc)) return talkToNpc(s, area.npc.id);
  return false;
}

function reward(s, e) {
  if (e.rewarded) return;
  e.rewarded = true;
  e.hp = 0;
  e.deathTimer = 0.65;
  e.respawnTimer = e.isBoss ? 35 : 9;
  s.kills++;
  recordStoryEvent(s, { kind: 'defeat', enemy: e });
  recordDailyDefeat(s, e);
  const active = getStoryView(s);
  if (
    active.status === 'active' &&
    active.quest.objective.kind === 'collect' &&
    matchesQuestEnemy(active.quest, e)
  )
    s.drops.push({
      id: `drop-${s.nextId++}`,
      type: 'quest',
      questId: active.quest.id,
      name: active.quest.title,
      x: center(e),
      y: e.y + e.h - 12,
      w: 18,
      h: 18,
      age: 0,
      platformId: e.platformId,
    });
  s.quest.kills++;
  s.quest.completed = s.quest.kills >= s.quest.target;
  s.player.xp += enemyXp(e);
  advance(s);
  s.drops.push({
    id: `drop-${s.nextId++}`,
    x: center(e),
    y: e.y + e.h - 16,
    w: 18,
    h: 18,
    type: 'gold',
    amount: enemyGold(e),
    item: null,
    age: 0,
    platformId: e.platformId,
  });
  if (s.kills % 3 === 0 || e.isBoss) {
    const slot = SLOTS[((s.kills / 3) | 0) % SLOTS.length];
    const rarity = lootRarity(random(s), e.isBoss, e.areaRank || 0),
      multiplier = RARITIES[rarity].multiplier;
    const item = {
      id: `loot-${s.nextId++}`,
      name: `${['Glade', 'Canopy', 'Crystal', 'Ember'][Math.min(3, Math.floor(e.x / 1200))]} ${slot === 'weapon' ? 'Blade' : slot[0].toUpperCase() + slot.slice(1)}`,
      type: slot,
      rarity,
      icon: slot === 'weapon' ? '⚔' : '✧',
      count: 1,
      stars: 0,
      ...(slot === 'weapon'
        ? { attack: Math.round((13 + e.level * 3) * multiplier) }
        : { defense: Math.round((4 + Math.ceil(e.level * 1.5)) * multiplier) }),
    };
    s.drops.push({
      id: `drop-${s.nextId++}`,
      x: center(e) + 22,
      y: e.y + e.h - 18,
      w: 20,
      h: 20,
      type: 'item',
      amount: 1,
      item,
      age: 0,
      platformId: e.platformId,
    });
  }
  if (e.isBoss) s.starCores += 5;
  effect(s, 'defeat', center(e), e.y + e.h / 2, { life: 0.6, maxLife: 0.6 });
}
function hitEnemies(s, damage, range, style, aoe = false, hits = 1) {
  const p = s.player;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const dx = center(e) - center(p),
      dy = Math.abs(e.y + e.h / 2 - (p.y + p.h / 2));
    if (
      dy > Math.max(65, e.h / 2 + 35) ||
      Math.abs(dx) > range + e.w / 2 ||
      (!aoe && dx * p.facing < -e.w / 4)
    )
      continue;
    s.combatSeed = (Math.imul(1664525, s.combatSeed ?? 38192) + 1013904223) >>> 0;
    const critical = s.combatSeed / 4294967296 < p.critRate;
    const amount = Math.max(1, Math.round(damage * (critical ? p.critDamage : 1)));
    e.hp = Math.max(0, e.hp - amount);
    e.hitTimer = 0.22;
    e.knockbackVx = (center(e) < center(p) ? -1 : 1) * (e.isBoss ? 30 : 155);
    e.knockbackTimer = 0.15;
    // Split the actual damage total into readable lines; no extra phantom damage.
    for (let line = 0; line < Math.min(hits, 3, amount); line++) {
      const count = Math.min(hits, 3, amount),
        value = Math.floor(amount / count) + (line < amount % count ? 1 : 0);
      floating(
        s,
        center(e) + (line % 2) * 12,
        e.y - 5 - line * 21,
        value,
        critical ? '#ffb079' : '#ffe5a0',
      );
      s.numbers.at(-1).critical = critical;
    }
    if (e.hp <= 0) reward(s, e);
  }
}
function combat(s, input) {
  const p = s.player;
  if (input.buff) castBuff(s);
  if (input.attack && p.attackTimer <= 0 && !p.climbing) {
    p.combo = p.comboTimer > 0 ? (p.combo % 3) + 1 : 1;
    p.comboTimer = 1.4;
    p.attackTimer = s.classId === 'nightblade' ? 0.3 : 0.42;
    p.attackAnimation = 0.24;
    effect(
      s,
      s.classId === 'ranger' ? 'arrow' : s.classId === 'arcanist' ? 'bolt' : 'slash',
      center(p),
      p.y + p.h * 0.45,
      { range: p.attackRange },
    );
    hitEnemies(s, p.attack * (1 + (p.combo - 1) * 0.18), p.attackRange, 'attack');
  }
  for (let i = 0; i < 4; i++) {
    const key = i ? 'skill' + (i + 1) : 'skill',
      def = s.skillDefinitions[i];
    if (
      !input[key] ||
      p.skillCooldowns[i] > 0 ||
      p.mp < Math.ceil(def.mp * p.manaCostMultiplier) ||
      p.level < def.reqLv ||
      p.climbing
    )
      continue;
    p.mp -= Math.ceil(def.mp * p.manaCostMultiplier);
    p.skillCooldowns[i] = def.cd;
    p.skillTimer = 0.55;
    p.skillAnimation = 0.55;
    p.activeSkill = i;
    effect(s, def.style, center(p), p.y + p.h * 0.4, {
      life: i === 3 ? 1.6 : 0.75,
      maxLife: i === 3 ? 1.6 : 0.75,
      range: def.range,
      classId: s.classId,
      skillIndex: i,
    });
    hitEnemies(
      s,
      p.attack * def.damage * (1 + (s.skillLevels[i] - 1) * 0.15),
      def.range,
      def.style,
      i >= 2,
      def.hits,
    );
    if (i === 3) s.ultimateBanner = { name: def.name, remaining: 1.8, classId: s.classId };
  }
}
export function castBuff(s) {
  const p = s.player;
  if (p.hp <= 0 || p.level < BUFF_LEVEL || p.buffCooldown > 0 || p.mp < BUFF_MP || p.climbing)
    return false;
  p.mp -= BUFF_MP;
  p.buffRemaining = BUFF_DURATION;
  p.buffCooldown = BUFF_COOLDOWN;
  recalculate(s);
  effect(s, 'buff', center(p), p.y + p.h * 0.6, { classId: s.classId, life: 1, maxLife: 1 });
  notice(s, `${BUFFS[s.classId].name} · ${BUFF_DURATION}s`);
  return true;
}
function damagePlayer(s, amount, sourceX = center(s.player) + 1) {
  const p = s.player;
  if (p.hp <= 0 || p.invuln > 0) return;
  p.hp = Math.max(0, p.hp - Math.max(1, Math.round((amount * 100) / (100 + p.defense * 1.4))));
  p.invuln = 0.7;
  p.knockbackVx = (center(p) < sourceX ? -1 : 1) * 260;
  p.knockbackTimer = 0.2;
  floating(
    s,
    center(p),
    p.y,
    '−' + Math.max(1, Math.round((amount * 100) / (100 + p.defense * 1.4))),
    '#ff8a91',
  );
  effect(s, 'hurt', center(p), p.y + 20);
}
function tickEnemies(s, dt) {
  const p = s.player;
  for (const e of s.enemies) {
    e.hitTimer = Math.max(0, e.hitTimer - dt);
    e.attackTimer = Math.max(0, e.attackTimer - dt);
    if (e.hp <= 0) {
      e.deathTimer = Math.max(0, e.deathTimer - dt);
      e.respawnTimer -= dt;
      if (e.respawnTimer <= 0) {
        if (e.encounterBase) {
          const view = getStoryView(s);
          if (view.status !== 'active' || view.quest.objective.enemyId !== e.id) {
            Object.assign(e, e.encounterBase);
            delete e.encounterBase;
            delete e.name;
            delete e.isElite;
          }
        }
        e.hp = e.maxHp;
        e.rewarded = false;
        e.deathTimer = 0;
        e.x = e.spawnX ?? e.x;
        e.attackTimer = 1;
        e.telegraph = 0;
        e.bossCooldown = 3;
      }
      continue;
    }
    const platform = s.world.platforms.find((p) => p.id === e.platformId);
    if (!platform) continue;
    const min = Math.max(platform.x, e.homeMin ?? platform.x),
      max = Math.min(platform.x + platform.w, e.homeMax ?? platform.x + platform.w) - e.w;
    if (e.isBoss) {
      e.bossCooldown -= dt;
      if (e.telegraph > 0) {
        e.telegraph = Math.max(0, e.telegraph - dt);
        e.attackPhase = 'warning';
        if (e.telegraph === 0) {
          e.attackPhase = 'strike';
          const meteor = e.attackKind === 'meteor';
          effect(s, meteor ? 'boss-meteor' : 'boss-slam', e.warningX, platform.y, {
            life: 0.6,
            maxLife: 0.6,
            radius: e.warningRadius,
          });
          const inRange = Math.abs(center(p) - e.warningX) < e.warningRadius;
          const inHeight = meteor || Math.abs(p.y + p.h - platform.y) < 75;
          if (inRange && inHeight) damagePlayer(s, meteor ? 470 : 360, e.warningX);
          e.bossCooldown = 4.2;
        }
      } else if (e.bossCooldown <= 0 && Math.abs(center(p) - center(e)) < 650 && p.hp > 0) {
        e.attackCount = (e.attackCount || 0) + 1;
        e.attackKind = e.attackCount % 2 === 0 ? 'meteor' : 'slam';
        e.warningX = e.attackKind === 'meteor' ? center(p) : center(e);
        e.warningRadius = e.attackKind === 'meteor' ? 100 : 245;
        e.telegraph = e.attackKind === 'meteor' ? 1.5 : 1.25;
        e.attackPhase = 'warning';
        effect(s, 'telegraph', e.warningX, platform.y, {
          life: e.telegraph,
          maxLife: e.telegraph,
          radius: e.warningRadius,
          w: e.warningRadius * 2,
          h: 30,
          attackKind: e.attackKind,
        });
      } else {
        e.attackPhase = 'idle';
        if (Math.abs(center(p) - center(e)) < 570) {
          e.facing = center(p) < center(e) ? -1 : 1;
          e.x += e.facing * 32 * dt;
        }
      }
    } else {
      if (
        e.level >= 3 &&
        p.hp > 0 &&
        p.platformId === e.platformId &&
        Math.abs(center(e) - center(p)) < 430
      ) {
        e.vx = Math.sign(center(p) - center(e)) * (38 + e.level * 3);
      }
      e.x += e.vx * dt;
      if (e.x <= min) {
        e.x = min;
        e.vx = Math.abs(e.vx);
        e.facing = 1;
      }
      if (e.x >= max) {
        e.x = max;
        e.vx = -Math.abs(e.vx);
        e.facing = -1;
      }
      if (
        e.attackTimer <= 0 &&
        Math.abs(center(e) - center(p)) < (e.w + p.w) / 2 + 12 &&
        Math.abs(e.y + e.h - (p.y + p.h)) < 50
      ) {
        damagePlayer(s, e.damage ?? 12 + e.level * 3, center(e));
        e.attackTimer = 1.1;
      }
    }
    if (e.knockbackTimer > 0) {
      e.x += (e.knockbackVx || 0) * dt;
      e.knockbackTimer = Math.max(0, e.knockbackTimer - dt);
    }
    e.x = clamp(e.x, min, Math.max(min, max));
    e.y = platform.y - e.h;
  }
}
function landOn(s, platform) {
  const p = s.player;
  p.y = platform.y - p.h;
  p.vy = 0;
  p.grounded = true;
  p.platformId = platform.id;
}
function physics(s, input, jump, dt) {
  const p = s.player;
  p.ropeCooldown = Math.max(0, p.ropeCooldown - dt);
  p.dropTimer = Math.max(0, p.dropTimer - dt);
  if (!p.dropTimer) p.dropPlatformId = null;
  if (p.climbing) {
    const r = s.world.ropes.find((r) => r.id === p.climbing);
    if (!r) {
      p.climbing = null;
      p.grounded = false;
    } else if (jump || ((input.left || input.right) && !input.up && !input.down)) {
      p.climbing = null;
      p.ropeCooldown = 0.45;
      p.grounded = false;
      p.platformId = null;
      p.vy = jump ? -JUMP_SPEED : 0;
    } else {
      p.x = r.x - p.w / 2;
      p.vx = 0;
      p.vy = 0;
      p.y += (Number(!!input.down) - Number(!!input.up)) * CLIMB_SPEED * dt;
      const feet = p.y + p.h;
      if (feet <= r.y1) {
        const platform = s.world.platforms.find(
          (t) => Math.abs(t.y - r.y1) < 2 && r.x >= t.x && r.x <= t.x + t.w,
        );
        p.climbing = null;
        p.ropeCooldown = 0.35;
        if (platform) landOn(s, platform);
      } else if (feet >= r.y2 && input.down) {
        p.climbing = null;
        p.ropeCooldown = 0.35;
        const platform = s.world.platforms.find(
          (t) => Math.abs(t.y - r.y2) < 2 && r.x >= t.x && r.x <= t.x + t.w,
        );
        if (platform) landOn(s, platform);
        else p.grounded = false;
      }
      return;
    }
  }
  if (!p.climbing && p.ropeCooldown <= 0 && (input.up || input.down) && !jump) {
    const r = s.world.ropes.find(
      (r) =>
        Math.abs(center(p) - r.x) < 23 &&
        p.y + p.h >= r.y1 - 3 &&
        p.y + p.h <= r.y2 + 5 &&
        ((input.up && p.y + p.h > r.y1 + 4) || (input.down && p.y + p.h < r.y2 - 4)),
    );
    if (r) {
      p.climbing = r.id;
      p.platformId = null;
      p.grounded = false;
      p.vx = 0;
      p.vy = 0;
      p.x = r.x - p.w / 2;
      p.y = clamp(p.y, r.y1 - p.h, r.y2 - p.h);
      return;
    }
  }
  const direction =
    Number.isFinite(input.moveX) && Math.abs(input.moveX) > 0.16
      ? clamp(input.moveX, -1, 1)
      : Number(!!input.right) - Number(!!input.left);
  p.vx = direction * MOVE_SPEED + (p.knockbackTimer > 0 ? p.knockbackVx : 0);
  p.knockbackTimer = Math.max(0, p.knockbackTimer - dt);
  if (direction) p.facing = Math.sign(direction);
  if (jump && p.grounded) {
    const surface = s.world.platforms.find((t) => t.id === p.platformId);
    const ground = s.world.platforms.find((t) => t.ground || t.id === 'ground');
    if (input.down && surface && ground && surface.y < ground.y) {
      p.dropPlatformId = p.platformId;
      p.dropTimer = 0.28;
      p.grounded = false;
      p.platformId = null;
      p.y += 3;
      p.vy = 30;
    } else {
      p.vy = -JUMP_SPEED;
      p.grounded = false;
      p.platformId = null;
    }
  }
  const beforeFeet = p.y + p.h;
  p.x += p.vx * dt;
  const lastArea = s.world.areas.filter((a) => s.unlockedAreas.includes(a.id)).at(-1);
  p.x = clamp(p.x, 0, (lastArea?.end || 1200) - p.w);
  const standing = s.world.platforms.find((t) => t.id === p.platformId);
  if (p.grounded && standing && p.x + p.w > standing.x && p.x < standing.x + standing.w) {
    p.y = standing.y - p.h;
    p.vy = 0;
  } else {
    p.grounded = false;
    p.platformId = null;
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.vy >= 0) {
      const feet = p.y + p.h;
      const platform = s.world.platforms
        .filter(
          (t) =>
            t.id !== p.dropPlatformId &&
            p.x + p.w > t.x + 1 &&
            p.x < t.x + t.w - 1 &&
            beforeFeet <= t.y + 0.5 &&
            feet >= t.y,
        )
        .sort((a, b) => a.y - b.y)[0];
      if (platform) landOn(s, platform);
    }
  }
  if (p.y > s.world.height + 100) respawnPlayer(s);
  s.currentArea =
    s.world.areas.find((a) => center(p) >= a.x && center(p) < a.end)?.id || s.currentArea;
}
function finishAutoInput(s, input, dt) {
  const p = s.player,
    nav = s.autoNavigation;
  const moved = Math.hypot(p.x - nav.lastX, p.y - nav.lastY);
  nav.stuck = moved < 0.2 ? nav.stuck + dt : 0;
  nav.lastX = p.x;
  nav.lastY = p.y;
  if (nav.stuck > 2.5 && (p.climbing || nav.edge || s.autoTarget)) {
    s.autoTarget = null;
    nav.edge = null;
    nav.stuck = 0;
    input.jump = true;
    if (p.climbing) {
      p.climbing = null;
      p.ropeCooldown = 0.5;
    }
    if (!input.left && !input.right) input.right = true;
  }
  return input;
}
function autoInput(s, dt, directive = null) {
  const p = s.player,
    nav = s.autoNavigation,
    input = {};
  if (p.hp < p.maxHp * 0.4) usePotion(s);
  const accessible = (e) =>
    s.world.areas.find((a) => e.x >= a.x && e.x < a.end)?.id === s.currentArea;
  // A toggle discards the old route, but the stored rope remains real world context.
  // Reconstruct its ascent edge so AUTO can finish the climb and plan from an endpoint.
  if (p.climbing && (nav.edge?.type !== 'rope' || nav.edge.ropeId !== p.climbing)) {
    const ropeEdges = Object.values(s.navigation)
      .flat()
      .filter((edge) => edge.type === 'rope' && edge.ropeId === p.climbing);
    nav.edge = ropeEdges.find((edge) => edge.direction < 0) || ropeEdges[0] || null;
  }
  const node = p.platformId || nav.edge?.from;
  if (!node && !p.climbing) {
    input.right = p.vx > 0;
    input.left = p.vx < 0;
    return finishAutoInput(s, input, dt);
  }
  let target =
    directive?.target ||
    s.drops
      .filter(
        (d) =>
          (!directive || (d.type === 'quest' && d.questId === s.story.activeId)) &&
          accessible(d) &&
          findRoute(s.navigation, node, d.platformId || 'ground') !== null,
      )
      .sort(
        (a, b) => Math.hypot(a.x - center(p), a.y - p.y) - Math.hypot(b.x - center(p), b.y - p.y),
      )[0];
  if (!target) {
    target = s.enemies.find(
      (e) =>
        e.id === s.autoTarget &&
        e.hp > 0 &&
        accessible(e) &&
        (!directive?.filter || directive.filter(e)),
    );
    if (!target)
      target = s.enemies
        .filter(
          (e) =>
            e.hp > 0 &&
            accessible(e) &&
            (!directive?.filter || directive.filter(e)) &&
            findRoute(s.navigation, node, e.platformId) !== null,
        )
        .sort((a, b) => {
          const score = (e) =>
            Math.abs(center(e) - center(p)) +
            Math.abs(e.y - p.y) * 1.3 +
            (findRoute(s.navigation, node, e.platformId)?.length || 0) * 150;
          return score(a) - score(b);
        })[0];
  }
  if (!target) {
    s.autoTarget = null;
    if (p.climbing && nav.edge?.type === 'rope') {
      input.up = nav.edge.direction < 0;
      input.down = nav.edge.direction > 0;
    } else nav.edge = null;
    return finishAutoInput(s, input, dt);
  }
  s.autoTarget = target.id;
  const targetPlatform = target.platformId || 'ground';
  if (p.platformId === targetPlatform && !p.climbing) {
    nav.edge = null;
    const dx = (target.w ? center(target) : target.x) - center(p);
    if (['gold', 'item', 'quest', 'waypoint'].includes(target.type)) {
      if (Math.abs(dx) > 20) {
        input.right = dx > 0;
        input.left = dx < 0;
      }
      input.interact = target.type !== 'waypoint';
    } else {
      p.facing = dx < 0 ? -1 : 1;
      const desired = Math.min(p.attackRange * 0.68, 115);
      if (Math.abs(dx) > desired) {
        input.right = dx > 0;
        input.left = dx < 0;
      }
      if (Math.abs(dx) <= p.attackRange + target.w / 2) {
        input.attack = true;
        for (let i = 0; i < 4; i++)
          if (p.skillCooldowns[i] <= 0) input[i ? 'skill' + (i + 1) : 'skill'] = true;
      }
    }
  } else {
    if (p.grounded) {
      const route = findRoute(s.navigation, p.platformId, targetPlatform);
      nav.edge = route?.[0] || null;
    }
    const edge = nav.edge;
    if (edge) {
      if (edge.type === 'rope') {
        if (Math.abs(center(p) - edge.x) > 7 && !p.climbing) {
          input.right = center(p) < edge.x;
          input.left = center(p) > edge.x;
        } else {
          input.up = edge.direction < 0;
          input.down = edge.direction > 0;
        }
      } else if (edge.type === 'walk') {
        input.right = center(p) < edge.landX - 3;
        input.left = center(p) > edge.landX + 3;
      } else if (edge.type === 'drop') {
        if (p.grounded && Math.abs(center(p) - edge.x) > 8) {
          input.right = center(p) < edge.x;
          input.left = center(p) > edge.x;
        } else if (p.grounded) {
          input.down = true;
          input.jump = true;
        }
      } else {
        if (p.grounded && Math.abs(center(p) - edge.x) > 8) {
          input.right = center(p) < edge.x;
          input.left = center(p) > edge.x;
        } else {
          if (p.grounded && edge.type === 'jump') input.jump = true;
          const dx = edge.landX - center(p);
          if (Math.abs(dx) > 5) {
            input.right = dx > 0;
            input.left = dx < 0;
          }
        }
      }
    }
  }
  return finishAutoInput(s, input, dt);
}
function haltQuestRoute(s) {
  s.story.autoQuest = false;
  s.auto = false;
  s.story.status = 'Route blocked';
  s.autoTarget = null;
  s.autoNavigation.edge = null;
  notice(s, 'No safe quest route. Move manually, then follow the quest again.');
  return {};
}
function questNavigation(s, dt, target) {
  const node = s.player.platformId || s.autoNavigation.edge?.from;
  if (node && findRoute(s.navigation, node, target.platformId || 'ground') === null)
    return haltQuestRoute(s);
  return autoInput(s, dt, { target });
}
export function talkToNpc(s, id) {
  const area = s.world.areas.find((a) => a.id === s.currentArea),
    npc = area?.npc,
    p = s.player;
  if (!npc || npc.id !== id || p.hp <= 0 || Math.hypot(center(p) - npc.x, p.y + p.h - npc.y) >= 80)
    return false;
  if (npc.id === 'rowan') claimQuest(s);
  s.dialogueNpcId = id;
  notice(s, `${npc.name} is ready to talk`);
  return true;
}
function autoQuestInput(s, dt) {
  const story = s.story,
    view = getStoryView(s),
    p = s.player;
  story.cooldown = Math.max(0, story.cooldown - dt);
  if (story.cooldown > 0) return {};
  if (view.status === 'finished') {
    story.autoQuest = false;
    s.auto = false;
    story.status = 'finished';
    notice(s, 'The lantern trail is complete. Aetheria remembers your journey.');
    return {};
  }
  if (view.status === 'locked') {
    story.status = view.description;
    const daily = getDailyView(s),
      guide = s.world.areas.find((a) => a.id === s.currentArea)?.npc;
    const reserveDaily =
      daily.status === 'ready' ||
      (daily.status === 'available' &&
        view.quest.minLevel >= 8 &&
        story.autoDailyGate !== view.quest.id);
    if (guide && reserveDaily) {
      if (nearDailyGuide(s)) {
        if (daily.status === 'ready') claimDailyBounty(s);
        else if (acceptDailyBounty(s)) story.autoDailyGate = view.quest.id;
        story.cooldown = 0.6;
        return {};
      }
      return questNavigation(s, dt, { ...guide, platformId: 'ground', type: 'waypoint' });
    }
    return autoInput(s, dt);
  }
  if (view.status === 'active' && view.quest.objective.kind === 'boss') {
    story.autoQuest = false;
    s.auto = false;
    s.autoTarget = null;
    story.status = 'manual-boss';
    notice(s, 'Cinderroot needs manual dodges. AUTO-quest paused before the boss.');
    return {};
  }
  const area = view.area;
  if (s.currentArea !== area.id) {
    const current = s.world.areas.find((a) => a.id === s.currentArea),
      direction = area.x > current.x ? 1 : -1;
    const next = s.world.areas.find((a) => a.x === current.x + direction * 1200);
    const portal = current.portals.find((portal) => portal.targetArea === next?.id);
    if (!portal || !s.unlockedAreas.includes(next.id)) {
      story.status = 'The next gate is locked';
      return {};
    }
    if (next.x > current.x && !areaReadiness(s, next.id)) {
      story.status = `Gear up before ${next.name} — check Bag / Forge / Shop`;
      return autoInput(s, dt);
    }
    story.status = `Travel to ${area.name}`;
    if (Math.hypot(center(p) - portal.x, p.y + p.h - portal.y) < 70) {
      travelToArea(s, next.id);
      story.cooldown = 0.4;
      return {};
    }
    return questNavigation(s, dt, { ...portal, platformId: 'ground', type: 'waypoint' });
  }
  if (view.status === 'available' || view.status === 'ready') {
    story.status =
      view.status === 'ready' ? `Return to ${view.npc.name}` : `Speak to ${view.npc.name}`;
    if (nearGiver(s, view)) {
      const changed =
        view.status === 'ready' ? turnInStoryQuest(s) : acceptStoryQuest(s, view.quest.id);
      if (changed) story.cooldown = 0.6;
      return {};
    }
    return questNavigation(s, dt, { ...view.npc, platformId: 'ground', type: 'waypoint' });
  }
  story.status = view.description;
  if (view.quest.objective.kind === 'visit')
    return questNavigation(s, dt, { ...view.quest.objective.location, type: 'waypoint' });
  const candidates = s.enemies.filter((e) => e.hp > 0 && matchesQuestEnemy(view.quest, e));
  const node = p.platformId || s.autoNavigation.edge?.from;
  if (
    node &&
    candidates.length &&
    !candidates.some((e) => findRoute(s.navigation, node, e.platformId) !== null)
  )
    return haltQuestRoute(s);
  if (!candidates.length) story.status = 'Waiting for quest creatures to return';
  return autoInput(s, dt, { filter: (e) => matchesQuestEnemy(view.quest, e) });
}
function checkStoryVisit(s) {
  const view = getStoryView(s);
  if (view.status !== 'active' || view.quest.objective.kind !== 'visit') return;
  const goal = view.quest.objective.location,
    p = s.player;
  if (
    s.currentArea === view.quest.areaId &&
    p.platformId === goal.platformId &&
    Math.abs(center(p) - goal.x) < 50 &&
    Math.abs(p.y + p.h - goal.y) < 40
  )
    recordStoryEvent(s, { kind: 'visit', questId: view.quest.id });
}
/** Pip works in both manual and AUTO modes. Flight never changes player physics. */
function tickPet(s, dt) {
  const p = s.player,
    pet = s.pet;
  pet.healCooldown = Math.max(0, pet.healCooldown - dt);
  pet.healFlash = Math.max(0, pet.healFlash - dt);
  const ownerX = center(p),
    ownerY = p.y + p.h / 2;
  if (Math.hypot(pet.x - ownerX, pet.y - ownerY) > 650) {
    pet.x = ownerX - 60;
    pet.y = ownerY - 20;
  }
  const nearby = s.drops.filter((d) => Math.hypot(d.x - ownerX, d.y - ownerY) < 360);
  let target = nearby.find((d) => d.id === pet.targetId);
  if (!target)
    target = nearby.sort(
      (a, b) => Math.hypot(a.x - pet.x, a.y - pet.y) - Math.hypot(b.x - pet.x, b.y - pet.y),
    )[0];
  pet.targetId = target?.id || null;
  pet.mode = target ? 'looting' : 'following';
  const tx = target ? target.x : ownerX - p.facing * 62;
  const ty = target ? target.y : ownerY - 24;
  const distance = Math.hypot(tx - pet.x, ty - pet.y);
  const fraction = Math.min(1, (340 * dt) / Math.max(1, distance));
  pet.x += (tx - pet.x) * fraction;
  pet.y += (ty - pet.y) * fraction;
  if (p.hp > 0 && p.hp < p.maxHp * 0.7 && pet.healCooldown === 0) {
    const amount = Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * PIP_HEAL_FRACTION));
    p.hp += amount;
    pet.healCooldown = PIP_HEAL_COOLDOWN;
    pet.healFlash = 1.2;
    floating(s, ownerX, p.y - 12, `+${amount} HP`, '#8effc4');
    notice(s, `Pip restored ${amount} HP`);
  }
}
function collect(s, input, dt) {
  const p = s.player;
  for (let i = s.drops.length - 1; i >= 0; i--) {
    const d = s.drops[i];
    d.age += dt;
    if (d.age > 120) {
      s.drops.splice(i, 1);
      continue;
    }
    if (
      (s.pet.targetId === d.id && Math.hypot(d.x - s.pet.x, d.y - s.pet.y) < 24) ||
      ((input.interact || s.auto) &&
        Math.abs(d.x - center(p)) < (input.interact ? 110 : 48) &&
        Math.abs(d.y - (p.y + p.h / 2)) < 90)
    ) {
      if (d.type === 'gold') {
        p.gold += d.amount;
        floating(s, d.x, d.y, `+${d.amount}g`, '#ffe5a0');
      } else if (d.type === 'quest') {
        if (recordStoryEvent(s, { kind: 'collect', questId: d.questId }))
          floating(s, d.x, d.y, 'QUEST +1', '#b9fff2');
      } else if (d.item) {
        p.inventory.push(d.item);
        notice(s, `Found ${d.item.name}`);
      }
      s.drops.splice(i, 1);
    }
  }
}
function frame(s, raw, dt) {
  if (s.paused) return;
  const p = s.player;
  s.time += dt;
  if (p.statLevel !== p.level) recalculate(s);
  s.noticeTimer = Math.max(0, s.noticeTimer - dt);
  for (const banner of [s.levelUpSummary, s.ultimateBanner])
    if (banner) banner.remaining = Math.max(0, banner.remaining - dt);
  p.buffCooldown = Math.max(0, p.buffCooldown - dt);
  if (p.buffRemaining > 0) {
    p.buffRemaining = Math.max(0, p.buffRemaining - dt);
    if (!p.buffRemaining) recalculate(s);
  }
  advance(s);
  for (const key of [
    'potionCooldown',
    'attackTimer',
    'attackAnimation',
    'skillTimer',
    'skillAnimation',
    'comboTimer',
    'invuln',
  ])
    p[key] = Math.max(0, p[key] - dt);
  if (!p.comboTimer) p.combo = 0;
  for (let i = 0; i < 4; i++) p.skillCooldowns[i] = Math.max(0, p.skillCooldowns[i] - dt);
  p.mp = Math.min(p.maxMp, p.mp + 6 * dt);
  for (const array of [s.numbers, s.effects, s.particles])
    for (let i = array.length - 1; i >= 0; i--) {
      array[i].life -= dt;
      if (array[i].life <= 0) array.splice(i, 1);
    }
  if (p.hp <= 0) {
    if (p.deadTimer <= 0) {
      p.buffRemaining = 0;
      recalculate(s);
      s.deaths++;
      if (s.story.autoQuest) {
        s.story.autoQuest = false;
        s.auto = false;
        s.story.status = 'fallen';
        s.autoStatus = '';
        s.autoRecovering = false;
      }
      p.deadTimer = 2.5;
      p.climbing = null;
      p.vx = 0;
      notice(s, 'You fell… Pip is bringing you home');
    } else {
      p.deadTimer -= dt;
      if (p.deadTimer <= 0) respawnPlayer(s);
    }
    tickEnemies(s, dt);
    s.previousInput = { ...raw };
    return;
  }
  const manual = raw.left || raw.right || raw.up || raw.down || raw.jump;
  if (s.auto && manual) s.autoOverride = 2.5;
  else s.autoOverride = Math.max(0, s.autoOverride - dt);
  const usingAuto = s.auto && s.autoOverride === 0;
  if (!usingAuto) s.autoStatus = '';
  let survival = null;
  if (usingAuto) {
    s.autoEquipTimer = Math.max(0, (s.autoEquipTimer || 0) - dt);
    if (!s.autoEquipTimer) {
      equipBestGear(s);
      s.autoEquipTimer = 1;
    }
    s.autoStatus = '';
    survival = autoSurvivalInput(s);
  }
  const input = usingAuto
    ? { ...(survival || (s.story.autoQuest ? autoQuestInput(s, dt) : autoInput(s, dt))) }
    : { ...raw };
  if (raw.attack) input.attack = true;
  if (usingAuto && !survival && input.attack && p.buffCooldown <= 0) input.buff = true;
  for (const key of ['skill', 'skill2', 'skill3', 'skill4', 'buff']) {
    if (raw[key] && !s.previousInput[key]) input[key] = true;
    else if (!usingAuto) input[key] = false;
  }
  const jump = !!input.jump && (usingAuto || !s.previousInput.jump);
  physics(s, input, jump, dt);
  checkStoryVisit(s);
  if (raw.interact && !s.previousInput.interact) interactWorld(s);
  combat(s, input);
  tickEnemies(s, dt);
  tickPet(s, dt);
  collect(s, input, dt);
  s.previousInput = { ...raw };
}
/** Deterministic seconds-based update. Large callers are substepped to avoid tunnelling. */
export function updateGame(s, input = {}, dt = 1 / 120) {
  if (!Number.isFinite(dt) || dt <= 0 || s.paused) return s;
  let remaining = dt;
  while (remaining > 1e-9) {
    const step = Math.min(remaining, 1 / 120);
    frame(s, input, step);
    remaining -= step;
  }
  return s;
}
