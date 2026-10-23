import { BUFFS, BUFF_LEVEL, BUFF_MP, BUFF_DURATION, BUFF_COOLDOWN, RARITIES } from './game/rpg.js';
import { previewDismantle } from './game/engine.js';
import { gearScore } from './game/auto.js';
import { getDailyView } from './game/daily.js';
import { getStoryView, STORY_QUESTS } from './game/quests.js';
import { forgeCost, upgradeCost, POTION_PRICE } from './game/balance.js';
const PATHS = {
  sword: 'm5 19 4-4m-3-3 6 6m-2-7 8-8 3 0 0 3-8 8M3 21l3-3',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16',
  bag: 'M5 8h14l2 13H3ZM8 8V6a4 4 0 0 1 8 0v2',
  forge: 'm4 3 7 7m-3 3 5-5m-2-3 4-3 7 7-3 4Zm-2 10 3 3-6 6-3-3Z',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
  class: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM12 6v11m-4-7h8',
  pause: 'M8 5v14m8-14v14',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'm8 4 8 8-8 8',
  jump: 'M12 21V3m-7 7 7-7 7 7',
  spark: 'm13 2-9 12h7l-1 8 10-13h-7Z',
  heart: 'M12 21S1 14 3 7c2-5 7-3 9 0 2-3 7-5 9 0 2 7-9 14-9 14Z',
  potion: 'M9 2h6m-5 0v6l-5 9a3 3 0 0 0 3 5h8a3 3 0 0 0 3-5l-5-9V2M7 14h10',
  leaf: 'M20 3C3 1 1 15 8 19c9 5 14-8 12-16ZM4 22 17 7',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM10 2h4l1 4 4 1 3 3v4l-4 1-1 4-3 3h-4l-1-4-4-1-3-3v-4l4-1 1-4Z',
  coin: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v12m4-9c-1-3-8-2-7 1s7 1 7 4-6 4-8 1',
  lock: 'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4Zm8 5v3',
  helmet: 'M4 15v-4a8 8 0 0 1 16 0v4M3 15h18v6h-6l-3-5-3 5H3Zm9-12v9',
};
const icon = (name, extra = '') =>
  `<svg ${extra} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] || PATHS.star}"/></svg>`;
