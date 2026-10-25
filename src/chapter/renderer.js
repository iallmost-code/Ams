import { Renderer } from '../renderer.js';
import { vanguardArt, guardianArt } from './art.js';
import { drawSkillVfx } from '../skill-vfx.js';
import { MAPS } from './world.js';
const tau = Math.PI * 2;
function ellipse(c, x, y, w, h, fill) {
  c.beginPath();
  c.ellipse(x, y, w, h, 0, 0, tau);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  } else c.stroke();
}
function star(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      v = i % 2 ? r * 0.24 : r;
    c.lineTo(x + Math.cos(a) * v, y + Math.sin(a) * v);
  }
  c.closePath();
  c.fill();
}
export class ChapterRenderer extends Renderer {
  resize() {
    super.resize();
    const r = this.canvas.getBoundingClientRect();
    this.height = r.height > r.width ? 940 : 560;
    this.width = (this.height * r.width) / r.height;
    this.scale = this.canvas.height / this.height;
  }
  render(state, dt) {
    if (this.mapId !== state.mapId) {
      this.mapId = state.mapId;
      this.initialized = false;
      this.layers.clear();
    }
    super.render(state, dt);
  }
  drawStoryBeacon() {
    const b = this.state.world.beacon;
    if (!b || !this.visible(b.x, 100)) return;
    const c = this.ctx;
    c.save();
    c.translate(b.x, b.y);
    c.strokeStyle = '#9c825c';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-18, 0);
    c.lineTo(-18, -75);
    c.quadraticCurveTo(0, -100, 18, -75);
    c.lineTo(18, 0);
    c.stroke();
    c.shadowBlur = 20;
    c.shadowColor = this.state.beaconLit ? '#a7fff6' : '#ffe6a1';
    c.fillStyle = '#ffe5a1';
    c.beginPath();
    c.moveTo(-18, -46);
    c.quadraticCurveTo(-12, -86, 0, -77);
    c.quadraticCurveTo(12, -86, 18, -46);
    c.closePath();
    c.fill();
    star(c, 0, -65, 7, '#fff8d4');
    c.restore();
    this.drawNamePill(b.name, b.x, b.y, '#ffe6a1');
  }
  drawWorldScenery(world) {
    const c = this.ctx;
    for (const p of world.portals)
      if (this.visible(p.x, 100))
        this.drawPortal(
          { ...p, targetArea: p.target },
          { areas: Object.entries(MAPS).map(([id, d]) => ({ id, ...d })) },
        );
    if (world.npc) this.drawNPC(world.npc);
    if (world.id === 'hollow') {
      for (const x of [190, 690, 1130])
        if (this.visible(x, 300)) {
          c.save();
          c.translate(x, world.ground);
          c.fillStyle = '#eee1b4';
          c.strokeStyle = '#78654f';
          c.lineWidth = 3;
          c.beginPath();
          c.roundRect(-95, -160, 190, 160, 12);
          c.fill();
          c.stroke();
          const roof = c.createLinearGradient(0, -250, 0, -140);
          roof.addColorStop(0, '#8b5143');
          roof.addColorStop(0.5, '#b87750');
          roof.addColorStop(1, '#d29e66');
          c.fillStyle = roof;
          c.beginPath();
          c.moveTo(-115, -150);
          c.quadraticCurveTo(-70, -245, 0, -225);
          c.quadraticCurveTo(70, -245, 115, -150);
          c.quadraticCurveTo(0, -126, -115, -150);
          c.fill();
          c.stroke();
          c.fillStyle = '#705c47';
          c.beginPath();
          c.roundRect(-24, -78, 48, 78, [24, 24, 0, 0]);
          c.fill();
          c.fillStyle = '#ffe5a7';
          ellipse(c, -58, -94, 20, 25, '#ffe5a7');
          ellipse(c, 58, -94, 20, 25, '#ffe5a7');
          c.strokeStyle = '#ae8959';
          c.beginPath();
          c.moveTo(-78, -94);
          c.lineTo(-38, -94);
          c.moveTo(38, -94);
          c.lineTo(78, -94);
          c.stroke();
          c.restore();
        }
    }
    for (
      let x = Math.floor(this.camera.x / 170) * 170;
      x < this.camera.x + this.width + 170;
      x += 170
    ) {
      if (world.id !== 'sanctuary') this.flower(x + 30, world.ground, Math.floor(x / 170));
      if (x % 340 === 0) {
        c.save();
        c.translate(x, world.ground);
        c.strokeStyle = '#6b7054';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, -66);
        c.stroke();
        c.fillStyle = '#ffe9b0';
        c.shadowBlur = 12;
        c.shadowColor = '#ffe49b';
        c.beginPath();
        c.roundRect(-7, -70, 14, 18, 4);
        c.fill();
        c.restore();
      }
    }
    // Tree trunks close map edges visibly; portals are the routes to another map.
    for (const x of [12, world.width - 12]) {
      c.save();
      c.globalAlpha = 0.9;
      this.tree(x, world.ground, 460, 70, x);
      c.restore();
    }
  }
  drawPortal(portal, world) {
    const old = this.state.unlockedAreas;
    this.state.unlockedAreas = Object.keys(MAPS);
    super.drawPortal(portal, world);
    this.state.unlockedAreas = old;
  }
  drawNPCLabel(npc) {
    this.drawNamePill(npc.name, npc.x, npc.y, '#fff0b6');
  }
  drawPlayer(p) {
    if (vanguardArt.frames.length !== 20) {
      super.drawPlayer(p, 'vanguard');
      return;
    }
    const c = this.ctx,
      a = p.action;
    let row = 3,
      col = 4;
    if (p.climbing) {
      row = 2;
      col = (Math.floor(this.t * 8) % 2) + 1;
    } else if (a) {
      row = a.kind === 'attack' ? 1 : 3;
      const progress = a.elapsed / a.duration;
      col = progress < 0.16 ? 0 : progress < 0.3 ? 1 : progress < 0.7 ? 2 : progress < 0.88 ? 3 : 4;
    } else if (!p.grounded) {
      row = 2;
      col = p.vy < -250 ? 1 : p.vy < 100 ? 2 : 3;
    } else if (Math.abs(p.vx) > 10) {
      row = 0;
      col = Math.floor(this.t * 12) % 5;
    }
    const x = p.x + p.w / 2,
      feet = p.y + p.h,
      size = 143;
    ellipse(c, x, feet + 1, 25, 4, '#18372c33');
    c.save();
    c.translate(x, feet);
    c.scale(p.facing, 1);
    if (p.deadTimer) {
      c.rotate(-1.3);
      c.globalAlpha = 0.55;
    } else if (p.invuln > 0) c.globalAlpha = 0.72 + Math.sin(this.t * 32) * 0.2;
    if (p.guarding) c.rotate(-0.07);
    c.drawImage(
      vanguardArt.frames[row * 5 + col],
      -size * 0.5,
      (-size * 280) / 330 + 6,
      size,
      (size * 280) / 330,
    );
    if (p.guarding) {
      c.strokeStyle = '#c3f5ff';
      c.lineWidth = 3;
      c.shadowColor = '#bcecff';
      c.shadowBlur = 14;
      c.beginPath();
      c.ellipse(35, -42, 16, 38, 0, -1.4, 1.4);
      c.stroke();
    }
    c.restore();
    this.drawNamePill('Aether · Vanguard', x, feet, '#fff6d5');
  }
  drawEnemy(e) {
    if (e.isBoss) {
      this.drawGuardian(e);
      return;
    }
    super.drawEnemy(e);
  }
  drawGuardian(e) {
    if (e.hp <= 0 && !e.deathTimer) return;
    const c = this.ctx,
      x = e.x + e.w / 2,
      feet = e.y + e.h,
      size = 220;
    c.save();
    c.translate(x, feet);
    if (e.deathTimer) c.globalAlpha = e.deathTimer / 0.55;
    const pulse = e.telegraph > 0 ? 1 + Math.sin(this.t * 20) * 0.02 : 1;
    c.scale(pulse, 1);
    if (guardianArt.complete && guardianArt.naturalWidth)
      c.drawImage(guardianArt, -size * 0.5, -size, size, size);
    if (e.hitTimer > 0) {
      c.globalCompositeOperation = 'screen';
      c.fillStyle = '#fff8d544';
      ellipse(c, 0, -90, 65, 80, '#fff8d544');
    }
    c.restore();
    this.drawNamePill(e.name, x, feet, '#fff0b6');
  }

  drawEffect(e, front) {
    if (!e.type.startsWith('chapter-')) {
      super.drawEffect(e, front);
      return;
    }
    if (e.type === 'chapter-warning') {
      if (front) return;
      const c = this.ctx;
      c.save();
      c.translate(e.x, e.y);
      c.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 18);
      c.fillStyle = '#ff655955';
      c.strokeStyle = '#ffc5a3';
      c.lineWidth = 3;
      if (e.vertical)
        c.fillRect(-e.radius, -this.state.world.height, e.radius * 2, this.state.world.height);
      c.beginPath();
      c.roundRect(-e.radius, -8, e.radius * 2, 12, 6);
      c.fill();
      c.stroke();
      c.restore();
      return;
    }
    if (!front) return;
    const c = this.ctx,
      t = 1 - e.life / e.maxLife;
    c.save();
    c.translate(e.x, e.y);
    c.globalAlpha = Math.min(1, e.life / 0.12);
    if (e.type === 'chapter-smite') {
      const height = e.vertical ? this.state.world.height : 160;
      const g = c.createLinearGradient(0, -height, 0, 0);
      g.addColorStop(0, '#fff5b000');
      g.addColorStop(0.7, '#fff8cdaa');
      g.addColorStop(1, '#fff8df');
      c.fillStyle = g;
      c.fillRect(-e.radius, -height, e.radius * 2, height);
      c.strokeStyle = '#ffe3a6';
      c.lineWidth = 5;
      ellipse(c, 0, -5, e.radius * (0.4 + t), 12);
    } else if (e.slot === -1 || e.slot === 0) {
      c.scale(e.facing, 1);
      const scale = e.slot === -1 ? 0.66 : 0.9;
      c.scale(scale, scale);
      drawSkillVfx(c, { ...e, skillIndex: 0, classId: 'vanguard', range: 200 }, t);
    } else if (e.slot === 1) {
      c.scale(e.facing, 1);
      c.shadowBlur = 20;
      c.shadowColor = '#fff3a6';
      c.strokeStyle = '#ffe59a';
      c.lineWidth = 8;
      c.beginPath();
      c.ellipse(38, 0, 23 + 10 * t, 57, 0, -1.4, 1.4);
      c.stroke();
      for (let i = 0; i < 8; i++) star(c, -i * 16, -15 + Math.sin(i) * 25, 5 * (1 - t), '#fff7c5');
    } else {
      const radius = e.slot === 3 ? 360 : 205;
      c.shadowBlur = 20;
      c.shadowColor = '#ffd85f';
      c.strokeStyle = '#ffe5a3';
      c.lineWidth = 3;
      ellipse(c, 0, 27, radius * (0.7 + t * 0.25), 22);
      ellipse(c, 0, 27, radius * (0.6 + t * 0.25), 15);
      const count = e.slot === 3 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 100,
          y = -170 + Math.min(1, t * 2) * 195;
        const g = c.createLinearGradient(0, -320, 0, 30);
        g.addColorStop(0, '#fff7b000');
        g.addColorStop(1, '#fff6be99');
        c.fillStyle = g;
        c.fillRect(x - 12, -320, 24, 350);
        c.save();
        c.translate(x, y);
        c.rotate(-0.25);
        c.fillStyle = '#eac36c';
        c.strokeStyle = '#fff9d5';
        c.lineWidth = 3;
        c.beginPath();
        c.roundRect(-23, -45, 46, 30, 7);
        c.fill();
        c.stroke();
        c.fillStyle = '#fff0b1';
        c.fillRect(-4, -16, 8, 37);
        c.restore();
        star(c, x, 22, 14 * (1 - t), '#fff9dc');
      }
    }
    c.restore();
  }
  drawDrop(d) {
    const c = this.ctx;
    if (d.type === 'gold') {
      super.drawDrop({ ...d, type: 'gold' });
      return;
    }
    c.save();
    c.translate(d.x, d.y + Math.sin(this.t * 4) * 4);
    const color = {
      normal: '#dae7d6',
      rare: '#85d8ff',
      epic: '#cf94ff',
      unique: '#ffe08e',
      mythic: '#ff8cbb',
    }[d.item.rarity];
    c.shadowBlur = 18;
    c.shadowColor = color;
    c.fillStyle = color;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -18);
    c.lineTo(13, -5);
    c.lineTo(0, 9);
    c.lineTo(-13, -5);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
  drawForeground() {}
}
