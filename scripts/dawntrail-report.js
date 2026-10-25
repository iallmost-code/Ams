import { pathToFileURL } from 'node:url';
import { createChapter, chapterAction, updateChapter } from '../src/chapter/engine.js';
export function guardianBenchmark() {
  const s = createChapter(null, { training: true });
  chapterAction(s, 'build', 'zeal');
  chapterAction(s, 'travel', 'sanctuary');
  s.player.x = 1000;
  const boss = s.enemies[0];
  let seconds = 0;
  while (seconds < 300 && boss.hp > 0 && !s.deaths) {
    const p = s.player,
      dx = boss.x + boss.w / 2 - p.x - p.w / 2;
    const input = {
      attack: true,
      skill: true,
      skill2: true,
      skill3: true,
      skill4: true,
      buff: true,
    };
    if (boss.telegraph > 0 && boss.attackPhase === 'pillars') {
      if (Math.abs(p.x + p.w / 2 - boss.targetX) < 100) input.left = true;
    } else if (boss.telegraph > 0 && boss.telegraph < 0.24 && p.grounded) input.jump = true;
    else {
      input.right = dx > 90;
      input.left = dx < -90;
    }
    if (p.hp < p.maxHp * 0.5) chapterAction(s, 'potion');
    updateChapter(s, input, 1 / 60);
    seconds += 1 / 60;
  }
  return {
    seconds: Math.round(seconds * 100) / 100,
    killed: boss.hp <= 0,
    deaths: s.deaths,
    remainingHp: Math.round(s.player.hp),
    bossHp: boss.hp,
    attack: s.player.baseAttack,
    defense: s.player.baseDefense,
    tonics: s.player.tonics,
  };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  console.log(JSON.stringify(guardianBenchmark(), null, 2));
