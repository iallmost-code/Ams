import { createGame, updateGame, travelToArea } from '../src/game/engine.js';
export function simulateGearedBoss() {
  const s = createGame({
    player: { level: 20 },
    upgrades: { vitality: 8, mastery: 6 },
    skillLevels: [5, 5, 3, 1],
  });
  s.player.equipment.weapon = { ...s.player.equipment.weapon, attack: 85, stars: 7 };
  for (const slot of ['hat', 'armor', 'cape', 'gloves', 'boots'])
    s.player.equipment[slot] = { id: slot, name: slot, type: slot, defense: 26, stars: 5 };
  s.player.statLevel = 0;
  updateGame(s, {}, 1 / 120);
  s.player.hp = s.player.maxHp;
  travelToArea(s, 'ember_altar');
  const boss = s.enemies.find((e) => e.isBoss);
  s.enemies = [boss];
  s.player.x = boss.x - 80;
  let killed = null,
    hits = 0;
  for (let i = 0; i < 600 * 30; i++) {
    const p = s.player,
      dx = boss.x + boss.w / 2 - p.x - p.w / 2;
    const raw = { attack: true };
    if (
      boss.telegraph > 0 &&
      boss.attackKind === 'meteor' &&
      Math.abs(p.x + p.w / 2 - boss.warningX) < 160
    )
      ((raw.left = boss.warningX > 4500 || (boss.warningX > 3800 && p.x + p.w / 2 < boss.warningX)),
        (raw.right = !raw.left));
    else if (Math.abs(dx) > 70) ((raw.right = dx > 0), (raw.left = dx < 0));
    if (boss.telegraph > 0 && boss.attackKind === 'slam' && boss.telegraph < 0.42) raw.jump = true;
    for (let k = 0; k < 4; k++)
      if (p.skillCooldowns[k] <= 0) raw[k ? 'skill' + (k + 1) : 'skill'] = true;
    const hp = p.hp;
    updateGame(s, raw, 1 / 30);
    if (p.hp < hp) hits++;
    if (boss.rewarded) {
      killed = (i + 1) / 30;
      break;
    }
    if (s.deaths) break;
  }
  return {
    killed,
    deaths: s.deaths,
    hp: s.player.hp,
    maxHp: s.player.maxHp,
    attack: s.player.attack,
    defense: s.player.defense,
    bossHp: boss.hp,
    hits,
  };
}
