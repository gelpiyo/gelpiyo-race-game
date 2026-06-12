import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, MAX_LAPS, COURSE_TEX_SIZE } from '../config/GameConfig';
import { getCharacter, getOtherCharacters } from '../config/CharacterConfig';
import { Mode7Renderer } from '../mode7/Mode7Renderer';
import { Camera } from '../mode7/Camera';
import { CourseGenerator } from '../course/CourseGenerator';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { Kart } from '../entities/Kart';
import { ItemSystem, ITEM_DEFS } from '../entities/Item';
import type { ItemType } from '../entities/Item';
import { Physics2D } from '../physics/Physics2D';
import { TouchController } from '../input/TouchController';
import { Transition } from '../utils/Transition';

type RacePhase = 'countdown' | 'racing' | 'goal_anim' | 'finished';

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
}

// Minimap config
const MINIMAP_CX = 249;  // center X (gap between TIME and POS panels)
const MINIMAP_CY = 28;   // center Y
const MINIMAP_R  = 24;   // radius of the circular minimap

export class RaceScene extends Phaser.Scene {
  private mode7!: Mode7Renderer;
  private camera7!: Camera;
  private course!: CourseGenerator;
  private player!: Player;
  private npcs: NPC[] = [];
  private allKarts: Kart[] = [];
  private itemSystem!: ItemSystem;
  private physics!: Physics2D;
  private inputCtrl!: TouchController;
  private groundSprite!: Phaser.GameObjects.Image;
  private kartSprites: Map<Kart, Phaser.GameObjects.Image> = new Map();
  private kartShadows: Map<Kart, Phaser.GameObjects.Ellipse> = new Map();
  private itemBoxSprites: Phaser.GameObjects.Arc[] = [];
  // Tire sprites: left + right per kart
  private kartTiresL: Map<Kart, Phaser.GameObjects.Image> = new Map();
  private kartTiresR: Map<Kart, Phaser.GameObjects.Image> = new Map();
  // Accumulated rotation angle per kart (degrees)
  private tireAngles: Map<Kart, number> = new Map();
  
  private racePhase: RacePhase = 'countdown';
  private countdownTimer: number = 4;
  private raceTimer: number = 0;
  private goalAnimTimer: number = 0;
  private itemUseFlashTimer: number = 0;  // countdown for item-use glow on player sprite
  private itemUseFlashColor: number = 0xffffff; // color of the item-use glow
  private countdownText!: Phaser.GameObjects.Text;
  
  private hudSpeed!: Phaser.GameObjects.Text;
  private hudPosition!: Phaser.GameObjects.Text;
  private hudLap!: Phaser.GameObjects.Text;
  private hudItem!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudWrongWay!: Phaser.GameObjects.Text;
  
  private particleGraphics!: Phaser.GameObjects.Graphics; 
  private smokes: SmokeParticle[] = [];

  private minimapGfx!: Phaser.GameObjects.Graphics;
  private effectTextPool: Phaser.GameObjects.Text[] = [];
  // Projectile egg: position in world
  private eggProjectile: { x: number; y: number; vx: number; vy: number; active: boolean } | null = null;

  constructor() {
    super({ key: 'RaceScene' });
  }

  private isTransitioning: boolean = false;
  create(): void {
    this.isTransitioning = false;
    this.racePhase = 'countdown';
    this.countdownTimer = 4;
    this.raceTimer = 0;
    this.kartSprites.clear();
    this.kartShadows.clear();
    this.kartTiresL.clear();
    this.kartTiresR.clear();
    this.tireAngles.clear();
    this.smokes = [];
    this.npcs = [];
    this.allKarts = [];
    this.itemBoxSprites = [];
    this.smokes = [];

    this.course = this.registry.get('courseGenerator') as CourseGenerator;
    this.camera7 = new Camera();
    this.mode7 = new Mode7Renderer(this.camera7, this.course);

    const selectedId = this.registry.get('selectedCharacter') || 'gelpiyo';
    const playerChar = getCharacter(selectedId);
    this.player = new Player(playerChar);
    
    const sl = this.course.startLine;
    const perpAngle = sl.angle + Math.PI / 2;
    this.player.init(
      sl.x - Math.cos(perpAngle) * 40,
      sl.y - Math.sin(perpAngle) * 40,
      sl.angle
    );

    const otherChars = getOtherCharacters(selectedId);
    const offsets = [60, -60, 0];
    otherChars.forEach((char, i) => {
      const npc = new NPC(char, this.course.waypoints);
      const offsetX = Math.cos(perpAngle) * offsets[i];
      const offsetY = Math.sin(perpAngle) * offsets[i];
      npc.initPosition(
        sl.x + offsetX - Math.cos(sl.angle) * (120 + i * 80),
        sl.y + offsetY - Math.sin(sl.angle) * (120 + i * 80),
        sl.angle
      );
      this.npcs.push(npc);
    });

    this.allKarts = [this.player, ...this.npcs];

    this.itemSystem = new ItemSystem();
    this.itemSystem.initBoxes(this.course.itemSpawns);

    this.customPhysics = new Physics2D();
    this.inputCtrl = new TouchController();

    this.camera7.reset(this.player.state.x, this.player.state.y, this.player.state.angle);

    this.mode7.render(this);
    this.groundSprite = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'mode7ground');
    this.groundSprite.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    for (const kart of this.allKarts) {
      const shadow = this.add.ellipse(0, 0, 100, 40, 0x000000, 0.6);
      shadow.setVisible(false);
      this.kartShadows.set(kart, shadow);

      const sprite = this.add.image(0, 0, kart.spriteKey);
      sprite.setVisible(false);
      this.kartSprites.set(kart, sprite);
    }

