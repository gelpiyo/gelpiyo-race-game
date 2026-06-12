import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { CHARACTERS } from '../config/CharacterConfig';
import type { CharacterDef } from '../config/CharacterConfig';
import { Transition } from '../utils/Transition';

export class CharSelectScene extends Phaser.Scene {
  private selectedIndex: number = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private statBars: Phaser.GameObjects.Rectangle[][] = [];

  constructor() {
    super({ key: 'CharSelectScene' });
  }

  private isStarting: boolean = false;

  private isTransitioning: boolean = false;
  create(): void {
    this.isTransitioning = false;
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.selectedIndex = 0;
    this.cards = [];
    this.statBars = [];

    const bg = this.add.image(w / 2, h / 2, 'char_select_bg');
    bg.setDisplaySize(w, h);

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.4);

    const titlePanel = this.add.graphics();
    titlePanel.fillStyle(0x0a0f1c, 0.9);
    titlePanel.lineStyle(2, 0x0ea5e9, 1);
    titlePanel.beginPath();
    titlePanel.moveTo(20, 20); titlePanel.lineTo(w - 20, 20);
    titlePanel.lineTo(w - 40, 60); titlePanel.lineTo(40, 60);
    titlePanel.closePath();
    titlePanel.fillPath(); titlePanel.strokePath();

    this.add.text(w / 2, 38, 'SELECT YOUR MACHINE', {
      fontSize: '24px',
      fontFamily: 'Impact',
      color: '#0ea5e9',
      letterSpacing: 2
    }).setOrigin(0.5);

    const cardW = 160;
    const cardH = 210;
    const startX = w / 2 - cardW / 2 - 10;
    const startY = 100;
    const gapX = cardW + 20;
    const gapY = cardH + 20;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const char = CHARACTERS[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = startX - (0.5 - col) * gapX + cardW / 2;
      const cy = startY + row * gapY + cardH / 2;
      this.createCharCard(char, cx, cy, cardW, cardH, i);
    }

    this.updateSelection();

    const btnY = h - 50;
    const btnBg = this.add.graphics();
    // NEXT button is now HTML overlay (GameButtons)

    this.input.keyboard?.on('keydown-LEFT', () => {
      this.selectedIndex = (this.selectedIndex + 3) % 4;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.selectedIndex = (this.selectedIndex + 1) % 4;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex + 2) % 4;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 2) % 4;
      this.updateSelection();
    });
    this.input.keyboard?.on('keydown-ENTER', () => this.startRace());
    this.input.keyboard?.on('keydown-Z', () => this.startRace());

    // Play transition entering the scene
    window.dispatchEvent(new CustomEvent('game-screen', { detail: 'charSelect' }));

    const btnHandler = ((e: CustomEvent) => {
      if (this.isTransitioning) return;
      if (e.detail === 'charSelectNext') this.startRace();
    }) as EventListener;
    window.addEventListener('game-button', btnHandler);
    this.events.once('shutdown', () => window.removeEventListener('game-button', btnHandler));

    Transition.playShutterOpen(this, 300);
  }

  private drawStartButton(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) {
    g.clear();
    g.fillStyle(0x020617, 0.9);
    g.lineStyle(3, color, 1);
    const hw = 130, hh = 30;
    g.beginPath();
    g.moveTo(cx - hw + 10, cy - hh);
    g.lineTo(cx + hw, cy - hh);
    g.lineTo(cx + hw - 10, cy + hh);
    g.lineTo(cx - hw, cy + hh);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private createCharCard(char: CharacterDef, cx: number, cy: number, cardW: number, cardH: number, index: number): void {
    const container = this.add.container(cx, cy);
    const colorNum = parseInt(char.color.replace('#', ''), 16);

    const cardBg = this.add.graphics();
    container.add(cardBg); 
    
    const zone = this.add.zone(0, 0, cardW, cardH).setInteractive({ useHandCursor: true });
    container.add(zone); 

    const charImg = this.add.image(0, -20, 'char_sys_' + char.id);
    const imgScale = 90 / Math.max(charImg.width, charImg.height);
    charImg.setScale(imgScale);
    container.add(charImg);

    const nameBg = this.add.rectangle(0, 35, cardW - 10, 24, 0x000000, 0.8).setOrigin(0.5);
    container.add(nameBg);

    const nameText = this.add.text(0, 35, char.name, {
      fontSize: '16px',
      fontFamily: 'Impact',
      color: char.color,
      letterSpacing: 1
    }).setOrigin(0.5);
    container.add(nameText);

    const stats = [
      { label: 'SPD', value: char.stats.speedMax / 120 },
      { label: 'ACC', value: char.stats.acceleration },
      { label: 'TRN', value: char.stats.turnRate / 1.1 },
    ];

    const bars: Phaser.GameObjects.Rectangle[] = [];
    stats.forEach((stat, si) => {
      const sy = 60 + si * 18;
      const label = this.add.text(-70, sy, stat.label, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#94a3b8',
      }).setOrigin(0, 0.5);
      container.add(label);

      const barBg = this.add.rectangle( -15, sy, 80, 8, 0x1e293b, 1).setOrigin(0, 0.5);
      container.add(barBg);

      const barFill = this.add.rectangle( -15, sy, 80 * Math.min(stat.value, 1), 8, colorNum, 1).setOrigin(0, 0.5);
      container.add(barFill);
      bars.push(barFill);
    });
    this.statBars.push(bars);

    zone.on('pointerdown', () => {
      this.selectedIndex = index;
      this.updateSelection();
    });

    this.cards.push(container);
  }

  private updateSelection(): void {
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const isSelected = i === this.selectedIndex;
      const bgGraphics = card.getAt(0) as Phaser.GameObjects.Graphics;
      const colorNum = parseInt(CHARACTERS[i].color.replace('#', ''), 16);

      const w = 160, h = 210;
      const hw = w/2, hh = h/2;

      bgGraphics.clear();
      if (isSelected) {
        bgGraphics.fillStyle(0x0f172a, 0.95);
        bgGraphics.lineStyle(4, colorNum, 1);
        bgGraphics.fillRect(-hw, -hh, w, h);
        bgGraphics.strokeRect(-hw, -hh, w, h);
        
        bgGraphics.lineStyle(1, 0xffffff, 0.8);
        bgGraphics.strokeRect(-hw + 6, -hh + 6, w - 12, h - 12);
        
        this.tweens.add({
          targets: card,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
        });
      } else {
        bgGraphics.fillStyle(0x020617, 0.8);
        bgGraphics.lineStyle(2, 0x334155, 1);
        bgGraphics.fillRect(-hw, -hh, w, h);
        bgGraphics.strokeRect(-hw, -hh, w, h);
        
        this.tweens.add({
          targets: card,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 100,
        });
      }
    }
  }

  private startRace(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const selectedChar = CHARACTERS[this.selectedIndex];
    this.registry.set('selectedCharacter', selectedChar.id);

    const card = this.cards[this.selectedIndex];
    this.tweens.add({
      targets: card,
      alpha: 0,
      duration: 100,
      yoyo: true,
      repeat: 3
    });

    this.time.delayedCall(400, () => {
      Transition.playShutterClose(this, 300, () => {
        this.scene.start('CourseSelectScene');
      });
    });
  }
}
