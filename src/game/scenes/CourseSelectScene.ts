import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { COURSES } from '../config/CourseConfig';
import type { CourseDef } from '../config/CourseConfig';
import { CourseGenerator } from '../course/CourseGenerator';
import { Transition } from '../utils/Transition';

// Card dimensions for 2-col × 3-row layout fitting in one screen
const CARD_W = 178;
const CARD_H = 186;
const GAP_X  = 10;
const GAP_Y  = 8;
const GRID_TOP = 72; // below title bar
const GRID_COLS = 2;

export class CourseSelectScene extends Phaser.Scene {
  private selectedIndex: number = 0;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'CourseSelectScene' });
  }

  create(): void {
    this.isTransitioning = false;
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeEffect.reset();
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.selectedIndex = 0;
    this.cards = [];

    // ── Dark background ───────────────────────────────────────────────────────
    this.add.rectangle(w/2, h/2, w, h, 0x020617);

    // Subtle starfield
    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, w), Phaser.Math.Between(0, h),
        Math.random() * 1.2 + 0.3, 0xffffff, Math.random() * 0.4 + 0.05
      );
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: star.alpha * 0.2 },
        duration: 800 + Math.random() * 1400, yoyo: true, repeat: -1,
      });
    }

    // ── Title bar ─────────────────────────────────────────────────────────────
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x0a0f1c, 0.93);
    titleBg.lineStyle(2, 0x0ea5e9, 1);
    titleBg.beginPath();
    titleBg.moveTo(16, 16); titleBg.lineTo(w - 16, 16);
    titleBg.lineTo(w - 30, 58); titleBg.lineTo(30, 58);
    titleBg.closePath();
    titleBg.fillPath(); titleBg.strokePath();

    this.add.text(w/2, 36, 'SELECT COURSE', {
      fontSize: '22px', fontFamily: 'Impact', color: '#0ea5e9', letterSpacing: 3,
    }).setOrigin(0.5);

    // BACK button is now HTML overlay (GameButtons)

    // ── 2×3 grid of course cards ──────────────────────────────────────────────
    const totalW = GRID_COLS * CARD_W + (GRID_COLS - 1) * GAP_X;
    const startX = (w - totalW) / 2 + CARD_W / 2;

    for (let i = 0; i < COURSES.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = startX + col * (CARD_W + GAP_X);
      const cy = GRID_TOP + row * (CARD_H + GAP_Y) + CARD_H / 2;
      this.createCourseCard(COURSES[i], cx, cy, i);
    }

    // ── RACE START button is now HTML overlay (GameButtons) ──

    // ── Keyboard nav ──────────────────────────────────────────────────────────
    const n = COURSES.length;
    this.input.keyboard?.on('keydown-LEFT',  () => { this.selectedIndex = (this.selectedIndex - 1 + n) % n; this.updateSelection(); });
    this.input.keyboard?.on('keydown-RIGHT', () => { this.selectedIndex = (this.selectedIndex + 1) % n; this.updateSelection(); });
    this.input.keyboard?.on('keydown-UP',    () => { this.selectedIndex = (this.selectedIndex - GRID_COLS + n) % n; this.updateSelection(); });
    this.input.keyboard?.on('keydown-DOWN',  () => { this.selectedIndex = (this.selectedIndex + GRID_COLS) % n; this.updateSelection(); });
    this.input.keyboard?.on('keydown-ENTER', () => this.startRace());
    this.input.keyboard?.on('keydown-Z',     () => this.startRace());

    this.updateSelection();

    // Tell React which screen we're on (for HTML overlay buttons)
    window.dispatchEvent(new CustomEvent('game-screen', { detail: 'courseSelect' }));

    // Listen for HTML overlay button events
    const btnHandler = ((e: CustomEvent) => {
      if (this.isTransitioning) return;
      if (e.detail === 'raceStart') this.startRace();
      if (e.detail === 'back') {
        this.isTransitioning = true;
        Transition.playShutterClose(this, 300, () => this.scene.start('CharSelectScene'));
      }
    }) as EventListener;
    window.addEventListener('game-button', btnHandler);
    this.events.once('shutdown', () => window.removeEventListener('game-button', btnHandler));

    Transition.playShutterOpen(this, 300);
  }

  // ── Course card ───────────────────────────────────────────────────────────
  private createCourseCard(course: CourseDef, cx: number, cy: number, index: number): void {
    const container = this.add.container(cx, cy);

    // bg panel — slot 0
    const bg = this.add.graphics();
    container.add(bg);

    // Preview image
    const previewH = 70;
    const previewW = CARD_W - 14;
    const previewKey = `course_preview_${course.id}`;
    if (!this.textures.exists(previewKey)) {
      const previewCanvas = this.generateCoursePreview(course, previewW, previewH);
      this.textures.addCanvas(previewKey, previewCanvas);
    }
    const preview = this.add.image(0, -CARD_H/2 + previewH/2 + 6, previewKey)
      .setDisplaySize(previewW, previewH);
    container.add(preview);

    // Difficulty bar (max 6 stars, shown as colored pips)
    const starY = -CARD_H/2 + previewH + 16;
    const maxDiff = 6;
    const pipW = 18, pipH = 7, pipGap = 3;
    const totalPipW = maxDiff * pipW + (maxDiff - 1) * pipGap;
    const accentHex = parseInt(course.accentColor.replace('#',''), 16);
    const pipG = this.add.graphics();
    for (let s = 0; s < maxDiff; s++) {
      const px = -totalPipW/2 + s * (pipW + pipGap);
      pipG.fillStyle(s < course.difficulty ? accentHex : 0x1e293b, 1);
      pipG.fillRect(px, starY - pipH/2, pipW, pipH);
    }
    container.add(pipG);

    // Course name
    container.add(this.add.text(0, starY + 12, course.name, {
      fontSize: '13px', fontFamily: 'Impact', color: course.accentColor, letterSpacing: 1,
    }).setOrigin(0.5));

    // Subtitle JP
    container.add(this.add.text(0, starY + 27, course.subtitle, {
      fontSize: '10px', fontFamily: 'sans-serif', color: '#94a3b8',
    }).setOrigin(0.5));

    // Concept (truncated to 2 lines)
    container.add(this.add.text(0, starY + 46, course.concept, {
      fontSize: '8.5px', fontFamily: 'sans-serif', color: '#64748b',
      align: 'center', wordWrap: { width: CARD_W - 14 },
    }).setOrigin(0.5));

    // Touch zone
    const zone = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => { this.selectedIndex = index; this.updateSelection(); });
    container.add(zone);

    this.cards.push(container);
  }

  // ── Tiny course preview canvas ────────────────────────────────────────────
  private generateCoursePreview(course: CourseDef, w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = course.bgColor;
    ctx.fillRect(0, 0, w, h);

    // Generate a low-res version of the course
    const previewSize = 400;
    const gen = new CourseGenerator(previewSize);
    gen.generate(course);
    ctx.drawImage(gen.canvas, 0, 0, previewSize, previewSize, 0, 0, w, h);

    // Vignette overlay
    const vign = ctx.createRadialGradient(w/2, h/2, h*0.15, w/2, h/2, h*0.75);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, w, h);

    // Difficulty badge overlay
    ctx.fillStyle = `${course.accentColor}33`;
    ctx.fillRect(0, 0, w, h);

    return canvas;
  }

  private drawHexBtn(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number): void {
    g.clear();
    g.fillStyle(0x020617, 0.92);
    g.lineStyle(3, color, 1);
    const hw = 135, hh = 24;
    g.beginPath();
    g.moveTo(cx-hw+10, cy-hh); g.lineTo(cx+hw, cy-hh);
    g.lineTo(cx+hw-10, cy+hh); g.lineTo(cx-hw, cy+hh);
    g.closePath();
    g.fillPath(); g.strokePath();
  }

  // ── Visual selection update ───────────────────────────────────────────────
  private updateSelection(): void {
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const isSelected = i === this.selectedIndex;
      const bg = card.getAt(0) as Phaser.GameObjects.Graphics;
      const course = COURSES[i];
      const accentHex = parseInt(course.accentColor.replace('#',''), 16);
      const hw = CARD_W/2, hh = CARD_H/2;

      bg.clear();
      if (isSelected) {
        bg.fillStyle(0x0f172a, 0.97);
        bg.lineStyle(3, accentHex, 1);
        bg.fillRect(-hw, -hh, CARD_W, CARD_H);
        bg.strokeRect(-hw, -hh, CARD_W, CARD_H);
        bg.lineStyle(1, 0xffffff, 0.4);
        bg.strokeRect(-hw+5, -hh+5, CARD_W-10, CARD_H-10);
        bg.fillStyle(accentHex, 0.06);
        bg.fillRect(-hw, -hh, CARD_W, CARD_H);
        this.tweens.add({ targets: card, scaleX: 1.03, scaleY: 1.03, duration: 110 });
      } else {
        bg.fillStyle(0x020617, 0.85);
        bg.lineStyle(2, 0x1e293b, 1);
        bg.fillRect(-hw, -hh, CARD_W, CARD_H);
        bg.strokeRect(-hw, -hh, CARD_W, CARD_H);
        this.tweens.add({ targets: card, scaleX: 0.97, scaleY: 0.97, duration: 110 });
      }
    }
  }

  private isTransitioning: boolean = false;

  // ── Start race ────────────────────────────────────────────────────────────
  private startRace(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Immediately play visual feedback so the UI doesn't feel frozen
    const card = this.cards[this.selectedIndex];
    this.tweens.add({ targets: card, alpha: 0, duration: 100, yoyo: true, repeat: 3 });
    
    // Add a loading text overlay
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.7).setDepth(100);
    this.add.text(w/2, h/2, 'GENERATING COURSE...', {
      fontSize: '24px', fontFamily: 'Impact', color: '#0ea5e9', letterSpacing: 2
    }).setOrigin(0.5).setDepth(101);

    // Yield control to the browser so it can render the tween and overlay
    // The generation takes ~0.5-1.5s and blocks the main thread.
    this.time.delayedCall(100, () => {
      const course = COURSES[this.selectedIndex];
      // Dispose old course generator to free ~128MB canvas memory
      const oldGen = this.registry.get('courseGenerator') as CourseGenerator | undefined;
      if (oldGen && oldGen.dispose) oldGen.dispose();

      const gen = new CourseGenerator();
      const trackTex  = this.textures.get('track_pattern').getSourceImage() as HTMLImageElement;
      
      try {
        gen.generate(course, trackTex);
      } catch (e) {
        console.error('Course generation error:', e);
        this.isTransitioning = false;
        return;
      }

      if (this.textures.exists('courseTexture')) this.textures.remove('courseTexture');
      this.textures.addCanvas('courseTexture', gen.canvas);

      this.registry.set('courseGenerator', gen);
      this.registry.set('selectedCourse', course.id);

      // Give a tiny pause after generation before transitioning
      this.time.delayedCall(200, () => {
        Transition.playShutterClose(this, 300, () => this.scene.start('RaceScene'));
      });
    });
  }
}