    // ── Tire angles per kart (drawn on particleGraphics each frame) ──
    for (const kart of this.allKarts) {
      this.tireAngles.set(kart, 0);
    }

    for (let _bi = 0; _bi < this.itemSystem.boxes.length; _bi++) {
      // Rainbow sphere drawn as Graphics each frame on particleGraphics
      // Use a placeholder Graphics object just to store visibility state
      const placeholder = this.add.graphics();
      placeholder.setVisible(false);
      (this.itemBoxSprites as unknown as Phaser.GameObjects.Graphics[]).push(placeholder);
    }

    this.particleGraphics = this.add.graphics();

    this.createHUD();

    this.countdownText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '', {
      fontSize: '80px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffffff',
      fontStyle: 'italic',
      stroke: '#000000',
      strokeThickness: 8,
      padding: { left: 40, right: 40, top: 40, bottom: 40 }
    }).setOrigin(0.5).setDepth(100);
    this.countdownText.setShadow(4, 4, '#0ea5e9', 0, true, false);

    // SKIP button is now HTML overlay (GameButtons)

    // QUIT button is now HTML overlay (GameButtons)

    window.dispatchEvent(new CustomEvent('game-screen', { detail: 'race' }));

    // Listen for HTML overlay button events
    const btnHandler = ((e: CustomEvent) => {
      if (this.isTransitioning) return;
      if (e.detail === 'skip') {
        this.isTransitioning = true;
        this.player.state.finished = true;
        this.player.state.finishTime = this.raceTimer;
        this.finishRace();
      }
      if (e.detail === 'quit') {
        this.isTransitioning = true;
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
          window.dispatchEvent(new CustomEvent('game-screen', { detail: 'title' }));
          this.scene.start('TitleScene');
        });
      }
    }) as EventListener;
    window.addEventListener('game-button', btnHandler);
    this.events.once('shutdown', () => window.removeEventListener('game-button', btnHandler));

    Transition.playShutterOpen(this, 300);
  }

  /**
   * HUD Layout - All info at top, bottom clear for D-pad overlay
   *
   *  Row 1 (y: 0-50):  [TIME]  [MAP]  [POS]
   *  Row 2 (y: 54-88): [LAP 1/3] [120 km/h] [ITEM]
   *  Bottom: empty (HTML D-pad overlays here)
   */
  private createHUD(): void {
    const depth = 90;
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    const g = this.add.graphics().setDepth(depth);

    // ========================================
    // ROW 1 - TOP-LEFT: TIME (x: 0-194, y: 0-46)
    // ========================================
    g.fillStyle(0xfde047, 0.3);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(200, 0); g.lineTo(180, 50); g.lineTo(0, 50);
    g.closePath(); g.fillPath();

    g.fillStyle(0x0a0f1c, 0.95);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(194, 0); g.lineTo(176, 46); g.lineTo(0, 46);
    g.closePath(); g.fillPath();

    g.lineStyle(1, 0x334155, 0.2);
    for (let i = 0; i < 46; i += 4) {
      g.beginPath(); g.moveTo(0, i); g.lineTo(194 - (i * 0.39), i); g.strokePath();
    }

    g.lineStyle(3, 0xfde047, 1);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(194, 0); g.lineTo(176, 46); g.lineTo(0, 46);
    g.strokePath();

    g.fillStyle(0xfde047, 1);
    g.fillRect(8, 44, 30, 4);

    this.add.text(10, 6, 'TIME', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#fde047',
      letterSpacing: 2
    }).setOrigin(0, 0).setDepth(depth + 1);

    this.hudTime = this.add.text(10, 28, '00:00.00', {
      fontSize: '26px',
      fontFamily: 'Impact',
      color: '#ffffff',
      fontStyle: 'italic',
      padding: { left: 5, right: 5, top: 5, bottom: 5 }
    }).setOrigin(0, 0.5).setDepth(depth + 1);
    this.hudTime.setShadow(0, 0, '#fde047', 8, false, true);

    this.hudWrongWay = this.add.text(w / 2, h / 2 - 80, 'REVERSE', {
      fontSize: '40px', fontFamily: 'Impact', color: '#ef4444', letterSpacing: 6
    }).setOrigin(0.5).setDepth(200).setVisible(false);
    this.hudWrongWay.setShadow(4, 4, '#000000', 4, true, true);
    this.tweens.add({
      targets: this.hudWrongWay,
      alpha: 0.3, duration: 400, yoyo: true, repeat: -1
    });


    // ========================================
    // ROW 1 - TOP-CENTER: MINIMAP (x: 249, y: 28)
    // ========================================
    g.fillStyle(0x020617, 0.85);
    g.fillCircle(MINIMAP_CX, MINIMAP_CY, MINIMAP_R + 4);
    g.lineStyle(2, 0x334155, 0.8);
    g.strokeCircle(MINIMAP_CX, MINIMAP_CY, MINIMAP_R + 4);

    const courseScale = (MINIMAP_R * 2) / COURSE_TEX_SIZE;
    const mapOX = MINIMAP_CX - COURSE_TEX_SIZE * courseScale / 2;
    const mapOY = MINIMAP_CY - COURSE_TEX_SIZE * courseScale / 2;

    g.lineStyle(2, 0x475569, 0.7);
    g.beginPath();
    const wps = this.course.waypoints;
    if (wps.length > 0) {
      g.moveTo(mapOX + wps[0].x * courseScale, mapOY + wps[0].y * courseScale);
      for (let i = 1; i < wps.length; i++) {
        g.lineTo(mapOX + wps[i].x * courseScale, mapOY + wps[i].y * courseScale);
      }
      g.closePath();
    }
    g.strokePath();

    // Start/Goal line marker
    const slMark = this.course.startLine;
    const slMx = mapOX + slMark.x * courseScale;
    const slMy = mapOY + slMark.y * courseScale;
    const slMPerp = slMark.angle + Math.PI / 2;
    const slMLen = 5;
    g.lineStyle(2, 0xffffff, 1);
    g.beginPath();
    g.moveTo(slMx - Math.cos(slMPerp) * slMLen, slMy - Math.sin(slMPerp) * slMLen);
    g.lineTo(slMx + Math.cos(slMPerp) * slMLen, slMy + Math.sin(slMPerp) * slMLen);
    g.strokePath();
    this.add.text(slMx + 6, slMy - 1, 'S', {
      fontSize: '7px', fontFamily: 'Impact', color: '#ffffff',
    }).setOrigin(0, 0.5).setDepth(depth + 2);

    this.add.text(MINIMAP_CX, MINIMAP_CY - MINIMAP_R - 7, 'MAP', {
      fontSize: '7px', fontFamily: 'monospace', color: '#64748b', letterSpacing: 1,
    }).setOrigin(0.5, 0.5).setDepth(depth + 1);

    this.minimapGfx = this.add.graphics().setDepth(depth + 2);

    // ========================================
    // ROW 1 - TOP-RIGHT: POSITION (x: 286-400, y: 0-46)
    // ========================================
    g.fillStyle(0x0ea5e9, 0.3);
    g.beginPath();
    g.moveTo(w, 0); g.lineTo(w, 50); g.lineTo(w - 120, 50); g.lineTo(w - 100, 0);
    g.closePath(); g.fillPath();

    g.fillStyle(0x0a0f1c, 0.95);
    g.beginPath();
    g.moveTo(w, 0); g.lineTo(w, 46); g.lineTo(w - 114, 46); g.lineTo(w - 96, 0);
    g.closePath(); g.fillPath();

    g.lineStyle(1, 0x334155, 0.2);
    for (let i = 0; i < 46; i += 4) {
      g.beginPath(); g.moveTo(w, i); g.lineTo(w - 114 + (i * 0.39), i); g.strokePath();
    }

    g.lineStyle(3, 0x0ea5e9, 1);
    g.beginPath();
    g.moveTo(w, 0); g.lineTo(w, 46); g.lineTo(w - 114, 46); g.lineTo(w - 96, 0);
    g.strokePath();

    g.fillStyle(0x0ea5e9, 1);
    g.fillRect(w - 50, 44, 30, 4);

    this.add.text(w - 90, 6, 'POS', {
      fontSize: '10px', fontFamily: 'monospace', color: '#0ea5e9', letterSpacing: 2
    }).setOrigin(0, 0).setDepth(depth + 1);

    this.hudPosition = this.add.text(w - 15, 26, '1', {
      fontSize: '30px',
      fontFamily: 'Impact, system-ui',
      color: '#ffffff',
      fontStyle: 'italic',
      padding: { left: 4, right: 4, top: 2, bottom: 2 }
    }).setOrigin(1, 0.5).setDepth(depth + 1);
    this.hudPosition.setShadow(2, 2, '#0ea5e9', 0, true, true);

    // ========================================
    // ROW 2 - COMPACT INFO BAR (y: 54-88)
    // ========================================
    const r2y = 54;
    const r2h = 34;

    // Background bar
    g.fillStyle(0x0a0f1c, 0.85);
    g.fillRect(0, r2y, w, r2h);
    g.lineStyle(1, 0x334155, 0.6);
    g.beginPath(); g.moveTo(0, r2y + r2h); g.lineTo(w, r2y + r2h); g.strokePath();

    // Subtle vertical dividers
    g.lineStyle(1, 0x334155, 0.3);
    g.beginPath(); g.moveTo(130, r2y + 4); g.lineTo(130, r2y + r2h - 4); g.strokePath();
    g.beginPath(); g.moveTo(270, r2y + 4); g.lineTo(270, r2y + r2h - 4); g.strokePath();

    // Left accent
    g.fillStyle(0xf43f5e, 1);
    g.fillRect(0, r2y, 3, r2h);

    // LAP (left section, x: 8-125)
    this.add.text(8, r2y + 8, 'LAP', {
      fontSize: '8px', fontFamily: 'monospace', color: '#f43f5e',
    }).setOrigin(0, 0).setDepth(depth + 1);

    this.hudLap = this.add.text(8, r2y + 24, '1/3', {
      fontSize: '18px',
      fontFamily: 'Impact',
      color: '#ffffff',
      fontStyle: 'italic',
      padding: { left: 2, right: 2, top: 2, bottom: 2 }
    }).setOrigin(0, 0.5).setDepth(depth + 1);
    this.hudLap.setShadow(1, 1, '#f43f5e', 0, true, true);

    // SPEED (center section, x: 135-265)
    this.add.text(140, r2y + 8, 'SPEED', {
      fontSize: '8px', fontFamily: 'monospace', color: '#0ea5e9',
    }).setOrigin(0, 0).setDepth(depth + 1);

    this.hudSpeed = this.add.text(140, r2y + 24, '0', {
      fontSize: '20px',
      fontFamily: 'Impact',
      color: '#0ea5e9',
      fontStyle: 'italic',
      padding: { left: 2, right: 2, top: 2, bottom: 2 }
    }).setOrigin(0, 0.5).setDepth(depth + 1);
    this.hudSpeed.setShadow(1, 1, '#000000', 0, true, true);

    this.add.text(210, r2y + 24, 'km/h', {
      fontSize: '9px', fontFamily: 'Impact', color: '#0ea5e9',
    }).setOrigin(0, 0.5).setDepth(depth + 1);

    // ITEM (right section, x: 275-395)
    // Accent
    g.fillStyle(0x4ade80, 1);
    g.fillRect(w - 3, r2y, 3, r2h);

    this.add.text(280, r2y + 8, 'ITEM', {
      fontSize: '8px', fontFamily: 'monospace', color: '#4ade80',
    }).setOrigin(0, 0).setDepth(depth + 1);

    // Small item box
    const ibx = 350, iby = r2y + 17, ibs = 22;
    g.fillStyle(0x020617, 0.8);
    g.fillRect(ibx - ibs/2, iby - ibs/2, ibs, ibs);
    g.lineStyle(1, 0x4ade80, 0.6);
    g.strokeRect(ibx - ibs/2, iby - ibs/2, ibs, ibs);

    this.add.text(ibx, iby, '-', {
      fontSize: '9px', fontFamily: 'Impact', color: '#334155'
    }).setOrigin(0.5).setDepth(depth);

    this.hudItem = this.add.text(ibx, iby, '', {
      fontSize: '18px', fontFamily: 'system-ui',
    }).setOrigin(0.5).setDepth(depth + 1);
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    if (this.racePhase === 'countdown') {
      this.updateCountdown(dt);
      this.renderMode7();
      this.renderSprites(dt);
      this.updateMinimap();
      return;
    }

    if (this.racePhase === 'goal_anim') {
      // Keep NPCs running so they can finish properly during the goal animation
      for (const npc of this.npcs) {
        if (!npc.state.finished) {
          npc.updateAI(dt, this.course, this.player.state.x, this.player.state.y, this.player.state.lap);
          if (npc.checkLap(this.course) && npc.state.lap >= MAX_LAPS) {
            npc.state.finished = true;
            npc.state.finishTime = this.raceTimer;
          }
        }
      }
      this.raceTimer += dt;
      // Player coasts to a stop
      this.player.state.speed *= 0.97;
      this.camera7.follow(this.player.state.x, this.player.state.y, this.player.state.angle, this.player.state.speed);
      this.renderMode7();
      this.renderSprites(dt);
      this.updateMinimap();
      this.updateHUD();
      return;
    }

    if (this.racePhase === 'finished') {
      this.renderMode7();
      this.renderSprites(dt);
      this.updateMinimap();
      return;
    }

    this.raceTimer += dt;
    const input = this.inputCtrl.getInput();

    if (input.useItem) {
      const usedItem = this.player.useItem();
      this.handleItemEffect(usedItem);
      this.inputCtrl.consumeItem();
    }

    this.player.updateWithInput(dt, this.course, input);

    for (const npc of this.npcs) {
      npc.updateAI(dt, this.course, this.player.state.x, this.player.state.y, this.player.state.lap);
      npc.checkLap(this.course);
    }

    // Only player collects items (NPCs don't compete for item boxes)
    const collected = this.itemSystem.tryCollect(
      this.player.state.x, this.player.state.y, this.player.radius
    );
    if (collected) {
      const didCollect = this.player.collectItem(collected);
      if (didCollect) {
        const info = ITEM_DEFS[collected as ItemType];
        this.hudItem.setText(info?.emoji || '?');
        this.hudItem.setScale(1.8);
        this.tweens.add({
          targets: this.hudItem,
          scaleX: 1, scaleY: 1,
          duration: 400,
          ease: 'Bounce.easeOut'
        });
        // Show "GOT ITEM!" text
        this.showEffectText(`GET! ${info?.emoji || '?'} ${info?.name || ''}`, '#ffffff');
      }
    }

    this.physics.resolveKartCollisions(this.allKarts);
    this.checkInvincibleCollisions();
    this.checkPlayerHit();
    this.itemSystem.update(dt);

    if (this.player.checkLap(this.course)) {
      if (this.player.state.lap >= MAX_LAPS && this.racePhase !== 'goal_anim' && this.racePhase !== 'finished') {
        this.player.state.finished = true;
        this.player.state.finishTime = this.raceTimer;
        this.startGoalAnim();
        // Continue to let the camera follow and frame render
      }
    }

    this.camera7.follow(
      this.player.state.x,
      this.player.state.y,
      this.player.state.angle,
      this.player.state.speed
    );

    this.renderMode7();
    this.renderSprites(dt);
    this.updateHUD();
    this.updateMinimap();
  }

  private updateMinimap(): void {
    const mg = this.minimapGfx;
    mg.clear();

    const courseScale = (MINIMAP_R * 2) / COURSE_TEX_SIZE;
    const mapOX = MINIMAP_CX - COURSE_TEX_SIZE * courseScale / 2;
    const mapOY = MINIMAP_CY - COURSE_TEX_SIZE * courseScale / 2;

    // Draw NPC dots (grey)
    for (const npc of this.npcs) {
      const nx = mapOX + npc.state.x * courseScale;
      const ny = mapOY + npc.state.y * courseScale;
      mg.fillStyle(0xf43f5e, 0.9);
      mg.fillCircle(nx, ny, 2.5);
    }

    // Draw player dot (bright yellow, larger, with pulsing glow)
    const px = mapOX + this.player.state.x * courseScale;
    const py = mapOY + this.player.state.y * courseScale;
    const pulse = 0.5 + Math.sin(this.time.now / 200) * 0.3;
    mg.fillStyle(0xfde047, pulse);
    mg.fillCircle(px, py, 5);
    mg.fillStyle(0xfde047, 1);
    mg.fillCircle(px, py, 3);
  }

  private updateCountdown(dt: number): void {
    this.countdownTimer -= dt;
    
    if (this.countdownTimer > 3) {
      this.countdownText.setText('');
    } else if (this.countdownTimer > 2) {
      if (this.countdownText.text !== '3') {
        this.countdownText.setText('3').setColor('#f43f5e').setAlpha(1).setScale(1);
        this.tweens.add({ targets: this.countdownText, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 400, delay: 500 });
      }
    } else if (this.countdownTimer > 1) {
      if (this.countdownText.text !== '2') {
        this.countdownText.setText('2').setColor('#fde047').setAlpha(1).setScale(1);
        this.tweens.add({ targets: this.countdownText, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 400, delay: 500 });
      }
    } else if (this.countdownTimer > 0) {
      if (this.countdownText.text !== '1') {
        this.countdownText.setText('1').setColor('#4ade80').setAlpha(1).setScale(1);
        this.tweens.add({ targets: this.countdownText, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 400, delay: 500 });
      }
    } else {
      if (this.countdownText.text !== 'EXCELLENT') {
        this.countdownText.setText('EXCELLENT').setColor('#ffffff').setAlpha(1).setScale(1);
        this.tweens.add({ targets: this.countdownText, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 800, delay: 200 });
        // Start racing IMMEDIATELY when it hits 0 and says EXCELLENT
        this.racePhase = 'racing';
      }
      if (this.countdownTimer < -0.8) {
        this.countdownText.setVisible(false);
      }
    }

    this.camera7.follow(
      this.player.state.x,
      this.player.state.y,
      this.player.state.angle,
      0
    );
  }

  private renderMode7(): void {
    this.mode7.render(this);
    if (this.groundSprite && this.textures.exists('mode7ground')) {
      this.groundSprite.setTexture('mode7ground');
    }
  }

  private renderSprites(dt: number = 0.016): void {
    const camX = this.camera7.x;
    const camY = this.camera7.y;

    const sortedKarts = [...this.allKarts].sort((a, b) => {
      const da = (a.state.x - camX) ** 2 + (a.state.y - camY) ** 2;
      const db = (b.state.x - camX) ** 2 + (b.state.y - camY) ** 2;
      return db - da; 
    });

    this.particleGraphics.clear();
    this.particleGraphics.setDepth(49);

    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.smokes.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.scale += dt * 30;
      
      const alpha = s.life / s.maxLife;
      // Outer puff
      this.particleGraphics.fillStyle(0xcccccc, alpha * 0.55);
      this.particleGraphics.fillCircle(s.x, s.y, s.scale);
      // Inner brighter core
      this.particleGraphics.fillStyle(0xffffff, alpha * 0.25);
      this.particleGraphics.fillCircle(s.x, s.y, s.scale * 0.5);
    }

    for (const kart of sortedKarts) {
      const sprite = this.kartSprites.get(kart);
      const shadow = this.kartShadows.get(kart);
      if (!sprite || !shadow) continue;

      const screen = this.mode7.worldToScreen(kart.state.x, kart.state.y, kart.state.z);
      if (screen.visible && screen.scale > 0.01) {
        sprite.setVisible(true);
        shadow.setVisible(true);

        const baseScale = screen.scale * 0.04; 
        
        shadow.setPosition(screen.x, screen.y + (30 * baseScale));
        shadow.setScale(baseScale);
        shadow.setDepth(48 + (1 / (screen.scale + 0.001)));

        sprite.setPosition(screen.x, screen.y);
        sprite.setScale(baseScale);
        sprite.setDepth(50 + (1 / (screen.scale + 0.001)));
        
        const targetBank = kart.state.steeringInput * 15; 
        if (kart.state.spinTimer > 0) {
          sprite.setAngle((this.time.now / 2) % 360);
        } else {
          sprite.setAngle(targetBank);
        }

        // speedRatio needed by both tire and smoke sections
        const speedRatio = Math.min(Math.abs(kart.state.speed) / kart.speedMax, 1);

        // ── Tire rotation: drawn on particleGraphics (same system as smoke) ──
        {
          const prevAngle = this.tireAngles.get(kart) ?? 0;
          const rotDeg = kart.state.speed * 3.0 * dt;
          const newAngle = (prevAngle + rotDeg) % 360;
          this.tireAngles.set(kart, newAngle);
          const rotRad = Phaser.Math.DegToRad(newAngle);

          // Size based on screen.scale directly (same ref as smoke which works)
          const tireR = Math.max(3, screen.scale * 2.2);
          // Horizontal offset between left/right tire
          const tireOffsetX = screen.scale * 3.5;
          // Vertical offset (tires are at bottom of kart)
          const tireOffsetY = screen.scale * 1.5;

          const pg = this.particleGraphics;

          // How many "blur layers" based on speed (1 = slow, 6 = fast)
          const blurLayers = Math.max(1, Math.round(speedRatio * 5));
          const blurStep = Phaser.Math.DegToRad(15); // angle between blur layers

          [-1, 1].forEach((side) => {
            const tx = screen.x + side * tireOffsetX;
            const ty = screen.y + tireOffsetY;

            // Rubber base
            pg.fillStyle(0x111111, 0.95);
            pg.fillCircle(tx, ty, tireR);

            // Hub cap
            pg.fillStyle(0xaaaaaa, 0.9);
            pg.fillCircle(tx, ty, tireR * 0.32);
            pg.fillStyle(0xffffff, 0.7);
            pg.fillCircle(tx - tireR * 0.1, ty - tireR * 0.1, tireR * 0.14);

            // Tread lines with motion blur
            for (let b = 0; b < blurLayers; b++) {
              const alpha = (1.0 - b / blurLayers) * (speedRatio > 0.5 ? 0.55 : 0.85);
              const rot = rotRad - b * blurStep * speedRatio;
              const lineW = Math.max(1, tireR * 0.18);
              pg.lineStyle(lineW, 0x666666, alpha);
              for (let t = 0; t < 2; t++) {
                const a = rot + t * Math.PI * 0.5;
                pg.beginPath();
                pg.moveTo(tx + Math.cos(a) * tireR * 0.88, ty + Math.sin(a) * tireR * 0.88);
                pg.lineTo(tx - Math.cos(a) * tireR * 0.88, ty - Math.sin(a) * tireR * 0.88);
                pg.strokePath();
              }
            }
          });
        }

        // Drift smoke: turning at speed
        const isDrifting = speedRatio > 0.2 && Math.abs(kart.state.steeringInput) > 0.1;
        // Speed dust: emit when moving at any reasonable speed
        const isHighSpeed = speedRatio > 0.35;

        if (isDrifting || isHighSpeed) {
          const emitChance = isDrifting ? 0.65 : 0.45;
          if (Math.random() < emitChance) {
            // Emit behind/below the kart sprite
            const smokeScale = screen.scale;
            const smokeSz = (isDrifting ? 12 : 7) * smokeScale;
            this.smokes.push({
              x: screen.x + (Math.random() - 0.5) * smokeScale * 5,
              y: screen.y + smokeScale * 2.5 + (Math.random() - 0.5) * smokeScale,
              vx: (Math.random() - 0.5) * smokeScale * 6,
              vy: -(Math.random() * smokeScale * 4 + smokeScale),
              maxLife: isDrifting ? 0.9 : 0.5,
              life:    isDrifting ? 0.9 : 0.5,
              scale:   Math.max(3, smokeSz),
            });
          }
        }

        if (kart.state.invincibleTimer > 0) {
          sprite.setTint(Phaser.Display.Color.HSLToColor((this.time.now / 150) % 1, 1, 0.8).color);
        } else if (kart === this.player && this.itemUseFlashTimer > 0) {
          // Item-use glow: flash between the item color and white rapidly
          this.itemUseFlashTimer -= dt;
          const flashPhase = Math.sin(this.time.now / 40) > 0;
          sprite.setTint(flashPhase ? this.itemUseFlashColor : 0xffffff);
        } else if (kart.state.boostTimer > 0) {
          sprite.setTint(0xfde047);
        } else if (kart.state.spinTimer <= 0) {
          sprite.clearTint();
        }
      } else {
        sprite.setVisible(false);
        shadow.setVisible(false);
        // tires are drawn on particleGraphics, no separate objects to hide
      }
    }

    // Draw rainbow sphere items on particleGraphics
    const now = this.time.now;
    for (let i = 0; i < this.itemSystem.boxes.length; i++) {
      const box = this.itemSystem.boxes[i];
      if (!box.active) continue;

      const bobZ = Math.sin(now / 500 + i * 1.2) * 12 + 18;
      const screen = this.mode7.worldToScreen(box.x, box.y, bobZ);
      if (!screen.visible || screen.scale <= 0.01) continue;

      const pg = this.particleGraphics;
      const cx = screen.x;
      const cy = screen.y;
      const r  = Math.max(5, screen.scale * 4.5);

      // Rotating hue for rainbow effect
      const hueBase = ((now / 800 + i * 0.4) % 1);

      // Draw layered arcs for sphere shading (dark outer → bright center)
      for (let layer = 0; layer < 7; layer++) {
        const frac   = 1 - layer / 7;
        const hue    = (hueBase + layer * 0.13) % 1;
        const color  = Phaser.Display.Color.HSLToColor(hue, 1.0, 0.45 + frac * 0.25).color;
        const alpha  = 0.7 + frac * 0.25;
        pg.fillStyle(color, alpha);
        pg.fillCircle(cx, cy, r * frac);
      }

      // Specular highlight (white glint top-left)
      pg.fillStyle(0xffffff, 0.65);
      pg.fillCircle(cx - r * 0.28, cy - r * 0.28, r * 0.22);
      pg.fillStyle(0xffffff, 0.3);
      pg.fillCircle(cx - r * 0.18, cy - r * 0.18, r * 0.12);

      // Outer glow ring
      pg.lineStyle(Math.max(1, r * 0.18), Phaser.Display.Color.HSLToColor(hueBase, 1, 0.7).color, 0.5);
      pg.strokeCircle(cx, cy, r * 1.25);

      // Pulsing outer ring
      const pulseR = r * (1.6 + Math.sin(now / 300 + i) * 0.15);
      pg.lineStyle(1, Phaser.Display.Color.HSLToColor((hueBase + 0.5) % 1, 1, 0.8).color, 0.3);
      pg.strokeCircle(cx, cy, pulseR);
    }
  }

  private updateHUD(): void {
    const displaySpeed = Math.floor(Math.abs(this.player.state.speed));
    this.hudSpeed.setText(`${displaySpeed}`);

    const position = this.calculatePosition();
    const posColors = ['#fde047', '#e2e8f0', '#fb923c', '#94a3b8'];
    
    const newPosText = `${position}`;
    if (this.hudPosition.text !== newPosText) {
      this.hudPosition.setText(newPosText);
      this.hudPosition.setColor(posColors[position - 1] || '#ffffff');
      
      this.tweens.add({
        targets: this.hudPosition,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    const lap = Math.min(this.player.state.lap + 1, MAX_LAPS);
    this.hudLap.setText(`${lap}/${MAX_LAPS}`);
    
    // UPDATE REVERSE UI
    if (this.hudWrongWay) {
      if (this.player.state.wrongWay && this.racePhase === 'racing') {
        this.hudWrongWay.setVisible(true);
      } else {
        this.hudWrongWay.setVisible(false);
      }
    }

    const item = this.player.state.itemSlot;
    if (item) {
      const info = ITEM_DEFS[item as ItemType];
      this.hudItem.setText(info?.emoji || '?');
    } else {
      this.hudItem.setText('');
    }

    const mins = Math.floor(this.raceTimer / 60);
    const secs = Math.floor(this.raceTimer % 60);
    const ms = Math.floor((this.raceTimer * 100) % 100);
    this.hudTime.setText(
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    );
  }

  private calculatePosition(): number {
    const getProgress = (kart: Kart): number => {
      // Finished karts always ahead of unfinished
      if (kart.state.finished) {
        return 10_000_000 - kart.state.finishTime * 1000;
      }
      // lap * big number, then checkpoints, then fractional distance to next CP (normalized 0-1000)
      const lapScore = kart.state.lap * 1_000_000;
      const cpScore  = kart.state.checkpointIndex * 10_000;
      let nextCpIdx  = kart.state.checkpointIndex;
      if (nextCpIdx >= this.course.checkpoints.length) nextCpIdx = 0;
      const nextCp = this.course.checkpoints[nextCpIdx];
      // Normalize dist: max course size ~3000px → divide to get 0-3000 range within 10000 bucket
      const dist = nextCp
        ? Math.sqrt((kart.state.x - nextCp.x)**2 + (kart.state.y - nextCp.y)**2)
        : 0;
      const distScore = Math.max(0, 5000 - dist); // closer to next CP = higher score
      return lapScore + cpScore + distScore;
    };

    const playerProgress = getProgress(this.player);
    let position = 1;
    for (const npc of this.npcs) {
      if (getProgress(npc) > playerProgress) {
        position++;
      }
    }
    return position;
  }

  // ─── Show floating effect text on screen ──────────────────────────────
  private showEffectText(text: string, color: string, x?: number, y?: number): void {
    const cx = x ?? GAME_WIDTH / 2;
    const cy = y ?? GAME_HEIGHT / 2 - 60;
    const txt = this.add.text(cx, cy, text, {
      fontSize: '38px',
      fontFamily: '"Impact", system-ui, sans-serif',
      color: color,
      stroke: '#000000',
      strokeThickness: 6,
      padding: { left: 10, right: 10, top: 4, bottom: 4 },
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: { from: 0, to: 1 },
      y: cy - 20,
      scaleX: { from: 0.5, to: 1.15 },
      scaleY: { from: 0.5, to: 1.15 },
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          alpha: 0,
          y: cy - 80,
          scaleX: 1.4,
          scaleY: 1.4,
          duration: 900,
          delay: 600,
          ease: 'Power2.easeIn',
          onComplete: () => txt.destroy(),
        });
      }
    });
    this.effectTextPool.push(txt);
  }

  // ─── Show screen flash effect ────────────────────────────────────────────
  private showScreenFlash(color: number, alpha: number = 0.4, duration: number = 300): void {
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, alpha).setDepth(290).setAlpha(0);
    this.tweens.add({
      targets: flash,
      alpha: { from: alpha, to: 0 },
      duration,
      ease: 'Power2.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  // ─── Handle item effects ─────────────────────────────────────────────────
  /** Flash the player sprite with a bright glow when an item is used */
  private flashPlayerSprite(color: number, duration: number = 0.4): void {
    this.itemUseFlashTimer = duration;
    this.itemUseFlashColor = color;
    const sprite = this.kartSprites.get(this.player);
    if (!sprite) return;

    // Scale punch
    this.tweens.killTweensOf(sprite);
    sprite.setScale(sprite.scaleX * 1.5, sprite.scaleY * 1.5);
    this.tweens.add({
      targets: sprite,
      scaleX: sprite.scaleX / 1.5,
      scaleY: sprite.scaleY / 1.5,
      duration: 250,
      ease: 'Back.easeOut',
    });

    // Ring burst particle around player sprite
    const pos = this.mode7.worldToScreen(this.player.state.x, this.player.state.y);
    if (pos.visible) {
      const numRings = 8;
      for (let r = 0; r < numRings; r++) {
        const angle = (r / numRings) * Math.PI * 2;
        const ring = this.add.circle(pos.x, pos.y, 6, color, 0.9).setDepth(200);
        this.tweens.add({
          targets: ring,
          x: pos.x + Math.cos(angle) * 60 * pos.scale,
          y: pos.y + Math.sin(angle) * 60 * pos.scale,
          alpha: 0,
          scaleX: 0.2, scaleY: 0.2,
          duration: 400,
          ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
      }
    }
  }

  private handleItemEffect(item: string | null): void {
    if (!item) return;

    switch (item) {
      // ── 煎餅: 5秒スピードアップ ──────────────────────────────────────────
      case 'senbei':
        this.flashPlayerSprite(0xFFD700);
        this.showEffectText('⚡ SPEED UP!', '#fde047');
        this.showScreenFlash(0xfde047, 0.3, 300);
        break;

      // ── 卵: 前を走るキャラにぶつける ────────────────────────────────────
      case 'egg': {
        // Find the nearest kart AHEAD of player by progress
        const wps = this.course.waypoints;
        const total = wps.length;
        const playerProgress = this.player.state.lap * total * 2 + this.player.state.checkpointIndex;
        let targetNpc = null;
        let minDiff = Infinity;
        for (const npc of this.npcs) {
          const npcProgress = npc.state.lap * total * 2 + npc.state.checkpointIndex;
          const diff = npcProgress - playerProgress;
          if (diff > 0 && diff < minDiff) {
            minDiff = diff;
            targetNpc = npc;
          }
        }
        if (targetNpc && targetNpc.state.invincibleTimer <= 0) {
          targetNpc.state.spinTimer = 2.0;
          // Show hit effect – get target screen position
          const sc = this.mode7.worldToScreen(targetNpc.state.x, targetNpc.state.y, targetNpc.state.z);
          if (sc.visible) {
            this.showEffectText('💥 HIT!', '#ff4444', sc.x, sc.y - 30);
          }
          this.showEffectText('🥚 EGG THROW!', '#ffffff');
          this.showScreenFlash(0xffffff, 0.25, 200);
        } else {
          this.showEffectText('🥚 MISS...', '#aaaaaa');
        }
        break;
      }

      // ── サッカーボール: 全員クラッシュ ──────────────────────────────────
      case 'soccer_ball':
        this.flashPlayerSprite(0xFF6600);
        this.showEffectText('⚽ EVERYONE CRASH!', '#ff8800');
        this.showScreenFlash(0xff4400, 0.5, 500);
        for (const npc of this.npcs) {
          if (npc.state.invincibleTimer <= 0) {
            npc.state.spinTimer = 2.5;
          }
        }
        // Player does not crash anymore

        break;

      // ── ゲルぴよ: 10秒無敵 + スピード30%UP ──────────────────────────────
      case 'gelpiyo':
        this.flashPlayerSprite(0xFFAA00, 0.8);
        this.showEffectText('🐣 INVINCIBLE!', '#FFD700');
        this.showScreenFlash(0xFFD700, 0.4, 400);
        // Trigger visual aura loop (tint already handled in renderSprites)
        this.time.addEvent({
          delay: 500,
          repeat: 19, // 10 sec at 0.5s interval
          callback: () => {
            if (this.player.state.invincibleTimer > 0) {
              this.showScreenFlash(0xFFD700, 0.08, 200);
            }
          }
        });
        break;
    }
  }

  // ─── Check invincible collision: if player is invincible and hits NPC ────
  private checkInvincibleCollisions(): void {
    if (this.player.state.invincibleTimer <= 0) return;
    for (const npc of this.npcs) {
      const dx = npc.state.x - this.player.state.x;
      const dy = npc.state.y - this.player.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + npc.radius + 10) {
        if (npc.state.spinTimer <= 0) {
          npc.state.spinTimer = 2.0;
          const sc = this.mode7.worldToScreen(npc.state.x, npc.state.y, npc.state.z);
          if (sc.visible) {
            this.showEffectText('💥 CRASH!', '#ff4444', sc.x, sc.y - 20);
          }
        }
      }
    }
    // Also check if player is hit by NPC when NOT invincible
  }

  // ─── Notify player when HIT by egg or crash ──────────────────────────────
  private prevPlayerSpinTimer: number = 0;
  private checkPlayerHit(): void {
    const nowSpin = this.player.state.spinTimer;
    if (nowSpin > 0 && this.prevPlayerSpinTimer <= 0) {
      // Player just got hit
      this.showEffectText('💥 YOU WERE HIT!', '#ff2222', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);
      this.showScreenFlash(0xff0000, 0.45, 400);
    }
    this.prevPlayerSpinTimer = nowSpin;
  }

  private startGoalAnim(): void {
    this.racePhase = 'goal_anim';

    // Rich GOAL text effect
    const goalText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'GOAL!', {
      fontSize: '80px',
      fontFamily: 'Impact',
      // @ts-ignore
      fontWeight: '900',
      color: '#FFD700',
      stroke: '#FF4500',
      strokeThickness: 8,
      fontStyle: 'italic',
      shadow: { blur: 15, color: '#FF4500', fill: true, offsetY: 5 }
    }).setOrigin(0.5).setDepth(200).setAlpha(0).setScale(0.5);

    this.tweens.add({
      targets: goalText,
      alpha: 1, scaleX: 1.2, scaleY: 1.2,
      duration: 500, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: goalText,
          scaleX: 1.0, scaleY: 1.0,
          duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
        });
      }
    });

    // Rainbow particle burst
    const colors = [0xFFD700, 0xFF4500, 0x00FFFF, 0xFF69B4, 0x7FFF00, 0xFFFFFF];
    for (let i = 0; i < 50; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = this.add.circle(GAME_WIDTH/2, GAME_HEIGHT/2 - 50, Math.random()*10+4, color).setDepth(199);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 350 + 80;
      this.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * speed,
        y: p.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.1,
        duration: 900 + Math.random() * 500,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }

    // After 2 seconds: fade to black, then go to ResultScene
    this.time.delayedCall(2000, () => {
      this.finishRace();
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        window.dispatchEvent(new CustomEvent('game-screen', { detail: 'result' }));
        this.scene.start('ResultScene');
      });
    });
  }

  private finishRace(): void {
    this.racePhase = 'finished';

    // Build race results: finished karts sorted by finishTime, then unfinished sorted by progress
    const wpTotal = this.course.waypoints.length;
    const getKartProgress = (k: Kart) => {
      if (k.state.finished) return 1_000_000_000 - k.state.finishTime * 1000;
      return k.state.lap * wpTotal * 2 + k.state.checkpointIndex;
    };
    const results = this.allKarts
      .map(k => ({
        characterId: k.characterId,
        time: k.state.finished ? k.state.finishTime : this.raceTimer + 9999,
        lap: k.state.lap,
        isPlayer: k === this.player,
        finished: k.state.finished,
        progress: getKartProgress(k),
      }))
      .sort((a, b) => {
        // Finished karts come first, sorted by finishTime
        if (a.finished && b.finished) return a.time - b.time;
        if (a.finished) return -1;
        if (b.finished) return 1;
        // Both unfinished: sort by progress
        return b.progress - a.progress;
      });

    this.registry.set('raceResults', results);
    this.registry.set('raceTime', this.raceTimer);

    // Fade out and transition to ResultScene
    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.time.delayedCall(1200, () => {
        window.dispatchEvent(new CustomEvent('game-screen', { detail: 'title' }));
        this.scene.start('ResultScene');
      });
    });
  }
}
