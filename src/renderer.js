/** Original AetherStory M illustration. All artwork is drawn locally with Canvas. */
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const noise = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const THEMES = {
  forest: {
    sky: ['#7fbbb4', '#c1dfba', '#f1e7b5'],
    far: '#619a8d',
    mid: '#3f8175',
    leaf: ['#276d56', '#398058', '#58994f', '#88b35c'],
    grass: '#78b54f',
    light: '#fff1a3',
    rock: '#797d60',
    shadow: '#364c47',
    flower: '#f8d38a',
  },
  canopy: {
    sky: ['#558d9c', '#9bc4b8', '#d8e0af'],
    far: '#4e8e88',
    mid: '#326c6a',
    leaf: ['#255b55', '#347b62', '#56966e', '#8dbb77'],
    grass: '#91bf61',
    light: '#e5f3b1',
    rock: '#697d69',
    shadow: '#2b4e4d',
    flower: '#eeaaca',
  },
  crystal: {
    sky: ['#242b59', '#3d6686', '#80b1b6'],
    far: '#415b7c',
    mid: '#30476e',
    leaf: ['#305479', '#426e93', '#5c9ca6', '#95c6be'],
    grass: '#7bb8b0',
    light: '#99fff1',
    rock: '#686a92',
    shadow: '#292f55',
    flower: '#b6bbff',
  },
  ember: {
    sky: ['#714759', '#b77a72', '#e8b589'],
    far: '#9d6d73',
    mid: '#775b65',
    leaf: ['#794658', '#a55c59', '#c47e56', '#dfa85a'],
    grass: '#c79f60',
    light: '#ffd2a0',
    rock: '#82706c',
    shadow: '#453b4b',
    flower: '#ffd887',
  },
};
function ellipse(c, x, y, rx, ry, color, rotation = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotation, 0, TAU);
  if (color) c.fillStyle = color;
  c.fill();
}
function path(c, d, fill, stroke, width = 1) {
  const p = new Path2D(d);
  if (fill) {
    c.fillStyle = fill;
    c.fill(p);
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke(p);
  }
}
function line(c, points, color, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.stroke();
}
function glow(c, x, y, r, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ellipse(c, x, y, r, r, g);
}
function star(c, x, y, r, color) {
  c.save();
  c.translate(x, y);
  path(c, `M 0 ${-r} Q 1 -1 ${r} 0 Q 1 1 0 ${r} Q -1 1 ${-r} 0 Q -1 -1 0 ${-r}`, color);
  c.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0 };
    this.width = 1280;
    this.height = 720;
    this.initialized = false;
    this.layers = new Map();
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || globalThis.innerWidth || 1280;
    const h = rect.height || globalThis.innerHeight || 720;
    this.dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.width = (720 * w) / h;
    this.height = 720;
    this.scale = this.canvas.height / 720;
  }
  theme(state) {
    const area = state.world?.areas?.find((a) => a.id === state.currentArea);
    const name = area?.theme || state.currentArea || 'forest';
    return name.includes('crystal') || name.includes('cavern')
      ? 'crystal'
      : name.includes('ember')
        ? 'ember'
        : name.includes('canopy')
          ? 'canopy'
          : 'forest';
  }
  render(state, dt = 1 / 60) {
    if (!state?.player) return;
    const c = this.ctx,
      p = state.player;
    const activeTheme = this.theme(state);
    if (this.activeTheme !== activeTheme) {
      this.layers.clear();
      this.activeTheme = activeTheme;
    }
    this.palette = THEMES[activeTheme];
    this.state = state;
    this.t = state.settings?.reducedMotion ? 0 : state.time || 0;
    this.motion = !state.settings?.reducedMotion;
    this.particles = state.settings?.particles !== false;
    const world = state.world || {};
    const targetX = clamp(
      p.x + (p.w || 36) / 2 - this.width * 0.39,
      0,
      Math.max(0, (world.width || 4800) - this.width),
    );
    const targetY = clamp(
      p.y + (p.h || 54) - this.height * 0.73,
      0,
      Math.max(0, (world.height || 1000) - this.height + 110),
    );
    const follow = this.motion ? 1 - Math.exp(-Math.min(dt || 1 / 60, 0.1) * 6) : 1;
    if (!this.initialized || Math.abs(targetX - this.camera.x) > this.width * 1.4) {
      this.camera.x = targetX;
      this.camera.y = targetY;
      this.initialized = true;
    } else {
      this.camera.x += (targetX - this.camera.x) * follow;
      this.camera.y += (targetY - this.camera.y) * follow;
    }
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.clearRect(0, 0, this.width, 720);
    this.drawBackground();
    c.save();
    c.translate(-this.camera.x, -this.camera.y);
    this.drawWorldScenery(world);
    for (const rope of world.ropes || []) if (this.visible(rope.x, 80)) this.drawRope(rope);
    for (const platform of world.platforms || [])
      if (this.visible(platform.x, platform.w)) this.drawPlatform(platform);
    for (const drop of state.drops || []) if (this.visible(drop.x, 30)) this.drawDrop(drop);
    for (const effect of state.effects || [])
      if (this.visible(effect.x, 250)) this.drawEffect(effect, false);
    for (const enemy of state.enemies || [])
      if (this.visible(enemy.x, enemy.w || 80) && !(enemy.respawnTimer > 0)) this.drawEnemy(enemy);
    this.drawPlayer(p, state.classId || 'vanguard');
    if (!p.deadTimer && p.hp > 0) this.drawCompanion(p);
    for (const effect of state.effects || [])
      if (this.visible(effect.x, 250)) this.drawEffect(effect, true);
    if (this.particles) for (const particle of state.particles || []) this.drawParticle(particle);
    for (const number of state.numbers || []) this.drawNumber(number, state.damageSkin);
    c.restore();
    this.drawForeground();
  }
  visible(x, w = 80) {
    return x + w > this.camera.x - 200 && x < this.camera.x + this.width + 200;
  }
  backgroundLayer(theme, index) {
    const key = `${theme}:${index}`;
    if (this.layers.has(key)) return this.layers.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1000;
    const c = canvas.getContext('2d'),
      pal = THEMES[theme];
    if (index === 0) {
      for (let i = 0; i < 13; i++) {
        const x = i * 160 - 80,
          y = 430 + noise(i + 3) * 220;
        const col = pal.far;
        c.globalAlpha = 0.26 + noise(i) * 0.13;
        path(
          c,
          `M ${x - 170} 1000 L ${x - 170} ${y + 170} Q ${x - 100} ${y + 80} ${x - 45} ${y + 40} Q ${x} ${y - 60} ${x + 80} ${y + 35} Q ${x + 120} ${y + 80} ${x + 210} ${y + 120} L ${x + 210} 1000 Z`,
          col,
        );
      }
      c.globalAlpha = 0.23;
      c.fillStyle = pal.mid;
      c.fillRect(1050, 460, 25, 200);
      c.fillRect(1160, 435, 30, 230);
      path(c, 'M 1048 475 Q 1120 370 1192 450 L 1192 480 Q 1120 407 1048 505 Z', pal.mid);
      path(
        c,
        'M 1050 460 L 1041 443 L 1087 443 L 1076 460 M 1158 435 L 1150 417 L 1200 417 L 1190 435',
        pal.mid,
      );
    } else {
      const count = index === 1 ? 11 : 7;
      for (let i = 0; i < count; i++) {
        const x = (i * 1800) / count + noise(i + index * 4) * 90;
        const base = 1040;
        const high = 250 + noise(i + 60) * 200;
        const wide = index === 1 ? 25 : 46;
        const col = index === 1 ? pal.far : pal.mid;
        c.globalAlpha = index === 1 ? 0.48 : 0.58;
        path(
          c,
          `M ${x - wide} ${base} Q ${x + 10} ${high + 300} ${x - 12} ${high} L ${x + 8} ${high} Q ${x + wide} ${high + 290} ${x + wide + 12} ${base} Z`,
          col,
        );
        for (let j = 0; j < 4; j++) {
          const by = high + 110 + j * 100,
            dir = j % 2 ? 1 : -1;
          path(
            c,
            `M ${x} ${by + 60} Q ${x + dir * 45} ${by + 10} ${x + dir * 110} ${by - 45} Q ${x + dir * 70} ${by + 30} ${x} ${by + 85}`,
            col,
          );
        }
        for (let j = 0; j < 11; j++) {
          const lx = x + (noise(j + i * 18) - 0.5) * 320,
            ly = high + (noise(j + i * 11 + 5) - 0.4) * 130;
          ellipse(c, lx, ly, 70 + noise(j) * 45, 38 + noise(j + 8) * 25, col, noise(j) * 0.6);
        }
      }
    }
    this.layers.set(key, canvas);
    return canvas;
  }
  drawBackground() {
    const c = this.ctx,
      p = this.palette,
      theme = this.theme(this.state),
      g = c.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, p.sky[0]);
    g.addColorStop(0.55, p.sky[1]);
    g.addColorStop(1, p.sky[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, this.width, 720);
    const sunX = this.width * 0.69 - this.camera.x * 0.025,
      sunY = 115 - this.camera.y * 0.09;
    glow(c, sunX, sunY, 240, theme === 'crystal' ? '#bcfaff50' : '#fff9c96b');
    ellipse(c, sunX, sunY, 43, 43, theme === 'crystal' ? '#d2f8e342' : '#fff6c56b');
    for (let layer = 0; layer < 3; layer++) {
      const img = this.backgroundLayer(theme, layer),
        factor = [0.12, 0.23, 0.42][layer];
      const y = -this.camera.y * factor - 120;
      let x = -(this.camera.x * factor) % 1800;
      for (; x < this.width; x += 1800) c.drawImage(img, x, y);
    }
    c.save();
    c.globalAlpha = 0.11;
    c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 5; i++) {
      path(
        c,
        `M ${sunX - 60 + i * 43} -100 L ${sunX + 30 + i * 43} -100 L ${sunX - 270 + i * 130} 800 L ${sunX - 460 + i * 130} 800 Z`,
        p.light,
      );
    }
    c.restore();
    const fog = c.createLinearGradient(0, 370, 0, 720);
    fog.addColorStop(0, 'transparent');
    fog.addColorStop(1, p.sky[2] + '70');
    c.fillStyle = fog;
    c.fillRect(0, 340, this.width, 380);
    if (this.particles) {
      for (let i = 0; i < 24; i++) {
        const x =
            (noise(i + 8) * this.width +
              this.t * (3 + (i % 3)) -
              this.camera.x * 0.12 +
              this.width * 30) %
            this.width,
          y = noise(i + 84) * 640 + Math.sin(this.t * 0.5 + i) * 14;
        c.globalAlpha = 0.3 + Math.sin(this.t + i) * 0.15;
        ellipse(c, x, y, i % 4 === 0 ? 2.4 : 1.2, i % 4 === 0 ? 2.4 : 1.2, p.light);
      }
      c.globalAlpha = 1;
    }
    if (theme === 'crystal') {
      for (let i = 0; i < 8; i++) {
        const x = i * 340 - this.camera.x * 0.25;
        this.crystal(c, x, 640, 35 + noise(i) * 40, 0.32);
      }
    }
  }
  drawWorldScenery(world) {
    const c = this.ctx,
      p = this.palette;
    for (let i = 0; i < Math.ceil((world.width || 4800) / 650); i++) {
      const x = 240 + i * 650;
      if (!this.visible(x - 120, 400)) continue;
      const base = 820;
      this.tree(x, base, 340 + noise(i + 5) * 80, noise(i) * 80 + 90, i);
      if (i % 3 === 2) this.ruin(x + 210, base);
      if (this.theme(this.state) === 'crystal') this.crystal(c, x + 130, base, 70, 1);
    }
    for (const area of world.areas || []) {
      if (area.npc && this.visible(area.npc.x - 100, 240)) {
        this.cottage(area.npc.x - 30, area.npc.y);
        this.drawNPC(area.npc);
      }
      for (const portal of area.portals || []) {
        if (this.visible(portal.x - 50, 100)) this.drawPortal(portal, world);
      }
    }
    if (this.visible(460, 90)) this.sign(490, 820, 'GLADE');
    for (const area of world.areas || []) {
      if (area.x > 0 && this.visible(area.x, 100))
        this.sign(area.x + 35, 820, area.name?.split(' ')[0]?.toUpperCase() || 'ONWARD');
    }
    // Small flowers and stones supply a handcrafted horizon without blocking play.
    for (
      let i = Math.max(0, Math.floor(this.camera.x / 110) - 1);
      i < (this.camera.x + this.width) / 110 + 1;
      i++
    ) {
      const x = i * 110 + noise(i) * 50;
      if (i % 3 === 0) {
        ellipse(c, x, 818, 17, 7, p.shadow);
        ellipse(c, x - 3, 813, 12, 8, p.rock);
        path(c, `M ${x - 12} 812 Q ${x - 5} 804 ${x + 5} 810`, p.sky[1]);
      }
      if (i % 2) this.flower(x + 35, 820, i);
    }
  }
  tree(x, y, height, width, seed) {
    const c = this.ctx,
      p = this.palette;
    c.save();
    c.translate(x, y);
    const trunk = c.createLinearGradient(-30, 0, 35, 0);
    trunk.addColorStop(0, '#3f5c4c');
    trunk.addColorStop(0.45, '#6d7953');
    trunk.addColorStop(0.7, '#7e8558');
    trunk.addColorStop(1, '#405d49');
    path(
      c,
      `M -58 5 Q -28 -20 -23 -80 Q -12 ${-height * 0.6} -25 ${-height} L 2 ${-height - 15} Q 4 ${-height * 0.65} 31 -85 Q 37 -32 68 4 Q 21 -5 0 -22 Q -22 2 -58 5 Z`,
      trunk,
      '#3c5c48',
      3,
    );
    path(
      c,
      `M -12 ${-height * 0.55} Q -67 ${-height * 0.63} -100 ${-height * 0.87} Q -61 ${-height * 0.71} -7 ${-height * 0.69} M 9 ${-height * 0.72} Q 70 ${-height * 0.78} 102 ${-height * 0.96} Q 73 ${-height * 0.66} 17 ${-height * 0.6}`,
      trunk,
      '#3c5c48',
      3,
    );
    line(
      c,
      [
        [-15, -35],
        [-8, -110],
        [-15, -height * 0.65],
      ],
      '#a1a06a',
      3,
    );
    line(
      c,
      [
        [15, -67],
        [8, -180],
        [3, -height * 0.85],
      ],
      '#3d5a46',
      3,
    );
    ellipse(c, 2, -112, 7, 15, '#405b44', 0.2);
    ellipse(c, 2, -113, 3, 8, '#7b8254', 0.2);
    for (let j = 0; j < 17; j++) {
      const lx = (noise(j + seed * 30) - 0.5) * width * 2.7,
        ly = -height + (noise(j + seed * 30 + 15) - 0.5) * 100;
      ellipse(
        c,
        lx,
        ly,
        38 + noise(j + 9) * 45,
        23 + noise(j + 13) * 25,
        p.leaf[j % 4],
        (noise(j) - 0.5) * 0.6,
      );
    }
    for (let j = 0; j < 15; j++) {
      const lx = (noise(j + seed * 14 + 77) - 0.5) * width * 2.5,
        ly = -height - 10 + (noise(j + seed * 8 + 33) - 0.5) * 70;
      path(c, `M ${lx} ${ly} q 8 -10 18 -5 q -4 10 -18 5`, p.leaf[3]);
    }
    path(c, 'M -22 -78 Q -2 -93 21 -76 Q 10 -63 -22 -78', p.leaf[1]);
    this.flower(-33, 0, seed);
    c.restore();
  }
  ruin(x, y) {
    const c = this.ctx,
      p = this.palette;
    c.save();
    c.translate(x, y);
    c.globalAlpha = 0.8;
    path(
      c,
      'M -30 0 L -25 -116 L -36 -125 L -31 -137 L 16 -137 L 24 -124 L 13 -115 L 20 0 Z',
      p.rock,
      p.shadow,
      2,
    );
    path(c, 'M -22 -116 L -16 -11 L -7 -16 L -9 -118 Z', '#b0b290');
    line(
      c,
      [
        [-23, -77],
        [14, -80],
        [3, -66],
        [14, -48],
      ],
      p.shadow,
      2,
    );
    path(c, 'M -40 0 Q -26 -19 27 -10 L 39 0', p.leaf[1]);
    line(
      c,
      [
        [17, -129],
        [22, -90],
        [10, -55],
        [26, -20],
      ],
      p.leaf[1],
      5,
    );
    for (let i = 0; i < 5; i++)
      ellipse(c, 18 + Math.sin(i * 2) * 8, -115 + i * 23, 10, 5, p.leaf[2], i);
    c.restore();
  }
  drawNPC(npc) {
    const c = this.ctx;
    c.save();
    c.translate(npc.x, npc.y);
    ellipse(c, 0, -2, 20, 5, '#253e4660');
    path(c, 'M-12 -31 Q-22 -14 -16 -3 L17 -3 Q19 -18 11 -31Z', '#5b6e95', '#2d464f', 2);
    path(c, 'M-9 -23 L-4 -4 L5 -4 L11 -25', '#b5ad88', '#3d5361', 1.5);
    ellipse(c, 0, -39, 13, 15, '#ecc5a2', '#624f4a', 1.5);
    path(
      c,
      'M-12 -37 Q-10 -19 0 -17 Q12 -24 12 -37 L5 -33 L0 -35 L-4 -32Z',
      '#eee7cd',
      '#b5bba4',
      1,
    );
    ellipse(c, -5, -41, 1.5, 2, '#39484a');
    ellipse(c, 5, -41, 1.5, 2, '#39484a');
    path(
      c,
      'M-17 -48 Q-8 -55 -7 -62 Q4 -56 10 -56 L17 -47 Q0 -42 -17 -48Z',
      '#596f7f',
      '#344f59',
      2,
    );
    line(
      c,
      [
        [17, -4],
        [21, -43],
        [26, -48],
      ],
      '#aa8960',
      3,
    );
    c.font = 'bold 10px Georgia';
    c.textAlign = 'center';
    c.fillStyle = '#fff0bd';
    c.fillText(npc.name, 0, -73);
    c.fillStyle = '#f4d986';
    c.font = 'bold 17px Georgia';
    c.fillText(
      this.state.quest?.completed && !this.state.quest?.claimed ? '?' : '!',
      0,
      -91 + Math.sin(this.t * 2) * 3,
    );
    c.restore();
  }
  drawPortal(portal, world) {
    const c = this.ctx,
      destination = world.areas.find((a) => a.id === portal.targetArea);
    const unlocked = this.state.unlockedAreas?.includes(portal.targetArea);
    const color = unlocked ? '#a4e9d5' : '#c5b698';
    c.save();
    c.translate(portal.x, portal.y);
    ellipse(c, 0, -2, 37, 8, '#173f4b55');
    const glow = c.createRadialGradient(0, -45, 2, 0, -45, 60);
    glow.addColorStop(0, unlocked ? '#8ce6d175' : '#bca98e35');
    glow.addColorStop(1, '#8ce6d100');
    c.fillStyle = glow;
    c.fillRect(-65, -115, 130, 120);
    c.strokeStyle = '#547e75';
    c.lineWidth = 7;
    c.beginPath();
    c.ellipse(0, -45, 27, 43, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, -45, 24, 40, 0, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + this.t * 0.35;
      ellipse(c, Math.cos(angle) * 18, -45 + Math.sin(angle) * 31, 1.5, 2.5, color);
    }
    path(c, 'M-33 -2 L-29 -13 L29 -13 L33 -2Z', '#718f7a', '#3c655d', 2);
    c.textAlign = 'center';
    c.font = 'bold 10px Georgia';
    c.fillStyle = '#f0e6bc';
    c.fillText(destination?.name || 'Aether gate', 0, -101);
    c.font = '9px sans-serif';
    c.fillText(
      unlocked ? 'E · Enter gate' : `Opens at level ${destination?.minLevel || 1}`,
      0,
      -87,
    );
    c.restore();
  }
  cottage(x, y) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(0.8, 0.8);
    ellipse(c, 25, -3, 112, 13, '#314f482b');
    path(c, 'M -65 -2 L -65 -107 L 91 -107 L 91 -2 Z', '#d3bd8b', '#656649', 3);
    path(
      c,
      'M -89 -105 Q -24 -133 8 -199 Q 42 -151 116 -109 Q 30 -79 -89 -105 Z',
      '#426c58',
      '#355747',
      4,
    );
    path(c, 'M -74 -112 Q -9 -139 8 -181 Q 51 -133 101 -114 Q 34 -97 -74 -112', '#668956');
    path(c, 'M 54 -144 L 54 -187 L 75 -187 L 75 -132', '#8b8966', '#52634e', 3);
    path(c, 'M -17 0 L -17 -62 Q 9 -89 35 -62 L 35 0 Z', '#6b7051', '#52553d', 3);
    line(
      c,
      [
        [6, -62],
        [6, -5],
      ],
      '#a09665',
      2,
    );
    ellipse(c, 24, -32, 3, 3, '#efcd7c');
    c.fillStyle = '#68745b';
    c.fillRect(-53, -75, 27, 33);
    c.fillStyle = '#f4d590';
    c.fillRect(-49, -71, 19, 25);
    line(
      c,
      [
        [-39, -70],
        [-39, -46],
      ],
      '#6f7352',
      3,
    );
    line(
      c,
      [
        [-49, -58],
        [-30, -58],
      ],
      '#6f7352',
      3,
    );
    path(c, 'M -72 0 Q -78 -22 -56 -16 Q -37 -24 -30 0', '#568c55');
    this.flower(64, 0, 5);
    c.font = 'bold 12px Georgia';
    c.textAlign = 'center';
    c.fillStyle = '#f4dfab';
    c.fillText('ROWAN’S REST', 14, -101);
    c.restore();
  }
  sign(x, y, label) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    path(c, 'M -4 0 L -3 -75 L 5 -75 L 6 0', '#72694a', '#4d5b43', 2);
    path(c, 'M -34 -74 L 29 -74 L 40 -60 L 29 -46 L -34 -46 Z', '#c5a56b', '#6b6d47', 2);
    line(
      c,
      [
        [-27, -69],
        [21, -69],
      ],
      '#edcf8d',
      2,
    );
    c.font = 'bold 10px Georgia';
    c.textAlign = 'center';
    c.fillStyle = '#424f3d';
    c.fillText(label.slice(0, 12), -1, -56);
    c.restore();
  }
  flower(x, y, seed) {
    const c = this.ctx,
      p = this.palette;
    for (let j = 0; j < 3; j++) {
      const xx = x + j * 7 - 7,
        hh = 10 + noise(seed + j) * 14;
      line(
        c,
        [
          [xx, y],
          [xx + 2, y - hh],
        ],
        p.leaf[1],
        1.8,
      );
      ellipse(c, xx - 2, y - hh * 0.45, 5, 2.5, p.leaf[2], -0.5);
      for (let k = 0; k < 5; k++)
        ellipse(
          c,
          xx + 2 + Math.cos((k * TAU) / 5) * 3,
          y - hh + Math.sin((k * TAU) / 5) * 3,
          2.5,
          2,
          p.flower,
        );
      ellipse(c, xx + 2, y - hh, 1.5, 1.5, '#e3b960');
    }
  }
  drawPlatform(platform) {
    const c = this.ctx,
      p = this.palette,
      { x, y, w } = platform;
    const ground = y >= 800 || w > 2000;
    const h = ground ? 220 : Math.min(72, platform.h + 30 || 55);
    c.save();
    c.translate(x, y);
    const stone = c.createLinearGradient(0, 0, 0, h);
    stone.addColorStop(0, p.rock);
    stone.addColorStop(1, p.shadow);
    if (ground) {
      c.fillStyle = stone;
      c.fillRect(0, 4, w, h);
      path(c, `M 0 8 L ${w} 8 L ${w} 35 Q ${w * 0.6} 23 0 37 Z`, '#5b6b4f');
      const left = Math.max(0, Math.floor((this.camera.x - x - 80) / 70)),
        right = Math.min(Math.ceil(w / 70), Math.ceil((this.camera.x + this.width - x + 80) / 70));
      for (let i = left; i < right; i++) {
        const sx = i * 70 + noise(i) * 22,
          sy = 46 + noise(i + 3) * 126;
        c.globalAlpha = 0.14;
        path(c, `M ${sx} ${sy} l 12 -3 l 9 6 l -6 7 l -14 -2 Z`, '#e0d2aa');
        line(
          c,
          [
            [sx + 23, sy - 17],
            [sx + 38, sy - 19],
            [sx + 49, sy - 15],
          ],
          '#273e37',
          2,
        );
        c.globalAlpha = 1;
        if (i % 3 === 0)
          path(
            c,
            `M ${sx} 18 Q ${sx - 12} 40 ${sx + 4} 60 Q ${sx + 10} 71 ${sx - 3} 83`,
            null,
            '#536248',
            2,
          );
      }
    } else {
      path(
        c,
        `M 2 4 L ${w - 2} 4 L ${w - 8} 26 L ${w * 0.82} 34 L ${w * 0.74} ${h - 8} L ${w * 0.58} ${h - 15} L ${w * 0.43} ${h + 4} L ${w * 0.25} ${h - 13} L 16 34 Z`,
        stone,
        p.shadow,
        2,
      );
      path(
        c,
        `M 19 20 L ${w * 0.25} 30 L ${w * 0.36} ${h - 5} L ${w * 0.22} ${h - 16} Z`,
        '#c3b69044',
      );
      path(
        c,
        `M ${w * 0.66} 17 L ${w * 0.57} 34 L ${w * 0.62} ${h - 12} L ${w * 0.77} 30 Z`,
        '#344b4844',
      );
      for (let i = 0; i < Math.floor(w / 60); i++) {
        const rx = 35 + i * 60;
        path(
          c,
          `M ${rx} 21 Q ${rx - 8} 53 ${rx + 9} ${h + 20} Q ${rx + 13} ${h + 31} ${rx - 1} ${h + 40}`,
          null,
          '#615f40',
          3,
        );
        line(
          c,
          [
            [rx + 4, h + 11],
            [rx + 15, h + 18],
          ],
          '#61734b',
          2,
        );
      }
    }
    const grass = c.createLinearGradient(0, -8, 0, 19);
    grass.addColorStop(0, '#c0d87c');
    grass.addColorStop(0.25, p.grass);
    grass.addColorStop(1, p.leaf[1]);
    path(
      c,
      `M 0 1 Q 6 -8 18 -5 L ${w - 18} -5 Q ${w - 5} -8 ${w} 2 L ${w - 3} 13 Q ${w - 13} 20 ${w - 24} 12 L 22 12 Q 9 23 2 11 Z`,
      grass,
      p.leaf[0],
      1.5,
    );
    const start = Math.max(0, Math.floor((this.camera.x - x - 30) / 18) * 18),
      end = Math.min(w, this.camera.x + this.width - x + 30);
    for (let gx = start; gx < end; gx += 18) {
      const s = noise(gx + x);
      path(c, `M ${gx} 0 l -4 ${-5 - s * 5} l 7 5 l 3 -9 l 3 9 l 6 -4 l -3 7`, p.grass);
      if (s > 0.87) this.flower(gx, -2, gx + x);
    }
    if (!ground && w > 140) {
      ellipse(c, w * 0.8, 2, 17, 6, p.leaf[1]);
      ellipse(c, w * 0.8, -2, 12, 6, '#8da76b');
    }
    c.restore();
  }
  drawRope(rope) {
    const c = this.ctx,
      p = this.palette,
      { x, y1, y2 } = rope;
    c.save();
    const sway = this.motion ? Math.sin(this.t * 0.8 + x) * 1.8 : 0;
    line(
      c,
      [
        [x - 6, y1],
        [x - 6 + sway, (y1 + y2) / 2],
        [x - 6, y2],
      ],
      '#435e45',
      4,
    );
    line(
      c,
      [
        [x + 6, y1],
        [x + 6 + sway, (y1 + y2) / 2],
        [x + 6, y2],
      ],
      '#537547',
      4,
    );
    for (let y = y1 + 10; y < y2; y += 19) {
      line(
        c,
        [
          [x - 8, y],
          [x + 8, y],
        ],
        '#b6a374',
        4,
      );
      line(
        c,
        [
          [x - 6, y - 1],
          [x + 6, y - 1],
        ],
        '#dcc692',
        1,
      );
      if (Math.floor(y / 19) % 4 === 0) {
        ellipse(c, x - 10, y + 3, 8, 4, p.leaf[2], -0.5);
        ellipse(c, x + 11, y + 12, 8, 4, p.leaf[1], 0.5);
      }
    }
    path(c, `M ${x - 9} ${y1 - 4} Q ${x} ${y1 - 14} ${x + 9} ${y1 - 4}`, null, '#a3a461', 4);
    c.restore();
  }
  drawPlayer(player, classId) {
    const c = this.ctx,
      w = player.w || 34,
      h = player.h || 56,
      dead = player.hp <= 0 || player.deadTimer > 0;
    const walk = player.grounded !== false && Math.abs(player.vx || 0) > 5;
    const step = walk && this.motion ? Math.sin(this.t * 14) : 0;
    const attack = (player.attackAnimation ?? player.attackTimer) > 0,
      cast = (player.skillAnimation ?? player.skillTimer) > 0 || player.castTimer > 0,
      climb = !!player.climbing;
    const airborne = player.grounded === false && !climb;
    const face = player.facing < 0 ? -1 : 1;
    const colors = {
      vanguard: { hair: '#784738', cape: '#d3654e', armor: '#4a8c8c', trim: '#f4cf7b' },
      arcanist: { hair: '#e4cb9c', cape: '#826fa6', armor: '#5b71a1', trim: '#f4d48a' },
      nightblade: { hair: '#d7dce7', cape: '#655385', armor: '#43516b', trim: '#a3d7dd' },
      ranger: { hair: '#a7653c', cape: '#5b8354', armor: '#648b76', trim: '#efd494' },
    }[classId] || { hair: '#784738', cape: '#d3654e', armor: '#4a8c8c', trim: '#f4cf7b' };
    ellipse(c, player.x + w / 2, player.y + h + 2, w * 0.7, 5, '#24453936');
    c.save();
    c.translate(player.x + w / 2, player.y + h);
    c.scale((face * h) / 65, h / 65);
    if (dead) {
      c.translate(0, -8);
      c.rotate(-1.35);
      c.globalAlpha = 0.65;
    } else if (player.invuln > 0) c.globalAlpha = 0.7 + Math.sin(this.t * 36) * 0.25;
    const bob = climb
      ? Math.sin(this.t * 10) * 2
      : walk
        ? Math.abs(step) * 2
        : Math.sin(this.t * 2) * 0.7;
    c.translate(0, -bob);
    const capeFlow = this.motion ? Math.sin(this.t * 6) * 3 : 0;
    path(
      c,
      `M -12 -43 Q -20 -30 ${-21 - (walk ? 7 : 0)} -10 Q -9 ${-8 + capeFlow} 7 -17 L 9 -43 Z`,
      colors.cape,
      '#343e48',
      2,
    );
    path(c, `M -11 -38 Q -15 -23 ${-17 - (walk ? 4 : 0)} -13 L -7 -17`, null, '#ffffff40', 2);
    // Articulated boots and leggings are separate from torso animation.
    for (const side of [-1, 1]) {
      const legX = side * 7 + step * side * 4 + (airborne ? side * 3 : 0),
        legY = airborne
          ? side > 0
            ? 8
            : 3
          : climb
            ? side > 0
              ? Math.sin(this.t * 10) * 6
              : -Math.sin(this.t * 10) * 6
            : Math.max(0, step * side * 4);
      path(
        c,
        `M ${side * 7 - 4} -17 L ${legX - 4} ${-5 - legY} Q ${legX - 5} ${2 - legY} ${legX + 8} ${-legY} L ${legX + 8} ${-6 - legY} L ${legX + 3} -18 Z`,
        '#414c58',
        '#303843',
        2,
      );
      line(
        c,
        [
          [legX - 3, -7 - legY],
          [legX + 5, -7 - legY],
        ],
        colors.trim,
        2,
      );
    }
    path(c, 'M -11 -42 Q 0 -47 12 -40 L 13 -20 Q 1 -12 -13 -20 Z', colors.armor, '#303e46', 2);
    path(c, 'M -7 -40 L 0 -31 L 7 -40 L 6 -25 L -7 -25 Z', '#c1d2c1');
    path(c, 'M -13 -21 Q 0 -17 13 -22 L 13 -17 Q 0 -13 -13 -17 Z', '#735640', '#303e46', 1.5);
    c.fillStyle = colors.trim;
    c.fillRect(-2, -22, 6, 6);
    c.fillStyle = '#6a6952';
    c.fillRect(0, -20, 2, 2);
    const rearArm = climb ? -16 : airborne ? -10 : step * 3;
    path(
      c,
      `M -12 -39 Q -23 -34 -17 ${-25 + rearArm} L -10 ${-27 + rearArm} L -6 -38`,
      colors.armor,
      '#303e46',
      2,
    );
    ellipse(c, -13, -25 + rearArm, 4, 5, '#f3c99b');
    // Face: warm outline, ears, large eyes, nose and changing expression.
    ellipse(c, -13, -51, 5, 6, '#e9b78c');
    ellipse(c, 13, -51, 5, 6, '#efc397');
    ellipse(c, 0, -55, 16, 17, colors.hair);
    ellipse(c, 2, -51, 13, 13, '#f4cc9f');
    path(
      c,
      'M -12 -49 Q -18 -59 -8 -68 Q 8 -75 16 -61 L 15 -50 L 10 -58 L 8 -54 L 3 -61 Q -4 -53 -12 -54 Z',
      colors.hair,
      '#433e40',
      1.5,
    );
    path(c, 'M -13 -62 Q -3 -73 8 -65', null, '#ffffff35', 2);
    const blink = this.motion && Math.sin(this.t * 0.71) > 0.997;
    if (dead) {
      line(
        c,
        [
          [-5, -53],
          [-1, -50],
          [-5, -49],
        ],
        '#594a47',
        1.5,
      );
      line(
        c,
        [
          [6, -53],
          [10, -50],
          [6, -49],
        ],
        '#594a47',
        1.5,
      );
    } else if (blink) {
      line(
        c,
        [
          [-5, -52],
          [-1, -52],
        ],
        '#594a47',
        1.5,
      );
      line(
        c,
        [
          [6, -52],
          [10, -52],
        ],
        '#594a47',
        1.5,
      );
    } else {
      ellipse(c, -3, -51, 2.4, 3.6, '#39434c');
      ellipse(c, 8, -51, 2.4, 3.6, '#39434c');
      ellipse(c, -2.4, -52.3, 0.9, 1.2, '#fff6db');
      ellipse(c, 8.6, -52.3, 0.9, 1.2, '#fff6db');
    }
    ellipse(c, -7, -46, 3, 1.6, '#e69e87');
    ellipse(c, 11, -46, 2.5, 1.5, '#e69e87');
    path(c, attack ? 'M 2 -43 Q 5 -40 8 -44' : 'M 2 -43 Q 5 -41 7 -44', null, '#9a6459', 1.2);
    if (classId === 'vanguard') {
      path(c, 'M -16 -59 Q -2 -65 15 -58 L 13 -55 Q 0 -60 -14 -55 Z', colors.trim, '#726149', 1);
      path(c, 'M -3 -61 L 1 -67 L 5 -61 L 1 -56 Z', '#7ed9d4');
    }
    if (classId === 'arcanist') {
      path(
        c,
        'M -24 -65 Q -17 -69 -8 -68 L 1 -92 Q 5 -83 14 -77 L 15 -66 Q 26 -65 23 -61 Q 2 -55 -24 -62 Z',
        colors.cape,
        '#393c52',
        2,
      );
      path(c, 'M -9 -69 L 15 -69 L 17 -64 L -11 -64 Z', colors.trim);
      star(c, 4, -77, 4, '#f7dd8f');
    }
    if (classId === 'nightblade') {
      path(
        c,
        'M -17 -59 Q -15 -77 1 -76 Q 17 -74 19 -56 L 13 -61 Q 1 -73 -11 -59 Z',
        colors.cape,
        '#343746',
        2,
      );
      path(c, 'M -9 -44 Q 0 -46 14 -43 L 11 -37 L -8 -37 Z', colors.cape);
    }
    if (classId === 'ranger') {
      path(
        c,
        'M -19 -64 Q -7 -71 1 -70 L 15 -78 L 12 -64 Q 22 -61 23 -59 L -19 -60 Z',
        colors.cape,
        '#3e4f40',
        2,
      );
      path(c, 'M -4 -68 Q -2 -81 8 -85 Q 11 -72 -4 -68', '#e8bd72');
      line(
        c,
        [
          [-3, -68],
          [6, -81],
        ],
        '#987750',
        1,
      );
    }
    c.save();
    c.translate(11, -35);
    let angle = attack
      ? -1.7 + Math.min(1, (player.attackTimer || 0) / 0.35) * 2.4
      : cast
        ? -1
        : walk
          ? step * 0.12
          : 0;
    if (climb) angle = -2.2;
    c.rotate(angle);
    path(c, 'M -3 -5 Q 7 -7 9 4 L 8 11 L 1 11 L -2 2', colors.armor, '#303e46', 1.6);
    ellipse(c, 6, 10, 4.5, 5, '#f4cc9f');
    if (classId === 'arcanist') {
      line(
        c,
        [
          [8, 22],
          [8, -38],
        ],
        '#634f4f',
        4,
      );
      line(
        c,
        [
          [9, 18],
          [9, -31],
        ],
        '#d6b581',
        1,
      );
      path(c, 'M 8 -48 Q 24 -39 14 -30 Q 5 -26 -1 -36 Z', '#a885c6', '#ded1aa', 2);
      glow(c, 9, -38, 17, '#c4f5ff70');
      ellipse(c, 9, -38, 5, 7, '#b9f4f4');
    } else if (classId === 'ranger') {
      path(c, 'M 12 -27 Q 43 2 12 29 Q 32 1 12 -27', '#bc9a65', '#6b654c', 2);
      line(
        c,
        [
          [12, -27],
          [16, 1],
          [12, 29],
        ],
        '#f2ddb2',
        1,
      );
      line(
        c,
        [
          [2, 1],
          [41, 1],
        ],
        '#f1dbac',
        2,
      );
      path(c, 'M 45 1 L 37 -3 L 37 5 Z', '#c7e6db');
    } else if (classId === 'nightblade') {
      path(c, 'M 8 7 L 11 -20 L 17 -29 L 17 6 Z', '#c3e2e3', '#354c62', 2);
      line(
        c,
        [
          [6, 8],
          [20, 8],
        ],
        '#b49fc1',
        3,
      );
      line(
        c,
        [
          [12, 10],
          [12, 18],
        ],
        '#655c7b',
        4,
      );
    } else {
      path(c, 'M 6 5 L 7 -30 L 13 -39 L 19 -30 L 17 5 Z', '#d9e7df', '#3b5962', 2);
      path(c, 'M 13 -34 L 13 4 L 17 4 L 18 -29 Z', '#8fb9bc');
      line(
        c,
        [
          [1, 6],
          [22, 6],
        ],
        '#edc478',
        4,
      );
      line(
        c,
        [
          [12, 8],
          [12, 19],
        ],
        '#6e5848',
        5,
      );
      ellipse(c, 12, 20, 4, 3, '#ebc77b');
    }
    c.restore();
    if (attack && !dead) {
      c.save();
      c.globalAlpha = 0.55;
      path(c, 'M 18 -75 Q 77 -37 28 8 Q 56 -29 18 -75', '#fff5ba');
      path(c, 'M 24 -70 Q 67 -36 34 0', null, '#fffde8', 3);
      c.restore();
    }
    if (cast && !dead) {
      glow(c, 5, -31, 48, '#b7f6f845');
      for (let i = 0; i < 4; i++)
        star(c, Math.cos(this.t * 3 + i) * 32, -35 + Math.sin(this.t * 3 + i) * 25, 3, '#e8faff');
    }
    c.restore();
    if (!dead) {
      c.save();
      c.textAlign = 'center';
      c.font = 'bold 10px system-ui';
      c.fillStyle = '#183e3e';
      c.strokeStyle = '#f7edcf';
      c.lineWidth = 3;
      c.strokeText(player.name || 'You', player.x + w / 2, player.y - 19);
      c.fillText(player.name || 'You', player.x + w / 2, player.y - 19);
      c.restore();
    }
  }
  drawCompanion(player) {
    const c = this.ctx,
      x = player.x - (player.facing || 1) * 30,
      y = player.y + 10 + Math.sin(this.t * 3) * 5;
    c.save();
    c.translate(x, y);
    glow(c, 0, 0, 16, '#fff3b645');
    ellipse(c, -7, -3, 7, 3, '#edfbef90', -0.4);
    ellipse(c, 7, -3, 7, 3, '#edfbef90', 0.4);
    path(c, 'M -6 0 Q -9 -10 0 -10 Q 10 -10 7 0 L 4 6 L -3 5 Z', '#e8d58e', '#707852', 1);
    path(
      c,
      'M -2 -10 Q -6 -18 -10 -14 Q -8 -9 -2 -10 M 1 -10 Q 4 -17 8 -15 Q 8 -10 1 -10',
      '#83ae6b',
    );
    ellipse(c, -2, -2, 1, 1.5, '#3d5b52');
    ellipse(c, 3, -2, 1, 1.5, '#3d5b52');
    c.restore();
  }
  drawEnemy(enemy) {
    const c = this.ctx,
      w = enemy.w || 48,
      h = enemy.h || 38;
    if (enemy.hp <= 0 && !enemy.deathTimer) return;
    const dying = enemy.hp <= 0;
    const phase = this.t * 3 + (Number(enemy.id) || enemy.x) * 0.1;
    const hop = this.motion ? Math.sin(phase) : 0;
    const face = enemy.facing < 0 ? -1 : 1;
    ellipse(c, enemy.x + w / 2, enemy.y + h + 2, w * 0.48, 5, '#29483d2b');
    c.save();
    c.translate(enemy.x + w / 2, enemy.y + h);
    c.scale(face, 1);
    if (dying) {
      c.globalAlpha = 0.35;
      c.scale(1.2, 0.35);
    }
    if (enemy.hitTimer > 0) c.globalAlpha = 0.6 + Math.sin(this.t * 50) * 0.3;
    if (enemy.isBoss || enemy.type === 'boss' || enemy.type === 'guardian')
      this.drawBoss(enemy, hop);
    else if (enemy.type === 'mushroom') {
      c.scale(w / 58, h / 58);
      c.translate(0, -Math.abs(hop) * 1.5);
      path(c, 'M -13 -30 Q -18 -10 -13 -4 Q 0 5 15 -4 Q 18 -15 11 -30 Z', '#efe1b9', '#675c4c', 2);
      path(c, 'M -12 -18 Q 0 -12 13 -18 L 14 -9 Q 0 -2 -13 -9', '#d5be8c');
      ellipse(c, -7, -3, 9, 4, '#907b55');
      ellipse(c, 9, -3, 9, 4, '#907b55');
      const cap = c.createLinearGradient(0, -58, 0, -19);
      cap.addColorStop(0, '#eea16c');
      cap.addColorStop(0.6, '#d87957');
      cap.addColorStop(1, '#a65346');
      path(
        c,
        'M -29 -27 Q -23 -57 -3 -59 Q 22 -60 31 -28 Q 11 -17 -16 -21 Q -27 -21 -29 -27 Z',
        cap,
        '#795748',
        2,
      );
      path(c, 'M -27 -27 Q 0 -17 30 -28 Q 20 -17 -5 -19 Q -21 -19 -27 -27', '#f4d497');
      ellipse(c, -13, -40, 6, 4, '#ffe5b4', -0.5);
      ellipse(c, 9, -48, 7, 4, '#ffe5b4', 0.3);
      ellipse(c, 21, -34, 4, 3, '#f6d3a5');
      this.creatureFace(c, 0, -15, 1, enemy.attackTimer > 0);
    } else if (enemy.type === 'wisp') {
      c.scale(w / 45, h / 54);
      c.translate(0, hop * 5);
      glow(c, 0, -28, 38, '#a5eeed45');
      path(
        c,
        'M 0 -58 Q 8 -43 17 -35 Q 29 -16 13 -8 Q 3 2 -14 -10 Q -28 -23 -9 -37 Q -3 -43 0 -58 Z',
        '#a3dadb',
        '#4e96a6',
        2,
      );
      path(c, 'M 0 -47 Q -9 -23 -9 -14 Q 3 -7 13 -19 Q 16 -28 0 -47', '#dbfbeb');
      this.creatureFace(c, 1, -22, 1, false);
      path(c, 'M -13 -10 Q -21 3 -7 2 M 10 -8 Q 22 3 8 4', null, '#97c5ce', 3);
    } else if (enemy.type === 'boar') {
      c.scale(w / 70, h / 47);
      c.translate(0, -Math.abs(hop));
      path(
        c,
        'M -29 -25 Q -31 -43 -10 -43 Q 10 -44 28 -24 L 29 -9 Q 6 1 -22 -8 Z',
        '#947664',
        '#5b514a',
        2,
      );
      path(c, 'M -22 -36 L -15 -48 L -7 -38 L 1 -47 L 5 -36 L 13 -42 L 16 -30', '#705b52');
      ellipse(c, 22, -20, 16, 13, '#bb977c');
      ellipse(c, 31, -18, 8, 7, '#d5ad8b');
      ellipse(c, 31, -20, 1.8, 2.5, '#735c50');
      path(c, 'M 18 -10 Q 30 -7 31 -24 Q 27 -15 18 -17', '#f9e2b7', '#8a7960', 1);
      ellipse(c, 16, -28, 3, 4, '#393d3b');
      ellipse(c, 17, -29, 1, 1, '#fff2cc');
      path(c, 'M 7 -34 Q 0 -50 14 -42 L 17 -31', '#b1967a', '#66574e', 2);
      for (const xx of [-18, 9])
        path(
          c,
          `M ${xx - 4} -13 L ${xx - 5} 0 L ${xx + 6} 0 L ${xx + 5} -14 Z`,
          '#6c6055',
          '#514d46',
          1.5,
        );
      path(c, 'M -29 -21 Q -44 -25 -37 -32 Q -32 -35 -33 -29', null, '#8b6e5a', 3);
    } else {
      c.scale(w / 58, h / 39);
      c.scale(1 + hop * 0.035, 1 - hop * 0.04);
      const body = c.createRadialGradient(-9, -23, 2, 0, -15, 34);
      body.addColorStop(0, '#b6e588');
      body.addColorStop(0.55, '#87c773');
      body.addColorStop(1, '#4a9d72');
      path(
        c,
        'M -28 -6 Q -27 -21 -18 -25 Q -14 -39 0 -38 Q 18 -38 22 -23 Q 29 -19 30 -6 Q 20 3 0 0 Q -20 4 -28 -6 Z',
        body,
        '#47876a',
        2,
      );
      ellipse(c, -9, -28, 7, 3, '#ecf9c5', -0.4);
      path(c, 'M -24 -7 Q -7 -2 23 -7', null, '#b7e09a', 2);
      this.creatureFace(c, 3, -15, 1, enemy.attackTimer > 0);
      ellipse(c, -12, -12, 4, 2, '#e3b39880');
      ellipse(c, 18, -12, 4, 2, '#e3b39880');
      path(
        c,
        'M -3 -37 Q -9 -47 -15 -43 Q -13 -36 -3 -37 M -2 -38 Q 4 -48 10 -44 Q 8 -38 -2 -38',
        '#5d9c67',
        '#47876a',
        1,
      );
    }
    c.restore();
    if (!dying && enemy.hp < enemy.maxHp) {
      const bw = Math.max(30, w * 0.7);
      c.fillStyle = '#263d40b0';
      c.fillRect(enemy.x + w / 2 - bw / 2, enemy.y - 11, bw, 4);
      c.fillStyle =
        enemy.isBoss || enemy.type === 'boss' || enemy.type === 'guardian' ? '#f1ab76' : '#d8ca8d';
      c.fillRect(
        enemy.x + w / 2 - bw / 2 + 1,
        enemy.y - 10,
        (bw - 2) * clamp(enemy.hp / enemy.maxHp, 0, 1),
        2,
      );
    }
    if ((enemy.isBoss || enemy.type === 'boss' || enemy.type === 'guardian') && !dying) {
      c.save();
      c.font = 'bold 11px Georgia';
      c.textAlign = 'center';
      c.fillStyle = '#fff0c4';
      c.strokeStyle = '#4b384b';
      c.lineWidth = 3;
      c.strokeText('CINDERROOT GUARDIAN', enemy.x + w / 2, enemy.y - 22);
      c.fillText('CINDERROOT GUARDIAN', enemy.x + w / 2, enemy.y - 22);
      c.restore();
    }
  }
  creatureFace(c, x, y, s, angry) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    ellipse(c, -7, 0, 2.4, 3.3, '#355a50');
    ellipse(c, 7, 0, 2.4, 3.3, '#355a50');
    ellipse(c, -6.5, -1, 1, 1.2, '#fff8d9');
    ellipse(c, 7.5, -1, 1, 1.2, '#fff8d9');
    path(c, 'M -2 5 Q 1 8 4 4', null, '#52765b', 1.4);
    if (angry) {
      line(
        c,
        [
          [-10, -6],
          [-5, -4],
        ],
        '#426456',
        2,
      );
      line(
        c,
        [
          [5, -4],
          [10, -6],
        ],
        '#426456',
        2,
      );
    }
    c.restore();
  }
  drawBoss(enemy, hop) {
    const c = this.ctx;
    c.scale((enemy.w || 130) / 130, (enemy.h || 140) / 140);
    c.translate(0, hop * 1.2);
    const stone = c.createLinearGradient(-40, -100, 40, 0);
    stone.addColorStop(0, '#70666a');
    stone.addColorStop(0.5, '#988372');
    stone.addColorStop(1, '#524951');
    for (const side of [-1, 1]) {
      path(
        c,
        `M ${side * 18 - 12} -39 L ${side * 28 - 16} -3 L ${side * 28 + 14} -3 L ${side * 24 + 12} -39 Z`,
        stone,
        '#403c44',
        3,
      );
      path(
        c,
        `M ${side * 40} -92 Q ${side * 72} -77 ${side * 59} -39 L ${side * 45} -35 L ${side * 31} -77 Z`,
        stone,
        '#403c44',
        3,
      );
      line(
        c,
        [
          [side * 52, -67],
          [side * 58, -54],
          [side * 48, -48],
        ],
        '#e4a164',
        3,
      );
    }
    path(
      c,
      'M -41 -102 L -30 -42 L 1 -31 L 36 -48 L 42 -103 L 12 -121 L -20 -120 Z',
      stone,
      '#403c44',
      3,
    );
    path(c, 'M -30 -101 L -19 -55 L 0 -44 L 24 -56 L 28 -101 Z', '#5d5557');
    path(c, 'M 0 -101 L 15 -80 L 0 -57 L -16 -80 Z', '#f1b16d', '#d98c54', 3);
    glow(c, 0, -80, 32, '#ffc96e65');
    path(c, 'M 0 -92 L 7 -80 L 0 -68 L -8 -80 Z', '#ffe6a3');
    path(
      c,
      'M -29 -112 L -25 -139 L 0 -148 L 28 -136 L 25 -108 L 0 -98 Z',
      '#9b8973',
      '#49464a',
      3,
    );
    path(
      c,
      'M -23 -127 L -8 -121 L -10 -116 L -23 -119 Z M 23 -127 L 8 -121 L 10 -116 L 23 -119 Z',
      '#ffe1a0',
    );
    path(c, 'M -9 -108 L 0 -112 L 10 -108', null, '#5a514e', 3);
    path(
      c,
      'M -25 -134 Q -42 -150 -39 -169 L -33 -155 L -29 -167 L -23 -143 M 24 -133 Q 41 -144 42 -166 L 34 -153 L 29 -163 L 24 -143',
      '#66584f',
      '#4f4848',
      3,
    );
    for (let i = 0; i < 5; i++) {
      ellipse(
        c,
        -35 + i * 17,
        -140 + Math.sin(i) * 6,
        13,
        7,
        ['#a8774f', '#c79856', '#78905b'][i % 3],
        i * 0.2,
      );
    }
    if (enemy.telegraph > 0 || enemy.telegraphTimer > 0 || enemy.attackPhase === 'strike') {
      c.save();
      c.globalAlpha = 0.55 + Math.sin(this.t * 12) * 0.2;
      ellipse(c, 0, -3, 100, 16, '#f3a05360');
      c.strokeStyle = '#ffc677';
      c.lineWidth = 2;
      c.stroke();
      c.restore();
    }
  }
  drawDrop(drop) {
    const c = this.ctx,
      x = drop.x,
      y = drop.y + (this.motion ? Math.sin(this.t * 4 + x) * 3 : 0);
    c.save();
    c.translate(x, y);
    if (drop.type === 'gold' || drop.type === 'coin') {
      glow(c, 0, 0, 18, '#ffe6a530');
      ellipse(c, 0, 0, 6, 8, '#dba849');
      ellipse(c, 0, -1, 4.5, 6.5, '#f9d276');
      ellipse(c, -1, -2, 3, 5, '#ffe9a4');
      line(
        c,
        [
          [0, -4],
          [0, 3],
        ],
        '#c29747',
        1.5,
      );
    } else {
      glow(c, 0, 0, 24, drop.item?.rarity === 'epic' ? '#d49fff55' : '#9fffe54d');
      path(c, 'M -8 -8 L 8 -8 L 10 6 L 0 11 L -10 6 Z', '#d1e4c2', '#4d7e74', 2);
      path(c, 'M -4 -4 L 4 -4 L 5 3 L 0 6 L -5 3 Z', '#a0bd83');
      star(c, 0, -1, 4, '#fff1bb');
      line(
        c,
        [
          [-8, -8],
          [0, -12],
          [8, -8],
        ],
        '#f0dd9d',
        2,
      );
    }
    if (this.particles) star(c, 8, -14, 2.5, '#ffedbc');
    c.restore();
  }
  drawEffect(effect, front) {
    const c = this.ctx;
    const kind = effect.type || 'burst';
    const max = effect.maxLife || 0.6;
    const life = effect.life ?? max;
    const progress = clamp(1 - life / max, 0, 1);
    const alpha = clamp((life / max) * 1.7, 0, 1);
    const radius = effect.radius || effect.range || 80;
    const face = effect.facing || 1;
    const color =
      { vanguard: '#ffda8c', arcanist: '#c9b5ff', ranger: '#c7f0a5', nightblade: '#c4bdff' }[
        effect.classId || this.state.classId
      ] || '#ffe8a2';
    if (front !== !['telegraph', 'boss-slam', 'nova', 'ultimate', 'levelup'].includes(kind)) return;
    c.save();
    c.translate(effect.x || 0, effect.y || 0);
    c.globalAlpha = alpha;
    if (kind === 'telegraph') {
      ellipse(c, 0, 0, radius, 22, '#f26c474a');
      c.strokeStyle = '#ffcf86';
      c.lineWidth = 2;
      c.stroke();
      ellipse(c, 0, 0, radius * (0.4 + progress * 0.6), 18, '#f3985e24');
      for (let i = 0; i < 7; i++)
        path(c, `M ${-radius + (i * radius) / 3} -8 l 8 -7 l 8 7`, null, '#ffe2a2', 2);
    } else if (kind === 'boss-slam') {
      ellipse(c, 0, 0, radius * progress, 25 + progress * 15, '#f1b06335');
      c.strokeStyle = '#ffd291';
      c.lineWidth = 5 * (1 - progress) + 1;
      c.stroke();
      for (let i = 0; i < 12; i++) {
        const x = Math.cos(i * 1.6) * radius * progress,
          y = -Math.sin(progress * Math.PI) * 40 - noise(i) * 25;
        path(c, `M ${x - 5} ${y} l 5 -10 l 6 8 l -4 7 Z`, '#ba8769');
      }
    } else if (kind === 'slash') {
      c.scale(face, 1);
      c.rotate(-0.6 + progress * 1.2);
      path(
        c,
        `M 15 -53 Q ${Math.min(radius, 130)} -21 25 51 Q ${Math.min(radius, 130) - 22} 0 15 -53`,
        color,
      );
      path(c, `M 20 -48 Q ${Math.min(radius, 130) - 8} -13 30 44`, null, '#fff8d8', 3);
    } else if (kind === 'arrow' || kind === 'bolt') {
      c.scale(face, 1);
      const x = 15 + progress * Math.min(radius, 400);
      if (kind === 'arrow') {
        line(
          c,
          [
            [x - 35, 0],
            [x + 10, 0],
          ],
          '#ffebbb',
          3,
        );
        path(c, `M ${x + 17} 0 l -12 -5 l 3 5 l -3 5 Z`, '#f4f8d4');
        line(
          c,
          [
            [x - 27, -5],
            [x - 21, 0],
            [x - 27, 5],
          ],
          '#abd69b',
          3,
        );
      } else {
        glow(c, x, 0, 25, color + '70');
        ellipse(c, x, 0, 12, 7, '#e3eaff');
        path(c, `M ${x - 7} -5 Q ${x - 28} -8 ${x - 45} 0 Q ${x - 28} 8 ${x - 7} 5`, color);
      }
    } else if (kind === 'levelup') {
      glow(c, 0, 0, 90, '#fff2b970');
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(0, 40 - progress * 80 + i * 17, 38 + progress * 22, 12, 0, 0, TAU);
        c.strokeStyle = '#fff2be';
        c.lineWidth = 2;
        c.stroke();
      }
      for (let i = 0; i < 8; i++)
        star(c, Math.cos(i) * 50, -progress * 90 + Math.sin(i) * 30, 4, '#fff6ce');
    } else if (kind === 'hurt') {
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5;
        line(
          c,
          [
            [Math.cos(a) * 8, Math.sin(a) * 8],
            [Math.cos(a) * (15 + progress * 20), Math.sin(a) * (15 + progress * 20)],
          ],
          '#f9d1aa',
          3,
        );
      }
    } else if (kind === 'defeat') {
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7;
        star(
          c,
          Math.cos(a) * progress * 45,
          Math.sin(a) * progress * 30 - progress * 10,
          4 * (1 - progress) + 1,
          '#fff3c8',
        );
      }
    } else {
      const r = Math.min(radius, 320) * (0.25 + progress * 0.75);
      glow(c, 0, 0, r, color + '38');
      c.beginPath();
      c.ellipse(0, 15, r, Math.max(15, r * 0.27), 0, 0, TAU);
      c.strokeStyle = color;
      c.lineWidth = 3 * (1 - progress) + 1;
      c.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + progress;
        c.save();
        c.translate(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.4);
        star(c, 0, 0, 6 * (1 - progress) + 2, '#fff7dc');
        c.restore();
      }
      if (kind === 'ultimate' || kind === 'nova') {
        for (let i = 0; i < 5; i++) {
          const xx = (i - 2) * r * 0.35;
          path(
            c,
            `M ${xx - 8} 25 L ${xx - 3} ${-r * 0.6} L ${xx + 3} ${-r * 0.8} L ${xx + 8} 25`,
            color + '50',
          );
        }
      }
    }
    c.restore();
  }
  drawParticle(particle) {
    if (!Number.isFinite(particle.x) || !Number.isFinite(particle.y)) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = clamp((particle.life ?? 1) / (particle.maxLife || 1), 0, 1);
    const size = clamp(particle.size || particle.radius || 2, 1, 18);
    ellipse(c, particle.x, particle.y, size, size, particle.color || '#ffe8ae');
    c.restore();
  }
  drawNumber(number, skin = 'amber') {
    if (!Number.isFinite(number.x) || !Number.isFinite(number.y)) return;
    const c = this.ctx,
      pal = {
        amber: ['#fff3bc', '#845f3b'],
        sakura: ['#ffe0ed', '#a54f80'],
        frost: ['#e0ffff', '#377491'],
        cyber: ['#d9ffbd', '#496a68'],
        solar: ['#fff5a9', '#ae6a37'],
      }[skin] || ['#fff3bc', '#845f3b'];
    const text = String(number.text ?? number.amount ?? '');
    c.save();
    c.globalAlpha = clamp((number.life ?? 1) * 2, 0, 1);
    c.textAlign = 'center';
    c.font = `900 ${text.length > 8 ? 15 : 21}px system-ui`;
    c.lineJoin = 'round';
    c.lineWidth = 4;
    c.strokeStyle = pal[1];
    c.strokeText(text, number.x, number.y);
    c.fillStyle = /^[-+]?\d/.test(text) ? pal[0] : number.color || pal[0];
    c.fillText(text, number.x, number.y);
    c.restore();
  }
  crystal(c, x, y, size, alpha) {
    c.save();
    c.translate(x, y);
    c.globalAlpha = alpha;
    path(
      c,
      `M ${-size * 0.4} 0 L ${-size * 0.5} ${-size * 0.55} L ${-size * 0.3} ${-size * 0.83} L 0 ${-size * 0.45} L ${size * 0.12} ${-size} L ${size * 0.4} ${-size * 0.72} L ${size * 0.35} 0 Z`,
      '#86c4c7',
      '#aecfcd',
      2,
    );
    path(
      c,
      `M 0 0 L ${size * 0.12} ${-size} L ${size * 0.17} ${-size * 0.38} L ${size * 0.35} 0 Z`,
      '#c0dfd9',
    );
    path(
      c,
      `M ${-size * 0.4} 0 L ${-size * 0.3} ${-size * 0.83} L ${-size * 0.18} ${-size * 0.35} L 0 0 Z`,
      '#5d9db2',
    );
    c.restore();
  }
  drawForeground() {
    const c = this.ctx,
      p = this.palette;
    const shade = c.createLinearGradient(0, 600, 0, 720);
    shade.addColorStop(0, 'transparent');
    shade.addColorStop(1, '#173f393c');
    c.fillStyle = shade;
    c.fillRect(0, 600, this.width, 120);
    // Soft corner foliage frames the playable world without hiding platforms.
    c.save();
    c.globalAlpha = 0.45;
    for (const side of [0, 1]) {
      c.save();
      c.translate(side ? this.width : 0, 720);
      c.scale(side ? -1 : 1, 1);
      for (let i = 0; i < 5; i++) {
        const x = i * 18,
          y = -i * 10;
        path(
          c,
          `M -5 10 Q ${x + 15} ${y - 55} ${x + 50} ${y - 65} Q ${x + 30} ${y - 25} -5 10`,
          p.leaf[0],
        );
      }
      c.restore();
    }
    c.restore();
  }
}
