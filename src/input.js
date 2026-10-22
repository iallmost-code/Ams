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
  let joystick = null;
  const resetJoystick = () => {
    joystick?.element.style.setProperty('--stick-x', '0px');
    joystick?.element.style.setProperty('--stick-y', '0px');
    joystick = null;
  };
  const moveJoystick = (event) => {
    if (!joystick || joystick.id !== event.pointerId) return;
    const rect = joystick.element.getBoundingClientRect();
    const radius = rect.width * 0.32;
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(dx, dy);
    const factor = length > radius ? radius / length : 1;
    joystick.x = length < radius * 0.16 ? 0 : (dx * factor) / radius;
    joystick.y = length < radius * 0.16 ? 0 : (dy * factor) / radius;
    joystick.element.style.setProperty('--stick-x', `${dx * factor}px`);
    joystick.element.style.setProperty('--stick-y', `${dy * factor}px`);
  };
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
    const stick = event.target?.closest?.('[data-joystick]');
    if (stick && Object.hasOwn(stick.dataset, 'joystick')) {
      if (joystick) return;
      event.preventDefault();
      joystick = { id: event.pointerId, element: stick, x: 0, y: 0 };
      try {
        stick.setPointerCapture(event.pointerId);
      } catch {}
      moveJoystick(event);
      return;
    }
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
  listen(root, 'pointermove', moveJoystick);
  const release = (event) => {
    if (joystick?.id === event.pointerId) resetJoystick();
    const held = pointers.get(event.pointerId);
    if (!held) return;
    pointers.delete(event.pointerId);
    if (![...pointers.values()].some((value) => value.button === held.button))
      held.button.classList?.remove('pressed');
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    listen(root, type, release);
  const clear = () => {
    resetJoystick();
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
      result.moveX = joystick?.x || 0;
      result.moveY = joystick?.y || 0;
      result.left ||= result.moveX < -0.16;
      result.right ||= result.moveX > 0.16;
      result.up ||= result.moveY < -0.35;
      result.down ||= result.moveY > 0.35;
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