const slots = ['weapon', 'hat', 'armor', 'cape', 'gloves', 'boots'];
const title = (text) =>
  String(text || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const amount = (value) => Math.floor(n(value)).toLocaleString();
const button = (action, label, glyph, extra = '') =>
  `<button type="button" data-action="${action}" ${extra}>${glyph ? icon(glyph) : ''}<span>${label}</span></button>`;

export function createUI({ onAction = () => {}, onSettings = () => {} } = {}) {
  const root = document.querySelector('#ui');
  let state,
    started = false,
    panel = 'start',
    installPrompt,
    panelKey = '',
    forgeSlot = 'weapon',
    forgeRunning = false,
    forgeAttempted = false,
    forgeTime = 0,
    forgeStart = 0,
    frame,
    dead = false,
    portraitTipShown = false,
    portraitTipTimer,
    dismantleQuote = null,
    dismantleRarities = ['normal', 'rare'],
    bagTab = 'all';
  root.innerHTML = `
    <div class="top-hud">
      <button class="identity glass" data-action="character" aria-label="Open character"><span class="portrait">${icon('sword')}</span><span class="identity-copy"><b>Aether</b><span class="class-name">Vanguard · Adventurer</span><span class="vital hp"><i></i><span data-testid="hp">100 / 100</span></span><span class="vital mp"><i></i><span>60 / 60</span></span></span><span class="level-badge" data-testid="level">1</span></button>
      <div class="journey"><div class="brand">AETHERSTORY <small>M</small></div><span>CHRONICLES OF AETHERIA</span><div class="area-pill">${icon('leaf')}<b class="area-name">Emerald Glade</b><i></i><span>FIELD</span></div></div>
      <div class="top-right"><div class="wallet"><span>${icon('coin')}<b class="gold" data-testid="gold">300</b></span><span>${icon('star')}<b class="cores">5</b></span></div><nav class="quick-nav" aria-label="Adventure menus">${button('quests', 'Quests', 'bag')}${button('map', 'Map', 'map')}${button('shop', 'Shop', 'coin')}${button('inventory', 'Bag', 'bag')}${button('forge', 'Forge', 'forge')}${button('skills', 'Skills', 'spark')}${button('class', 'Class', 'class')}${button('pause', 'Pause', 'pause', 'aria-label="Pause game"')}</nav></div>
    </div>
    <aside class="field-info"><button class="minimap-toggle glass" data-action="toggle-minimap" aria-label="Toggle mini-map" aria-expanded="false">${icon('map')}<span>MINI-MAP</span></button><button class="minimap glass" data-action="map" aria-label="Open world map"><canvas width="190" height="70" aria-hidden="true"></canvas><span class="map-caption">EMERALD GLADE ${icon('map')}</span></button><div class="quest glass"><div class="eyebrow">THE LANTERN TRAIL</div><b class="story-title"></b><p class="quest-progress"></p><div><button data-action="quests">Journal</button><button data-action="follow-quest">Follow</button></div><div class="quest-line"><i></i></div></div></aside>
    <div class="story-strip glass"><button data-action="quests"><b class="story-strip-title"></b><small class="story-strip-progress"></small></button><button data-action="follow-quest">Follow</button></div>
    <div class="notice" role="status" aria-live="polite"></div>
    <div class="portrait-tip" hidden>${icon('map')} More room to explore in landscape</div>
    <div class="bottom-hud"><div class="movement"><div class="joystick" data-joystick role="group" aria-label="Movement joystick"><div class="joystick-ring"></div><span class="joystick-thumb"></span><span class="joystick-label">MOVE · CLIMB</span></div><span class="key-hint">W A S D · MOVE</span></div><div class="bottom-center"><button class="auto-button" data-action="auto" aria-pressed="false"><span class="auto-dot"></span>AUTO <small>OFF</small></button><div class="pet-status" aria-live="off"><b>✦ PIP</b><span>Auto loot · Heal ready</span></div><div class="utility-controls"><button data-control="interact" aria-label="Collect or interact">${icon('leaf')}<span>Collect <kbd>E</kbd></span></button><button data-action="potion" aria-label="Use health potion">${icon('potion')}<span class="potion-count">3</span></button></div><div class="save-indicator" data-status="pending" role="status" aria-live="polite"><i></i><span>SAVE PENDING</span></div></div><div class="combat-controls"><div class="skill-wheel">${[0, 1, 2, 3].map((i) => `<button class="skill skill-${i}" data-control="${i ? `skill${i + 1}` : 'skill'}" aria-label="Skill ${i + 1}"><span class="skill-glyph">${icon(['sword', 'spark', 'star', 'leaf'][i])}</span><span class="skill-cooldown"></span><span class="skill-key">${['Z', 'X', 'C', 'V'][i]}</span><span class="skill-level"></span></button>`).join('')}</div><button class="jump-button" data-control="jump" aria-label="Jump">${icon('jump')}<small>JUMP</small></button><button class="attack-button" data-control="attack" aria-label="Attack">${icon('sword')}<span>ATTACK</span><kbd>J</kbd></button></div></div>
    <div class="buff-deck"><button class="buff-button glass" data-control="buff" aria-label="Activate class buff"><span>✦</span><b>BUFF</b><small>F</small></button><div class="active-buff glass" hidden><b></b><span></span><i></i></div></div>
    <div class="ultimate-banner" hidden><small>ULTIMATE ART</small><strong></strong></div>
    <div class="level-growth glass" hidden></div>
    <div class="experience"><i></i><span>LEVEL 1 · 0 / 100 XP</span></div>
    <div class="modal-layer"><section class="modal" role="dialog" aria-modal="true" aria-label="Adventure menu" tabindex="-1"></section></div>`;
  const $ = (selector) => root.querySelector(selector),
    $$ = (selector) => [...root.querySelectorAll(selector)];
  const modal = $('.modal'),
    layer = $('.modal-layer');
  const setText = (selector, text) => {
    const element = $(selector);
    if (element && element.textContent !== String(text)) element.textContent = text;
  };
  function dispatch(action, payload) {
    onAction(action, payload);
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function actionButton(action, label, payload, className = 'secondary') {
    const el = node('button', className, label);
    el.type = 'button';
    el.dataset.action = action;
    if (payload !== undefined) el._payload = payload;
    return el;
  }
  function heading(kicker, name, description) {
    modal.innerHTML = `<header class="panel-header"><div><span class="eyebrow"></span><h1></h1></div>${button('close', 'Close', 'close', 'class="icon-close" aria-label="Close panel"')}</header><p class="panel-description"></p><div class="panel-body"></div>`;
    modal.querySelector('.eyebrow').textContent = kicker;
    modal.querySelector('h1').textContent = name;
    modal.querySelector('.panel-description').textContent = description;
    return modal.querySelector('.panel-body');
  }
  function itemRow(item, equipped = false) {
    const row = node('div', `item-row rarity-${item?.rarity || 'normal'}`),
      glyph = node('span', 'item-icon');
    glyph.innerHTML = icon(
      item?.type === 'potion' ? 'potion' : item?.type === 'weapon' ? 'sword' : 'helmet',
    );
    const copy = node('div', 'item-copy');
    copy.append(
      node('b', '', item?.name || 'Unknown item'),
      node(
        'small',
        '',
        `${title(item?.rarity || 'normal')} ${title(item?.type)}${item?.stars ? ` · ★${item.stars}` : ''}${slots.includes(item?.type) ? ` · +${Number(gearScore(item).toFixed(2))} ${item.type === 'weapon' ? 'ATK' : 'DEF'}` : ''}${item?.count > 1 ? ` · ×${item.count}` : ''}`,
      ),
    );
    const badge = node(
      'span',
      `rarity-badge rarity-${item.rarity || 'normal'}`,
      title(item.rarity || 'normal'),
    );
    copy.append(badge);
    if (!equipped && slots.includes(item.type)) {
      const upgrade = gearScore(item) > gearScore(state.player.equipment[item.type]);
      copy.append(
        node(
          'small',
          upgrade ? 'gear-upgrade' : 'gear-spare',
          upgrade ? '↑ Stat upgrade' : 'Spare gear',
        ),
      );
    }
    row.append(glyph, copy);
    if (equipped) row.append(node('span', 'equipped-label', 'Equipped'));
    else if (item.type === 'potion')
      row.append(actionButton('potion', 'Use', undefined, 'small-button'));
    else if (slots.includes(item.type)) {
      const actions = node('div', 'item-actions');
      const salvage = actionButton('salvage', 'Salvage', item.id, 'text-button');
      salvage.disabled = Boolean(item.locked);
      actions.append(actionButton('equip', 'Equip', item.id, 'small-button'), salvage);
      row.append(actions);
    }
    if (!equipped) {
      const lock = actionButton('lock-item', '', item.id, 'item-lock');
      lock.innerHTML = icon('lock');
      lock.setAttribute('aria-label', `${item.locked ? 'Unlock' : 'Lock'} ${item.name}`);
      lock.setAttribute('aria-pressed', String(Boolean(item.locked)));
      row.append(lock);
    }
    return row;
  }
  function getClasses() {
    const fallback = [
      {
        id: 'vanguard',
        name: 'Vanguard',
        description: 'A steadfast blade. Close combat and enduring strength.',
      },
      {
        id: 'arcanist',
        name: 'Arcanist',
        description: 'Shape aether into powerful ranged spells.',
      },
      {
        id: 'nightblade',
        name: 'Nightblade',
        description: 'Swift strikes from the edge of the shadows.',
      },
      { id: 'ranger', name: 'Ranger', description: 'A precise bow and the spirit of the wild.' },
    ];
    return Array.isArray(state?.classes)
      ? state.classes
      : state?.classes && typeof state.classes === 'object'
        ? Object.entries(state.classes).map(([id, value]) => ({ id, ...value }))
        : fallback;
  }
  function renderDailyBoard(body) {
    const view = getDailyView(state),
      section = node('section', 'daily-board story-summary');
    section.append(
      node('div', 'eyebrow', 'COURIER BOUNTIES · ALL AREAS'),
      node('h2', '', 'Rowan’s daily board'),
    );
    section.append(
      node(
        'p',
        '',
        `${view.remaining}/3 rewards left today · Resets at local midnight. Any area’s guide carries Rowan’s board. XP scales to your level; cores and tonics prepare you for the next area.`,
      ),
    );
    if (view.bounty) {
      const b = view.bounty;
      section.append(
        node('h3', '', b.title),
        node(
          'p',
          '',
          `Defeat ${b.count} creatures in any area · ${view.progress}/${b.count} · ${view.rewards.xp} XP · ${b.gold} gold · ${b.cores} cores · ${b.tonics} tonics`,
        ),
      );
      const guide = state.world.areas.find((a) => a.id === state.currentArea)?.npc,
        p = state.player;
      const near =
        guide && Math.hypot(p.x + p.w / 2 - guide.x, p.y + p.h - guide.y) < 80 && p.hp > 0;
      if (view.status === 'available' || view.status === 'ready') {
        const el = actionButton(
          view.status === 'ready' ? 'claim-daily' : 'accept-daily',
          view.status === 'ready' ? 'Claim daily bounty' : 'Accept daily bounty',
          b.id,
        );
        el.disabled = !near;
        section.append(el);
        if (!near)
          section.append(
            node(
              'p',
              '',
              'Speak to a nearby guide to accept or claim. AUTO-quest can handle bounties while waiting for a level gate.',
            ),
          );
      } else
        section.append(
          node('b', 'story-objective', 'In progress · Pip and your journal will keep count'),
        );
    } else
      section.append(
        node(
          'b',
          'story-objective',
          'Three rewards claimed. Return tomorrow; the story and hunting grounds remain open.',
        ),
      );
    body.append(section);
  }
  function renderStory(body) {
    const view = getStoryView(state),
      q = view.quest;
    const summary = node('section', 'story-summary');
    if (q) {
      summary.append(
        node('div', 'eyebrow', `CHAPTER ${view.chapter} · ${view.area.name}`),
        node('h2', '', q.title),
      );
      const speaking = panel === 'dialogue' && state.dialogueNpcId === q.giverId;
      const lines = speaking
        ? view.status === 'ready'
          ? [q.thanks]
          : view.status === 'available'
            ? q.offer
            : [q.reminder, q.description]
        : [q.description];
      for (const line of lines) summary.append(node('p', '', line));
      summary.append(node('b', 'story-objective', view.description));
      summary.append(
        node(
          'p',
          'story-rewards',
          `Rewards · ${q.rewards.xp} XP · ${q.rewards.gold} gold${q.rewards.cores ? ` · ${q.rewards.cores} cores` : ''}${q.rewards.tonics ? ` · ${q.rewards.tonics} tonics` : ''}`,
        ),
      );
      const actions = node('div', 'story-actions');
      if (speaking && view.status === 'available')
        actions.append(actionButton('accept-story', 'Accept quest', q.id, 'primary'));
      if (speaking && view.status === 'ready')
        actions.append(actionButton('turn-in-story', 'Turn in quest', undefined, 'primary'));
      const follow = actionButton(
        'follow-quest',
        state.story.autoQuest ? 'Stop following' : 'Follow quest',
      );
      follow.disabled = q.objective.kind === 'boss' && view.status === 'active';
      actions.append(follow);
      summary.append(actions);
      if (!speaking && panel === 'dialogue')
        summary.append(
          node(
            'p',
            '',
            `Your next guide is ${view.npc.name}. Open your journal or follow the trail.`,
          ),
        );
    } else
      summary.append(
        node('h2', '', 'The lantern trail is restored'),
        node('p', '', 'Four lights shine again. Your adventure continues in the hunting grounds.'),
      );
    body.append(summary);
    renderDailyBoard(body);
    body.append(
      node(
        'p',
        'story-help',
        'AUTO-quest travels through unlocked portals, accepts missions, hunts, gathers drops and returns to your guide. Manual movement takes priority. It pauses on death and before the guardian fight.',
      ),
    );
    if (panel !== 'quests') return;
    const list = node('div', 'story-list');
    STORY_QUESTS.forEach((quest, index) => {
      const row = node('article', 'story-entry');
      const done = index < state.story.completed.length;
      row.append(
        node(
          'small',
          'eyebrow',
          `${done ? 'COMPLETE' : quest.id === q?.id ? view.status.toUpperCase() : 'UPCOMING'} · CHAPTER ${state.world.areas.findIndex((a) => a.id === quest.areaId) + 1} · Lv.${quest.minLevel}`,
        ),
        node('h3', '', quest.title),
        node('p', '', quest.description),
      );
      list.append(row);
    });
    body.append(list);
    const bounty = node('section', 'story-entry'),
      old = state.quest;
    bounty.append(
      node('h3', '', 'Woodland bounty'),
      node(
        'p',
        '',
        `${old.kills}/${old.target} creatures · ${old.claimed ? 'Reward claimed' : 'An extra favor for Rowan'}`,
      ),
    );
    const claim = actionButton('claim', 'Claim bounty');
    claim.disabled = !old.completed || old.claimed;
    bounty.append(claim);
    body.append(bounty);
  }
  function renderPanel() {
    if (!panel) return;
    modal.className = `modal panel-${panel}`;
    if (panel === 'start') {
      modal.innerHTML = `<div class="start-emblem">${icon('leaf')}<span>✦</span></div><div class="eyebrow">A LITTLE WONDER. A GRAND ADVENTURE.</div><h1>AetherStory <em>M</em></h1><div class="start-subtitle">CHRONICLES OF AETHERIA</div><div class="start-rule"><span>✦</span></div><p>Beyond the familiar path,<br>your story is waiting.</p><button data-action="start" class="enter-button">Enter Aetheria ${icon('arrow')}</button><div class="start-controls"><span><kbd>WASD</kbd> Move</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>J</kbd> Attack</span><span><kbd>Z X C V</kbd> Skills</span></div><div class="start-foot">${icon('class')} Touch controls · Four classes · Play offline<br><span>Progress saves locally when browser storage is available.</span></div>`;
      return;
    }
    const p = state?.player || {},
      body = heading(
        'YOUR ADVENTURE',
        {
          quests: 'The lantern trail',
          dialogue:
            state?.world?.areas.find((a) => a.npc?.id === state.dialogueNpcId)?.npc.name ||
            'A traveler',
          shop: 'Rowan’s supplies',
          inventory: 'Traveler’s satchel',
          character: 'Aether, the adventurer',
          map: 'The world of Aetheria',
          class: 'Choose your calling',
          forge: 'The starforge',
          skills: 'Aether arts',
          skins: 'Damage signatures',
          pause: 'A moment of rest',
          settings: 'Make yourself at home',
          offline: 'Welcome back, adventurer',
        }[panel] || 'Adventure',
        {
          shop: 'Prepare for harder hunting grounds. Training and tonics cost gold.',
          inventory: 'Equip your discoveries. Keep a potion close.',
          character: 'Every journey leaves its mark.',
          map: 'New paths open as your story grows.',
          class: 'Four paths. One story. Change freely without losing progress.',
          forge: 'Stop the spark in the gold zone for a greater chance of success.',
          skills: `${amount(state?.sp)} skill points available · Master the arts of your class.`,
          skins: 'Choose how your hits light up the forest.',
          pause: 'Your adventure is paused. Take your time.',
          settings: 'Preferences are saved on this device.',
          offline: 'Your AUTO expedition has returned. Rewards are already added to your save.',
        }[panel] || '',
      );
    if (panel === 'quests' || panel === 'dialogue') {
      renderStory(body);
    } else if (panel === 'offline') {
      const summary = state.offlineSummary || {};
      const stats = node('div', 'stat-grid');
      for (const [label, value] of [
        ['Time away', `${Math.floor(n(summary.seconds) / 60)}m ${n(summary.seconds) % 60}s`],
        ['Creatures defeated', summary.kills],
        ['Experience', `+${amount(summary.xp)}`],
        ['Gold', `+${amount(summary.gold)}`],
        ['Starlight cores', `+${amount(summary.cores)}`],
      ]) {
        const cell = node('div', 'stat');
        cell.append(node('small', '', label), node('b', '', value ?? 0));
        stats.append(cell);
      }
      body.append(
        node('p', 'panel-description', summary.areaName || 'Emerald Glade'),
        stats,
        actionButton('offline-continue', 'Continue adventure', undefined, 'primary'),
      );
    } else if (panel === 'shop') {
      const list = node('div', 'shop-list');
      const tonic = node('article', 'shop-row');
      tonic.append(
        node('h2', '', 'Crimson Tonic'),
        node('p', '', `Restores 45% HP · 10s cooldown · ${POTION_PRICE} gold each`),
      );
      const buy = actionButton('buy-potion', 'Buy 5 tonics', 5, 'small-button');
      buy.disabled = p.gold < POTION_PRICE * 5;
      const single = actionButton('buy-potion', 'Buy 1 tonic', 1, 'small-button');
      single.disabled = p.gold < POTION_PRICE;
      tonic.append(single, buy);
      list.append(tonic);
      for (const [type, label, detail] of [
        ['vitality', 'Vitality', '+25 maximum HP per rank'],
        ['mastery', 'Weapon mastery', '+4 attack per rank'],
      ]) {
        const row = node('article', 'shop-row'),
          rank = state.upgrades?.[type] || 0;
        row.append(
          node('h2', '', `${label} · ${rank}/10`),
          node('p', '', `${detail} · ${amount(upgradeCost(rank))} gold`),
        );
        const train = actionButton('buy-upgrade', `Train ${type}`, type, 'small-button');
        train.disabled = rank >= 10 || p.gold < upgradeCost(rank);
        row.append(train);
        list.append(row);
      }
      body.append(list);
    } else if (panel === 'inventory') {
      if (dismantleQuote) {
        body.classList.add('dismantle-body');
        body.append(node('h2', '', 'Review dismantling'));
        const filters = node('fieldset', 'rarity-filters');
        filters.append(node('legend', '', 'Include rarities'));
        for (const rarity of ['normal', 'rare', 'epic']) {
          const label = node('label', ''),
            input = node('input', '');
          input.type = 'checkbox';
          input.dataset.rarity = rarity;
          input.checked = dismantleRarities.includes(rarity);
          label.append(input, document.createTextNode(title(rarity)));
          filters.append(label);
        }
        body.append(
          filters,
          node(
            'p',
            'dismantle-summary',
            `Dismantle ${dismantleQuote.ids.length} items for ${dismantleQuote.gold} gold + ${dismantleQuote.cores} star cores?`,
          ),
          node('p', '', 'Equip Best runs first. Starred, locked and non-gear items stay safe.'),
        );
        const actions = node('div', 'bag-toolbar');
        const confirm = actionButton('confirm-dismantle', 'Confirm', undefined, 'primary');
        confirm.disabled = !dismantleQuote.ids.length;
        actions.append(actionButton('cancel-dismantle', 'Cancel'), confirm);
        body.append(actions);
        return;
      }
      const tools = node('div', 'bag-toolbar');
      tools.append(
        actionButton('equip-best', 'Equip Best', undefined, 'primary'),
        actionButton('dismantle-low', 'Dismantle Low Gear'),
      );
      body.append(
        tools,
        node(
          'p',
          'bag-stats',
          `Attack ${p.attack} · Defense ${p.defense} · ${p.inventory.length} bag items`,
        ),
      );
      const tabs = node('nav', 'bag-tabs');
      tabs.setAttribute('aria-label', 'Bag categories');
      for (const [id, label] of [
        ['all', 'All items'],
        ['weapon', 'Weapons'],
        ['armor', 'Armor'],
        ['potion', 'Tonics'],
      ]) {
        const tab = actionButton('bag-tab', label, id, bagTab === id ? 'selected' : '');
        tab.setAttribute('aria-pressed', String(bagTab === id));
        tabs.append(tab);
      }
      body.append(tabs);
      const equipment = node('div', 'equipment-grid');
      for (const slot of slots) {
        const item = p.equipment?.[slot],
          cell = node('div', `equipment-slot ${item ? `rarity-${item.rarity}` : ''}`);
        const glyph = node('span', '');
        glyph.innerHTML = icon(slot === 'weapon' ? 'sword' : 'helmet');
        cell.append(
          glyph,
          node('small', '', title(slot)),
          node('b', '', item ? item.name : 'Empty'),
          node(
            'span',
            'slot-stars',
            item
              ? `${title(item.rarity)} · ${Number(gearScore(item).toFixed(2))} ${slot === 'weapon' ? 'ATK' : 'DEF'}${item.stars ? ` · ★${item.stars}` : ''}`
              : 'Find an upgrade',
          ),
        );
        equipment.append(cell);
      }
      const worn = node('details', 'worn-gear');
      worn.append(node('summary', '', 'Worn gear · 6 slots'), equipment);
      body.append(
        actionButton('shop', 'Visit supply shop', undefined, 'secondary'),
        worn,
        node('h2', 'section-title', 'IN THE SATCHEL'),
      );
      const list = node('div', 'item-list');
      const filtered = (p.inventory || [])
        .filter(
          (i) =>
            bagTab === 'all' ||
            (bagTab === 'armor'
              ? slots.includes(i.type) && i.type !== 'weapon'
              : i.type === bagTab),
        )
        .sort(
          (a, b) =>
            Object.keys(RARITIES).indexOf(b.rarity) - Object.keys(RARITIES).indexOf(a.rarity) ||
            gearScore(b) - gearScore(a),
        );
      for (const item of filtered) list.append(itemRow(item));
      if (!filtered.length) list.append(node('p', 'empty-state', 'Room for your next discovery.'));
      body.append(list);
    } else if (panel === 'character') {
      const hero = node('div', 'character-banner');
      hero.innerHTML = `${icon('class')}<div><h2>Aether</h2><p></p></div>`;
      hero.querySelector('p').textContent = `${title(state.classId)} · Level ${p.level || 1}`;
      body.append(
        hero,
        node('div', 'power-banner', `COMBAT POWER  ${amount(p.combatPower)}`),
        node('p', 'growth-note', 'Every level: +4 ATK · +2 DEF · +28 HP · +7 MP · +2 skill points'),
      );
      const attributes = node('div', 'attribute-grid');
      for (const [key, value] of Object.entries(p.attributes || {})) {
        const cell = node('div', key === p.mainAttribute ? 'main-attribute' : '');
        cell.append(
          node('small', '', key + (key === p.mainAttribute ? ' · MAIN' : '')),
          node('b', '', value),
        );
        attributes.append(cell);
      }
      body.append(attributes);
      const stats = node('div', 'stat-grid');
      for (const [label, value] of [
        ['Attack', p.attack],
        ['Defense', p.defense],
        ['Critical chance', `${(p.critRate * 100).toFixed(1)}%`],
        ['Critical damage', `${Math.round(p.critDamage * 100)}%`],
        [
          'Gear attack',
          Math.round(
            Object.values(p.equipment).reduce(
              (sum, i) => sum + (i?.attack || 0) * (1 + (i?.stars || 0) * 0.12),
              0,
            ),
          ),
        ],
        [
          'Gear defense',
          Math.round(
            Object.values(p.equipment).reduce(
              (sum, i) => sum + (i?.defense || 0) * (1 + (i?.stars || 0) * 0.12),
              0,
            ),
          ),
        ],
        ['Health', `${amount(p.hp)} / ${amount(p.maxHp)}`],
        ['Mana', `${amount(p.mp)} / ${amount(p.maxMp)}`],
        ['Creatures defeated', state.kills],
        ['Star cores', state.starCores],
      ]) {
        const cell = node('div', 'stat');
        cell.append(
          node('small', '', label),
          node('b', '', typeof value === 'number' ? amount(value) : value || '0'),
        );
        stats.append(cell);
      }
      body.append(
        stats,
        actionButton('inventory', 'Equipment & bag', undefined, 'primary'),
        actionButton('class', 'Change class', undefined, 'secondary'),
        actionButton('skin', 'Damage signatures', undefined, 'secondary skin-menu'),
      );
    } else if (panel === 'class') {
      const grid = node('div', 'class-grid');
      getClasses().forEach((entry, index) => {
        const card = node('div', `class-card ${state.classId === entry.id ? 'selected' : ''}`),
          sigil = node('div', 'class-sigil');
        sigil.innerHTML = icon(['sword', 'spark', 'class', 'leaf'][index % 4]);
        card.append(
          sigil,
          node('h2', '', entry.name || title(entry.id)),
          node(
            'p',
            '',
            entry.description ||
              entry.desc ||
              [
                'Steadfast steel and close-range strength.',
                'Aether magic and ranged elemental power.',
                'Swift blades and decisive shadow strikes.',
                'Ranged precision and woodland instinct.',
              ][index % 4],
          ),
          actionButton(
            'switch-class',
            state.classId === entry.id
              ? `${entry.name || title(entry.id)} · Selected`
              : `Choose ${entry.name || title(entry.id)}`,
            entry.id,
            'small-button',
          ),
        );
        grid.append(card);
      });
      body.append(grid);
    } else if (panel === 'map') {
      const areas = state.areas || state.world?.areas || [],
        map = node('div', 'world-map');
      areas.forEach((area, index) => {
        const unlocked =
            (state.unlockedAreas || []).includes(area.id) || n(p.level) >= n(area.minLevel),
          card = node(
            'div',
            `area-card theme-${area.theme || index} ${state.currentArea === area.id ? 'current' : ''} ${unlocked ? '' : 'locked'}`,
          );
        card.append(
          node('span', 'area-number', `0${index + 1}`),
          node('h2', '', area.name),
          node(
            'p',
            '',
            `Level ${area.minLevel || 1}${state.currentArea === area.id ? ' · You are here' : ''}`,
          ),
        );
        const travel = actionButton(
          'travel',
          unlocked
            ? state.currentArea === area.id
              ? 'Current area'
              : 'Travel here'
            : `Unlock at Lv. ${area.minLevel}`,
          area.id,
          'small-button',
        );
        travel.disabled = !unlocked || state.currentArea === area.id;
        card.append(travel);
        map.append(card);
      });
      body.append(map);
    } else if (panel === 'skills') {
      const buff = BUFFS[state.classId],
        card = node('article', 'buff-card');
      card.append(
        node('div', 'eyebrow', 'CLASS BUFF · F'),
        node('h2', '', buff.name),
        node(
          'p',
          '',
          `${buff.detail} · ${BUFF_DURATION}s duration · ${BUFF_COOLDOWN}s cooldown · ${BUFF_MP} MP · Lv.${BUFF_LEVEL}`,
        ),
      );
      body.append(card);
      const list = node('div', 'skill-list');
      (state.skillDefinitions || []).forEach((skill, index) => {
        const locked = n(p.level) < n(skill.reqLv),
          row = node('div', `skill-detail ${locked ? 'locked' : ''}`),
          glyph = node('span', 'skill-detail-icon');
        glyph.innerHTML = icon(['sword', 'spark', 'star', 'leaf'][index]);
        const copy = node('div', '');
        copy.append(
          node(
            'h2',
            '',
            `${skill.ultimate ? '✦ ULTIMATE · ' : ''}${skill.name} · ${Math.max(1, n(state.skillLevels?.[index]))}`,
          ),
          node('p', '', skill.description || 'Channel your aether into a powerful strike.'),
          node(
            'small',
            '',
            `${Math.ceil(skill.mp * (p.manaCostMultiplier || 1))} MP · ${skill.cd}s cooldown · Lv.${skill.reqLv || 1} · ${Math.round(skill.damage * (1 + (Math.max(1, n(state.skillLevels?.[index])) - 1) * 0.15) * 100)}% total → ${state.skillLevels[index] >= 30 ? 'MAX RANK' : `${Math.round(skill.damage * (1 + Math.max(1, n(state.skillLevels?.[index])) * 0.15) * 100)}% next rank`}`,
          ),
        );
        const upgrade = actionButton(
          'upgrade-skill',
          locked
            ? `Lv. ${skill.reqLv}`
            : state.skillLevels[index] >= 30
              ? 'MAX RANK'
              : 'Upgrade · 1 SP',
          index,
          'small-button',
        );
        upgrade.disabled = locked || n(state.sp) < 1 || state.skillLevels[index] >= 30;
        row.append(glyph, copy, upgrade);
        list.append(row);
      });
      body.append(list);
    } else if (panel === 'forge') {
      const options = node('div', 'forge-slots');
      slots.forEach((slot) => {
        const item = p.equipment?.[slot],
          choice = actionButton(
            'select-forge',
            title(slot),
            slot,
            `small-button ${forgeSlot === slot ? 'selected' : ''}`,
          );
        choice.disabled = !item || forgeRunning;
        options.append(choice);
      });
      body.append(options);
      const item = p.equipment?.[forgeSlot];
      if (item) body.append(itemRow(item, true));
      else body.append(node('p', 'empty-state', 'Equip an item before visiting the forge.'));
      const forge = node('div', 'forge-game');
      forge.innerHTML = `<div class="forge-orb">${icon('forge')}</div><p>Find the golden moment</p><div class="timing-track"><span class="success-zone"></span><i class="timing-marker"></i></div><div class="timing-labels"><span>STEADY</span><b>PERFECT</b><span>STEADY</span></div><small class="forge-cost"></small>`;
      forge.querySelector('.forge-cost').textContent =
        `★ ${n(item?.stars)} / 25 · ${amount(forgeCost(n(item?.stars)).gold)} gold + ${forgeCost(n(item?.stars)).cores} star core(s) per attempt`;
      body.append(forge);
      const go = actionButton(
        forgeRunning ? 'stop-forge' : 'begin-forge',
        forgeRunning ? 'STOP THE SPARK' : 'Begin forging',
        undefined,
        'primary forge-trigger',
      );
      go.disabled =
        !item ||
        n(item.stars) >= 25 ||
        (!forgeRunning &&
          (n(state.starCores) < forgeCost(n(item?.stars)).cores ||
            n(p.gold) < forgeCost(n(item?.stars)).gold));
      body.append(go);
      if (forgeAttempted && state.notice) {
        const result = node('p', 'forge-result', state.notice);
        result.setAttribute('role', 'status');
        body.append(result);
      }
    } else if (panel === 'skins') {
      const grid = node('div', 'skin-grid');
      for (const [id, color] of [
        ['amber', '#ffce75'],
        ['sakura', '#f09cbb'],
        ['frost', '#a7e6ff'],
        ['cyber', '#b9ff7e'],
        ['solar', '#fff29b'],
      ]) {
        const choice = actionButton(
          'skin',
          title(id),
          id,
          `skin-choice ${state.damageSkin === id ? 'selected' : ''}`,
        );
        choice.style.setProperty('--skin', color);
        const preview = node('b', '', '1,248');
        choice.prepend(preview);
        grid.append(choice);
      }
      body.append(grid);
    } else {
      if (panel === 'pause') {
        const actions = node('div', 'pause-actions');
        actions.append(
          actionButton('resume', 'Return to the forest', undefined, 'primary'),
          actionButton('settings', 'Settings', undefined, 'secondary'),
          actionButton('character', 'Character', undefined, 'secondary'),
          actionButton('install', 'Install adventure', undefined, 'secondary'),
        );
        body.append(actions);
      }
      const prefs = node('div', 'preferences');
      for (const [key, label, description] of [
        ['music', 'Music and forest ambience', 'A gentle soundtrack for your adventure'],
        ['sound', 'Sound effects', 'Soft combat and interface sounds'],
        ['particles', 'Aether particles', 'Magic, blossoms, and little sparks'],
        ['reducedMotion', 'Reduce motion', 'A calmer adventure with fewer effects'],
      ]) {
        const row = node('label', 'preference'),
          copy = node('span', '');
        copy.append(node('b', '', label), node('small', '', description));
        const input = node('input', '');
        input.type = 'checkbox';
        input.dataset.setting = key;
        input.checked =
          key === 'particles' ? state?.settings?.[key] !== false : Boolean(state?.settings?.[key]);
        row.append(copy, input, node('span', 'switch'));
        prefs.append(row);
      }
      body.append(prefs);
      const help = node('div', 'install-help');
      help.append(
        node('b', '', 'Take Aetheria with you'),
        node(
          'p',
          '',
          installPrompt
            ? 'Install for a full-screen adventure and quick access from your home screen.'
            : 'Android: browser menu → Install app. iPhone or iPad: Safari → Share → Add to Home Screen. Visit once online, then your adventure can continue offline.',
        ),
        node(
          'small',
          '',
          'Progress is stored in this browser. Clearing site data removes your save.',
        ),
      );
      if (installPrompt)
        help.append(actionButton('install', 'Install app', undefined, 'small-button'));
      body.append(help);
    }
  }
  function animateForge(time) {
    if (dead) return;
    if (forgeRunning) {
      forgeTime = (Math.sin((time - forgeStart) / 470 - Math.PI / 2) + 1) / 2;
      const marker = $('.timing-marker');
      if (marker) marker.style.left = `${forgeTime * 100}%`;
    }
    frame = requestAnimationFrame(animateForge);
  }
  frame = requestAnimationFrame(animateForge);
  function showPanel(name, nextState) {
    if (nextState) state = nextState;
    panel = name;
    dismantleQuote = null;
    panelKey = '';
    forgeRunning = false;
    forgeAttempted = false;
    layer.hidden = !name;
    root.classList.toggle('modal-open', Boolean(name));
    renderPanel();
    if (name !== 'start') modal.focus({ preventScroll: true });
  }
  function closePanel() {
    panel = null;
    forgeRunning = false;
    layer.hidden = true;
    root.classList.remove('modal-open');
    panelKey = '';
  }
  const click = (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action,
      payload = target._payload;
    if (action === 'bag-tab') {
      bagTab = payload;
      renderPanel();
      return;
    }
    if (action === 'dismantle-low') {
      dismantleRarities = ['normal', 'rare'];
      const quote = previewDismantle(state, dismantleRarities);
      if (!quote.ids.length) dispatch('nothing-dismantle');
      else {
        dismantleQuote = quote;
        renderPanel();
        modal.scrollTop = 0;
        modal.focus();
      }
      return;
    }
    if (action === 'cancel-dismantle') {
      dismantleQuote = null;
      renderPanel();
      return;
    }
    if (action === 'confirm-dismantle') {
      const quote = dismantleQuote;
      dismantleQuote = null;
      dispatch('dismantle-low', quote);
      renderPanel();
      return;
    }
    if (action === 'toggle-minimap') {
      onSettings({ ...state.settings, minimapCollapsed: !state.settings.minimapCollapsed });
      return;
    }
    if (action === 'select-forge') {
      forgeSlot = payload;
      renderPanel();
      return;
    }
    if (action === 'begin-forge') {
      forgeRunning = true;
      forgeStart = performance.now();
      renderPanel();
      return;
    }
    if (action === 'stop-forge') {
      forgeRunning = false;
      forgeAttempted = true;
      dispatch('forge-item', { slot: forgeSlot, timing: forgeTime });
      renderPanel();
      return;
    }
    if (action === 'skin' && payload === undefined) {
      showPanel('skins', state);
      return;
    }
    dispatch(action, payload);
  };
  const change = (event) => {
    const rarity = event.target.dataset.rarity;
    if (rarity) {
      dismantleRarities = event.target.checked
        ? [...dismantleRarities, rarity]
        : dismantleRarities.filter((r) => r !== rarity);
      dismantleQuote = previewDismantle(state, dismantleRarities);
      renderPanel();
      return;
    }
    const key = event.target.dataset.setting;
    if (key) onSettings({ ...(state?.settings || {}), [key]: event.target.checked });
  };
  const trapFocus = (event) => {
    if (!panel || event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not(:disabled),input,a[href]')];
    if (!focusable.length) return;
    const first = focusable[0],
      last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  root.addEventListener('keydown', trapFocus);
  function update(nextState) {
    state = nextState;
    const p = state.player;
    if (!p) return;
    const saveStatus = ['saved', 'unavailable'].includes(state.saveStatus)
      ? state.saveStatus
      : 'pending';
    $('.save-indicator').dataset.status = saveStatus;
    setText(
      '.save-indicator span',
      saveStatus === 'saved'
        ? 'LOCAL ADVENTURE · SAVED'
        : saveStatus === 'unavailable'
          ? 'LOCAL ADVENTURE · SESSION ONLY'
          : 'SAVE PENDING',
    );
    const collapsed = state.settings.minimapCollapsed !== false;
    root.classList.toggle('minimap-collapsed', collapsed);
    $('.minimap-toggle').setAttribute('aria-expanded', String(!collapsed));
    const currentClass = getClasses().find((entry) => entry.id === state.classId);
    setText(
      '.class-name',
      `${currentClass?.name || title(state.classId || 'vanguard')} · Adventurer`,
    );
    $('.portrait').style.setProperty(
      '--portrait-row',
      `${(Math.max(0, ['vanguard', 'arcanist', 'nightblade', 'ranger'].indexOf(state.classId)) * 100) / 3}%`,
    );
    setText('.level-badge', p.level);
    setText('.gold', amount(p.gold));
    setText('.cores', amount(state.starCores));
    for (const [type, value, max] of [
      ['hp', p.hp, p.maxHp],
      ['mp', p.mp, p.maxMp],
    ]) {
      $(`.${type} i`).style.width =
        `${Math.max(0, Math.min(100, (n(value) / Math.max(1, n(max))) * 100))}%`;
      setText(`.${type} span`, `${type.toUpperCase()} ${amount(value)} / ${amount(max)}`);
    }
    const area = (state.areas || state.world?.areas || []).find((a) => a.id === state.currentArea);
    setText('.area-name', area?.name || 'Emerald Glade');
    const caption = $('.map-caption');
    if (caption.firstChild?.nodeType === 3)
      caption.firstChild.textContent = `${(area?.name || 'Emerald Glade').toUpperCase()} `;
    const xp = (n(p.xp) / Math.max(1, n(p.xpToNext))) * 100;
    $('.experience i').style.width = `${Math.min(100, xp)}%`;
    setText('.experience span', `LEVEL ${p.level} · ${amount(p.xp)} / ${amount(p.xpToNext)} XP`);
    const auto = $('.auto-button');
    auto.classList.toggle('active', Boolean(state.auto));
    auto.setAttribute('aria-pressed', String(Boolean(state.auto)));
    setText('.auto-button small', state.auto ? 'ON' : 'OFF');
    const pet = state.pet;
    setText(
      '.pet-status span',
      pet?.healFlash > 0
        ? 'Healing you ♥'
        : `${pet?.mode === 'looting' ? 'Collecting loot' : 'Auto loot'} · ${pet?.healCooldown > 0 ? `Heal ${Math.ceil(pet.healCooldown)}s` : 'Heal ready'}`,
    );
    $('.pet-status').classList.toggle('healing', pet?.healFlash > 0);
    $('.identity').classList.toggle('low-hp', p.hp < p.maxHp * 0.3);
    const story = getStoryView(state),
      daily = getDailyView(state);
    if (started && !portraitTipShown && window.matchMedia('(orientation: portrait)').matches) {
      portraitTipShown = true;
      let seen = false;
      try {
        seen = sessionStorage.getItem('aether-portrait-hint') === 'shown';
        sessionStorage.setItem('aether-portrait-hint', 'shown');
      } catch {}
      if (!seen) {
        $('.portrait-tip').hidden = false;
        portraitTipTimer = setTimeout(() => {
          $('.portrait-tip').hidden = true;
        }, 5500);
      }
    }
    setText('.story-title', story.quest?.title || 'A trail restored');
    setText(
      '.quest-progress',
      state.story.autoQuest && state.story.status.startsWith('Gear up')
        ? state.story.status
        : story.description || 'All four chapters complete',
    );
    setText(
      '.story-strip-title',
      story.quest
        ? `${story.status === 'locked' ? 'Next: ' : ''}${story.quest.title}${story.status === 'locked' ? ` · Lv.${story.quest.minLevel}` : ''}`
        : 'A trail restored',
    );
    setText(
      '.story-strip-progress',
      state.autoStatus ||
        (state.story.autoQuest && state.story.status.startsWith('Gear up')
          ? state.story.status
          : story.status === 'locked'
            ? daily.status === 'active' || daily.status === 'ready'
              ? `Daily: ${daily.bounty.title} · ${daily.progress}/${daily.bounty.count}`
              : daily.status === 'available'
                ? 'Try a daily bounty · Rowan’s board'
                : 'Daily rewards claimed · train on the lantern trail'
            : state.story.autoQuest
              ? `AUTO · ${state.story.status}`
              : story.description || 'All chapters complete'),
    );
    $$('.story-strip [data-action="follow-quest"], .quest [data-action="follow-quest"]').forEach(
      (el) => {
        el.textContent = state.story.autoQuest ? 'Stop' : 'Follow';
        el.setAttribute('aria-pressed', String(state.story.autoQuest));
      },
    );
    $('.quest-line i').style.width =
      `${story.quest ? (story.progress / story.quest.objective.count) * 100 : 100}%`;
    const potions = (p.inventory || [])
      .filter((item) => item.type === 'potion')
      .reduce((sum, item) => sum + (item.count || 1), 0);
    const buff = BUFFS[state.classId],
      cooldown = p.buffCooldown || 0,
      remaining = p.buffRemaining || 0;
    const buffButton = $('.buff-button');
    buffButton.disabled = p.level < BUFF_LEVEL || cooldown > 0 || p.mp < BUFF_MP;
    buffButton.setAttribute(
      'aria-label',
      `${buff.name}${p.level < BUFF_LEVEL ? ` locked until level ${BUFF_LEVEL}` : cooldown > 0 ? ` cooldown ${Math.ceil(cooldown)} seconds` : ' ready'}`,
    );
    buffButton.querySelector('b').textContent =
      p.level < BUFF_LEVEL ? `Lv.${BUFF_LEVEL}` : cooldown > 0 ? `${Math.ceil(cooldown)}s` : 'BUFF';
    $('.active-buff').hidden = remaining <= 0;
    setText('.active-buff b', buff.name);
    setText('.active-buff span', `${remaining.toFixed(1)}s · ${buff.detail}`);
    $('.active-buff i').style.width = `${(remaining / BUFF_DURATION) * 100}%`;
    $('.ultimate-banner').hidden = !(state.ultimateBanner?.remaining > 0);
    setText('.ultimate-banner strong', state.ultimateBanner?.name || '');
    $('.level-growth').hidden =
      !(state.levelUpSummary?.remaining > 0) || state.ultimateBanner?.remaining > 0;
    setText(
      '.level-growth',
      `LEVEL ${state.levelUpSummary?.level || p.level}  ↑  +4 ATK · +2 DEF · +28 HP`,
    );
    setText('.potion-count', potions);
    $('[data-action="potion"]').disabled = potions < 1 || p.hp >= p.maxHp;
    setText('.notice', state.notice || '');
    $('.notice').classList.toggle('visible', Boolean(state.notice && state.noticeTimer > 0));
    $$('.skill').forEach((el, index) => {
      const skill = state.skillDefinitions?.[index],
        locked = p.level < n(skill?.reqLv || [1, 1, 10, 25][index]),
        cooldown = n(p.skillCooldowns?.[index]);
      const classGlyphs = {
        vanguard: ['sword', 'forge', 'class', 'star'],
        arcanist: ['spark', 'leaf', 'star', 'spark'],
        nightblade: ['sword', 'spark', 'leaf', 'star'],
        ranger: ['arrow', 'leaf', 'spark', 'star'],
      };
      if (el.dataset.classId !== state.classId) {
        el.querySelector('.skill-glyph').innerHTML = icon(classGlyphs[state.classId][index]);
        el.dataset.classId = state.classId;
      }
      el.disabled =
        locked || cooldown > 0 || p.mp < Math.ceil(n(skill?.mp) * (p.manaCostMultiplier || 1));
      el.classList.toggle('locked', locked);
      el.classList.toggle('cooling', cooldown > 0);
      el.style.setProperty('--cooldown', `${skill?.cd ? (cooldown / skill.cd) * 100 : 0}%`);
      el.querySelector('.skill-cooldown').textContent = locked
        ? `Lv.${skill?.reqLv || [1, 1, 10, 25][index]}`
        : cooldown > 0
          ? cooldown.toFixed(1)
          : '';
      el.querySelector('.skill-level').textContent = locked
        ? ''
        : `${Math.max(1, n(state.skillLevels?.[index]))}`;
      el.setAttribute(
        'aria-label',
        `${skill?.ultimate ? 'Ultimate ' : ''}${skill?.name || `Skill ${index + 1}`}${locked ? ` locked until level ${skill?.reqLv}` : cooldown > 0 ? ` cooldown ${cooldown.toFixed(1)} seconds` : ''}`,
      );
    });
    drawMinimap(state);
    if (panel && panel !== 'start') {
      const key = JSON.stringify([
        panel,
        bagTab,
        p.level,
        p.gold,
        p.attack,
        p.defense,
        p.equipment,
        p.inventory,
        state.classId,
        state.sp,
        state.skillLevels,
        state.starCores,
        state.currentArea,
        state.unlockedAreas,
        state.damageSkin,
        state.settings,
        state.upgrades,
        state.daily,
        state.story.activeId,
        state.story.progress,
        state.story.completed,
        state.story.autoQuest,
        state.dialogueNpcId,
        state.quest,
      ]);
      if (key !== panelKey && !forgeRunning) {
        panelKey = key;
        renderPanel();
      }
    }
  }
  function drawMinimap(s) {
    const canvas = $('.minimap canvas'),
      ctx = canvas.getContext('2d');
    if (!ctx || !s.world) return;
    const w = canvas.width,
      h = canvas.height,
      sx = w / s.world.width,
      sy = (h - 10) / s.world.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#9bba8e';
    for (const platform of s.world.platforms || [])
      ctx.fillRect(platform.x * sx, platform.y * sy + 4, Math.max(2, platform.w * sx), 2);
    ctx.strokeStyle = '#bcb984';
    ctx.lineWidth = 1;
    for (const rope of s.world.ropes || []) {
      ctx.beginPath();
      ctx.moveTo(rope.x * sx, rope.y1 * sy + 4);
      ctx.lineTo(rope.x * sx, rope.y2 * sy + 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#e89172';
    for (const enemy of s.enemies || [])
      if (enemy.hp > 0) ctx.fillRect(enemy.x * sx, enemy.y * sy + 3, 2, 2);
    ctx.shadowBlur = 7;
    ctx.shadowColor = '#f4d790';
    ctx.fillStyle = '#fff0ad';
    ctx.beginPath();
    ctx.arc(s.player.x * sx, s.player.y * sy + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  showPanel('start');
  return {
    update,
    showPanel,
    closePanel,
    setStarted() {
      started = true;
      root.classList.add('started');
      closePanel();
    },
    isModalOpen() {
      return Boolean(panel) || !started;
    },
    setInstallPrompt(event) {
      installPrompt = event;
      if (panel === 'pause' || panel === 'settings') renderPanel();
    },
    destroy() {
      clearTimeout(portraitTipTimer);
      dead = true;
      cancelAnimationFrame(frame);
      root.removeEventListener('click', click);
      root.removeEventListener('change', change);
      root.removeEventListener('keydown', trapFocus);
      root.replaceChildren();
    },
  };
}
