import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { getCharacter } from '../config/CharacterConfig';
import { Transition } from '../utils/Transition';

interface RaceResult {
  characterId: string;
  time: number;
  lap: number;
  isPlayer: boolean;
  finished?: boolean;
  progress?: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const results: RaceResult[] = this.registry.get('raceResults') || [];

    // ── Background ────────────────────────────────────────────────────
    if (this.textures.exists('result_bg')) {
      const bg = this.add.image(w / 2, h / 2, 'result_bg');
      bg.setDisplaySize(w, h);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0a0f1c, 0x0a0f1c, 0x1e1b4b, 0x1e1b4b, 1);
      bg.fillRect(0, 0, w, h);
    }

    // Scanline overlay
    const scanlines = this.add.graphics().setAlpha(0.04);
    for (let y = 0; y < h; y += 4) {
      scanlines.fillStyle(0x000000, 1);
      scanlines.fillRect(0, y, w, 2);
    }

    // ── Animated particles ────────────────────────────────────────────
    for (let i = 0; i < 30; i++) {
      const colors = [0xf43f5e, 0x3b82f6, 0xfde047, 0x10b981, 0xa855f7, 0x0ea5e9];
      const col = colors[Math.floor(Math.random() * colors.length)];
      const star = this.add.circle(
        Math.random() * w,
        Math.random() * h,
        Math.random() * 3 + 1,
        col, 0.8
      ).setDepth(1);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 1 },
        scaleX: { from: 0.5, to: 1.5 },
        scaleY: { from: 0.5, to: 1.5 },
        duration: 800 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 1000,
        ease: 'Sine.easeInOut'
      });
    }

    // Confetti
    for (let i = 0; i < 35; i++) {
      const colors = [0xf43f5e, 0x3b82f6, 0x10b981, 0xfde047, 0xa855f7];
      const confetti = this.add.rectangle(
        Math.random() * w,
        -60 - Math.random() * 200,
        6 + Math.random() * 6,
        12 + Math.random() * 8,
        colors[Math.floor(Math.random() * colors.length)],
        0.9
      ).setDepth(2);
      this.tweens.add({
        targets: confetti,
        y: h + 60,
        x: `+=${Math.random() * 120 - 60}`,
        rotation: Math.PI * (3 + Math.random() * 4),
        duration: 2200 + Math.random() * 2000,
        repeat: -1,
        delay: Math.random() * 2000,
        ease: 'Linear'
      });
    }

    // ── Title panel ────────────────────────────────────────────────────
    const titleBg = this.add.graphics().setDepth(5);
    titleBg.fillStyle(0x000000, 0.5);
    titleBg.fillRoundedRect(20, 12, w - 40, 52, 12);
    titleBg.lineStyle(2, 0xfde047, 0.8);
    titleBg.strokeRoundedRect(20, 12, w - 40, 52, 12);

    // Neon glow on title box
    const glowLine = this.add.graphics().setDepth(4);
    glowLine.lineStyle(4, 0xfde047, 0.15);
    glowLine.strokeRoundedRect(18, 10, w - 36, 56, 14);

    const title = this.add.text(w / 2, 38, '🏆  RACE RESULT  🏆', {
      fontSize: '24px',
      fontFamily: '"Impact", system-ui, sans-serif',
      color: '#fde047',
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(6);
    title.setShadow(0, 0, '#fde047', 12, true, false);

    // ── Determine player final position ────────────────────────────────
    const playerPos = results.findIndex(r => r.isPlayer) + 1;

    // ── Result rows ────────────────────────────────────────────────────
    const posEmoji = ['🥇', '🥈', '🥉', '4️⃣'];
    const posGlow  = [0xfde047, 0x94a3b8, 0xfb923c, 0x6b7280];
    const rowColors = [
      { fill: 0x1c1a00, border: 0xfde047 },
      { fill: 0x0f1520, border: 0x94a3b8 },
      { fill: 0x1a0e00, border: 0xfb923c },
      { fill: 0x0f0f0f, border: 0x4b5563 },
    ];

    results.forEach((result, i) => {
      const rowY = 82 + i * 118;
      const char = getCharacter(result.characterId);
      const rc = rowColors[i] || rowColors[3];

      // Shadow
      const shadowG = this.add.graphics().setDepth(7);
      shadowG.fillStyle(0x000000, 0.4);
      shadowG.fillRoundedRect(24, rowY + 4, w - 48, 104, 14);

      // Row bg
      const rowG = this.add.graphics().setDepth(8);
      rowG.fillStyle(rc.fill, 0.92);
      rowG.fillRoundedRect(20, rowY, w - 40, 104, 14);
      rowG.lineStyle(result.isPlayer ? 3 : 1.5, rc.border, result.isPlayer ? 1.0 : 0.6);
      rowG.strokeRoundedRect(20, rowY, w - 40, 104, 14);

      // Inner glow for 1st place
      if (i === 0) {
        const glowG = this.add.graphics().setDepth(7);
        glowG.lineStyle(8, 0xfde047, 0.08);
        glowG.strokeRoundedRect(16, rowY - 4, w - 32, 112, 18);
      }

      // Player highlight glow
      if (result.isPlayer) {
        const playerGlow = this.add.graphics().setDepth(7);
        playerGlow.lineStyle(6, 0x0ea5e9, 0.2);
        playerGlow.strokeRoundedRect(18, rowY - 2, w - 36, 108, 16);
      }

      // Position emoji
      this.add.text(42, rowY + 52, posEmoji[i] || '  ', {
        fontSize: '34px',
      }).setOrigin(0.5).setDepth(10);

      // Character image
      const charImg = this.add.image(100, rowY + 42, 'char_sys_' + result.characterId).setDepth(10);
      const imgScale = 70 / Math.max(charImg.width, charImg.height);
      charImg.setScale(imgScale);

      // Separator line
      const sepG = this.add.graphics().setDepth(9);
      sepG.lineStyle(1, rc.border, 0.3);
      sepG.lineBetween(130, rowY + 8, 130, rowY + 96);

      // Character name
      this.add.text(140, rowY + 18, char.name, {
        fontSize: '20px',
        fontFamily: '"Impact", system-ui, sans-serif',
        color: char.color,
        letterSpacing: 1,
      }).setDepth(10).setShadow(1, 1, '#000000', 4, true, false);

      // Time
      const timeStr = result.finished ? this.formatTime(result.time) : '-:--.--';
      this.add.text(140, rowY + 44, '⏱ ' + timeStr, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#e2e8f0',
      }).setDepth(10);

      // Lap
      const lapStr = result.finished ? 'FINISHED' : `LAP ${result.lap}`;
      this.add.text(140, rowY + 66, lapStr, {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: result.finished ? '#10b981' : '#94a3b8',
      }).setDepth(10);

      // YOU badge
      if (result.isPlayer) {
        const youBg = this.add.graphics().setDepth(10);
        youBg.fillStyle(0x0ea5e9, 1);
        youBg.fillRoundedRect(w - 78, rowY + 36, 52, 24, 6);
        this.add.text(w - 52, rowY + 48, 'YOU', {
          fontSize: '13px',
          fontFamily: '"Impact", system-ui, sans-serif',
          color: '#ffffff',
          letterSpacing: 2,
        }).setOrigin(0.5).setDepth(11);
      }

      // Animate row entrance
      rowG.setAlpha(0);
      rowG.x = -30;
      this.tweens.add({
        targets: rowG,
        alpha: 1,
        x: 0,
        duration: 450,
        delay: 200 + i * 120,
        ease: 'Back.easeOut',
      });
    });

    // ── Player position announcement ────────────────────────────────────
    const posMessages = ['CHAMPION!', '2nd PLACE', '3rd PLACE', '4th PLACE'];
    const posMsg = posMessages[playerPos - 1] || `${playerPos}th PLACE`;
    const msgColors = ['#fde047', '#94a3b8', '#fb923c', '#6b7280'];
    const msgColor = msgColors[playerPos - 1] || '#ffffff';

    const msgPanel = this.add.graphics().setDepth(15).setAlpha(0);
    msgPanel.fillStyle(0x000000, 0.75);
    msgPanel.fillRoundedRect(w / 2 - 130, h - 140, 260, 36, 10);
    msgPanel.lineStyle(2, parseInt(msgColor.replace('#', '0x')), 0.9);
    msgPanel.strokeRoundedRect(w / 2 - 130, h - 140, 260, 36, 10);

    const posText = this.add.text(w / 2, h - 122, `YOUR POSITION: ${posMsg}`, {
      fontSize: '18px',
      fontFamily: '"Impact", system-ui, sans-serif',
      color: msgColor,
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(16).setAlpha(0);
    posText.setShadow(0, 0, msgColor, 10, true, false);

    this.tweens.add({
      targets: [msgPanel, posText],
      alpha: 1,
      duration: 500,
      delay: 800,
      ease: 'Power2.easeOut',
    });
    this.tweens.add({
      targets: posText,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 700,
      delay: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Buttons ────────────────────────────────────────────────────────
    // Visual and interactive buttons are now handled entirely by HTML overlay (GameButtons)

    // Navigation buttons are now HTML overlays (GameButtons)
    let isTransitioning = false;
    const btnHandler = ((e: CustomEvent) => {
      if (isTransitioning) return;
      isTransitioning = true;
      if (e.detail === 'retry') {
        this.cameras.main.fadeOut(350, 0, 0, 0);
        this.time.delayedCall(350, () => this.scene.start('RaceScene'));
      }
      if (e.detail === 'charSelect') {
        this.cameras.main.fadeOut(350, 0, 0, 0);
        this.time.delayedCall(350, () => this.scene.start('CharSelectScene'));
      }
      if (e.detail === 'toTitle') {
        this.cameras.main.fadeOut(350, 0, 0, 0);
        this.time.delayedCall(350, () => {
          window.dispatchEvent(new CustomEvent('game-screen', { detail: 'title' }));
          this.scene.start('TitleScene');
        });
      }
    }) as EventListener;
    window.addEventListener('game-button', btnHandler);
    this.events.once('shutdown', () => window.removeEventListener('game-button', btnHandler));

    this.cameras.main.fadeIn(500);
    window.dispatchEvent(new CustomEvent('game-screen', { detail: 'result' }));
    Transition.playShutterOpen(this, 300);
  }

  private formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return min.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0') + '.' + ms.toString().padStart(2, '0');
  }
}
