import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game/engine.js';

test('all four areas define usable portals and travel respects locked destinations', () => {
  const state = game.createGame({ player: { level: 25 } });
  for (const area of state.world.areas) {
    assert.ok(area.portals?.length > 0, `${area.id} needs portals`);
    game.travelToArea(state, area.id);
    const portal = area.portals[0];
    state.player.x = portal.x - state.player.w / 2;
    state.player.y = portal.y - state.player.h;
    assert.equal(game.interactWorld(state), true);
    assert.equal(state.currentArea, portal.targetArea);
  }
  const fresh = game.createGame(),
    portal = fresh.world.areas[0].portals[0];
  fresh.player.x = portal.x - fresh.player.w / 2;
  assert.equal(game.interactWorld(fresh), false);
  assert.equal(fresh.currentArea, 'emerald_glade');
});

test('NPC interaction follows map coordinates and grants its completed quest only once', () => {
  const state = game.createGame();
  const npc = state.world.areas[0].npc;
  npc.x = 710;
  npc.y = 680;
  assert.equal(game.interactWorld(state), false);
  state.player.x = npc.x - state.player.w / 2;
  state.player.y = npc.y - state.player.h;
  state.quest.kills = state.quest.target;
  const before = state.player.gold;
  assert.equal(game.interactWorld(state), true);
  assert.equal(state.player.gold, before + 500);
  game.interactWorld(state);
  assert.equal(state.player.gold, before + 500);
});

test('down-jump cannot drop through the actual ground platform', () => {
  const state = game.createGame();
  game.updateGame(state, { down: true, jump: true }, 1 / 120);
  assert.equal(state.player.dropPlatformId, null);
  assert.ok(state.player.vy < 0);
});
