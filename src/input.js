const KEY_ACTIONS = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  Space: 'jump',
  KeyJ: 'attack',
  KeyK: 'skill',
  KeyZ: 'skill',
  KeyX: 'skill2',
  KeyC: 'skill3',
  KeyV: 'skill4',
  KeyE: 'interact',
};
const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'attack',
  'skill',
  'skill2',
  'skill3',
  'skill4',
  'interact',
];
const PULSES = new Set(['jump', 'skill', 'skill2', 'skill3', 'skill4', 'interact']);
/** Separate physical sources keep one lifted finger from releasing another. */
export function createInput(root = document) {
  const doc = root.ownerDocument || root,
    view = doc.defaultView || globalThis.window;
  const keys = new Map(),
    pointers = new Map(),
    pulses = new Set(),
    listeners = [];
  const listen = (target, type, fn) => {
    target?.addEventListener(type, fn, { passive: false });
    listeners.push(() => target?.removeEventListener(type, fn));
  };
  const active = (action) =>
    [...keys.values(), ...pointers.values()].some(
      (value) => value.action === action || value === action,
    );
  const press = (action) => {
    if (PULSES.has(action) && !active(action)) pulses.add(action);
  };
  const editable = (target) =>
    /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName) || target?.isContentEditable;
  listen(root, 'keydown', (event) => {
    const action = KEY_ACTIONS[event.code];
    if (!action || editable(event.target)) return;
    event.preventDefault();
    if (keys.has(event.code) || event.repeat) return;
    press(action);
    keys.set(event.code, action);
  });
  listen(root, 'keyup', (event) => {
    if (KEY_ACTIONS[event.code]) {
      event.preventDefault();
      keys.delete(event.code);
    }
  });
  listen(root, 'pointerdown', (event) => {
    const button = event.target?.closest?.('[data-control]'),
      action = button?.dataset.control;
    if (!ACTIONS.includes(action) || button.disabled) return;
    event.preventDefault();
    press(action);
    pointers.set(event.pointerId, { action, button });
    button.classList?.add('pressed');
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      /* Detached touch targets cannot capture. */
    }
  });
  const release = (event) => {
    const held = pointers.get(event.pointerId);
    if (!held) return;
    pointers.delete(event.pointerId);
    if (![...pointers.values()].some((value) => value.button === held.button))
      held.button.classList?.remove('pressed');
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    listen(root, type, release);
  const clear = () => {
    keys.clear();
    for (const { button } of pointers.values()) button.classList?.remove('pressed');
    pointers.clear();
    pulses.clear();
  };
  listen(view, 'blur', clear);
  listen(doc, 'visibilitychange', () => {
    if (doc.visibilityState !== 'visible') clear();
  });
  return {
    sample() {
      const result = Object.fromEntries(
        ACTIONS.map((action) => [action, PULSES.has(action) ? pulses.has(action) : active(action)]),
      );
      pulses.clear();
      return result;
    },
    clear,
    destroy() {
      clear();
      for (const remove of listeners) remove();
    },
  };
}
