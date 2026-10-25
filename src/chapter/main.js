import './chapter.css';
import {
  createChapter,
  updateChapter,
  chapterAction,
  serializeChapter,
  CHAPTER_SAVE_KEY,
  SKILLS,
  BUILDS,
  QUESTS,
  dismantlePreview,
} from './engine.js';
import { MAPS } from './world.js';
import { SLOTS, RARITIES, AFFIXES, itemScore } from './gear.js';
import { ChapterRenderer } from './renderer.js';
import { loadChapterArt, vanguardArt } from './art.js';
import { artReady } from '../art.js';
import { createInput } from '../input.js';
import { createFixedStepper } from '../loop.js';
import { GameAudio } from '../audio.js';
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export function startChapter() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(CHAPTER_SAVE_KEY) || 'null');
  } catch {}
  let state = createChapter(saved),
    started = false,
    panel = null,
    last = performance.now(),
    elapsedSave = 0,
    hudTime = 0,
    saveAvailable = true;
  const root = document.getElementById('ui'),
    canvas = document.getElementById('game-canvas');
  root.innerHTML = `<div class="chapter-shell"><header class="chapter-identity"><span class="chapter-crest">☀</span><div><small>DAWNTRAIL · VANGUARD</small><strong>Aether <span class="chapter-level"></span></strong><div class="chapter-meter hp"><i></i><span></span></div><div class="chapter-meter mp"><i></i><span></span></div></div></header><nav class="chapter-nav"><button data-action="map" aria-label="Region map">♧<small>Region</small></button><button data-action="bag" aria-label="Bag & build">▣<small>Bag</small></button><button data-action="quest" aria-label="Story & guide">♧<small>Story</small></button><button data-action="pause" aria-label="Pause chapter">Ⅱ<small>Pause</small></button></nav><div class="chapter-location"><small>THE LANTERN COAST</small><strong></strong></div><button class="chapter-tracker" data-action="quest"><small>THE LANTERN VOW</small><strong></strong><span></span></button><div class="chapter-status"><button data-action="auto" class="chapter-auto">AUTO OFF</button><span class="chapter-pip"></span><span class="chapter-vow"></span></div><div class="chapter-wallet"></div><div class="chapter-boss" hidden><strong></strong><div><i></i></div><span></span></div><div class="chapter-notice" role="status"></div><div class="chapter-movement"><div data-joystick aria-label="Movement joystick" class="chapter-stick"><span>↑</span><i></i><span>↓</span></div><small>MOVE · CLIMB</small></div><div class="chapter-combat"><div class="chapter-skills">${SKILLS.map((d, i) => `<button data-control="${i ? 'skill' + (i + 1) : 'skill'}" aria-label="${d.name}" title="${d.name} [${d.key}]"><b>${d.icon}</b><small>${d.key}</small><span class="chapter-cd" data-slot="${i}"></span></button>`).join('')}</div><div class="chapter-physical"><button data-action="potion" aria-label="Use tonic" class="chapter-tonic">♙<small></small></button><button data-control="guard" aria-label="Hold shield guard">⛨<small>GUARD</small></button><button data-control="jump" aria-label="Jump or air advance">↑<small>JUMP</small></button><button data-control="attack" aria-label="Hammer attack" class="chapter-attack">⚒<small>ATTACK</small></button></div></div><button data-control="interact" class="chapter-interact">↗ <span>Interact · E</span></button><button data-control="buff" class="chapter-buff" aria-label="Lantern Vow buff">☀ <span>VOW · F</span></button><div class="chapter-exp"><i></i><span></span></div><div class="chapter-overlay"><section class="chapter-panel" role="dialog" aria-modal="true" aria-label="Dawntrail chapter"></section></div></div>`;
  const $ = (q) => root.querySelector(q),
    input = createInput(document),
    renderer = new ChapterRenderer(canvas),
    stepper = createFixedStepper((controls, dt) => updateChapter(state, controls, dt)),
    audio = new GameAudio(state.settings);
  const persist = () => {
    const data = serializeChapter(state);
    if (data)
      try {
        localStorage.setItem(CHAPTER_SAVE_KEY, JSON.stringify(data));
        saveAvailable = true;
      } catch {
        saveAvailable = false;
      }
  };
  function resetInput() {
    input.clear();
    stepper.reset();
    last = performance.now();
  }
  function close() {
    panel = null;
    $('.chapter-overlay').hidden = true;
    state.paused = !started;
    resetInput();
  }
  function show(name) {
    panel = name;
    state.paused = true;
    resetInput();
    $('.chapter-overlay').hidden = false;
    renderPanel();
  }
  const gearLine = (i) =>
    `${i.attack ? 'ATK ' + Math.round(i.attack * (1 + i.stars * 0.12)) : 'DEF ' + Math.round(i.defense * (1 + i.stars * 0.12))} · Lv.${i.level} ${i.stars ? '· ★' + i.stars : ''}`;
  const affixLine = (i) =>
    (i.affixes || []).map((a) => `<span>+${a.value}% ${AFFIXES[a.stat]}</span>`).join('');
  function itemRow(item, worn = false) {
    const rarity = RARITIES[item.rarity],
      equipped = state.player.equipment[item.type],
      better = !worn && itemScore(item) > itemScore(equipped);
    return `<article class="chapter-item" style="--rarity:${rarity.color}"><div class="chapter-item-icon">${item.icon || '✧'}</div><div><small>${rarity.name} · ${item.type}${better ? ' · UPGRADE' : ''}</small><strong>${escape(item.name)}</strong><span>${gearLine(item)}</span><div class="chapter-affixes">${affixLine(item)}</div></div><div class="chapter-item-actions">${worn ? `<button data-action="forge" data-value="${item.type}" ${item.stars >= 10 ? 'disabled' : ''}>★ Enhance<small>${80 * (item.stars + 1) ** 2}g + 1 core</small></button>` : `<button data-action="equip" data-value="${item.id}" ${item.level > state.player.level ? 'disabled' : ''}>Equip</button><button data-action="lock" data-value="${item.id}" aria-label="${item.locked ? 'Unlock' : 'Lock'} ${escape(item.name)}">${item.locked ? '🔒' : '♧'}</button>`}</div></article>`;
  }
  function renderPanel() {
    const p = state.player;
    let content = '',
      title = '';
    if (panel === 'intro') {
      $('.chapter-panel').innerHTML =
        `<div class="chapter-intro"><div class="chapter-intro-mark">☀</div><small>AETHERSTORY · A PLAYABLE NEW CHAPTER</small><h1>The Lantern Vow</h1><p>A hammer. A shield. A promise to keep the light alive.</p><div class="chapter-intro-columns"><div><h3>A region to discover</h3><p>Four separate maps. Hidden upper paths, rare relics, and a guardian who remembers your vow.</p></div><div><h3>A Vanguard to build</h3><p>Timed holy strikes, shield guard and an aerial advance. Random gear with percentage bonuses.</p></div></div><button class="chapter-primary" data-action="begin">Begin the chapter</button><button class="chapter-secondary" data-action="training">Try all skills in training · Lv.10</button><small class="chapter-save-note">${saved ? 'Continue your saved Dawntrail progress.' : 'New chapter · separate save from your original adventure.'} Training never overwrites progress.</small><a href="?">Return to original adventure</a></div>`;
      return;
    }
    if (panel === 'bag') {
      title = 'Vanguard · Bag & build';
      content = `<div class="chapter-bag-tools"><button data-action="best">Equip Best</button><button data-action="dismantle-preview">Dismantle Low Gear</button></div><div class="chapter-power"><strong>${p.combatPower} POWER</strong><span>ATK ${p.attack} · DEF ${p.defense} · HP ${p.maxHp} · MP ${p.maxMp}</span><span>STR ${p.attributes.STR} · Crit ${Math.round(p.critRate * 100)}% · Holy +${Math.round((p.skillDamageMultiplier - 1) * 100)}%</span><span>Gear: ${
        Object.entries(AFFIXES)
          .filter(([key]) => p.affixes[key] > 0)
          .map(([key, label]) => `+${p.affixes[key]}% ${label}`)
          .join(' · ') || 'No percentage bonuses equipped yet'
      }</span></div><div class="chapter-builds">${Object.entries(BUILDS)
        .map(
          ([id, b]) =>
            `<button data-action="build" data-value="${id}" class="${state.build === id ? 'selected' : ''}"><strong>${b.name}</strong><small>${b.detail}</small></button>`,
        )
        .join(
          '',
        )}</div><button data-action="mastery" class="chapter-mastery" ${p.sp <= 0 || state.mastery >= 10 ? 'disabled' : ''}>Hammer mastery ${state.mastery}/10 · Learn for 1 SP <small>${p.sp} SP available · +2.5% attack / +1.5% holy damage per rank</small></button><details><summary>Worn equipment · ${Object.values(p.equipment).filter(Boolean).length}/6 · enhance here</summary>${Object.values(
        p.equipment,
      )
        .filter(Boolean)
        .map((i) => itemRow(i, true))
        .join(
          '',
        )}</details><h3>Loot bag · ${p.inventory.length}/72</h3><div class="chapter-items">${p.inventory.length ? p.inventory.map((i) => itemRow(i)).join('') : '<p class="chapter-empty">Hunt creatures for equipment. Jellies favor boots and capes; wardens carry weapons and armor.</p>'}</div>`;
    }
    if (panel === 'dismantle') {
      title = 'Dismantle low gear';
      const plan = dismantlePreview(state);
      content = `<p>Dismantle ${plan.ids.length} items for <strong>${plan.gold} gold + ${plan.cores} star cores</strong>?</p><p>Only lower-scoring Normal/Rare equipment. Equipped, locked, starred and higher-level items are protected.</p><div class="chapter-confirm"><button data-action="bag">Cancel</button><button data-action="dismantle-confirm" data-value="${plan.ids.join('|')}" class="chapter-primary" ${plan.ids.length ? '' : 'disabled'}>Confirm dismantle</button></div>`;
    }
    if (panel === 'map') {
      title = 'The Lantern Coast';
      content = `<p>Portals connect separate places. Walk to an unexplored destination; revisit discovered maps from this board.</p><div class="chapter-map-grid">${Object.entries(
        MAPS,
      )
        .map(
          ([id, m], i) =>
            `<article class="chapter-map-card ${state.mapId === id ? 'current' : ''}"><small>0${i + 1} · ${id === 'hollow' ? 'VILLAGE' : id === 'sanctuary' ? 'GUARDIAN ARENA' : 'HUNTING GROUND'}</small><h3>${m.name}</h3><p>${m.note}</p><span>${m.width} wide · ${m.platforms.length + 1} terrain levels</span><button data-action="travel" data-value="${id}" ${!state.visited.includes(id) || id === state.mapId ? 'disabled' : ''}>${id === state.mapId ? 'You are here' : state.visited.includes(id) ? 'Revisit' : 'Discover through a portal'}</button></article>`,
        )
        .join('')}</div>`;
    }
    if (panel === 'quest') {
      title = state.questIndex < 3 ? QUESTS[state.questIndex].name : 'A promise kept';
      content = `<p class="chapter-dialogue">${state.questIndex < 3 ? QUESTS[state.questIndex].text : 'Rowan: “You brought the bell’s voice home. Our lanterns will carry it beyond the coast.”'}</p><div class="chapter-power"><strong>${state.questIndex < 3 ? QUESTS[state.questIndex].reward : 'Chapter complete'}</strong><span>${state.questIndex === 0 ? `${state.questProgress}/8 field creatures defeated` : state.questIndex === 1 ? 'Reach the Last Bell on the highest path of Bellroot Rise.' : state.questIndex === 2 ? 'Defeat Aurel in Broken Sanctuary.' : 'Explore, seek rarer loot and refine your build.'}</span></div><h3>The Vanguard’s handbook</h3><div class="chapter-handbook">${SKILLS.map((d) => `<div><strong>${d.icon} ${d.name} · Lv.${d.level}</strong><p>${d.description} ${d.mp} MP · ${d.cd}s cooldown</p></div>`).join('')}</div><p><b>Jump twice:</b> aerial advance once per jump. <b>Hold shield:</b> block frontal attacks. <b>Vow [F]:</b> Lv.3 blessing lasts 12s. <b>Down + Jump:</b> drop through a ledge. Climb with the joystick or W/S.</p>`;
    }
    if (panel === 'pause') {
      title = state.training ? 'Training session' : 'Campfire';
      content = `<p>${state.training ? 'All skills available. No training progress is saved.' : saveAvailable ? 'Chapter progress is saved locally. Your original adventure save is untouched.' : 'Storage is unavailable; this chapter is session-only.'}</p><div class="chapter-pause-actions"><button data-action="resume">Resume chapter</button><button data-action="shop" ${p.gold < 45 ? 'disabled' : ''}>Buy tonic · 45 gold <small>40% HP + 25% MP · 8s cooldown</small></button><button data-action="camp">Return to Lantern Hollow</button><button data-action="training">Try all skills in training</button>${state.training ? '<button data-action="return-save">Return to saved chapter</button>' : ''}<button data-action="sound">Sound: ${state.settings.sound ? 'ON' : 'OFF'}</button><a href="?">Original adventure</a></div><p>WASD / joystick · Space jump/advance · J attack · Z/X/C/V skills · G hold guard · F blessing · E interact</p>`;
    }
    $('.chapter-panel').innerHTML =
      `<header><div><small>THE LANTERN VOW</small><h2>${title}</h2></div><button data-action="close" aria-label="Close panel">×</button></header><div class="chapter-panel-content">${content}</div><footer>${p.gold.toLocaleString()} gold · ${state.starCores} cores · ${p.tonics} tonics${state.training ? ' · TRAINING · NOT SAVED' : ''}</footer>`;
  }
  root.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button || button.disabled) return;
    audio.unlock();
    const action = button.dataset.action,
      arg = button.dataset.value;
    if (action === 'begin') {
      started = true;
      close();
      return;
    }
    if (action === 'training') {
      persist();
      state = createChapter(null, { training: true });
      started = true;
      renderer.initialized = false;
      close();
      return;
    }
    if (action === 'return-save') {
      state = createChapter(saved);
      try {
        state = createChapter(JSON.parse(localStorage.getItem(CHAPTER_SAVE_KEY) || 'null'));
      } catch {}
      started = true;
      close();
      return;
    }
    if (action === 'close' || action === 'resume') {
      close();
      return;
    }
    if (['bag', 'map', 'quest', 'pause'].includes(action)) {
      show(action);
      return;
    }
    if (action === 'dismantle-preview') {
      if (!dismantlePreview(state).ids.length) {
        state.notice = 'Nothing to dismantle';
        state.noticeTimer = 3;
      } else show('dismantle');
      return;
    }
    if (action === 'dismantle-confirm') {
      chapterAction(state, 'dismantle', arg);
      persist();
      show('bag');
      return;
    }
    if (action === 'camp') {
      chapterAction(state, 'travel', 'hollow');
      persist();
      close();
      return;
    }
    if (action === 'travel') {
      if (state.visited.includes(arg)) chapterAction(state, 'travel', arg);
      persist();
      close();
      return;
    }
    if (action === 'sound') state.settings.sound = !state.settings.sound;
    else chapterAction(state, action, arg);
    persist();
    updateHUD();
    if (panel) renderPanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && started) {
      e.preventDefault();
      if (panel) close();
      else show('pause');
    }
    if (!panel && started && ['KeyI', 'KeyM', 'KeyQ', 'KeyP'].includes(e.code)) {
      e.preventDefault();
      show({ KeyI: 'bag', KeyM: 'map', KeyQ: 'quest', KeyP: 'pause' }[e.code]);
    }
  });
  function updateHUD() {
    const p = state.player;
    $('.chapter-level').textContent = 'Lv.' + p.level;
    for (const [key, value, max] of [
      ['hp', p.hp, p.maxHp],
      ['mp', p.mp, p.maxMp],
    ]) {
      $('.chapter-meter.' + key + ' i').style.width = (value / max) * 100 + '%';
      $('.chapter-meter.' + key + ' span').textContent = `${Math.ceil(value)} / ${max}`;
    }
    $('.chapter-location strong').textContent = MAPS[state.mapId].name;
    $('.chapter-wallet').textContent =
      `● ${p.gold.toLocaleString()}  ✦ ${state.starCores}${state.training ? ' · TRAINING' : ''}`;
    $('.chapter-tracker strong').textContent = QUESTS[state.questIndex]?.name || 'A promise kept';
    $('.chapter-tracker span').textContent =
      state.questIndex === 0
        ? `Sunpetal Fields · ${state.questProgress}/8 creatures`
        : state.questIndex === 1
          ? 'Bellroot Rise · reach the Last Bell'
          : state.questIndex === 2
            ? 'Broken Sanctuary · defeat Aurel'
            : 'Chapter complete · keep exploring';
    const boss = state.enemies.find((e) => e.isBoss && e.hp > 0);
    $('.chapter-boss').hidden = !boss;
    if (boss) {
      $('.chapter-boss strong').textContent = boss.name;
      $('.chapter-boss i').style.width = (boss.hp / boss.maxHp) * 100 + '%';
      $('.chapter-boss span').textContent =
        boss.telegraph > 0
          ? boss.attackPhase === 'pillars'
            ? 'LEAVE THE MARKED LIGHT'
            : 'JUMP THE SHOCKWAVE'
          : Math.ceil(boss.hp) + ' / ' + boss.maxHp;
    }
    $('.chapter-auto').textContent = 'AUTO ' + (state.autoBattle ? 'ON' : 'OFF');
    $('.chapter-auto').classList.toggle('active', state.autoBattle);
    $('.chapter-pip').textContent =
      'PIP · ' +
      (state.pet.healCooldown > 0 ? `heal ${Math.ceil(state.pet.healCooldown)}s` : 'heal ready');
    $('.chapter-vow').textContent = p.buffRemaining > 0 ? `VOW ${Math.ceil(p.buffRemaining)}s` : '';
    $('.chapter-notice').textContent = state.noticeTimer > 0 ? state.notice : '';
    $('.chapter-notice').hidden = state.noticeTimer <= 0;
    $('.chapter-tonic small').textContent =
      p.potionCooldown > 0 ? Math.ceil(p.potionCooldown) + 's' : p.tonics;
    $('.chapter-buff span').textContent =
      p.level < 3
        ? 'VOW · Lv.3'
        : p.buffCooldown > 0
          ? 'VOW ' + Math.ceil(p.buffCooldown) + 's'
          : 'VOW · F';
    for (let i = 0; i < 4; i++) {
      const cd = $(`[data-slot="${i}"]`);
      cd.textContent =
        p.level < SKILLS[i].level
          ? 'Lv.' + SKILLS[i].level
          : p.skillCooldowns[i] > 0
            ? Math.ceil(p.skillCooldowns[i])
            : '';
      cd.parentElement.disabled =
        p.level < SKILLS[i].level || p.skillCooldowns[i] > 0 || p.mp < SKILLS[i].mp;
    }
    const nearPortal = state.world.portals.find(
      (t) => Math.abs(p.x + p.w / 2 - t.x) < 100 && Math.abs(p.y + p.h - t.y) < 80,
    );
    $('.chapter-interact span').textContent = nearPortal ? nearPortal.label : 'Interact · E';
    $('.chapter-exp i').style.width = Math.min(100, (p.xp / p.xpToNext) * 100) + '%';
    $('.chapter-exp span').textContent = `Lv.${p.level} · ${p.xp}/${p.xpToNext} XP`;
    renderer.hudOcclusions = [
      ...root.querySelectorAll(
        '.chapter-identity,.chapter-nav,.chapter-location,.chapter-tracker,.chapter-status,.chapter-boss,.chapter-movement,.chapter-combat,.chapter-buff,.chapter-interact,.chapter-exp',
      ),
    ]
      .filter((e) => e.getClientRects().length)
      .map((e) => {
        const b = e.getBoundingClientRect();
        return {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          kind: e.classList.contains('chapter-nav') ? 'top-right' : e.className,
        };
      });
  }
  window.dawntrail = Object.freeze({
    getSnapshot: () => structuredClone(state),
    getDiagnostics: () => ({
      scene: structuredClone(renderer.sceneDiagnostics || {}),
      text: structuredClone(renderer.textDiagnostics || {}),
      motionFrames: vanguardFrames(),
      saveAvailable,
    }),
  });
  function vanguardFrames() {
    return vanguardArt.frames.length;
  }
  window.addEventListener('resize', () => {
    renderer.resize();
    updateHUD();
  });
  window.addEventListener('blur', () => {
    resetInput();
    if (started && !panel) show('pause');
  });
  document.addEventListener('visibilitychange', () => {
    persist();
    resetInput();
    if (document.hidden && started && !panel) show('pause');
  });
  show('intro');
  updateHUD();
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (started && !panel) {
      stepper.advance(dt, input.sample());
      elapsedSave += dt;
      if (state.dialogue) {
        state.dialogue = false;
        show('quest');
      }
      if (elapsedSave >= 4) {
        persist();
        elapsedSave = 0;
      }
    } else resetInput();
    hudTime += dt;
    if (hudTime > 0.08) {
      updateHUD();
      hudTime = 0;
    }
    renderer.render(state, dt);
    if (started) {
      audio.settings = state.settings;
      audio.update(state);
    }
    requestAnimationFrame(frame);
  }
  Promise.all([document.fonts?.ready, artReady, loadChapterArt()]).then(() => {
    last = performance.now();
    requestAnimationFrame(frame);
  });
  if (import.meta.env.PROD && !import.meta.env.VITE_SINGLE_FILE && 'serviceWorker' in navigator)
    navigator.serviceWorker.register(new URL('./sw.js', location.href)).catch(() => {});
}
