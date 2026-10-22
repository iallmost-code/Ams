import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';
class Target extends EventTarget {
  constructor() {
    super();
    this.ownerDocument = this;
    this.defaultView = new EventTarget();
    this.visibilityState = 'visible';
  }
  fire(type, properties = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(properties))
      Object.defineProperty(event, key, { value });
    this.dispatchEvent(event);
    return event;
  }
}
function button(control) {
  return {
    dataset: { control },
    closest() {
      return this;
    },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
}
test('independent fingers preserve movement when attack finger lifts', () => {
  const root = new Target(),
    input = createInput(root);
  root.fire('pointerdown', { pointerId: 1, target: button('left') });
  root.fire('pointerdown', { pointerId: 2, target: button('attack') });
  assert.equal(input.sample().left, true);
  assert.equal(input.sample().attack, true);
  root.fire('pointerup', { pointerId: 2 });
  assert.equal(input.sample().left, true);
  assert.equal(input.sample().attack, false);
  root.fire('pointercancel', { pointerId: 1 });
  assert.equal(input.sample().left, false);
  input.destroy();
});
test('jump and all skills pulse once per press while attack stays held', () => {
  const root = new Target(),
    input = createInput(root);
  for (const [code, action] of [
    ['Space', 'jump'],
    ['KeyK', 'skill'],
    ['KeyX', 'skill2'],
    ['KeyC', 'skill3'],
    ['KeyV', 'skill4'],
  ]) {
    root.fire('keydown', { code });
    assert.equal(input.sample()[action], true);
    assert.equal(input.sample()[action], false);
    root.fire('keydown', { code, repeat: true });
    assert.equal(input.sample()[action], false);
    root.fire('keyup', { code });
  }
  root.fire('keydown', { code: 'KeyJ' });
  assert.equal(input.sample().attack, true);
  assert.equal(input.sample().attack, true);
  input.destroy();
});
test('lost capture, blur, hidden document and destroy remove held input and pending pulses', () => {
  const root = new Target(),
    input = createInput(root);
  root.fire('pointerdown', { pointerId: 9, target: button('right') });
  root.fire('lostpointercapture', { pointerId: 9 });
  assert.equal(input.sample().right, false);
  root.fire('keydown', { code: 'KeyD' });
  root.defaultView.dispatchEvent(new Event('blur'));
  assert.equal(input.sample().right, false);
  root.fire('keydown', { code: 'Space' });
  root.visibilityState = 'hidden';
  root.fire('visibilitychange');
  assert.equal(input.sample().jump, false);
  input.destroy();
  root.fire('keydown', { code: 'KeyA' });
  assert.equal(input.sample().left, false);
});
test('keyboard and touch holding same action are independent and clear fully resets', () => {
  const root = new Target(),
    input = createInput(root);
  root.fire('keydown', { code: 'KeyA' });
  root.fire('pointerdown', { pointerId: 1, target: button('left') });
  root.fire('keyup', { code: 'KeyA' });
  assert.equal(input.sample().left, true);
  input.clear();
  assert.equal(input.sample().left, false);
  input.destroy();
});

test('joystick supports analog diagonals, independent attack, cancellation and blur', () => {
  const root = new Target(),
    input = createInput(root);
  const stick = {
    dataset: { joystick: '' },
    closest(selector) {
      return selector === '[data-joystick]' ? this : null;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 120, height: 120 };
    },
    style: { setProperty() {} },
    setPointerCapture() {},
  };
  root.fire('pointerdown', { pointerId: 1, target: stick, clientX: 100, clientY: 20 });
  let sample = input.sample();
  assert.ok(sample.right && sample.up && sample.moveX > 0 && sample.moveY < 0);
  root.fire('pointerdown', { pointerId: 2, target: button('attack') });
  root.fire('pointerup', { pointerId: 2 });
  assert.equal(input.sample().right, true);
  root.fire('pointermove', { pointerId: 1, clientX: 60, clientY: 60 });
  assert.equal(input.sample().right, false);
  root.fire('pointermove', { pointerId: 1, clientX: 500, clientY: 60 });
  assert.equal(input.sample().moveX, 1);
  root.fire('pointercancel', { pointerId: 1 });
  assert.equal(input.sample().moveX, 0);
  root.fire('pointerdown', { pointerId: 3, target: stick, clientX: 100, clientY: 60 });
  root.defaultView.dispatchEvent(new Event('blur'));
  assert.equal(input.sample().right, false);
  input.destroy();
});
