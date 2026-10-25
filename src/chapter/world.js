/** Independent local worlds. Portals replace the world; no coordinate-based area gates. */
export const MAPS = {
  hollow: {name:'Lantern Hollow', subtitle:'A promise at first light',theme:'forest',width:1800,height:1000,ground:820,rank:0,npc:{id:'rowan',name:'Elder Rowan',x:370,y:820},
    platforms:[[660,680,330],[1090,555,300],[1450,680,220]],ropes:[[800,680,820],[1210,555,820]],
    portals:[{x:1670,y:820,target:'fields',label:'Sunpetal Fields'}],spawns:[],note:'Speak to Rowan, stock up, and follow the eastern lanterns.'},
  fields: {name:'Sunpetal Fields',subtitle:'Where the bells have fallen silent',theme:'forest',width:3000,height:1200,ground:1000,rank:1,
    platforms:[[200,820,440],[790,820,480],[460,650,420],[1030,620,460],[1510,820,470],[1980,650,530],[1700,480,400],[2420,820,420]],
    ropes:[[410,820,1000],[590,650,820],[1120,620,820],[1720,820,1000],[2070,650,1000],[1880,480,820],[2610,820,1000]],
    portals:[{x:105,y:1000,target:'hollow',label:'Lantern Hollow'},{x:2860,y:1000,target:'rise',label:'Bellroot Rise'}],
    spawns:[['slime',420,0],['slime',730,0],['mushroom',1130,0],['slime',1660,0],['mushroom',2530,0],['mushroom',370,1],['slime',970,2],['mushroom',1190,4],['mushroom',1810,7,'Gloamroot']],
    note:'Jellies gather by the road. Gloamroot guards the upper flowers.'},
  rise: {name:'Bellroot Rise',subtitle:'Above the forgotten canopy',theme:'canopy',width:2400,height:1500,ground:1320,rank:2,
    platforms:[[180,1120,500],[780,1120,440],[1400,1120,620],[400,920,570],[1130,920,550],[700,720,620],[1500,720,640],[1050,520,520],[1600,320,540]],
    ropes:[[400,1120,1320],[980,1120,1320],[1580,1120,1320],[600,920,1120],[1390,920,1120],[880,720,920],[1710,720,1120],[1200,520,720],[1740,320,720]],
    portals:[{x:105,y:1320,target:'fields',label:'Sunpetal Fields'},{x:2260,y:1320,target:'sanctuary',label:'Broken Sanctuary'}],
    spawns:[['boar',520,0],['boar',1280,0],['boar',1910,0],['wisp',350,1],['wisp',980,2],['boar',1560,3],['wisp',760,4],['wisp',1350,8],['wisp',1840,9,'Bellkeeper Echo']],
    beacon:{x:1890,y:320,name:'The Last Bell'},note:'Climb to the Last Bell for a guaranteed relic. Wardens patrol the road.'},
  sanctuary: {name:'Broken Sanctuary',subtitle:'The light beneath the stone',theme:'crystal',width:1700,height:1000,ground:820,rank:3,
    platforms:[[280,680,320],[1040,680,350],[630,530,460]],ropes:[[430,680,820],[1210,680,820],[820,530,820]],
    portals:[{x:110,y:820,target:'rise',label:'Bellroot Rise'}],
    spawns:[['guardian',1070,0,'Aurel, the Hollow Warden']],note:'Aurel marks the ground before striking. Jump the shockwave; leave the light pillars.'},
};
export function createMap(id='hollow') {
  if(!Object.hasOwn(MAPS,id))id='hollow';
  const d=structuredClone(MAPS[id]);
  const platforms=[{id:'ground',ground:true,x:0,y:d.ground,w:d.width,h:180},...d.platforms.map(([x,y,w],i)=>({id:`${id}-${i}`,x,y,w,h:32}))];
  const enemies=d.spawns.map(([type,x,index,name],i)=>{
    const p=platforms[index],boss=type==='guardian',elite=!!name&&!boss;
    const hp=boss?5800:elite?950:({slime:90,mushroom:145,boar:270,wisp:210}[type]);
    const w=boss?100:type==='boar'?64:46,h=boss?120:type==='mushroom'?52:42;
    return {id:`${id}-mob-${i}`,type,name:name||({slime:'Dewdrop Jelly',mushroom:'Sunpetal Cap',boar:'Briarback',wisp:'Bellroot Wisp'}[type]),x,y:p.y-h,w,h,vx:(i%2?1:-1)*(type==='boar'?52:30),facing:1,hp,maxHp:hp,damage:boss?52:elite?30:d.rank*7+7,platformId:p.id,homeMin:p.x+20,homeMax:p.x+p.w-20,spawnX:x,respawnTimer:0,hitTimer:0,deathTimer:0,isElite:elite,isBoss:boss,level:boss?10:elite?6:d.rank*2,attackTimer:0,attackPhase:'idle',telegraph:0,bossCooldown:2.5,rewarded:false,exp:boss?600:elite?140:d.rank*8+6};
  });
  const area={...d,id,x:0,end:d.width,portals:d.portals.map(p=>({...p,targetArea:p.target}))};
  return {...d,id,platforms,ropes:d.ropes.map(([x,y1,y2],i)=>({id:`${id}-rope-${i}`,x,y1,y2})),enemies,areas:[area]};
}
