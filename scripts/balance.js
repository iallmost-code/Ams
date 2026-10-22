import { createGame, updateGame, toggleAuto } from '../src/game/engine.js';
import { pathToFileURL } from 'node:url';

/** Real fixed-step simulation; no XP, HP, damage or time multipliers. */
export function simulateAuto({ seconds = 3600, game = createGame(), onSecond } = {}) {
  if (!game.auto) toggleAuto(game);
  const levels = {},
    checkpoints = {};
  let deaths = 0,
    wasDead = false,
    bossKill = null;
  for (let second = 1; second <= seconds; second++) {
    updateGame(game, {}, 1);
    if (game.player.hp <= 0 && !wasDead) deaths++;
    wasDead = game.player.hp <= 0;
    levels[game.player.level] ??= second;
    if (bossKill === null && game.enemies.find((e) => e.isBoss)?.rewarded) bossKill = second;
    onSecond?.(game, second);
    if ([600, 900, 1800, 3600].includes(second))
      checkpoints[second] = {
        level: game.player.level,
        gold: game.player.gold,
        deaths: game.deaths ?? deaths,
        ...(game.balanceGoldSpent !== undefined ? { goldSpent: game.balanceGoldSpent } : {}),
      };
  }
  return {
    seconds,
    level: game.player.level,
    gold: game.player.gold,
    kills: game.kills,
    deaths: game.deaths ?? deaths,
    timeTo10: levels[10] ?? null,
    timeTo25: levels[25] ?? null,
    firstBossKill: bossKill,
    checkpoints,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(simulateAuto({ seconds: Number(process.argv[2]) || 3600 }), null, 2));
}
