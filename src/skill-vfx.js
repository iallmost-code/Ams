import atlas from './assets/skills.atlas.json';
import {
  primaryKeyframes,
  PRIMARY_SKILL_SIZE,
  paintedPosition,
} from './game/skill-presentation.js';
import { skillArt } from './art.js';
/** Original combat art. Each class/slot has a distinct silhouette and motion. */
export const ART_COLORS = {
  vanguard: ['#ffbd46', '#ff4d30'],
  arcanist: ['#70ecff', '#8a6bff'],
  nightblade: ['#ff8ade', '#a251ff'],
  ranger: ['#abff70', '#16d6ba'],
};
const TAU = Math.PI * 2;
function glow(c, x, y, r, color) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha *= 0.4;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#ffffffba');
  g.addColorStop(0.25, color + '9a');
  g.addColorStop(1, color + '00');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.restore();
}
function shape(c, d, color, outline = '#fff9dd', width = 2) {
  const p = new Path2D(d);
  c.fillStyle = color;
  c.fill(p);
  c.strokeStyle = outline;
  c.lineWidth = width;
  c.stroke(p);
}
function stroke(c, d, color, width = 4) {
  const p = new Path2D(d);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.stroke(p);
  c.strokeStyle = '#ffffff';
  c.lineWidth = Math.max(1, width * 0.24);
  c.stroke(p);
}
function star(c, x, y, r, color, phase = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(phase);
  shape(
    c,
    `M 0 ${-r} L ${r * 0.22} ${-r * 0.22} L ${r} 0 L ${r * 0.22} ${r * 0.22} L 0 ${r} L ${-r * 0.22} ${r * 0.22} L ${-r} 0 L ${-r * 0.22} ${-r * 0.22} Z`,
    color,
  );
  c.restore();
}
function crescent(c, x, y, r, phase, color) {
  c.save();
  c.translate(x, y);
  c.rotate(phase);
  shape(
    c,
    `M ${-r * 0.35} ${-r} Q ${r * 1.6} 0 ${-r * 0.35} ${r} Q ${r * 0.7} 0 ${-r * 0.35} ${-r} Z`,
    color,
    '#fff7c9',
    2,
  );
  stroke(c, `M 0 ${-r * 0.82} Q ${r} 0 0 ${r * 0.82}`, '#fff3ad', 2);
  c.restore();
}
function arrow(c, x, y, a, color) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  stroke(c, 'M -75 0 L 20 0', color, 5);
  shape(c, 'M 28 0 L 7 -11 L 13 0 L 7 11 Z', color);
  stroke(c, 'M -66 -8 L -54 0 L -66 8', color, 2);
  c.restore();
}
function crystal(c, x, y, r, color) {
  shape(
    c,
    `M ${x} ${y - r} L ${x + r * 0.3} ${y - r * 0.25} L ${x + r * 0.17} ${y + r * 0.5} L ${x - r * 0.2} ${y + r * 0.5} L ${x - r * 0.35} ${y - r * 0.3} Z`,
    color + 'a8',
    color,
    2,
  );
  stroke(c, `M ${x} ${y - r * 0.7} L ${x} ${y + r * 0.35}`, '#f0ffff', 2);
}
function sparks(c, t, color, count = 12, radius = 100) {
  for (let i = 0; i < count; i++) {
    const a = i * 2.399,
      r = (0.2 + t) * radius * (0.5 + (i % 3) * 0.2),
      x = Math.cos(a) * r,
      y = Math.sin(a) * r * 0.6;
    star(c, x, y, 2 + (1 - t) * 3, color, a + t);
  }
}
/** Crossfade the five painted keyframes with continuous travel. The atlas has runtime gutters. */
function paintedSkill(c, e, t, opacity = 1, large = false) {
  if (skillArt.frames.length !== 20) return false;
  const row = ['vanguard', 'arcanist', 'nightblade', 'ranger'].indexOf(e.classId || 'vanguard');
  const { frame, next, mix } = primaryKeyframes(t);
  const size = large ? 420 : PRIMARY_SKILL_SIZE[e.classId || 'vanguard'];
  const x = paintedPosition(
      e,
      t,
      size,
      atlas.contentBounds[row][2].width / skillArt.frames[row * 5].width,
    ),
    y = large ? -35 : 0;
  const draw = (index, alpha) => {
    const image = skillArt.frames[row * 5 + index];
    c.save();
    c.globalAlpha *= alpha * opacity;
    c.drawImage(
      image,
      x - size / 2,
      y - (size * (skillArt.frames[row * 5].height / skillArt.frames[row * 5].width)) / 2,
      size,
      size * (skillArt.frames[row * 5].height / skillArt.frames[row * 5].width),
    );
    c.restore();
  };
  draw(frame, 1 - mix);
  if (next !== frame && mix > 0) draw(next, mix);
  return true;
}
export function drawSkillVfx(c, e, t, reducedMotion = false) {
  const cls = e.classId || 'vanguard',
    slot = e.skillIndex || 0,
    [bright, accent] = ART_COLORS[cls],
    u = slot === 3;
  c.save();
  c.scale(e.facing || 1, 1);
  c.globalCompositeOperation = 'source-over';
  c.shadowColor = bright;
  c.shadowBlur = reducedMotion ? 0 : 9;
  if (slot === 0 && paintedSkill(c, e, t)) {
    c.restore();
    return;
  }
  if (u) paintedSkill(c, e, t, 0.65, true);
  const travel = Math.min(1, t * 1.7);
  if (cls === 'vanguard') {
    if (slot === 0) {
      glow(c, 55, 0, 95, accent);
      for (let i = 0; i < 3; i++)
        crescent(
          c,
          20 + i * 20,
          -8 + i * 6,
          65 + i * 14,
          -0.9 + t * 1.4 + i * 0.17,
          i % 2 ? accent : bright,
        );
      stroke(c, `M -15 45 Q 95 ${-80 - t * 30} 165 -12`, bright, 6);
    } else if (slot === 1) {
      stroke(c, 'M -20 36 L 40 28 L 70 39 L 104 23 L 145 40 L 220 32', bright, 6);
      for (let i = 0; i < 5; i++) {
        const x = 25 + i * 43,
          h = 25 + Math.sin(Math.min(1, t * 2 + i * 0.05) * Math.PI) * 95;
        glow(c, x, 20, 40, accent);
        crystal(c, x, 30 - h * 0.5, h, bright);
        shape(
          c,
          `M ${x - 15} 34 L ${x - 22} 20 L ${x + 8} 13 L ${x + 24} 37 Z`,
          '#b86836',
          bright,
          2,
        );
      }
    } else if (slot === 2) {
      for (let i = 0; i < 6; i++)
        crescent(
          c,
          Math.cos(t * 8 + i) * 55,
          Math.sin(t * 8 + i) * 15,
          65,
          -i + t * 5,
          i % 2 ? accent : bright,
        );
      glow(c, 0, -10, 90, bright);
      sparks(c, t, bright, 18, 130);
    } else {
      const y = -290 + Math.min(1, t * 2.7) * 270;
      glow(c, 95, y + 30, 150, bright);
      shape(
        c,
        `M 82 ${y - 135} L 110 ${y - 110} L 108 ${y + 20} L 95 ${y + 75} L 79 ${y + 20} Z`,
        '#ffedb0',
        bright,
        4,
      );
      shape(c, `M 40 ${y - 65} L 150 ${y - 65} L 140 ${y - 49} L 50 ${y - 49} Z`, bright);
      for (let i = 0; i < 7; i++)
        stroke(
          c,
          `M ${40 + i * 18} ${y - 110} L ${40 + i * 18} ${y - 230}`,
          i % 2 ? accent : bright,
          2,
        );
      crescent(c, 95, 35, 85 + travel * 80, t * 0.2, bright);
      sparks(c, t, bright, 24, 190);
    }
  } else if (cls === 'arcanist') {
    if (slot === 0) {
      for (let i = 0; i < 3; i++) {
        const x = 30 + Math.max(0, travel - i * 0.11) * 210,
          y = Math.sin(t * 9 + i) * 12 + (i - 1) * 16;
        glow(c, x, y, 42, bright);
        stroke(c, `M ${x - 90} ${y + 15} Q ${x - 30} ${y - 20} ${x} ${y}`, accent, 9);
        star(c, x, y, 17, bright, t * 6 + i);
      }
    } else if (slot === 1) {
      for (let j = 0; j < 3; j++) {
        let d = `M -10 ${j * 9 - 15}`;
        for (let i = 1; i < 12; i++)
          d += ` L ${i * 23} ${Math.sin(i * 2 + t * 30 + j) * 24 + j * 10 - 20}`;
        stroke(c, d, j === 1 ? '#fff4ff' : bright, j === 1 ? 3 : 7);
      }
      for (let i = 0; i < 5; i++) star(c, 35 + i * 48, Math.sin(i) * 28, 10, accent, t * 7);
    } else if (slot === 2) {
      glow(c, 20, 0, 140, bright);
      for (let i = 0; i < 9; i++) {
        const a = (i * TAU) / 9;
        c.save();
        c.rotate(a);
        crystal(c, 30 + travel * 90, 0, 65, bright);
        c.restore();
      }
      sparks(c, t, '#d4fbff', 20, 145);
    } else {
      for (let i = 0; i < 7; i++) {
        const x = -85 + i * 49,
          y = -200 + ((t + i * 0.09) % 1) * 240;
        glow(c, x, y, 47, accent);
        stroke(c, `M ${x - 30} ${y - 120} L ${x} ${y}`, accent, 11);
        crystal(c, x, y, 50, bright);
        star(c, x, y, 14, '#ffdfed', t * 5);
      }
      c.save();
      c.translate(60, 15);
      c.scale(1, 0.35);
      c.beginPath();
      c.arc(0, 0, 175, 0, TAU);
      c.strokeStyle = accent;
      c.lineWidth = 7;
      c.stroke();
      c.restore();
      sparks(c, t, bright, 20, 180);
    }
  } else if (cls === 'nightblade') {
    if (slot === 0) {
      for (let i = 0; i < 5; i++) {
        const x = 15 + travel * 220 - i * 22,
          y = (i - 2) * 14;
        stroke(c, `M ${x - 70} ${y + 20} Q ${x - 25} ${y - 10} ${x} ${y}`, accent, 5);
        star(c, x, y, 19, bright, t * 14 + i);
      }
    } else if (slot === 1) {
      for (let i = 0; i < 3; i++) {
        const x = travel * 180 - i * 35;
        glow(c, x, 0, 45, accent);
        stroke(
          c,
          `M ${x - 25} -50 L ${x + 30} 45 M ${x - 25} 45 L ${x + 30} -50`,
          i % 2 ? bright : accent,
          10,
        );
      }
      crescent(c, 80, 0, 80, -1 + t * 2, bright);
    } else if (slot === 2) {
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7 + t * 7;
        crescent(c, Math.cos(a) * 45, Math.sin(a) * 15, 55, a, i % 2 ? bright : accent);
      }
      sparks(c, t, bright, 18, 110);
    } else {
      glow(c, 70, -25, 175, accent);
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + t * 5;
        c.save();
        c.translate(70, -25);
        c.rotate(a);
        shape(c, 'M 12 -8 Q 130 -90 170 -20 Q 90 -24 18 12 Z', i % 2 ? bright : accent);
        c.restore();
      }
      crescent(c, 70, -25, 90, t * 3, '#fff0ff');
      sparks(c, t, bright, 22, 175);
    }
  } else {
    if (slot === 0) {
      for (let i = 0; i < 3; i++)
        arrow(
          c,
          35 + travel * 260 - i * 25,
          (i - 1) * 19,
          (i - 1) * 0.06,
          i === 1 ? '#fff1ad' : bright,
        );
      glow(c, 45 + travel * 240, 0, 55, bright);
    } else if (slot === 1) {
      for (let i = 0; i < 8; i++) {
        const x = 20 + i * 32,
          y = -180 + ((t * 1.5 + i * 0.08) % 1) * 230;
        arrow(c, x, y, 1.35, i % 2 ? bright : accent);
      }
      sparks(c, t, bright, 14, 150);
    } else if (slot === 2) {
      for (let i = 0; i < 10; i++) {
        const a = (i * TAU) / 10 + t * 6;
        arrow(c, 40 + Math.cos(a) * 95, Math.sin(a) * 45, a + 0.8, i % 2 ? bright : accent);
      }
      sparks(c, t, bright, 18, 135);
    } else {
      const x = 20 + travel * 170,
        y = -35 - Math.sin(t * Math.PI) * 25;
      glow(c, x, y, 160, bright);
      c.save();
      c.translate(x, y);
      shape(
        c,
        'M 0 0 Q -65 -145 -150 -82 Q -100 -30 -20 13 L -55 70 L 0 35 L 55 70 L 20 13 Q 100 -30 150 -82 Q 65 -145 0 0 Z',
        accent + '99',
        bright,
        3,
      );
      for (let i = 0; i < 5; i++) {
        stroke(
          c,
          `M -8 5 Q ${-70 - i * 12} ${-20 - i * 15} ${-110 - i * 8} ${-55 - i * 8}`,
          bright,
          3,
        );
        stroke(
          c,
          `M 8 5 Q ${70 + i * 12} ${-20 - i * 15} ${110 + i * 8} ${-55 - i * 8}`,
          bright,
          3,
        );
      }
      star(c, 0, 10, 22, '#fff5c5', t);
      c.restore();
      sparks(c, t, '#ffe3a3', 26, 185);
    }
  }
  if (!u && !reducedMotion) sparks(c, t, bright, 8, 90);
  c.restore();
}
export function drawImpactVfx(c, e, t, reducedMotion = false) {
  const [bright, accent] = ART_COLORS[e.classId || 'vanguard'];
  c.save();
  c.globalCompositeOperation = 'source-over';
  const r = (e.style === 'attack' ? 22 : 48) * (0.4 + t);
  glow(c, 0, 0, r, bright);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8 + t * 0.6;
    c.save();
    c.rotate(a);
    stroke(
      c,
      `M ${r * 0.2} 0 L ${r * (1.1 + (i % 2) * 0.35)} 0`,
      i % 2 ? bright : accent,
      e.critical ? 4 : 2,
    );
    c.restore();
  }
  if (!reducedMotion) sparks(c, t, bright, 6, r);
  c.restore();
}
