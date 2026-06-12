import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { Transition } from '../utils/Transition';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.isTransitioning = false;
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeEffect.reset();
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    const bg = this.add.image(w / 2, h / 2, 'title_bg');
    bg.setDisplaySize(w, h);

    // Add generated logo image with ADD blend mode to make black background transparent
    const logo = this.add.image(w / 2, h * 0.3, 'logo');
    logo.setScale(0.5); // Adjust scale as needed to fit the screen
    logo.setBlendMode(Phaser.BlendModes.SCREEN); // Screen removes black background
    
    // Animate logo floating
    this.tweens.add({
      targets: logo,
      y: '-=15',
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const subTitle = this.add.text(w / 2, h * 0.5, 'NEXT GEN TOURNAMENT', {
      fontSize: '16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      fontWeight: 'bold',
      letterSpacing: 8
    }).setOrigin(0.5);
    subTitle.setShadow(1, 1, '#000000', 5, true, true);

    this.add.rectangle(w / 2, h * 0.85, w, 60, 0x000000, 0.7);

    const startText = this.add.text(w / 2, h * 0.85, 'PRESS TO START', {
      fontSize: '28px',
      fontFamily: 'system-ui, sans-serif',
      // @ts-ignore
      fontWeight: '900',
      color: '#fde047',
      letterSpacing: 4
    }).setOrigin(0.5);
    startText.setShadow(0, 0, '#fde047', 10, false, true);

    this.tweens.add({
      targets: startText,
      alpha: 0.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // HTML Overlay handles the mobile touch now
    this.input.keyboard?.once('keydown', () => this.startGame());

    // Play transition entering the scene
    window.dispatchEvent(new CustomEvent('game-screen', { detail: 'title' }));
    
    const btnHandler = ((e: CustomEvent) => {
      if (e.detail === 'titleStart') this.startGame();
    }) as EventListener;
    window.addEventListener('game-button', btnHandler);
    this.events.once('shutdown', () => window.removeEventListener('game-button', btnHandler));

    Transition.playShutterOpen(this, 300);
  }

  private isTransitioning = false;
  private startGame() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    Transition.playShutterClose(this, 300, () => {
      this.scene.start('CharSelectScene');
    });
  }
}
