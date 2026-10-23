/** Shared equipment comparison and area preparation used by game AI and balance policy. */
export const gearScore = (item) =>
  !item
    ? 0
    : (item[item.type === 'weapon' ? 'attack' : 'defense'] || 0) * (1 + (item.stars || 0) * 0.12);
export const AREA_READINESS = {
  emerald_glade: { attack: 0, defense: 0 },
  whispering_canopy: { attack: 75, defense: 60 },
  crystal_cavern: { attack: 175, defense: 150 },
  ember_altar: { attack: 300, defense: 250 },
};
export function areaReadiness(state, id) {
  const needed = AREA_READINESS[id];
  return (
    !!needed &&
    (state.player.baseAttack ?? state.player.attack) >= needed.attack &&
    (state.player.baseDefense ?? state.player.defense) >= needed.defense
  );
}
