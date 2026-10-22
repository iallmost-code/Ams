/** Shared online/offline economy and combat constants. No simulation time scaling. */
export const PIP_HEAL_FRACTION = 0.11;
export const PIP_HEAL_COOLDOWN = 35;
export const POTION_PRICE = 90;
export const POTION_COOLDOWN = 10;
export const xpThreshold = (level) =>
  Math.round(
    (90 + 35 * level + 95 * level * level) *
      (level >= 3 && level <= 9 ? 0.95 : 1) *
      (1 + Math.max(0, level - 9) * 0.2),
  );
export const enemyXp = (enemy) => (enemy.isBoss ? 8000 : [32, 180, 480, 1000][enemy.areaRank ?? 0]);
export const enemyGold = (enemy) => (enemy.isBoss ? 650 : 10 + enemy.level * 3);
export const forgeCost = (stars) => ({
  gold: Math.min(5_000_000, Math.round(150 * Math.pow(1.7, stars) + 50 * stars * stars)),
  cores: 1 + Math.floor(stars / 3),
});
export const upgradeCost = (rank) => 250 * Math.pow(rank + 1, 2);
export const upgradeLimit = 10;
