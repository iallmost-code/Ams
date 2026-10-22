import { xpThreshold } from './balance.js';
/** Rowan's courier board: three shared bounties per device-local calendar day. Level-scaled, bounded XP rewards. */
export const DAILY_BOUNTIES = [
  {
    id: 'trail-patrol',
    title: 'Rowan’s trail patrol',
    count: 25,
    gold: 100,
    cores: 2,
    tonics: 1,
    xpFraction: 0.02,
  },
  {
    id: 'lantern-watch',
    title: 'Keep the lanterns burning',
    count: 50,
    gold: 180,
    cores: 3,
    tonics: 1,
    xpFraction: 0.03,
  },
  {
    id: 'warden-relief',
    title: 'Relief for the wardens',
    count: 100,
    gold: 300,
    cores: 5,
    tonics: 3,
    xpFraction: 0.05,
  },
];
export function bountyRewards(level, bounty) {
  return {
    gold: bounty.gold,
    cores: bounty.cores,
    tonics: bounty.tonics,
    xp: Math.max(1, Math.round(xpThreshold(level) * bounty.xpFraction)),
  };
}
export function localDay(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function normalizeDaily(value) {
  const data = value && typeof value === 'object' ? value : {};
  const claimed = [];
  for (const id of Array.isArray(data.claimed) ? data.claimed : []) {
    if (id !== DAILY_BOUNTIES[claimed.length]?.id) break;
    claimed.push(id);
  }
  const next = DAILY_BOUNTIES[claimed.length];
  const activeId = next && data.activeId === next.id ? next.id : null;
  return {
    day: typeof data.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.day) ? data.day : null,
    claimed,
    activeId,
    progress:
      activeId && Number.isFinite(data.progress)
        ? Math.max(0, Math.min(next.count, Math.floor(data.progress)))
        : 0,
  };
}
export function refreshDailyBounties(state, now = new Date()) {
  const day = localDay(now);
  if (!day || (state.daily.day && day <= state.daily.day)) return false;
  state.daily = { day, claimed: [], activeId: null, progress: 0 };
  return true;
}
export function getDailyView(state) {
  const d = state.daily,
    bounty = DAILY_BOUNTIES[d.claimed.length] || null;
  return {
    bounty,
    status: !bounty
      ? 'finished'
      : d.activeId === bounty.id
        ? d.progress >= bounty.count
          ? 'ready'
          : 'active'
        : 'available',
    rewards: bounty ? bountyRewards(state.player.level, bounty) : null,
    remaining: 3 - d.claimed.length,
    progress: d.progress,
  };
}
export function recordDailyDefeat(state, enemy) {
  const view = getDailyView(state);
  if (view.status !== 'active' || enemy.isBoss) return false;
  state.daily.progress = Math.min(view.bounty.count, state.daily.progress + 1);
  return true;
}
