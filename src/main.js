import './style.css';
import { artReady, artStatus } from './art.js';
import {
  createGame,
  updateGame,
  toggleAuto,
  equipItem,
  usePotion,
  claimQuest,
  serializeGame,
  changeClass,
  travelToArea,
  upgradeSkill,
  forgeItem,
  salvageItem,
} from './game/engine.js';
import { Renderer } from './renderer.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { loadProgress, saveProgress } from './save.js';
import { createFixedStepper } from './loop.js';
import { GameAudio } from './audio.js';
import { markAbsence, settleAbsence } from './offline.js';

const saved = loadProgress();
const state = createGame(saved);
state.saveStatus = 'pending';
settleAbsence(state);
state.settings = {
  sound: true,
  music: false,
  particles: true,
  reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  ...state.settings,
  ...saved?.settings,
};
const renderer = new Renderer(document.getElementById('game-canvas'));
const input = createInput(document);
const audio = new GameAudio(state.settings);
let started = false;
let installPrompt = null;
let lastSaveTime = 0;
let saveAvailable = true;
let fps = 0;
let measuredFrames = 0;
let measuredTime = 0;
let lastFrame = performance.now();
let hudElapsed = 0;
let saveElapsed = 0;
let frameId;
const stepper = createFixedStepper((controls, dt) => updateGame(state, controls, dt));

function persist() {
  const previouslyAvailable = saveAvailable;
  saveAvailable = saveProgress(serializeGame(state, state.settings));
  state.saveStatus = saveAvailable ? 'saved' : 'unavailable';
  if (saveAvailable) lastSaveTime = Date.now();
  else if (previouslyAvailable && started)
    notify('Progress cannot be saved in this browser. This adventure is session only.');
  return saveAvailable;
}

function clearInput() {
  input.clear();
  stepper.reset();
  lastFrame = performance.now();
}

function notify(text) {
  state.notice = text;
  state.noticeTimer = 3;
}

function openPanel(name) {
  if (!started) return;
  clearInput();
  state.paused = true;
  ui.showPanel(name, state);
}

function closePanel() {
  ui.closePanel();
  state.paused = false;
  clearInput();
}

async function onAction(action, payload) {
  audio.unlock();
  if (action !== 'potion') audio.click();
  switch (action) {
    case 'start':
      started = true;
      state.paused = false;
      ui.setStarted();
      ui.closePanel();
      clearInput();
      persist();
      if (state.offlineSummary) {
        state.paused = true;
        ui.showPanel('offline', state);
      }
      if (!saveAvailable)
        notify('Browser storage is unavailable. You can still play this session.');
      break;
    case 'auto':
      toggleAuto(state);
      clearInput();
      break;
    case 'offline-continue':
      state.offlineSummary = null;
      closePanel();
      persist();
      break;
    case 'pause':
      openPanel('pause');
      break;
    case 'resume':
    case 'close':
      closePanel();
      break;
    case 'inventory':
    case 'character':
    case 'settings':
    case 'map':
    case 'forge':
    case 'skills':
    case 'class':
      openPanel(action);
      break;
    case 'equip':
      equipItem(state, payload);
      persist();
      break;
    case 'potion':
      usePotion(state);
      persist();
      break;
    case 'claim':
      claimQuest(state);
      persist();
      break;
    case 'switch-class':
      changeClass(state, payload);
      persist();
      break;
    case 'upgrade-skill':
      upgradeSkill(state, Number(payload));
      persist();
      break;
    case 'travel':
      if (travelToArea(state, payload)) closePanel();
      persist();
      break;
    case 'forge-item': {
      const result = forgeItem(state, payload?.slot, Number(payload?.timing));
      notify(result?.message || 'Visit the forge with gold and star cores.');
      persist();
      break;
    }
    case 'salvage':
      salvageItem(state, payload);
      persist();
      break;
    case 'skin':
      if (['amber', 'sakura', 'frost', 'cyber', 'solar'].includes(payload))
        state.damageSkin = payload;
      persist();
      break;
    case 'install':
      if (installPrompt) {
        try {
          await installPrompt.prompt();
          await installPrompt.userChoice;
        } catch {
          notify('Use your browser menu to install AetherStory.');
        }
        installPrompt = null;
        ui.setInstallPrompt(null);
      } else {
        openPanel('settings');
        notify('Install: browser menu → Install app. On iPhone: Share → Add to Home Screen.');
      }
      break;
  }
  ui.update(state);
}

