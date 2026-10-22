import { createGame, travelToArea } from '../src/game/engine.js';
import { simulateAuto } from './balance.js';
import { simulateProgression } from './progression-benchmark.js';
import { simulateGearedBoss } from './boss-benchmark.js';
import { simulateQuestTrail } from './quest-benchmark.js';
const bossGame = createGame({ player: { level: 20 } });
travelToArea(bossGame, 'ember_altar');
const boss = bossGame.enemies.find((e) => e.isBoss);
bossGame.enemies = [boss];
bossGame.player.x = boss.x - 75;
const report = {
  freshStarterAuto: simulateAuto(),
  autoQuestToTen: simulateQuestTrail(),
  progressionWithPurchases: simulateProgression(14400),
  starterGearBossArena: simulateAuto({ game: bossGame }),
  gearedBossWithDodges: simulateGearedBoss(),
};
console.log(JSON.stringify(report, null, 2));
