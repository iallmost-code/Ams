/** Rowan's courier board: three shared bounties per device-local calendar day. No XP. */
export const DAILY_BOUNTIES = [
  { id: 'trail-patrol', title: 'Rowan’s trail patrol', count: 60, gold: 60, cores: 1 },
  { id: 'lantern-watch', title: 'Keep the lanterns burning', count: 120, gold: 90, cores: 1 },
  { id: 'warden-relief', title: 'Relief for the wardens', count: 600, gold: 120, cores: 2 },
];
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
