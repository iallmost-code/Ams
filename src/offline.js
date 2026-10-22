import { gainExperience } from './game/engine.js';

const MAX_ABSENCE_SECONDS = 8 * 3600;

export function markAbsence(state, now = Date.now()) {
  if (state.absence?.hiddenAt > 0 || !Number.isFinite(now) || now <= 0) return;
  state.absence = { hiddenAt: now, autoBattle: state.auto === true, areaId: state.currentArea };
}

/** Consume the departure once. Visible autosaves never rewrite its timestamp. */
export function settleAbsence(state, now = Date.now()) {
  const absence = state.absence;
  state.absence = null;
  if (!absence || !absence.autoBattle || !Number.isFinite(now)) return null;
  const area = state.world.areas.find((a) => a.id === absence.areaId);
  if (!area || area.isBoss) return null;
  const seconds = Math.min(MAX_ABSENCE_SECONDS, Math.floor((now - absence.hiddenAt) / 1000));
  if (!Number.isFinite(seconds) || seconds < 15) return null;
  const sample = state.enemies.find((e) => !e.isBoss && e.x >= area.x && e.x < area.end);
  if (!sample) return null;
  const kills = Math.floor(seconds / 8);
  const xp = Math.round(kills * (28 + sample.level * 9) * 0.65);
  const gold = Math.round(kills * (18 + sample.level * 5) * 0.7);
  const cores = Math.floor(kills / 12);
  state.player.gold += gold;
  state.starCores += cores;
  gainExperience(state, xp);
  const summary = { seconds, kills, xp, gold, cores, areaName: area.name };
  state.offlineSummary = summary;
  return summary;
}
