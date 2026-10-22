import {
  createGame,
  equipItem,
  forgeItem,
  forgeCost,
  buyPotion,
  buyUpgrade,
  upgradeCost,
  travelToArea,
  salvageItem,
} from '../src/game/engine.js';
import { simulateAuto } from './balance.js';
/** A reproducible progression policy: looted gear, paid training, tonics and forging; no free stats. */
export function simulateProgression(seconds = 14400) {
  const game = createGame();
  let spent = 0;
  const result = simulateAuto({
    seconds,
    game,
    onSecond(s, second) {
      if (second % 10) return;

      for (const item of [...s.player.inventory]) {
        if (item.type === 'potion') continue;
        const old = s.player.equipment[item.type],
          stat = item.type === 'weapon' ? 'attack' : 'defense';
        if (
          (item[stat] || 0) * (1 + (item.stars || 0) * 0.12) >
          (old?.[stat] || 0) * (1 + (old?.stars || 0) * 0.12)
        )
          equipItem(s, item.id);
      }
      for (const item of [...s.player.inventory])
        if (item.type !== 'potion') salvageItem(s, item.id);
      const before = s.player.gold;
      const tonics = s.player.inventory
        .filter((i) => i.type === 'potion')
        .reduce((sum, i) => sum + i.count, 0);
      if (tonics < 3 && s.player.gold > 900) buyPotion(s, 5);
      for (const type of ['vitality', 'mastery'])
        if (s.upgrades[type] < 6 && s.player.gold > upgradeCost(s.upgrades[type]) + 1000)
          buyUpgrade(s, type);
      for (const [slot, item] of Object.entries(s.player.equipment))
        if (item && (item.stars || 0) < 5 && s.player.gold > forgeCost(item.stars || 0).gold + 1000)
          forgeItem(s, slot, 0.5);
      const area = [...s.world.areas]
        .reverse()
        .find(
          (a) =>
            s.unlockedAreas.includes(a.id) &&
            s.player.defense >= [0, 60, 150, 250][Math.floor(a.x / 1200)] &&
            s.player.attack >= [0, 75, 175, 300][Math.floor(a.x / 1200)],
        );
      // Hunt ordinary monsters; a boss fight requires the player's dodge input.
      if (area?.isBoss) {
        if (s.currentArea !== 'crystal_cavern') travelToArea(s, 'crystal_cavern');
      } else if (area && area.id !== s.currentArea) travelToArea(s, area.id);
      spent += Math.max(0, before - s.player.gold);
      s.balanceGoldSpent = spent;
    },
  });
  return { ...result, goldSpent: spent, upgrades: game.upgrades, area: game.currentArea };
}
if (process.argv[1]?.endsWith('progression-benchmark.js'))
  console.log(JSON.stringify(simulateProgression(Number(process.argv[2]) || 14400), null, 2));
