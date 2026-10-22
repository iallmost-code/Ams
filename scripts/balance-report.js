import assert from 'node:assert/strict';
import { createGame, travelToArea, updateGame } from '../src/game/engine.js';
import { simulateAuto } from './balance.js';
import { simulateProgression } from './progression-benchmark.js';
import { simulateGearedBoss } from './boss-benchmark.js';
import { simulateQuestTrail } from './quest-benchmark.js';
const bossGame = createGame({ player: { level: 20 } });
travelToArea(bossGame, 'ember_altar');
const boss = bossGame.enemies.find((e) => e.isBoss);
bossGame.enemies = [boss];
bossGame.player.x = boss.x - 75;
const manual = createGame({ player: { level: 20 }, inventory: [] });
travelToArea(manual, 'ember_altar');
const manualBoss = manual.enemies.find((e) => e.isBoss);
manual.enemies = [manualBoss];
manual.player.x = manualBoss.x - 75;
for (let i = 0; i < 60 && !manual.deaths; i++) updateGame(manual, { attack: true }, 1);
const report = {
  freshStarterAuto: simulateAuto(),
  autoQuestToTen: simulateQuestTrail(),
  autoQuest35Minutes: simulateQuestTrail(2100, { stopAtTen: false }),
  progressionWithPurchases: simulateProgression(14400),
  starterGearBossArena: simulateAuto({ game: bossGame }),
  manualStarterBoss: { deaths: manual.deaths, bossKilled: !!manualBoss.rewarded },
  gearedBossWithDodges: simulateGearedBoss(),
};
assert.ok(
  report.freshStarterAuto.timeTo10 >= 1500 && report.freshStarterAuto.timeTo10 <= 1800,
  'fresh AUTO level-ten timing',
);
assert.ok(
  report.progressionWithPurchases.timeTo25 >= 7200 &&
    report.progressionWithPurchases.timeTo25 <= 14400,
  'paid final-job timing',
);
assert.equal(report.autoQuest35Minutes.deaths, 0);
assert.equal(report.autoQuest35Minutes.autoQuest, true);
assert.ok(report.autoQuestToTen.maxObjectiveGap <= 300);
assert.ok(report.manualStarterBoss.deaths > 0);
assert.ok(report.gearedBossWithDodges.killed >= 120 && report.gearedBossWithDodges.killed <= 240);
console.log(JSON.stringify(report, null, 2));
