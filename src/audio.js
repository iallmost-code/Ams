// Original synthesized sounds. No network requests, audio files or autoplay.
const MELODY = [
  392, 493.88, 587.33, 493.88, 440, 523.25, 659.25, 523.25, 349.23, 440, 523.25, 440, 369.99, 440,
  554.37, 493.88,
];

export class GameAudio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.last = {};
    this.note = 0;
    this.nextNote = 0;
  }

  unlock() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch {
      /* Audio is optional, including in private and embedded browsers. */
    }
  }

  tone(
    frequency,
    duration = 0.12,
    { volume = 0.035, type = 'sine', slide, delay = 0, music = false } = {},
  ) {
    if (
      !(music ? this.settings.music : this.settings.sound) ||
      !this.ctx ||
      this.ctx.state !== 'running'
    )
      return;
    const start = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(slide, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  click() {
    this.tone(660, 0.07, { volume: 0.018, slide: 880 });
  }

  update(state) {
    const p = state.player;
    if (this.last.level && p.level > this.last.level) {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) =>
        this.tone(note, 0.28, { delay: i * 0.09, type: 'triangle' }),
      );
    } else if (this.last.gold !== undefined && p.gold > this.last.gold) {
      this.tone(1046.5, 0.07, { volume: 0.02 });
      this.tone(1567.98, 0.1, { volume: 0.018, delay: 0.05 });
    }
    if (p.hp < this.last.hp) this.tone(150, 0.17, { type: 'triangle', slide: 65, volume: 0.045 });
    if (p.attackTimer > (this.last.attackTimer || 0) + 0.03)
      this.tone(360, 0.1, { type: 'triangle', slide: 110 });
    if (p.skillTimer > (this.last.skillTimer || 0) + 0.03)
      this.tone(392, 0.22, { slide: 1174.66, type: 'triangle' });
    if (p.vy < -300 && this.last.grounded) this.tone(220, 0.14, { slide: 523.25, volume: 0.02 });
    this.last = {
      level: p.level,
      gold: p.gold,
      hp: p.hp,
      attackTimer: p.attackTimer,
      skillTimer: p.skillTimer,
      grounded: p.grounded,
    };
    if (this.settings.music && state.time >= this.nextNote) {
      this.tone(MELODY[this.note % MELODY.length], 0.65, {
        music: true,
        volume: 0.009,
        type: 'sine',
      });
      if (this.note % 4 === 0)
        this.tone(MELODY[this.note % MELODY.length] / 2, 1.2, {
          music: true,
          volume: 0.007,
          type: 'triangle',
        });
      this.note++;
      this.nextNote = state.time + 0.7;
    }
  }
}
