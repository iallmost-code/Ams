/** Visual timing only: damage, cooldowns and simulation balance do not change. */
export const PRIMARY_SKILL_SECONDS = 1.25;
// Calibrated against the prior runtime-shrunk source: ~1.5x painted footprint per class.
export const PRIMARY_SKILL_SIZE = { vanguard: 342, arcanist: 392, nightblade: 400, ranger: 388 };
export function primaryKeyframes(progress) {
  const t = Math.max(0, Math.min(1, progress)) * PRIMARY_SKILL_SECONDS + 1e-10;
  if (t < 0.1) return { frame: 0, next: 1, mix: t / 0.1, fullPower: false };
  if (t < 0.225) return { frame: 1, next: 2, mix: (t - 0.1) / 0.125, fullPower: false };
  if (t < 0.875) return { frame: 2, next: 2, mix: 0, fullPower: true };
  if (t < 1.075) return { frame: 2, next: 3, mix: (t - 0.875) / 0.2, fullPower: false };
  return { frame: 3, next: 4, mix: Math.min(1, (t - 1.075) / 0.175), fullPower: false };
}
export const effectIsForeground = (e) =>
  Number.isInteger(e.skillIndex) ||
  !['telegraph', 'boss-slam', 'boss-meteor', 'nova', 'ultimate', 'levelup'].includes(e.type);
export function paintedPosition(e, t, size, contentFraction) {
  const ranged = e.classId === 'arcanist' || e.classId === 'ranger';
  let x = (e.skillIndex === 3 ? 90 : 55) + (ranged ? t * Math.min(180, e.range * 0.5) : t * 35);
  if (Number.isFinite(e.viewLeft) && Number.isFinite(e.viewRight)) {
    const half = (size * contentFraction) / 2,
      pad = 4;
    const min = e.viewLeft + half + pad,
      max = e.viewRight - half - pad;
    // If a portrait spell is wider than the field, preserve its leading edge; only its trail clips.
    x = min <= max ? Math.max(min, Math.min(max, x)) : max;
  }
  return x;
}
