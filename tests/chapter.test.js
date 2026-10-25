import test from 'node:test';
import assert from 'node:assert/strict';
import { createMap, MAPS } from '../src/chapter/world.js';
import { rollGear, gearStats, canDismantle, itemScore } from '../src/chapter/gear.js';
test('chapter worlds are separate, large, distinct and linked by reciprocal portals', () => {
  const worlds=Object.keys(MAPS).map(createMap);
  assert.equal(worlds.length,4);
  assert.ok(worlds.every(m=>m.width>=1500));
  assert.equal(new Set(worlds.map(m=>JSON.stringify(m.platforms.map(p=>[p.x,p.y,p.w])))).size,4);
  for(const m of worlds) for(const p of m.portals) {
    const target=createMap(p.target);
    assert.ok(target.portals.some(back=>back.target===m.id));
    assert.ok(m.platforms.some(f=>p.x>=f.x && p.x<=f.x+f.w && p.y===f.y));
  }
  const a=createMap('fields'),b=createMap('fields');a.platforms[0].y=0;
  assert.notEqual(a.platforms[0].y,b.platforms[0].y);
  assert.notDeepEqual(new Set(createMap('fields').enemies.map(e=>e.type)),new Set(createMap('rise').enemies.map(e=>e.type)));
});
test('random gear has real bounded affixes and varying base rolls at the same rarity', () => {
  const a=rollGear(42,'weapon','epic',3),b=rollGear(43,'weapon','epic',3);
  assert.notDeepEqual(a,b);assert.equal(a.affixes.length,2);
  assert.ok(a.attack>0);assert.ok(a.affixes.every(a=>a.value>0&&a.value<=20));
  assert.deepEqual(a,rollGear(42,'weapon','epic',3));
  const flat=gearStats([{type:'weapon',attack:20,stars:0,affixes:[]}]);
  const rolled=gearStats([{type:'weapon',attack:20,stars:0,affixes:[{stat:'attackPct',value:10},{stat:'hpPct',value:8}]}]);
  assert.equal(flat.attack,rolled.attack);assert.equal(rolled.attackPct,10);assert.equal(rolled.hpPct,8);
  assert.ok(itemScore({...a,stars:3})>itemScore(a));
});
test('batch dismantle protects equipped, starred, locked and non-equipment items',()=>{
  const item=rollGear(7,'hat','rare',1);
  assert.equal(canDismantle(item,[]),true);
  for(const protectedItem of [{...item,locked:true},{...item,stars:1},{...item,type:'quest'},{...item,type:'potion'}])assert.equal(canDismantle(protectedItem,[]),false);
  assert.equal(canDismantle(item,[item]),false);
});