const ui = createUI({
  onAction,
  onSettings(settings) {
    Object.assign(state.settings, settings);
    audio.settings = state.settings;
    audio.unlock();
    persist();
    ui.update(state);
  },
});
ui.update(state);
state.paused = true;
// Read-only diagnostics are useful for bug reports as well as automated QA.
window.aetherStory = Object.freeze({
  getSnapshot() {
    return structuredClone({
      started,
      paused: state.paused || ui.isModalOpen(),
      time: state.time,
      auto: state.auto,
      classId: state.classId,
      currentArea: state.currentArea,
      damageSkin: state.damageSkin,
      kills: state.kills,
      quest: state.quest,
      starCores: state.starCores,
      sp: state.sp,
      skillLevels: state.skillLevels,
      settings: state.settings,
      unlockedAreas: state.unlockedAreas,
      player: state.player,
      pet: state.pet,
      enemies: state.enemies.map(({ id, type, x, y, hp, maxHp, platformId, respawnTimer }) => ({
        id,
        type,
        x,
        y,
        hp,
        maxHp,
        platformId,
        respawnTimer,
      })),
      drops: state.drops.length,
      navigation: state.autoNavigation || null,
      offlineSummary: state.offlineSummary,
    });
  },
  getDiagnostics() {
    return {
      version: '1.0.0',
      art: artStatus(),
      fps,
      saveAvailable,
      lastSaveTime,
      offlineReady: Boolean(navigator.serviceWorker?.controller),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio,
      },
    };
  },
});

function frame(now) {
  const elapsed = Math.max(0, Math.min((now - lastFrame) / 1000, 0.1));
  lastFrame = now;
  const paused = !started || state.paused || ui.isModalOpen() || document.hidden;
  if (!paused) {
    stepper.advance(elapsed, input.sample());
    audio.update(state);
    saveElapsed += elapsed;
    if (saveElapsed >= 5) {
      persist();
      saveElapsed = 0;
    }
  } else {
    // Drop pending edge inputs while paused; resumed controls start fresh.
    input.clear();
    stepper.reset();
  }
  renderer.render(state, elapsed);
  hudElapsed += elapsed;
  if (hudElapsed >= 0.08) {
    ui.update(state);
    hudElapsed = 0;
  }
  measuredFrames++;
  measuredTime += elapsed;
  if (measuredTime >= 1) {
    fps = Math.round(measuredFrames / measuredTime);
    measuredFrames = 0;
    measuredTime = 0;
  }
  frameId = requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  renderer.resize();
  clearInput();
});
window.visualViewport?.addEventListener('resize', () => {
  renderer.resize();
  clearInput();
});
window.addEventListener('blur', () => {
  clearInput();
  if (started && !ui.isModalOpen()) openPanel('pause');
  persist();
});
document.addEventListener('visibilitychange', () => {
  clearInput();
  if (document.hidden) {
    if (started) markAbsence(state);
    persist();
    if (started && !ui.isModalOpen()) openPanel('pause');
  } else if (started && state.absence) {
    const summary = settleAbsence(state);
    persist();
    if (summary) {
      state.paused = true;
      ui.showPanel('offline', state);
    }
  }
});
window.addEventListener('pagehide', () => {
  if (started) markAbsence(state);
  persist();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && started && state.absence) {
    settleAbsence(state);
    persist();
    if (state.offlineSummary) ui.showPanel('offline', state);
  }
});
window.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (!started) {
    if (key === 'enter') onAction('start');
    return;
  }
  const actions = {
    t: 'auto',
    b: 'auto',
    i: 'inventory',
    p: 'character',
    m: 'map',
    g: 'forge',
    u: 'skills',
    o: 'settings',
  };
  if (key === 'escape') {
    event.preventDefault();
    if (ui.isModalOpen()) closePanel();
    else openPanel('pause');
  } else if (actions[key]) {
    event.preventDefault();
    onAction(actions[key]);
  }
});
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  ui.setInstallPrompt(event);
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  ui.setInstallPrompt(null);
  notify('AetherStory is installed. Your adventure is ready offline.');
});

if (
  import.meta.env.PROD &&
  import.meta.env.VITE_SINGLE_FILE !== 'true' &&
  'serviceWorker' in navigator
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Offline installation is unavailable:', error.message);
    });
  });
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameId);
    input.destroy();
    ui.destroy();
    audio.ctx?.close();
  });

// System fonts are local, but wait for font readiness before measuring/drawing text.
Promise.all([document.fonts?.ready, artReady])
  .catch(() => {})
  .then(() => {
    lastFrame = performance.now();
    frameId = requestAnimationFrame(frame);
  });
